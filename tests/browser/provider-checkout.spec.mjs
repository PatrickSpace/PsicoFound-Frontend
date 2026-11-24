import { test, expect } from '@playwright/test';
import { seedFollowup, password } from '../helpers/followup-fixtures.mjs';
import { adminFirestore } from '../helpers/admin-sdk.mjs';
let db;
test.skip(!process.env.MARKETPLACE_BROWSER_ONLY, 'Runs with the isolated fake provider configuration');
test.beforeEach(async () => {
  db = adminFirestore.getFirestore(await seedFollowup());
  await db.doc('users/unlinked-x').update({ 'productGuides.patient': { status: 'dismissed', step: 0 } });
  await db.doc('terapias/provider-test').set({ pacienteUid: 'unlinked-x', terapeutaId: 'therapist-a',
    terapeutaNombre: 'Profesional A', estado: 'activo', citas: [] });
  await db.doc('therapists/therapist-a').update({ sessionPriceAmount: 12000 });
  await db.doc('survey_summaries/unlinked-x').set({ confirmed: true, sessionId: 'synthetic-provider-session',
    summary: { motivoConsulta: 'Motivo sintético aprobado', temas: ['Ansiedad'], modalidad: 'Remoto' } });
  await db.doc('payment_accounts/therapist-a').set({ status: 'connected', provider: 'culqi',
    providerAccountId: 'lurems-culqi', isFake: true });
  const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  await db.doc('therapist_availability/provider-test').set({ therapistId: 'therapist-a', date,
    startTime: '10:00', endTime: '10:45', durationMinutes: 45, bufferMinutes: 15,
    status: 'available', modality: 'Remoto', location: 'Terapia Online', timezone: 'America/Lima' });
});
async function openCheckout(page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo', exact: true }).fill('unlinked-x@example.test');
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/dashboard');
  await page.getByText('Agenda una sesión', { exact: false }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button').filter({ hasText: '10:00–10:45' }).click();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Siguiente paso' }).click();
  await expect(dialog.getByRole('button', { name: 'Confirmar pago simulado' })).toBeVisible();
  await dialog.getByRole('checkbox').check();
  return dialog;
}
for (const rejected of [false, true]) {
  test('provider checkout: ' + (rejected ? 'rejection can be retried' : 'approved payment opens care guide'), async ({ page }, info) => {
    const dialog = await openCheckout(page);
    if (rejected) {
      await dialog.getByLabel('Escenario de prueba').locator('..').click();
      await page.getByRole('option', { name: 'Rechazado', exact: true }).click();
    }
    await dialog.getByRole('button', { name: 'Confirmar pago simulado' }).click();
    if (rejected) {
      await expect.poll(async () => (await db.collection('payments').where('patientId', '==', 'unlinked-x').get()).docs[0]?.data().status).toBe('rejected');
      await dialog.getByLabel('Escenario de prueba').locator('..').click();
      await page.getByRole('option', { name: 'Aprobado', exact: true }).click();
      await dialog.getByRole('button', { name: 'Confirmar pago simulado' }).click();
    }
    await expect(dialog.getByText('Cita confirmada', { exact: true })).toBeVisible();
    const appointments = await db.collection('citas').where('pacienteUid', '==', 'unlinked-x').get();
    expect(appointments.size).toBe(1);
    expect(appointments.docs[0].data()).toMatchObject({ estado: 'confirmada', durationMinutes: 45, paymentStatus: 'approved' });
    await page.screenshot({ path: info.outputPath('provider-confirmed.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Ver mis sesiones' }).click();
    await expect(page.getByRole('heading', { name: 'Tu cita está confirmada' })).toBeVisible();
  });
}

test('provider checkout: professional reschedules the paid appointment using an official slot', async ({ page }) => {
  const dialog = await openCheckout(page);
  await dialog.getByRole('button', { name: 'Confirmar pago simulado' }).click();
  await expect(dialog.getByText('Cita confirmada', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Ver mis sesiones' }).click();
  const appointment = (await db.collection('citas').where('pacienteUid', '==', 'unlinked-x').get()).docs[0];
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await db.doc('therapist_availability/provider-next').set({ therapistId: 'therapist-a', date,
    startTime: '11:00', endTime: '11:45', durationMinutes: 45, bufferMinutes: 15,
    status: 'available', modality: 'Remoto', location: 'Terapia Online', timezone: 'America/Lima' });
  await page.evaluate(async password => {
    const { auth } = await import(new URL('/src/plugins/Firebase/firebase.js', location.origin).href);
    const module = performance.getEntriesByType('resource').find(entry => entry.name.includes('/firebase_auth.js'));
    const { signInWithEmailAndPassword } = await import(module.name);
    await signInWithEmailAndPassword(auth, 'professional-a@example.test', password);
  }, password);
  await expect.poll(() => page.evaluate(async () => {
    const { useAppContextStore } = await import(new URL('/src/store/appContext.js', location.origin).href);
    return useAppContextStore().loadedForUid;
  })).toBe('professional-a');
  await page.evaluate(async () => {
    const { useAppContextStore } = await import(new URL('/src/store/appContext.js', location.origin).href);
    const { default: router } = await import(new URL('/src/router/index.js', location.origin).href);
    useAppContextStore().setActiveMode('psychologist');
    await router.push('/psicologo/sesiones');
  });
  const row = page.getByRole('row').filter({ hasText: 'Sin vínculo X' });
  await row.getByRole('button', { name: 'Reprogramar cita', exact: true }).click();
  await page.getByRole('dialog').getByRole('button').filter({ hasText: '11:00–11:45' }).click();
  await page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(async () => (await appointment.ref.get()).data()).toMatchObject({ fecha: date, hora: '11:00',
    availabilitySlotId: 'provider-next', durationMinutes: 45, paymentStatus: 'approved' });
  expect((await db.doc('bookings/' + appointment.id).get()).data()).toMatchObject({ slotId: 'provider-next', date, startTime: '11:00' });
});

test('provider checkout: dashboard ignores a delayed result after an account change', async ({ page }) => {
  await page.addInitScript(() => { window.__holdDashboard = true; });
  await page.route('**/src/services/terapiaService.js*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      'const therapies = await getTherapiesByPatient(pacienteUid);',
      `const therapies = await getTherapiesByPatient(pacienteUid);
       if (pacienteUid === 'unlinked-x' && window.__holdDashboard) {
         window.__holdDashboard = false;
         await new Promise(resolve => { window.__releaseDashboard = resolve; });
       }`);
    await route.fulfill({ response, body });
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo', exact: true }).fill('unlinked-x@example.test');
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.__releaseDashboard)).toBe('function');
  await page.evaluate(async password => {
    const { auth } = await import(new URL('/src/plugins/Firebase/firebase.js', location.origin).href);
    const module = performance.getEntriesByType('resource').find(entry => entry.name.includes('/firebase_auth.js'));
    const { signInWithEmailAndPassword } = await import(module.name);
    await signInWithEmailAndPassword(auth, 'professional-a@example.test', password);
  }, password);
  await expect(page.getByRole('heading', { name: /Bienvenido, Profesional A/ })).toBeVisible();
  const taken = page.getByText('Sesiones tomadas', { exact: true }).locator('..').locator('.progress-summary-stat__value');
  await expect(taken).toHaveText('1');
  await page.evaluate(async () => { window.__releaseDashboard(); await new Promise(resolve => requestAnimationFrame(resolve)); });
  await expect(taken).toHaveText('1');
});
