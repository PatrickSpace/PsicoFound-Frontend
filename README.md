# Lurems (PsicoFound)

Vue 3 + Vuetify + Pinia en `src/`; backend Firebase en `functions/`.
La encuesta estructura el perfil con Gemini; el matching deterministico vive
solo en Functions. Firestore conserva perfiles, sesiones y catalogo de tarifas.

## Desarrollo

Requisitos: Node.js 22.20 o posterior compatible con Node 22 y npm.
Firebase CLI 15.15.0; Java 21 para las pruebas con emulador.

```sh
npm ci
npm --prefix functions ci
npm install --global firebase-tools@15.15.0
```

Configura `.env` segun `.env.example` con el proyecto Firebase de desarrollo.
Las claves `VITE_` son publicas: no incluir secretos de proveedores.
Para Functions, ver `functions/.env.example`. En produccion Gemini usa Secret
Manager (`firebase functions:secrets:set GEMINI_API_KEY`).

```sh
npm run dev
```

Servidor limitado a `http://127.0.0.1:5173` por defecto. Para probar desde otro
dispositivo de confianza: `npm run dev -- --host 0.0.0.0`. No exponerlo a Internet.
El frontend de desarrollo conecta al proyecto indicado en `.env`; no crea un
entorno aislado automaticamente. Las pruebas unitarias no acceden a produccion.

## Validacion

```sh
npm test
npm run test:backend
npm run lint:backend
npm run audit:unused
npm run audit:unused -- --production --include files,dependencies,unlisted,unresolved,binaries
npm run build
npm run test:payment-rules
```

`npm test` cubre dominio frontend: perfiles, roles, importes y temporizadores.
Backend cubre perfiles, matching, proveedores, reinicio, onboarding y tarifas.
`test:payment-rules` usa exclusivamente `demo-lurems-rates` y un emulador local;
comprueba permisos, concurrencia, historial y reinicio persistente de encuesta.
No utiliza credenciales reales ni llama a proveedores de IA/pagos.

Knip revisa archivos, exports y dependencias de los dos proyectos. Las Functions
exportadas desde `functions/index.js` son entradas publicas, no codigo muerto.
El test de emulador usa el SDK Admin de `functions/node_modules`; la excepcion
puntual esta explicada en `knip.jsonc`. No ignorar carpetas completas para hacer
pasar el analizador. CI ejecuta estas mismas comprobaciones sin despliegue.
El segundo analisis comprueba archivos/imports/dependencias de runtime; el
primero tambien comprueba exports y tests. No eliminar los exports usados por
tests solo porque no aparecen al excluirlos con `--production`. Las entradas
con `!` son deliberadas para ese modo, aunque Knip avise de redundancia con
las entradas que descubre automaticamente en el analisis completo.

Si Firebase CLI informa `Timed out` despues de `Script exited successfully`,
revisar `firebase-debug.log`. En esta auditoria fue el envio de telemetria del
CLI, no las pruebas. Se verifico tambien con configuracion temporal aislada:

```sh
XDG_CONFIG_HOME="$(mktemp -d)" npm run test:payment-rules
```

Este comando no cambia la configuracion ni la sesion Firebase habitual.

Auditoria de paquetes (no confundir avisos de dependencias con explotabilidad):

```sh
npm audit
npm --prefix functions audit
```

No usar `npm audit fix --force`: puede degradar Firebase o migrar el bundler.
Las excepciones y migraciones pendientes estan en el informe de auditoria.

## Publicacion

```sh
npm run build
firebase deploy --only hosting --project psicosaas-3c819
```

Desplegar solo las Functions modificadas y, si corresponde, las reglas:

```sh
firebase deploy --only functions:savePaymentRate,functions:setPsychologistPaymentRate,firestore:rules --project psicosaas-3c819
```

No ejecutar `firebase deploy` sin `--only` por rutina. No borrar Functions,
colecciones ni historiales basandose unicamente en el analisis estatico.

## Documentacion

- [Publicacion y pendientes para lanzamiento](docs/audits/2026-10-03-launch-readiness.md)
- [Auditoria y plan ejecutado](docs/audits/2026-09-30-technical-debt.md)
- [Tarifas y reparto 70/30, fase 1](docs/payments/rate-catalog.md)
- [Registro y onboarding](docs/architecture/registration-onboarding.md)
- [Contrato de proveedores IA](docs/architecture/ai-provider-abstraction.md)

Pagos fase 1 configura links y tarifa profesional; no confirma pagos ni integra
todavia el cobro en reservas. No existe implementacion Culqi, OAuth o webhook de
pagos en esta version.
