import {test,expect} from '@playwright/test';
import {adminAuth,adminFirestore} from '../helpers/admin-sdk.mjs';
import {seedPatient,seedSlots,reserve,httpCall} from '../helpers/patient-http.mjs';
import {password} from '../helpers/followup-fixtures.mjs';
let db,app;
test.use({timezoneId:'Asia/Tokyo'});
test.beforeEach(async({context})=>{
 app=await seedPatient();db=adminFirestore.getFirestore(app);
 await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
async function login(page,uid='review-admin',path='/admin/usuarios'){
 await page.goto('/login');await page.getByRole('textbox',{name:'Correo',exact:true}).fill(`${uid}@example.test`);await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(password);await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).not.toHaveURL(/\/login/);await page.goto(path);
}
async function choice(page,label,title){await page.getByRole('combobox',{name:label,exact:true}).locator('..').click();await page.getByRole('option',{name:title,exact:true}).click();}
async function capture(page,info,name){
 await page.evaluate(async()=>{await Promise.allSettled(document.getAnimations().filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished));});
 await page.screenshot({path:info.outputPath(name),fullPage:true});
}
async function retrySave(page,callable,button,dialog=page.getByRole('dialog')){
 const pattern=`**/${callable}`;
 await page.route(pattern,route=>route.abort());await button.click();await expect(dialog.locator('.v-alert.bg-error, .v-alert.text-error').first()).toBeVisible();
 await page.unroute(pattern);await button.evaluate(element=>{element.click();element.click();});
}
async function changeAccount(page,uid){await page.evaluate(async({uid,password})=>{const {auth}=await import(['/src/plugins/Firebase/firebase.js'][0]);const {signOut,signInWithEmailAndPassword}=await import(['/node_modules/.vite/deps/firebase_auth.js'][0]);await signOut(auth);await signInWithEmailAndPassword(auth,`${uid}@example.test`,password);},{uid,password});}
async function applicant(){return (await httpCall('C','submitPsychologistApplication',{professionalName:'Profesional C sintético',licenseNumber:'DECLARADA-C',country:'Perú',professionalSummary:'Solicitud ficticia para prueba de acceso',specialties:['Ansiedad'],approaches:['Humanista'],modalities:['Remoto']})).request.id;}
async function freshPage(browser,uid,path){const context=await browser.newContext();await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const page=await context.newPage();await login(page,uid,path);return {context,page};}

test('admin permissions: direct routes denied; account and view changes clear open forms',async({page})=>{
 await login(page,'patient-b','/admin/usuarios');await expect(page).not.toHaveURL(/\/admin\//);await expect(page.getByRole('heading',{name:'Usuarios y permisos'})).toHaveCount(0);
 await changeAccount(page,'professional-a');await page.goto('/admin/conciliacion');await expect(page).not.toHaveURL(/\/admin\//);
 await changeAccount(page,'review-admin');await page.goto('/admin/usuarios');await page.getByRole('row').filter({hasText:'patient-b'}).getByRole('button',{name:'Editar usuario'}).click();await expect(page.getByRole('dialog')).toContainText('patient-b');
 await changeAccount(page,'patient-c');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('main')).not.toContainText('patient-b');
 await db.doc('users/review-admin').update({roles:['admin','patient']});await changeAccount(page,'review-admin');await page.goto('/admin/usuarios');await page.getByRole('row').filter({hasText:'patient-b'}).getByRole('button',{name:'Editar usuario'}).click();
 await page.evaluate(async()=>{const {useAppContextStore}=await import(['/src/store/appContext.js'][0]);useAppContextStore().setActiveMode('patient');});
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('main')).not.toContainText('patient-b');
});

