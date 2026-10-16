import {test,expect} from '@playwright/test';
import {adminFirestore} from '../helpers/admin-sdk.mjs';
import {seedPatient,seedSlots,reserve,httpCall} from '../helpers/patient-http.mjs';
import {password} from '../helpers/followup-fixtures.mjs';
test.use({timezoneId:"Asia/Tokyo"});
let db,id,ref,original;
test.beforeEach(async({context})=>{
  db=adminFirestore.getFirestore(await seedPatient());
  await seedSlots(db);
  id=(await reserve('review-ten','payment-deadline-browser')).appointmentId;
  ref=db.doc(`payment_operations/${id}`);
  original=(await ref.get()).data();
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
async function login(page) {
  await page.goto('/login');
  await page.getByRole('textbox',{name:'Correo',exact:true}).fill('patient-b@example.test');
  await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(password);
  await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/sesiones');
}
const card=page=>page.locator('.payment-operation').filter({hasText:original.reference});
async function noPaymentInvitation(page) {
  await expect(card(page).getByRole('link',{name:'Abrir Mercado Pago'})).toHaveCount(0);
  await expect(card(page).getByRole('button',{name:'Ya realicé el pago',exact:true})).toHaveCount(0);
}

test('REV-PIL-01: expired pending payment offers linked support and preserves financial records',async({page},info)=>{
  await ref.update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-60000)});
  await expect(httpCall('B','markPaymentSubmitted',{operationId:id})).rejects.toMatchObject({code:'failed-precondition'});
  await login(page);
  await expect(card(page)).toContainText('Plazo de pago terminado');
  await expect(card(page)).toContainText('hora de Lima, Perú');
  await noPaymentInvitation(page);
  const reviewButton = card(page).getByRole('button',{name:'Ya pagué: solicitar revisión'});
  expect(await reviewButton.locator('.v-btn__content').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await reviewButton.click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText(original.reference);
  await dialog.getByRole('textbox',{name:'Observación'}).fill('Ya pagué antes de ver el plazo. Revisar comprobante sintético.');
  await dialog.getByRole('button',{name:'Enviar solicitud'}).click();
  await expect(dialog).toContainText('Recibida');
  const requests=await db.collection('support_requests').where('requesterUid','==','patient-b').get();
  expect(requests.size).toBe(1);
  expect(requests.docs[0].data().paymentOperationId).toBe(id);
  expect(requests.docs[0].data().paymentReference).toBe(original.reference);
  expect((await ref.get()).data().status).toBe('pending');
  expect((await ref.get()).data().rateSnapshot).toEqual(original.rateSnapshot);
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await page.screenshot({path:info.outputPath('expired-payment-review.png'),fullPage:true,animations:'disabled'});
});

test('REV-PIL-01: deadline closes while mounted in a different device timezone',async({page})=>{
  await ref.update({expiresAt:adminFirestore.Timestamp.fromDate(new Date('2030-01-02T05:01:45Z'))});
  await page.clock.install({time:new Date('2030-01-02T04:59:45Z')});
  await login(page);
  await expect(card(page)).toContainText('2030-01-02 · 00:01 · hora de Lima, Perú');
  await expect(card(page).getByRole('link',{name:'Abrir Mercado Pago'})).toBeVisible();
  await expect(card(page).getByRole('button',{name:'Ya realicé el pago',exact:true})).toBeEnabled();
  await page.clock.fastForward(121000);
  await expect(card(page)).toContainText('Plazo de pago terminado');
  await noPaymentInvitation(page);
  expect((await ref.get()).data().status).toBe('pending');
  expect((await ref.get()).data().rateSnapshot).toEqual(original.rateSnapshot);
});

test('REV-PIL-01: missing or malformed deadlines require review',async({page})=>{
  await ref.update({expiresAt:null});
  await login(page);
  for(const expiresAt of [null,'invalid',{seconds:'invalid'}]) {
    await ref.update({expiresAt});
    await expect(card(page)).toContainText('Plazo por revisar');
    await expect(card(page)).toContainText('Plazo de pago no verificable');
    await noPaymentInvitation(page);
    await expect(card(page).getByRole('button',{name:'Ya pagué: solicitar revisión'})).toBeVisible();
  }
});

test('REV-PIL-01: submitted policy and terminal states never invite a second payment',async({page})=>{
  await ref.update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-60000),status:'submitted'});
  await login(page);
  await expect(card(page)).toContainText('conserva el aviso para revisión');
  await noPaymentInvitation(page);
  await ref.update({'rateSnapshot.commercialPolicy.submittedExpiration':'expire'});
  await expect(card(page)).toContainText('permite su vencimiento mediante revisión administrativa');
  await noPaymentInvitation(page);
  expect((await ref.get()).data().status).toBe('submitted');
  for (const [status,label] of Object.entries({confirmed:'Pago confirmado',expired:'Operación vencida',cancelled:'Operación cancelada',rejected:'Pago rechazado',refund_review:'Devolución en revisión',refunded:'Devolución registrada'})) {
    await ref.update({status});
    await expect(card(page)).toContainText(label);
    await noPaymentInvitation(page);
    await expect(card(page).getByRole('button',{name:'Solicitar revisión de devolución'})).toHaveCount(status==='confirmed'?1:0);
    expect((await ref.get()).data().status).toBe(status);
  }
});

test('REV-PIL-01: changing accounts closes payment support and discards the previous draft',async({page})=>{
  await ref.update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-60000)});
  await login(page);
  await card(page).getByRole('button',{name:'Ya pagué: solicitar revisión'}).click();
  await page.getByRole('dialog').getByRole('textbox',{name:'Observación'}).fill('Borrador privado del paciente anterior');
  await page.evaluate(async password=>{
    const appPath='/src/plugins/Firebase/firebase.js';
    const sdkPath='/node_modules/.vite/deps/firebase_auth.js';
    const {auth}=await import(appPath);
    const {signInWithEmailAndPassword}=await import(sdkPath);
    await signInWithEmailAndPassword(auth,'patient-c@example.test',password);
  },password);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.payment-operation')).toHaveCount(0);
  await expect(page.getByText('Borrador privado del paciente anterior')).toHaveCount(0);
  expect((await db.collection('support_requests').get()).size).toBe(0);
});
