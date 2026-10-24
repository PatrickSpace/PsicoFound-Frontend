import {test,expect} from '@playwright/test';
import {adminFirestore} from '../helpers/admin-sdk.mjs';
import {seedPatient,httpCall,seedSlots} from '../helpers/patient-http.mjs';
import {password} from '../helpers/followup-fixtures.mjs';
let db;
test.beforeEach(async ({context}) => {
  db=adminFirestore.getFirestore(await seedPatient());
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
async function login(page,target='/encuesta') {
  await page.goto('/login');
  await page.getByRole('textbox',{name:'Correo',exact:true}).fill('patient-b@example.test');
  await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(password);
  await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login/); await page.goto(target);
}
async function send(page,message) {
  await page.getByPlaceholder('Escribe cómo te sientes...').fill(message);
  const response=page.waitForResponse(r=>r.url().endsWith('/sendProfileChatMessage'));
  await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
  return response;
}
test('B-02/F-01: guided options, reload and reset preserve authoritative session',async ({page})=>{
  await httpCall('B','resetProfileChatConversation',{requestId:'browser-reset-initial'});
  await login(page);
  await expect(page.getByRole('button',{name:'Solo conversar',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Solo conversar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Online',exact:true})).toBeVisible();
  await send(page,'No sé');
  const before=(await db.doc('conversations/patient-b').get()).data();
  await page.reload();
  await expect(page.getByRole('button',{name:'Online',exact:true})).toBeVisible();
  expect((await db.doc('conversations/patient-b').get()).data().activeSessionId).toBe(before.activeSessionId);
  await page.getByRole('button',{name:'Reiniciar',exact:true}).click();
  await page.getByRole('button',{name:'Reiniciar encuesta',exact:true}).click();
  await expect.poll(async()=>(await db.doc('conversations/patient-b').get()).data().activeSessionId).not.toBe(before.activeSessionId);
  await expect(page.getByText('No sé',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Solo conversar',exact:true})).toBeVisible();
});
test('B-03/C-01: quota error keeps independent help accessible',async ({page})=>{
  await httpCall('B','resetProfileChatConversation',{requestId:'browser-quota-reset'});
  await db.doc('profile_chat_quotas/patient-b').set({day:new Date().toISOString().slice(0,10),count:40,leaseUntil:0});
  await login(page);
  expect((await send(page,'hola')).status()).toBe(429);
  await expect(page.getByRole('button',{name:'Reintentar sin duplicar'})).toBeVisible();
  await page.getByRole('link',{name:'Consultar recursos de ayuda'}).click();
  await expect(page.getByRole('link',{name:'Llamar al 113'})).toBeVisible();
  await expect(page).toHaveURL(/crisis=1/);
});
test('F-02: all unread notifications, same-route opening and retry after permission error',async ({page})=>{
  const batch=db.batch();
  for(let i=0;i<25;i++) batch.set(db.doc(`notifications/many-${i}`),{recipientUid:'patient-b',actorUid:'system',type:'general',
    title:`Aviso sintético ${i}`,message:'Datos ficticios',route:'/sesiones',readAt:null,createdAt:adminFirestore.Timestamp.fromMillis(Date.now()+i)});
  await batch.commit(); await login(page,'/sesiones');
  await expect(page.locator('.v-badge__badge')).toHaveText('25');
  await page.getByRole('button',{name:'Notificaciones',exact:true}).click();
  await page.getByText('Aviso sintético 24',{exact:true}).click();
  await expect(page).toHaveURL(/notification=many-24/);
  await expect.poll(async()=>(await db.doc('notifications/many-24').get()).data().readAt!==null).toBe(true);
  await expect(page.locator('.v-badge__badge')).toHaveText('24');
  // A real rules rejection terminates the listener; the UI must resubscribe.
  await db.doc('runtime_controls/maintenance').set({enabled:true});
  await db.doc('notifications/many-24').update({message:'Forzar una nueva evaluación de permisos'});
  await page.getByRole('button',{name:'Notificaciones',exact:true}).click();
  await expect(page.getByText('No pudimos actualizar los avisos.',{exact:false})).toBeVisible();
  await db.doc('runtime_controls/maintenance').set({enabled:false});
  await page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await expect(page.getByText('Aviso sintético 24',{exact:true})).toBeVisible();
});

test('B-02: bounded history pages retrieve previous messages without extending provider context',async({page})=>{
  const reset=await httpCall('B','resetProfileChatConversation',{requestId:'paged-history-reset'});
  const batch=db.batch();
  for(let i=0;i<130;i++)batch.set(db.doc(`conversations/patient-b/messages/page-${String(i).padStart(3,'0')}`),{
    sessionId:reset.activeSessionId,role:'user',text:`Mensaje paginado ${i}`,createdAt:adminFirestore.Timestamp.fromMillis(Date.now()+i)});
  await batch.commit();await login(page);
  await expect(page.getByText('Mensaje paginado 129',{exact:true})).toBeVisible();
  await expect(page.getByText('Mensaje paginado 0',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Cargar mensajes anteriores',exact:true}).click();
  await expect(page.getByText('Mensaje paginado 0',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Cargar mensajes anteriores',exact:true})).toHaveCount(0);
});


test('B-04: guided survey records all answers and confirms the summary',async ({page},info)=>{
  await db.doc('conversations/patient-b').delete();
  await db.doc('profiles/patient-b').delete();
  await seedSlots(db);
  await page.route('**/getAccountAccessStatus',async route=>{
    const response=await route.fetch();
    const payload=await response.json();
    payload.result.survey={inputMode:'guided'};
    await route.fulfill({response,json:payload});
  });
  await login(page);
  await expect(page.getByText('Encuesta guiada',{exact:true})).toBeVisible();
  await expect(page.getByPlaceholder('Escribe cómo te sientes...')).toHaveCount(0);
  await page.getByRole('button',{name:'Ansiedad',exact:true}).click();
  await expect(page.getByRole('button',{name:'Online',exact:true})).toBeVisible();
  const first=(await db.doc('conversations/patient-b').get()).data();
  await page.reload();
  await expect(page.getByRole('button',{name:'Online',exact:true})).toBeVisible();
  expect((await db.doc('conversations/patient-b').get()).data().activeSessionId).toBe(first.activeSessionId);
  await page.getByRole('button',{name:'Online',exact:true}).click();
  await page.getByRole('button',{name:'Me da igual',exact:true}).click();
  await page.getByRole('button',{name:'Me da igual',exact:true}).click();
  await page.getByRole('button',{name:'Me da igual',exact:true}).click();
  await expect(page.getByRole('button',{name:'Revisar resumen',exact:true})).toBeVisible();
  const summary=page.getByRole('dialog');
  await expect(summary).toBeVisible();
  await expect(summary.getByText('Revisa tu resumen',{exact:true})).toBeVisible();
  await summary.getByRole('button',{name:'Confirmar y ver psicólogos',exact:true}).click();
  await expect(page).toHaveURL(/\/elegirterapeuta/);
  await expect(page.getByText('Psicólogos afines a tu perfil',{exact:true})).toBeVisible();
  const profile=(await db.doc('profiles/patient-b').get()).data();
  expect(profile.completado).toBe(true);
  expect(profile.summaryConfirmed).toBe(true);
  for(const field of ['preferenciaGenero','preferenciaEdad','enfoque'])expect(profile[field]).toBe('indiferente');
  await page.screenshot({path:`test-results/survey-guided-${info.project.name}.png`,fullPage:true});
});