test('admin approves a professional and applicant gets effective access after reload and new login',async({page,browser},info)=>{
 const id=await applicant();await login(page,'review-admin','/admin/solicitudes-psicologos');await page.getByRole('button',{name:'Revisar solicitud',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('DECLARADA-C');await choice(page,'Decisión','Aprobar');await dialog.getByRole('checkbox',{name:'Confirmo la decisión sobre esta solicitud'}).check();await retrySave(page,'reviewPsychologistApplication',dialog.getByRole('button',{name:'Guardar decisión'}));await expect(dialog).toHaveCount(0);await expect(page.getByRole('row').filter({hasText:'Profesional C sintético'})).toContainText('approved');await page.reload();await expect(page.getByRole('row').filter({hasText:'Profesional C sintético'})).toContainText('approved');
 expect((await db.doc(`psychologist_requests/${id}`).get()).data().status).toBe('approved');
 const other=await freshPage(browser,'patient-c','/psicologo/sesiones');await expect(other.page).toHaveURL(/\/psicologo\/sesiones/);await expect(other.page.locator('.layout-shell')).toHaveAttribute('data-user-role','psychologist');await other.page.reload();await expect(other.page.locator('.layout-shell')).toHaveAttribute('data-user-role','psychologist');await other.context.close();
 await capture(page,info,'admin-approved.png');
});

test('admin rejects with a reason; requester sees reason and can correct their application',async({page,browser})=>{
 await applicant();await login(page,'review-admin','/admin/solicitudes-psicologos');await page.getByRole('button',{name:'Revisar solicitud',exact:true}).click();await choice(page,'Decisión','Rechazar');const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Motivo del rechazo visible para el solicitante'}).fill('Completa el resumen declarado para revisión sintética.');await dialog.getByRole('checkbox',{name:'Confirmo la decisión sobre esta solicitud'}).check();await dialog.getByRole('button',{name:'Guardar decisión'}).click();await expect(dialog).toHaveCount(0);
 const other=await freshPage(browser,'patient-c','/onboarding/psicologo');await expect(other.page.locator('main')).toContainText('Completa el resumen declarado');await other.page.goto('/psicologo/sesiones');await expect(other.page).not.toHaveURL(/\/psicologo\/sesiones/);await other.context.close();
});

test('admin user edits persist to patient UI; failed save retains form and permits retry',async({page,browser},info)=>{
 await login(page);const row=page.getByRole('row').filter({hasText:'patient-b'});await row.getByRole('button',{name:'Editar usuario'}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Nombre',exact:true}).fill('Paciente B editado por administración');await dialog.getByRole('checkbox',{name:'Confirmo los datos y permisos que se guardarán'}).check();
 await page.route('**/updateUserByAdmin',route=>route.abort());await dialog.getByRole('button',{name:'Guardar cambios'}).click();await expect(dialog.locator('.v-alert')).toBeVisible();await page.unroute('**/updateUserByAdmin');await dialog.getByRole('button',{name:'Guardar cambios'}).click();await expect(dialog).toHaveCount(0);await page.reload();await expect(row).toContainText('Paciente B editado por administración');
 expect((await adminAuth.getAuth(app).getUser('patient-b')).email).toBe('patient-b@example.test');
 const other=await freshPage(browser,'patient-b','/configuracion');await expect(other.page.locator('main')).toContainText('Paciente B editado por administración');await other.context.close();
 await row.getByRole('button',{name:'Editar usuario'}).click();await expect(dialog).toContainText('user_updated');await capture(page,info,'admin-user-audit.png');
});

test('admin expires a pending reservation from its queue; patient sees closed payment and professional slot is released',async({page,browser},info)=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;await db.doc(`payment_operations/${id}`).update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-60000)});
 await login(page,'review-admin','/admin/conciliacion');await page.getByRole('button',{name:'Revisar operación'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('hora de Lima');await choice(page,'Acción de conciliación','Vencer y liberar reserva');await dialog.getByRole('textbox',{name:'Evidencia o motivo de la decisión'}).fill('Cola sintética sin pago acreditado');await dialog.getByRole('checkbox',{name:'Revisé los comprobantes, el soporte y las condiciones capturadas'}).check();await retrySave(page,'expirePaymentReservation',dialog.getByRole('button',{name:'Confirmar conciliación'}));await expect(dialog).toContainText('Vencido');
 expect((await db.doc('therapist_availability/review-ten').get()).data().status).toBe('available');expect((await db.doc(`citas/${id}`).get()).data().estado).toBe('cancelada');
 const other=await freshPage(browser,'patient-b','/sesiones');await expect(other.page.locator('.payment-operation')).toContainText('Operación vencida');await other.context.close();await capture(page,info,'admin-expired.png');
});

test('admin reconciles, records a verified transfer, then records refund and sees recovery review',async({page,browser},info)=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;await httpCall('B','markPaymentSubmitted',{operationId:id});await login(page,'review-admin','/admin/conciliacion');await page.getByRole('button',{name:'Revisar operación'}).click();const dialog=page.getByRole('dialog');await choice(page,'Acción de conciliación','Confirmado');await dialog.getByRole('textbox',{name:'Referencia verificable del proveedor'}).fill('SYNTHETIC-RECEIPT');await dialog.getByRole('textbox',{name:'Evidencia o motivo de la decisión'}).fill('Comprobante ficticio verificado');await dialog.getByRole('checkbox',{name:'Revisé los comprobantes, el soporte y las condiciones capturadas'}).check();await retrySave(page,'reviewPaymentOperation',dialog.getByRole('button',{name:'Confirmar conciliación'}));await expect(dialog).toContainText('Calculado:');
 await dialog.getByRole('textbox',{name:'Importe transferido',exact:true}).fill('10.00');await dialog.getByRole('textbox',{name:'Referencia única de transferencia externa'}).fill('SYNTHETIC-TRANSFER');await dialog.getByRole('checkbox',{name:'Verifiqué externamente la transferencia, su importe, moneda y destinatario'}).check();await retrySave(page,'recordProfessionalTransfer',dialog.getByRole('button',{name:'Registrar transferencia realizada'}));await expect(dialog).toContainText('SYNTHETIC-TRANSFER');expect((await db.doc(`professional_obligations/${id}`).get()).data().pendingMinor).toBe(7400);
 const other=await freshPage(browser,'patient-b','/sesiones');await expect(other.page.locator('.payment-operation')).toContainText('Pago confirmado');await other.context.close();
 await httpCall('B','requestPaymentRefundReview',{operationId:id,reason:'Solicitud ficticia'});await expect(dialog.getByRole('button',{name:'Registrar transferencia realizada'})).toHaveCount(0);await choice(page,'Acción de conciliación','Devuelto');await dialog.getByRole('textbox',{name:'Referencia verificable del proveedor'}).fill('SYNTHETIC-REFUND');await dialog.getByRole('textbox',{name:'Evidencia o motivo de la decisión'}).fill('Devolución ficticia verificada externamente');await dialog.getByRole('checkbox',{name:'Revisé los comprobantes, el soporte y las condiciones capturadas'}).check();await dialog.getByRole('button',{name:'Confirmar conciliación'}).click();await expect(dialog).toContainText('Recuperación pendiente');await expect(dialog).toContainText('Comprobante del pago original: SYNTHETIC-RECEIPT');await expect(dialog).toContainText('Última referencia verificada: SYNTHETIC-REFUND');expect((await db.doc(`professional_obligations/${id}`).get()).data().status).toBe('recovery_review');await dialog.getByText('Recuperación pendiente de revisión',{exact:false}).scrollIntoViewIfNeeded();await capture(page,info,'admin-refund-recovery.png');
});

