# Despliegue y regresión de optimizaciones — 31/10/2026

Proyecto: `psicosaas-3c819`. Hosting: `luremsapp` / `app.lurems.lat`.
Región: `southamerica-east1`. Fecha de referencia: America/Lima.

## Alcance autorizado y candidato

El usuario autorizó desplegar la entrega completa de optimizaciones y probar las
funcionalidades. Posteriormente aprobó USD 50 mensuales de IA, 20 inferencias por
encuesta y hasta diez encuestas por cuenta, y autorizó la excepción de coordinación
para ajustar IA/chat y corregir lo necesario para publicar.

Se congeló una copia del candidato en `/tmp/psico-release-20261031` para preservar
el trabajo concurrente de otros chats. Incluye las optimizaciones de frontend,
backend e IA, los límites aprobados y las correcciones encontradas durante la
regresión. Los cambios posteriores de automatización de Mercado Pago, nuevos jobs
administrativos y vencimiento automático quedan fuera de esta entrega: no se
publica trabajo financiero que seguía en edición durante la validación.

El candidato local no se identifica con el SHA antiguo `4896783`: contiene cambios
sin commit posteriores. Los hashes de la copia probada quedan en los artefactos
locales; una prueba de esta copia no acredita archivos que otros chats sigan
modificando después. Esta entrega no ejecuta commit/push ni presume CI remoto verde.

## Cambios adicionales necesarios para publicar

- Presupuesto de IA de aplicación de USD 50 por mes calendario de Lima, renovado
  por la política en cada cambio de mes, con ledgers separados y acumulados
  conservados. No cambia Cloud Billing ni el plan del proveedor. La estimación del
  código no constituye un límite monetario del proveedor.
- Máximo de 20 inferencias por sesión y 200 acumuladas por cuenta. Diez intentos
  totales, comprobados en la misma transacción de inicio/reinicio; repetición
  idempotente y reapertura de sesión no consumen otro intento. Una sesión heredada
  sin contador cuenta como primer intento; el historial anterior de inferencias
  no se inventa. Los contadores por cuenta no se renuevan mensualmente.
- ESLint migrado a configuración plana y versión compatible con Node 22; se
  conservan las reglas de estilo de Google y el tratamiento previo de argumentos
  y excepciones no utilizados. Se actualizan dependencias transitivas vulnerables
  mediante overrides acotados y se elimina la dependencia MDI completa sin uso,
  conservando el subconjunto local de iconos del frontend.
- El listener de documentos legales se inicia tras autenticar o al abrir páginas
  legales/registro. Una nueva versión redirige una pantalla protegida abierta al
  registro, conservando destino y consentimiento versionado.
- Los avisos comparten una suscripción; ante error de permisos el reintento abre
  una suscripción fresca para sus consumidores. Abrir una notificación cierra
  explícitamente el menú, incluido al navegar dentro de la misma ruta.
- El harness de encuesta incorpora políticas sintéticas reales del nuevo control
  y comprueba continuación guiada al agotar cuota/concurrencia. Las pruebas de
  agenda seleccionan el período correspondiente a sus slots también en fin de mes.
  No se eliminaron verificaciones de idempotencia, permisos o integridad financiera.

## Preparación remota realizada

- Los dos índices nuevos y los doce existentes se verificaron en `READY`.
- Preparación de actividad: inspección de 12 usuarios; cuatro documentos requerían
  normalización. Se aplicó transaccionalmente y la segunda inspección confirmó
  cero pendientes. Se conservaron actividad histórica, datos y estados restringidos.
- Mantenimiento observado desactivado. Política legal publicada: `2026-10-v2`.
- Los ledgers mensuales de IA de octubre/noviembre de esta entrega no existían
  durante la inspección; se inicializan por el primer permiso de inferencia.
- Hosting anterior recuperable observado: `a31d81ca650eae10`.
- Se conservaron referencias de las 57 Functions previas, región, runtime y secretos.
  No se imprimieron ni guardaron tokens ni claves del proveedor en los informes.

## Archivos de esta fase

Los archivos de matching, actividad, índices, backfill y sus pruebas se enumeran
en [el informe de backend](../finance/optimizaciones-backend-2026-10-31.md).
Para completar esta publicación también se ajustaron:

- `functions/src/ai/admissionPolicy.js`, `functions/src/chat/surveyAttempts.js`,
  `profileChatHandlers.js`, `surveyService.js` y `surveyAttempts.test.js`.
- `functions/.env.psicosaas-3c819`, `.env.example` y
  `functions/src/ai/ADMISSION_COST_CONTROLS.md`.
- `functions/package.json`, `functions/package-lock.json`,
  `functions/eslint.config.js`, `package.json`, `package-lock.json` y `knip.jsonc`.
- `src/App.vue`, `src/services/notificationService.js` y
  `src/components/Navigation/NavBar.vue`, para los problemas de regresión descritos.
- `tests/pilot-survey.integration.test.mjs`,
  `tests/browser/pilot-closure.spec.mjs`, `tests/browser/patient-http.spec.mjs` y
  `tests/run-followup.mjs`, para políticas sintéticas y cobertura actualizada.
- Los informes de backend y despliegue de esta fecha.

El manifiesto local `candidate-source-hashes-final.json` identifica todo el
candidato publicado, incluidas las optimizaciones previas aportadas por los otros
chats. Las sustituciones de puertos/proyecto de la copia son preparación local de
pruebas y no cambian las URLs del producto publicado.

