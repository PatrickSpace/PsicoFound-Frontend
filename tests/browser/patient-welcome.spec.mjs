import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { adminFirestore } from '../helpers/admin-sdk.mjs';
import { password, projectId, seedFollowup } from '../helpers/followup-fixtures.mjs';

const title = 'Tu primer paso en Lurems';
const dialog = page => page.getByRole('dialog', { name: title });
const manualGuide = page => page.getByRole('button', { name: 'Guía de funciones' });
let db;

test.beforeEach(async () => {
  db = adminFirestore.getFirestore(await seedFollowup());
});

async function login(page, uid = 'unlinked-x', mode = 'patient') {
  await page.goto('/login');
  await page.evaluate(mode => localStorage.setItem('psicofound-active-mode', mode), mode);
  await page.getByRole('textbox', { name: 'Correo', exact: true }).fill(`${uid}@example.test`);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await visit(page);
}

function visit(page, path = '/dashboard') {
  return page.evaluate(async path => {
    const { default: router } = await import(new URL('/src/router/index.js', location.origin).href);
    await router.push(path);
  }, path);
}

function progress(uid = 'unlinked-x') {
  return db.doc(`users/${uid}`).get().then(doc => doc.data().productGuides?.patient);
}

async function seedOldTherapy(summaries = []) {
  await db.doc('terapias/welcome-old').set({
    pacienteUid: 'unlinked-x', terapeutaId: 'therapist-a', estado: 'finalizado', citas: summaries,
  });
}

function appointment(estado, extra = {}) {
  return { pacienteUid: 'unlinked-x', terapeutaId: 'therapist-a', terapiaId: 'welcome-old',
    fecha: '2020-01-01', hora: '10:00', estado, ...extra };
}

test('patient welcome: starts the existing tour with focus inside the dialog', async ({ page }, info) => {
  await login(page);
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading', { name: title })).toBeFocused();
  await dialog(page).screenshot({ path: info.outputPath('welcome.png') });
  await dialog(page).getByRole('button', { name: 'Conocer Lurems' }).click();
  await expect(page).toHaveURL(/\/encuesta/);
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByText('Guía interactiva · 1 de 3', { exact: true })).toBeVisible();
  await expect.poll(progress).toMatchObject({ status: 'started', step: 0 });
});