test('admin resolves linked late-payment support, patient sees reply, unrelated patient does not; deletion receipt is visible',async({page,browser},info)=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;await db.doc(`payment_operations/${id}`).update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-60000)});
 await httpCall('B','createSupportRequest',{requestId:'late-admin-browser',category:'error',message:'Revisar mi pago tardío sintético',paymentOperationId:id});await httpCall('B','requestAccountDeletion',{confirmation:'ELIMINAR MI CUENTA'});
 await login(page,'review-admin','/admin/soporte');await expect(page.locator('main')).toContainText('pending_policy');await page.getByRole('button',{name:'Revisar',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Pago vinculado:');await choice(page,'Nuevo estado','Resuelta');await dialog.getByRole('textbox',{name:'Respuesta visible para el usuario'}).fill('Solución comercial ficticia registrada. No se reactivó la reserva.');await dialog.getByRole('checkbox',{name:'Confirmo el envío de esta respuesta al titular'}).check();await retrySave(page,'respondSupportRequest',dialog.getByRole('button',{name:'Guardar y avisar'}));await expect(dialog).toHaveCount(0);await page.reload();await expect(page.locator('main')).toContainText('resolved');
 const other=await freshPage(browser,'patient-b','/configuracion');await other.page.getByRole('button',{name:'Enviar feedback',exact:true}).click();await other.page.getByRole('tab',{name:'Mis solicitudes'}).click();await expect(other.page.getByRole('dialog')).toContainText('Solución comercial ficticia registrada');await other.context.close();
 const stranger=await freshPage(browser,'patient-c','/configuracion');await stranger.page.getByRole('button',{name:'Enviar feedback',exact:true}).click();await stranger.page.getByRole('tab',{name:'Mis solicitudes'}).click();await expect(stranger.page.getByRole('dialog')).not.toContainText('Solución comercial ficticia registrada');await stranger.context.close();await capture(page,info,'admin-support-privacy.png');
});