## Aislamiento de las pruebas

Otro chat tenía ocupados los puertos de desarrollo. La copia usa el proyecto
`demo-lurems-release-20261031` y puertos propios: Auth 19099, Firestore 18080,
Functions 15001, Vite 15178, hub 14400, logs 14500 y websocket 19150. Solo se adaptan
proyecto/puertos en pruebas, configuración de emulador y herramienta de operador;
el código de producto probado es el candidato a publicar. Se mantuvieron las
comprobaciones de puertos libres, ausencia de preloads, políticas sintéticas,
proveedor real bloqueado y salida de red restringida a loopback/Unix sockets.

Una clave de Secret Manager ficticia se usa exclusivamente en el emulador para
impedir que su arranque intente consultar el secreto remoto. No se publica esa
configuración de emulador ni se usa para aprobar el proveedor real.

## Validación

- Frontend: 50/50 unitarias.
- Backend: 162/162 unitarias.
- Lint y build: correctos. Knip normal/producción del candidato congelado
  identifica cuatro exports sin consumidores en `roles.js` y
  `tableLoadingTimeout.js`; se conservan por compatibilidad y no afectan al
  despliegue. La comprobación del workspace compartido no sustituye este resultado:
  otros chats incorporan consumidores que todavía no forman parte del candidato.
- Auditorías de frontend y Functions: cero vulnerabilidades al umbral moderate.
- Integración completa: 102 casos, sin fallos en la última pasada.
- Navegador: **138/138** casos correctos en la pasada completa final: 32 de agenda
  con escritorio/móvil y cuatro zonas horarias, y 106 de administración, pacientes,
  profesionales, reservas, pagos, seguimiento, consentimiento, avisos y encuesta.
  Las pasadas anteriores detectaron problemas de renovación legal, recuperación
  del menú de avisos y selección de período en pruebas durante fin de mes;
  se corrigieron y repitió toda la matriz. Total de la validación final:
  **452 casos, cero fallos y cero omitidos** entre unitarias, integración y navegador.

Artefactos locales en `output/despliegue-2026-10-31/`; los nombres terminados en
`final` identifican la validación final y los anteriores conservan los hallazgos.
Estos archivos pueden no existir en otro clon del repositorio.

## Publicación y comprobación posterior

Backend publicado mediante `firebase deploy --only functions,firestore --project
psicosaas-3c819 --non-interactive`. Firebase confirmó 57 actualizaciones; la
inspección posterior muestra las mismas 57 Functions en `ACTIVE`, Node 22 y
`southamerica-east1`. La configuración publicada confirma USD 50 por mes de Lima,
20 inferencias por sesión y 200 por cuenta. Las cuatro llamadas públicas de smoke
a matching, reserva, chat y acceso, sin App Check ni autenticación, devolvieron
`401 UNAUTHENTICATED`.

Hosting publicado mediante `firebase deploy --only hosting --project
psicosaas-3c819 --non-interactive`. Versión live `57a546064e82d54a`, publicada el
31/10/2026 a las 20:35:20 UTC (15:35:20 Lima), disponible en
https://app.lurems.lat y https://luremsapp.web.app. Se conservó como referencia
la versión previa `a31d81ca650eae10`.

Las 15 comprobaciones HTTP de producción pasaron: cinco rutas públicas, nueve
assets representativos y un asset inexistente. El contenido coincide por SHA-256
con el build probado; HTML requiere revalidación, assets tienen caché inmutable y
el asset inexistente devuelve 404 sin sustituirse por el HTML de la aplicación.
Los 369 archivos del manifiesto conservan los hashes del candidato validado.
La comprobación pública con Chromium confirmó inicio, login, registro móvil y
documentos legales publicados (`2026-10-v2`), sin errores de consola. Las capturas
quedan en `output/playwright/production-release-*-20261031.png`. Se eliminó el
archivo `.secret.local` con la clave ficticia del emulador al terminar sus pruebas;
la configuración `*.local` también estaba excluida del paquete de Functions.
No se relajan App Check ni permisos y no se eliminan recursos ausentes de la
copia. Vercel no fue publicado ni se presume actualizado por Firebase.

No queda preparación de índices o backfill pendiente para este candidato. Sí
queda medir tráfico representativo y lecturas/escrituras, latencia y contención
en producción antes de atribuir un ahorro monetario real. En el ejemplo de
planificación de 100 profesionales y 2.000 slots, matching pasa de 2.300 a unas
206 lecturas (91% menos); actividad pasa de 20 escrituras a una si esas llamadas
caen en la misma ventana. El job pasa de recorrer N usuarios a C candidatos más
una página de compatibilidad de hasta 200 y su checkpoint. Con pocos usuarios o
disponibilidad muy dispersa el ahorro puede disminuir o invertirse: no se presenta
la proyección como una medición de las 12 cuentas existentes.

La comprobación pública posterior cubre HTML, assets, caché, rutas y denegaciones
esperadas sin credenciales. Las funciones de negocio y carreras se prueban con
datos sintéticos en emuladores. No se ejecutan cobros/transferencias reales,
restauraciones, borrados de usuarios, correo a terceros ni una caída real de IA.
Un smoke público no sustituye aceptación clínica, operativa o financiera ni prueba
correo entregado, Google OAuth o dispositivos físicos/Safari.
