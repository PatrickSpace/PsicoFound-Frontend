// Explicit operator command; no Firestore or Auth mutations outside the existing callables.
// Credentials stay in a private local file and never appear in output or command arguments.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const operations = new Set(['diagnoseAccountDeletion', 'authorizeAccountDeletion', 'executeAccountDeletion']);
export function preparePrivacyRequest(plan, credentials) {
  if (!plan || !operations.has(plan.operation) || !/^[a-z][a-z0-9-]{4,60}$/.test(plan.projectId || '') ||
      plan.region !== 'southamerica-east1' || !plan.data || typeof plan.data !== 'object') {
    throw new Error('Indica proyecto, región, operación de privacidad y datos revisados.');
  }
  if (!credentials?.idToken || typeof credentials.idToken !== 'string' || /[\r\n]/.test(credentials.idToken)) {
    throw new Error('Falta el ID token de la sesión reciente del operador.');
  }
  const demo = plan.emulator === true;
  if (demo && !plan.projectId.startsWith('demo-')) throw new Error('El emulador solo admite proyectos demo.');
  if (!demo && (plan.projectId.startsWith('demo-') || !credentials.appCheckToken || !plan.environmentAuthorization)) {
    throw new Error('El entorno remoto exige referencia de autorización y App Check, además de la sesión del operador.');
  }
  const base = demo ? `http://127.0.0.1:5001/${plan.projectId}/${plan.region}` :
    `https://${plan.region}-${plan.projectId}.cloudfunctions.net`;
  return {
    url: `${base}/${plan.operation}`,
    options: {method: 'POST', headers: {'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.idToken}`,
      ...(credentials.appCheckToken ? {'X-Firebase-AppCheck': credentials.appCheckToken} : {})},
    body: JSON.stringify({data: plan.data})},
  };
}
export async function runPrivacyRequest(plan, credentials, request = fetch) {
  const {url, options} = preparePrivacyRequest(plan, credentials);
  const response = await request(url, options);
  const payload = await response.json();
  if (!response.ok || payload.error) {
    // Do not echo request options, credentials or arbitrary transport error objects.
    throw new Error(payload.error?.message || 'La operación no se completó. Revisa el estado antes de reintentar.');
  }
  return payload.result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Uso: node scripts/privacy-operator.mjs plan.local.json sesion.local.json');
    const plan = JSON.parse(await readFile(process.argv[2], 'utf8'));
    const session = JSON.parse(await readFile(process.argv[3], 'utf8'));
    const result = await runPrivacyRequest(plan, session);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