test('admin tariff edits preserve historical reservations and professional selection changes new quotes',async({page,browser})=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;const original=(await db.doc(`payment_operations/${id}`).get()).data();
 await login(page,'review-admin','/admin/cobros');await page.getByRole('button',{name:'Nueva tarifa'}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Nombre de la tarifa'}).fill('Tarifa piloto nueva');await dialog.getByRole('textbox',{name:'Importe por sesión'}).fill('130.01');await dialog.getByRole('textbox',{name:'Link de Mercado Pago'}).fill('https://mpago.la/synthetic-admin');await dialog.getByRole('checkbox',{name:'Identificar como tarifa de prueba'}).check();await retrySave(page,'savePaymentRate',dialog.getByRole('button',{name:'Guardar tarifa'}));await expect(dialog).toHaveCount(0);await expect(page.locator('.rate-card').filter({hasText:'Tarifa piloto nueva'})).toBeVisible();
 const rate=(await db.collection('payment_rates').where('name','==','Tarifa piloto nueva').get()).docs[0];
 await httpCall('A','setPsychologistPaymentRate',{therapistId:'therapist-a',rateId:rate.id,expectedRateVersion:1,expectedSelectionVersion:1});
 expect((await httpCall('B','getBookingQuote',{therapistId:'therapist-a'})).amountMinor).toBe(13001);expect((await db.doc(`payment_operations/${id}`).get()).data().rateSnapshot).toEqual(original.rateSnapshot);
 const card=page.locator('.rate-card').filter({hasText:'Tarifa piloto nueva'});await card.getByRole('button',{name:'Editar tarifa'}).click();await dialog.getByRole('textbox',{name:'Nombre de la tarifa'}).fill('Tarifa piloto revisada');await dialog.getByRole('button',{name:'Guardar tarifa'}).click();await expect(dialog).toHaveCount(0);
 const edited=page.locator('.rate-card').filter({hasText:'Tarifa piloto revisada'});await edited.getByRole('button',{name:'Ver historial de tarifa'}).click();await expect(dialog).toContainText('Versión 2');await expect(dialog).toContainText('hora de Lima');await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();await edited.getByRole('checkbox').click();await dialog.getByRole('button',{name:'Confirmar estado',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(edited).toContainText('Inactiva');await expect(httpCall('B','getBookingQuote',{therapistId:'therapist-a'})).rejects.toMatchObject({code:'failed-precondition'});
 const other=await freshPage(browser,'patient-b','/sesiones');await expect(other.page.locator('.payment-operation')).toContainText('120.00');await other.context.close();
});

test('admin edits professional directory and deactivates access; role revocation clears operational UI',async({page,browser})=>{
 await login(page,'review-admin','/psicologos');await page.getByRole('row').filter({hasText:'professional-a'}).getByRole('button',{name:'Editar profesional'}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Nombre profesional'}).fill('Profesional actualizado');await dialog.getByRole('combobox',{name:'Enfoques',exact:true}).fill('Humanista');await dialog.getByRole('combobox',{name:'Enfoques',exact:true}).press('Enter');await dialog.getByRole('checkbox',{name:'Confirmo la edición y el estado profesional'}).check();await retrySave(page,'updateProfessionalByAdmin',dialog.getByRole('button',{name:'Guardar profesional'}));await expect(dialog).toHaveCount(0);
 const other=await freshPage(browser,'professional-a','/configuracion');await expect(other.page.locator('main')).toContainText('Profesional actualizado');
 await page.getByRole('row').filter({hasText:'professional-a'}).getByRole('button',{name:'Editar profesional'}).click();await dialog.getByRole('checkbox',{name:'Perfil activo'}).uncheck();await dialog.getByRole('checkbox',{name:'Confirmo la edición y el estado profesional'}).check();await dialog.getByRole('button',{name:'Guardar profesional'}).click();await expect(dialog).toHaveCount(0);await other.page.goto('/psicologo/sesiones');await expect(other.page).not.toHaveURL(/\/psicologo\/sesiones/);await other.context.close();
 await page.goto('/admin/usuarios');await page.getByRole('row').filter({hasText:'patient-b'}).getByRole('button',{name:'Editar usuario'}).click();await db.doc('users/review-admin').update({roles:['patient'],rol:'patient'});await expect(dialog).toHaveCount(0);await expect(page.locator('main')).not.toContainText('patient-b');
});

test('admin delayed account-request response is discarded after changing the signed-in account',async({page})=>{
 await httpCall('B','requestAccountDeletion',{confirmation:'ELIMINAR MI CUENTA'});
 let release;const gate=new Promise(resolve=>release=resolve);let started=false;
 await page.route('**/getAdministrativeAccountRequests',async route=>{const reply=await route.fetch();started=true;await gate;await route.fulfill({response:reply});});
 await login(page,'review-admin','/admin/soporte');await expect.poll(()=>started).toBe(true);
 await changeAccount(page,'patient-c');release();await expect(page.locator('main')).not.toContainText('patient-b');await expect(page.getByRole('button',{name:'Guardar y avisar'})).toHaveCount(0);
});


test('admin queues provide empty search/filter results and can reload without stale selections',async({page})=>{
 await login(page);
 const queues=[['/admin/usuarios','Buscar por nombre, correo, UID o rol','No hay cuentas para estos filtros.'],['/psicologos','Buscar profesional, UID o especialidad','No hay profesionales para estos filtros.'],['/admin/solicitudes-psicologos','Buscar solicitante, correo o colegiatura','No hay solicitudes para estos filtros.'],['/admin/conciliacion','Buscar referencia, operación, paciente o profesional','No hay operaciones para estos filtros.'],['/admin/soporte','Buscar usuario, mensaje o referencia de pago','No hay solicitudes para estos filtros.']];
 for(const [path,label,message] of queues){
  await page.goto(path);await page.getByRole('textbox',{name:label,exact:true}).fill('NO-MATCH-SYNTHETIC');await expect(page.locator('main')).toContainText(message);
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(page.getByRole('textbox',{name:label,exact:true})).toHaveValue('');await expect(page.getByRole('dialog')).toHaveCount(0);
 }
 await page.goto('/admin/cobros');await choice(page,'Estado','Inactivas');await expect(page.locator('main')).toContainText('No hay tarifas en este estado');await choice(page,'Estado','Activas');await expect(page.locator('.rate-card').first()).toBeVisible();await page.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(page.locator('.rate-card').first()).toBeVisible();
});

test('admin payment context has a retry and completed appointments never offer release actions',async({page})=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;await db.doc(`citas/${id}`).update({estado:'realizada'});await db.doc(`payment_operations/${id}`).update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-60000)});
 await login(page,'review-admin','/admin/conciliacion');await page.route('**/getPaymentOperationContext',route=>route.abort());await page.getByRole('button',{name:'Revisar operación'}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Reintentar contexto'})).toBeVisible();await expect(dialog.getByRole('combobox',{name:'Acción de conciliación'})).toHaveCount(0);
 await page.unroute('**/getPaymentOperationContext');await dialog.getByRole('button',{name:'Reintentar contexto'}).click();await expect(dialog).toContainText('realizada');await expect(dialog.getByRole('button',{name:'Reintentar contexto'})).toHaveCount(0);await expect(dialog.getByRole('combobox',{name:'Acción de conciliación'})).toHaveCount(0);
 await expect(httpCall('review-admin','expirePaymentReservation',{operationId:id})).rejects.toMatchObject({code:'failed-precondition'});expect((await db.doc('therapist_availability/review-ten').get()).data().status).toBe('booked');
});