for (const escape of [false, true]) {
  test(`patient welcome: ${escape ? 'Escape' : 'Más tarde'} saves and restores focus`, async ({ page }) => {
    await login(page);
    await expect(dialog(page).getByRole('heading', { name: title })).toBeFocused();
    if (escape) await page.keyboard.press('Escape');
    else await dialog(page).getByRole('button', { name: 'Más tarde' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(manualGuide(page)).toBeFocused();
    await expect.poll(progress).toMatchObject({ status: 'dismissed', step: 0 });
    await page.reload();
    await expect(manualGuide(page)).toBeVisible();
    await expect(dialog(page)).toBeHidden();
    await manualGuide(page).click();
    await expect(page).toHaveURL(/\/encuesta/);
  });
}

test('patient welcome: a failed save can be retried or closed for the visit', async ({ page }) => {
  let attempts = 0;
  const endpoint = '**/saveProductGuide';
  await page.route(endpoint, route => {
    attempts++;
    return route.fulfill({ status: 503, json: { error: { status: 'UNAVAILABLE' } } });
  });
  await login(page);
  const later = dialog(page).getByRole('button', { name: 'Más tarde' });
  await later.click();
  await expect(dialog(page).getByRole('alert')).toBeVisible();
  await later.click();
  await expect.poll(() => attempts).toBe(2);
  await dialog(page).getByRole('button', { name: 'Cerrar por ahora' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(manualGuide(page)).toBeFocused();
  expect(await progress()).toBeUndefined();
  await page.unroute(endpoint);
  await page.reload();
  await expect(dialog(page)).toBeVisible();
  await later.click();
  await expect.poll(progress).toMatchObject({ status: 'dismissed' });
});

test('patient welcome: pending, payment review and unconfirmed cancellations stay eligible; live confirmation closes', async ({ page }) => {
  await seedOldTherapy([
    { citaId: 'cancelled', estado: 'confirmada' },
    { citaId: 'legacy-cancelled', estado: ' CANCELADO ' },
  ]);
  const batch = db.batch();
  batch.set(db.doc('citas/pending'), appointment('pendiente'));
  batch.set(db.doc('citas/submitted'), appointment('pendiente', { paymentStatus: 'submitted' }));
  batch.set(db.doc('citas/cancelled'), appointment('cancelada', { paymentStatus: 'refund_review' }));
  await batch.commit();
  await login(page);
  await expect(dialog(page)).toBeVisible();
  await db.doc('citas/pending').update({ estado: 'confirmada', paymentStatus: 'not_applicable' });
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole('link', { name: 'Encontrar terapeuta' })).toBeFocused();
  expect(await progress()).toBeUndefined();
});

test('patient welcome: yields to patient care after a paid confirmation', async ({ page }) => {
  await db.doc('terapias/welcome-old').set({
    pacienteUid: 'unlinked-x', terapeutaId: 'therapist-a', estado: 'activo', citas: [],
  });
  await login(page);
  await expect(dialog(page)).toBeVisible();
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const batch = db.batch();
  batch.set(db.doc('citas/paid'), appointment('confirmada', {
    fecha: date, startAtIso: `${date}T15:00:00.000Z`, paymentOperationId: 'paid', paymentStatus: 'confirmed',
  }));
  batch.set(db.doc('payment_operations/paid'), {
    patientUid: 'unlinked-x', therapistId: 'therapist-a', appointmentId: 'paid', status: 'confirmed',
  });
  await batch.commit();
  await expect(page.getByRole('heading', { name: 'Tu cita está confirmada' })).toBeVisible();
  await expect(dialog(page)).toBeHidden();
  expect(await progress()).toBeUndefined();
});

for (const [label, official, summary, evidence] of [
  ['unpaid historical confirmation', appointment(' CONFIRMADO ', { paymentStatus: 'not_applicable' })],
  ['legacy completion in a summary', null, { estado: 'Completada' }],
  ['no-show', appointment(' NO ASISTIÓ ')],
  ['cancelled after confirmation', appointment('cancelada'), null, { sourceType: 'appointment', sourceId: 'historic', eventType: 'appointment_confirmed' }],
  ['cancelled after payment confirmation', appointment('cancelada', { paymentOperationId: 'historic-payment', paymentStatus: 'refunded' }), null,
    { sourceType: 'payment', sourceId: 'historic-payment', eventType: 'payment_confirmed' }],
]) {
  test(`patient welcome: hides for ${label} with zero upcoming sessions`, async ({ page }) => {
    await seedOldTherapy(summary ? [{ citaId: 'historic', ...summary }] : []);
    await db.doc('terapias/welcome-active').set({
      pacienteUid: 'unlinked-x', terapeutaId: 'therapist-d', estado: 'activo', citas: [],
    });
    if (official) await db.doc('citas/historic').set(official);
    if (evidence) await db.doc('longitudinal_history/historic').set({ pacienteUid: 'unlinked-x', ...evidence });
    const care = page.waitForResponse('**/getPatientCareGuide');
    await login(page);
    expect((await (await care).json()).result.available).toBe(false);
    await expect(manualGuide(page)).toBeVisible();
    await expect(page.getByText('Sesiones agendadas').locator('..')).toContainText('0');
    await expect(dialog(page)).toBeHidden();
  });
}

test('patient welcome: stays closed when the guide eligibility read fails', async ({ page }) => {
  await page.route('**/getPatientCareGuide', route =>
    route.fulfill({ status: 503, json: { error: { status: 'UNAVAILABLE' } } }));
  await login(page);
  await expect(page.getByRole('button', { name: 'Reintentar guía' })).toBeVisible();
  await expect(dialog(page)).toBeHidden();
});

test('patient welcome: stays closed when Firestore denies the history read', async ({ page }) => {
  // seedFollowup verifies loopback and the demo project before this test runs.
  const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
  const endpoint = `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}:securityRules`;
  async function setRules(content) {
    const response = await fetch(endpoint, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } }),
    });
    expect(response.ok).toBe(true);
  }
  const restricted = rules.replace(/match \/longitudinal_history\/\{eventId\} \{[^}]*}/,
    'match /longitudinal_history/{eventId} { allow read, write: if false; }');
  expect(restricted).not.toBe(rules);
  try {
    await setRules(restricted);
    await login(page);
    await expect(manualGuide(page)).toBeVisible();
    await expect(dialog(page)).toBeHidden();
    await setRules(rules);
    await page.reload();
    await expect(dialog(page)).toBeVisible();
  } finally {
    await setRules(rules);
  }
});

test('patient welcome: discards a delayed read across mode and account changes', async ({ page }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let observed, delivered;
  const started = new Promise(resolve => { observed = resolve; });
  const completed = new Promise(resolve => { delivered = resolve; });
  await page.route('**/getPatientCareGuide', async route => {
    const response = await route.fetch();
    observed();
    await held;
    await route.fulfill({ response });
    delivered();
  }, { times: 1 });
  await login(page, 'professional-d');
  await started;
  await expect(dialog(page)).toBeHidden();
  await page.evaluate(async () => {
    const { useAppContextStore } = await import(new URL('/src/store/appContext.js', location.origin).href);
    useAppContextStore().setActiveMode('psychologist');
  });
  await expect(page.locator('.layout-shell[data-user-role="psychologist"]')).toBeVisible();
  await expect(dialog(page)).toBeHidden();
  await page.evaluate(async password => {
    const { auth } = await import(new URL('/src/plugins/Firebase/firebase.js', location.origin).href);
    const authModule = performance.getEntriesByType('resource').find(entry => entry.name.includes('/firebase_auth.js'));
    const { signInWithEmailAndPassword } = await import(authModule.name);
    await signInWithEmailAndPassword(auth, 'patient-b@example.test', password);
  }, password);
  await expect(page.getByRole('heading', { name: /Paciente B/ })).toBeVisible();
  await expect(manualGuide(page)).toBeVisible();
  release();
  await completed;
  await expect(dialog(page)).toBeHidden();
});
