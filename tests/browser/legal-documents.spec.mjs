import {test,expect} from '@playwright/test';
import {adminFirestore} from '../helpers/admin-sdk.mjs';
import {seedPatient,httpCall} from '../helpers/patient-http.mjs';
import {password} from '../helpers/followup-fixtures.mjs';
let db;
test.beforeEach(async({context})=>{
 db=adminFirestore.getFirestore(await seedPatient());
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
async function login(page,uid='review-admin',path='/admin/documentos-legales'){
 await page.goto('/login');await page.getByRole('textbox',{name:'Correo',exact:true}).fill(`${uid}@example.test`);await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(password);await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).not.toHaveURL(/\/login/);await page.goto(path);
}
async function publish(page,version,terms,privacy){
 await page.getByRole('button',{name:'Nuevo borrador',exact:true}).click();
 await page.getByRole('textbox',{name:'Identificador de versión'}).fill(version);
 await page.getByRole('textbox',{name:'Contenido de términos de uso'}).fill(terms);
 await page.getByRole('tab',{name:'Privacidad',exact:true}).click();await page.getByRole('textbox',{name:'Contenido de política de privacidad'}).fill(privacy);
 await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();await expect(page.getByText('Borrador guardado. Todavía no es público.')).toBeVisible();
 await page.getByRole('button',{name:'Publicar versión',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Referencia de revisión o aprobación'}).fill('Revisión sintética de navegador');
 await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmar publicación',exact:true}).click();await expect(dialog).toBeHidden();await expect(page.getByText(`Versión ${version} publicada. Las versiones anteriores se conservan.`)).toBeVisible();
}
test('legal admin publishes both documents, creates a new version, and public history preserves original text',async({page},info)=>{
 await login(page);
 await publish(page,'browser-legal-v1','Términos versión original\nTexto de prueba <script>alert(1)</script>','Privacidad versión original');
 await page.getByRole('button',{name:'Crear nueva versión',exact:true}).last().click();
 await page.getByRole('textbox',{name:'Identificador de versión'}).fill('browser-legal-v2');
 await page.getByRole('textbox',{name:'Contenido de términos de uso'}).fill('Términos revisados');
 await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();await expect(page.getByText('Borrador guardado. Todavía no es público.')).toBeVisible();
 await page.getByRole('button',{name:'Publicar versión',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Referencia de revisión o aprobación'}).fill('Segunda revisión sintética');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmar publicación'}).click();await expect(dialog).toBeHidden();
 await page.getByRole('heading',{name:'Documentos legales',exact:true}).scrollIntoViewIfNeeded();
 await expect.poll(async()=>page.locator('.legal-admin').evaluate(el=>{const box=el.getBoundingClientRect();return box.x>=0 && box.right<=window.innerWidth+1;})).toBe(true);
 await page.evaluate(async()=>{await Promise.allSettled(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished));});
 await page.screenshot({path:info.outputPath(`legal-admin-${info.project.name}.png`),fullPage:true});
 await page.goto('/terminos?version=browser-legal-v1');await expect(page.locator('.legal-text')).toContainText('Términos versión original');await expect(page.locator('.legal-text')).toContainText('<script>alert(1)</script>');await expect(page.getByText('Versión histórica.',{exact:false})).toBeVisible();
 await page.goto('/terminos');await expect(page.locator('.legal-text')).toHaveText('Términos revisados');
 await page.goto('/privacidad');await expect(page.locator('.legal-text')).toHaveText('Privacidad versión original');
 await page.goto('/terminos?version=missing');await expect(page.getByRole('alert')).toContainText('No pudimos cargar esta versión');
 expect((await db.collection('legal_releases').get()).size).toBe(2);
});
test('legal admin draft is private, recoverable after reload, and unavailable to patients',async({page})=>{
 await login(page);await page.getByRole('button',{name:'Nuevo borrador',exact:true}).click();
 await page.getByRole('textbox',{name:'Identificador de versión'}).fill('incomplete');await page.getByRole('tab',{name:'Privacidad',exact:true}).click();await page.getByRole('textbox',{name:'Contenido de política de privacidad'}).fill('');await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();await expect(page.getByText('Borrador guardado. Todavía no es público.')).toBeVisible();await expect(page.getByRole('button',{name:'Publicar versión',exact:true})).toBeDisabled();
 await page.reload();await page.getByRole('button',{name:'Editar borrador'}).click();await expect(page.getByRole('textbox',{name:'Identificador de versión'})).toHaveValue('incomplete');
 await page.goto('/terminos?version=incomplete');await expect(page.getByRole('alert')).toContainText('No pudimos cargar esta versión');
 await page.goto('/');await page.evaluate(async()=>{const {auth}=await import(['/src/plugins/Firebase/firebase.js'][0]);const {signOut}=await import(['/node_modules/.vite/deps/firebase_auth.js'][0]);await signOut(auth);});
 await login(page,'patient-b');await expect(page.getByRole('heading',{name:'Documentos legales',exact:true})).toHaveCount(0);await expect(page).not.toHaveURL(/\/admin\/documentos-legales/);
});
test('published legal documents are accessible before login and linked to registration',async({page})=>{
 await httpCall('review-admin','saveLegalDraft',{id:'public-one',version:'public-v1',termsText:'Términos públicos',privacyText:'Privacidad pública',expectedRevision:0});
 await httpCall('review-admin','publishLegalDraft',{id:'public-one',expectedRevision:1,expectedCurrentVersion:'review-2026-10-06',confirmReviewed:true,approvalReference:'Prueba local'});
 await page.goto('/registro');await expect(page.getByRole('link',{name:'términos de uso',exact:true})).toHaveAttribute('href','https://app.lurems.lat/terminos?version=public-v1');
 await page.goto('/privacidad?version=public-v1');await expect(page.locator('.legal-text')).toHaveText('Privacidad pública');
});
