# Lurems App Web · contexto técnico para agentes

Corte del 13 de noviembre de 2026, hora de Lima. Esta guía describe [`main` de la app, `fce97f4`](https://github.com/PatrickSpace/PsicoFound-Frontend/tree/fce97f43c22fe60d9ffd73ef7e7d799c28c7c872) y referencia [`main` de la landing, `7800ccf`](https://github.com/PatrickSpace/LuremsLanding/tree/7800ccfef1aea3dffd4124327ea1d5de0ae03741). Comprueba la rama, el SHA y el estado del árbol antes de aplicar este mapa a otro checkout.

## Proyectos y entornos

| Superficie | Código | Infraestructura |
| --- | --- | --- |
| App en [app.lurems.lat](https://app.lurems.lat/) | `PatrickSpace/PsicoFound-Frontend` | Firebase `psicosaas-3c819`, sitio Hosting `luremsapp`, Firestore `(default)` y Functions en `southamerica-east1`. |
| [App en Vercel](https://psico-found-frontend.vercel.app/) | Mismo repo. El push a `main` activa Vercel. | Comparte el Firebase de producción. Para pruebas aisladas usa emuladores o un proyecto de staging propio. |
| Landing en [lurems.lat](https://lurems.lat/) | `PatrickSpace/LuremsLanding` | Firebase `luremslanding`, Hosting `luremslanding`, callable `submitLead` en `us-central1`. Capta interesados. El alta de cuenta empieza en la app. |

La landing escribe `leads`, `leadRegistrations` y `leadEmails` mediante Admin SDK. El [registro del 5 de noviembre](https://github.com/PatrickSpace/LuremsLanding/blob/7800ccfef1aea3dffd4124327ea1d5de0ae03741/docs/deployments/full-landing-2026-11-05.json) identifica Hosting, reglas y `submitLead` publicados. El envío con Gmail seguía pendiente del secreto `EARLY_ACCESS_SMTP_PASSWORD`.

## Entrada y capas de la app

- **Interfaz**. `src/main.js` instala Vue 3, Pinia, Vue Router y Vuetify. `src/App.vue` aloja la aplicación. Busca pantallas en `src/views/`, elementos reutilizables en `src/components/` y tokens/temas en `src/plugins/theme/`. Vite compila a `dist/`.
- **Navegación y sesión**. `src/router/index.js` resuelve login, verificación de correo, suspensión, consentimiento, onboarding y modo activo. `src/store/auth.js` y `src/store/appContext.js` coordinan sesión e identidad. Los modos `patient`, `psychologist` y `admin` eligen la experiencia. Los permisos efectivos se comprueban en Functions y reglas.
- **Integración web**. `src/plugins/Firebase/firebase.js` inicializa la app, Authentication y App Check con reCAPTCHA Enterprise cuando hay clave de sitio. `src/plugins/Firebase/firestore.js` expone `db`. `src/services/` agrupa consultas, suscripciones y callables por dominio. Las callables usan el mismo proyecto y la región configurada por Vite.
- **Backend**. `functions/index.js` exporta callables, triggers Firestore y tareas programadas de Functions v2 en Node 22. Los handlers viven en `functions/src/`. `operations/callable.js` aplica App Check, controles de acceso operativo y trazas con identificador de correlación. Firebase Admin SDK usa la identidad del runtime y sus permisos IAM.
- **Infraestructura**. `firebase.json` define Hosting, Auth, Functions, reglas e índices. `.firebaserc` señala un proyecto predeterminado. `vercel.json` configura el fallback de rutas SPA y la caché. Verifica el proyecto y el sitio efectivos antes de cualquier operación remota.

## Rutas, lógica y datos

| Flujo | Por dónde empezar | Datos o contrato |
| --- | --- | --- |
| Registro y acceso | `/registro`, `/login`, `/verificar-correo`, `/onboarding/*`. `functions/src/onboarding/registrationHandlers.js` y `functions/src/accounts/`. | Firebase Auth (correo/contraseña o Google), `users/{uid}`, `psychologist_requests` y `therapists`. La intención profesional inicia una solicitud. La aprobación administrativa agrega el rol profesional en una transacción. |
| Encuesta y matching | `/encuesta`, `/elegirterapeuta`, `conversationService.js`, `matchingService.js`, `functions/src/{chat,profiles,matching,ai}/`. | `profiles/{uid}`, `conversations/{uid}/messages`, `survey_summaries/{uid}`. Opciones guiadas y texto libre asistido con OpenAI según política. El paciente confirma un resumen editable y el servidor ordena profesionales de forma determinística. |
| Agenda y terapia | `/sesiones`, `/psicologo/sesiones`, `/terapiadetail`. `citaService.js`, `availabilityService.js`, `terapiaService.js` y `functions/src/appointments/`. | `therapist_availability`, `citas` y `terapias`. Reserva, reprogramación y cambios de estado pasan por callables. `schedulePolicy.mjs` fija `America/Lima` y convive con campos históricos. |
| Seguimiento | `/progreso`, `/registro-emocional`, `/historial` y `/herramientas`. `functions/src/therapy/followupHandlers.js`. | `therapy_goals/{id}/progress`, `exercises`, `emotional_checkins`, `longitudinal_history`. El resumen y el historial compartidos se resuelven en el servidor según vínculo, consentimiento y pago de la primera cita. |
| Cobros y operaciones | `paymentService.js`, `functions/src/payments/`, `/admin/operaciones`, `/admin/cobros`, `/admin/conciliacion`. | `payment_rates/{id}/versions`, `payment_operations`, `professional_obligations`, `professional_transfers`, `admin_tasks/{id}/history`. En el alcance publicado documentado, el paciente usa un enlace de pago, la conciliación es administrativa y el vencimiento se automatiza. Confirma el despliegue antes de dar por disponible una integración de proveedor. |
| Cuenta, soporte y legal | `/configuracion`, `/cuenta-suspendida`, `/admin/usuarios`, `/admin/soporte`, `/admin/documentos-legales`, `functions/src/{accounts,support,operations}/`. | `users`, `account_requests`, `support_requests`, `notifications`, `legal_settings/current`, `legal_releases`. La versión legal publicada en Firestore tiene prioridad sobre el fallback de Vite. La suspensión conserva datos. |

Las reglas de Firestore limitan lecturas por identidad, rol y vínculo. Citas, terapias, seguimiento y operaciones de pago se escriben desde Functions. Hay escrituras directas específicas bajo reglas, como la marca `readAt` de una notificación propia. Para cambiar una consulta, revisa su servicio, los filtros de `firestore.rules`, los índices de `firestore.indexes.json` y las pruebas del recorrido. Para cambiar una escritura, sigue el handler y sus validaciones de rol, estado, idempotencia y concurrencia.

Referencias de dominio: [onboarding](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/architecture/registration-onboarding.md), [encuesta y acceso compartido](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/functional/encuesta-matching.md), [agenda de Lima](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/functional/politica-horaria-mvp.md) y [operación de cobros](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/automatizacion-operativa-2026-10-31.md).

## Configuración y archivos auxiliares

| Archivo o recurso | Qué contiene y cuándo se usa |
| --- | --- |
| `.env.example` → `.env` en la raíz | Copia la configuración pública de la **app web Firebase del entorno elegido**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` y `VITE_FIREBASE_APP_ID`. `VITE_FIREBASE_FUNCTIONS_REGION` usa `southamerica-east1` por defecto. |
| Configuración web opcional | `VITE_APP_CHECK_SITE_KEY` para el sitio reCAPTCHA Enterprise. El fallback de `src/config/appCheck.js` es específico de producción. `VITE_LEGAL_DOCUMENT_VERSION`, `VITE_TERMS_URL` y `VITE_PRIVACY_URL` sirven de fallback legal. `VITE_VERCEL_ANALYTICS_ENABLED` habilita Analytics cuando corresponda en Vercel. |
| Emuladores del cliente | `VITE_USE_FIREBASE_EMULATORS=true` requiere proyecto `demo-*` y hostname `localhost` o `127.0.0.1`. Puertos predeterminados: Auth 9099, Firestore 8080, Functions 5001. Overrides: `VITE_AUTH_EMULATOR_PORT`, `VITE_FIRESTORE_EMULATOR_PORT`, `VITE_FUNCTIONS_EMULATOR_PORT`. El runner del piloto aporta su configuración sintética. |
| `functions/.env.example` y configuración por proyecto | Plantilla del runtime, con `APP_ENV` y `APP_CHECK_MODE`; políticas `ELIGIBILITY_POLICY_JSON`, `PRIVACY_POLICY_JSON` y valores legales `LEGAL_*`; `SURVEY_INPUT_MODE`, `CHAT_LIMITS_JSON`, `AI_USE_APPROVAL_JSON`, `AI_ADMISSION_LIMITS_JSON`, `PRIMARY_AI_PROVIDER`, `AI_MODEL` y `FALLBACK_AI_PROVIDER`; `COMMERCIAL_POLICY_JSON` y `PAYMENT_AUTOMATION_JSON`. `functions/.env.psicosaas-3c819` es específico de producción en este corte. Usa políticas propias del entorno o fixtures sintéticos. |
| Secret Manager, IAM y consola Firebase | `OPENAI_API_KEY` para el proveedor aprobado de texto libre. `GEMINI_API_KEY` corresponde a un adaptador heredado. `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` pertenecen a la configuración de una integración opcional. Auth, dominios autorizados, App Check, permisos y secretos se preparan fuera del checkout. El runtime administrado se inicializa sin un JSON de cuenta de servicio en el repo. |
| `firebase.followup-test.json`, `tests/helpers/`, `playwright*.config.js` | Configuración de Auth, Firestore y Functions locales, fixtures y suites de navegador. El runner usa `demo-lurems-followup` y bloquea la red externa. |
| `config/pilot-staging.example.json` | Ejemplo de manifiesto de staging para una copia local `*.local.json`. Contiene referencias, no credenciales. `npm run verify:pilot-config -- <ruta>` valida su estructura offline. |
| `docs/email/` | Plantillas y previews de correo de la app. La verificación y recuperación usan Firebase Auth. El envío de acceso temprano pertenece al backend de la landing. |

Los valores `VITE_*` quedan en el bundle del navegador. Guarda credenciales en Secret Manager y usa datos sintéticos para capturas, logs y pruebas. [Plantilla web](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/.env.example) · [Plantilla Functions](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/functions/.env.example) · [Política del proveedor](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/pilot-provider-review.md).

## Arranque y verificación

Usa Node 22.20 o posterior dentro de la rama 22, npm y, para integración, Firebase CLI 15.15.0 y Java 21. Ejecuta en la raíz de la app:

```bash
npm ci
npm --prefix functions ci
npm test
npm run test:backend
npm run lint:backend
npm run audit:unused
npm run build
```

Para el servidor de desarrollo, configura el `.env` del entorno elegido y ejecuta `npm run dev` en `127.0.0.1:5173`. Vite usa el proyecto configurado. Para probar cuentas, roles, datos y reglas en aislamiento, descarga Chromium con `npx playwright install chromium` y el emulador con `firebase setup:emulators:firestore`. Ejecuta `npm run test:pilot` o una suite dirigida como `npm run test:agenda` o `npm run test:payment-rules`, una a la vez. Deja libres los puertos del runner y revisa los requisitos de red de tu plataforma. [Guía de validación](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/validation.md).

Para un release autorizado, identifica el SHA, la versión de Hosting y el backend compatible. Cuando una UI nueva depende de APIs nuevas, coordina reglas, índices y Functions antes de integrar en `main`. Consulta el registro y Quality para el SHA que se esté evaluando. [Procedimiento de release](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/pilot-release.md) · [Estado y pendientes](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/salida-a-produccion.md).
