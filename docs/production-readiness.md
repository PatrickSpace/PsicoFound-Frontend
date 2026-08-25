# Preparación para producción de Lurems

Fecha de revisión: 2026-08-24  
Rama: `feat/frontend-finops-audit`

## Estado ejecutivo

El código queda preparado para una salida controlada con pacientes, psicólogos,
administración, encuesta conversacional, matching, agenda, terapia y pagos
marketplace. El pago real permanece bloqueado de forma intencional hasta que se
configuren credenciales válidas de Mercado Pago y se complete una prueba sandbox.

El inicio de sesión por correo no exige verificación en esta versión, por decisión
de producto. Las cuentas QA también se crean con `emailVerified=false`. La
verificación debe introducirse después con migración de cuentas y recuperación de
acceso, no mediante un cambio silencioso de configuración.

## Implementado

- Roles múltiples y controles de autorización por paciente, psicólogo y admin.
- Desactivación administrativa que bloquea Firebase Auth y revoca sesiones.
- Reglas para impedir escrituras clínicas y financieras desde clientes no autorizados.
- App Check configurable y límites por usuario para chat, matching y pagos.
- Consentimiento versionado para registro y pago.
- Restablecimiento de contraseña y mensajes de autenticación controlados.
- Payment Brick cargado solo en checkout; el frontend nunca almacena tarjeta o CVV.
- Reserva transaccional de horario, pago, webhook, ledger, reembolso y conciliación.
- Verificación directa del pago en Mercado Pago antes de confirmar la cita.
- Datos QA idempotentes y visibles únicamente por el admin autorizado.
- Páginas de términos, privacidad y 404; requieren revisión legal final.
- Cabeceras de seguridad y caché para Firebase Hosting.
- CI con lint, sintaxis, pruebas, reglas, emuladores y build.

## Variables que debes actualizar

Usa [.env.example](../.env.example) para el frontend y
[functions/.env.example](../functions/.env.example) para Functions. No edites ni
versiones las plantillas con secretos reales.

| Variable | Entorno final | Acción |
|---|---|---|
| Firebase `VITE_FIREBASE_*` | Frontend | Copiar configuración web del proyecto |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | Frontend | Crear clave reCAPTCHA v3 para `app.lurems.lat` |
| `VITE_PAYMENT_ENVIRONMENT` | Frontend | Usar `sandbox` durante QA y `production` al activar cobros |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | Frontend | Copiar Public Key del entorno correspondiente |
| `APP_BASE_URL` | Functions | `https://app.lurems.lat` |
| `MERCADO_PAGO_CLIENT_ID` | Functions | Copiar Client ID de la aplicación marketplace |
| `MERCADO_PAGO_OAUTH_REDIRECT_URI` | Functions | Registrar callback exacto de Firebase Functions |
| `MERCADO_PAGO_WEBHOOK_URL` | Functions/MP | Registrar webhook exacto de Firebase Functions |
| `MERCADO_PAGO_ACCESS_TOKEN` | Secret Manager | Configurar con Firebase CLI |
| `MERCADO_PAGO_CLIENT_SECRET` | Secret Manager | Configurar con Firebase CLI |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Secret Manager | Configurar con Firebase CLI |
| `PAYMENT_TOKEN_ENCRYPTION_KEY` | Secret Manager | Generar clave aleatoria de 32 bytes o más |
| `QA_ADMIN_UIDS` | Functions | UID del admin que puede generar cuentas QA |
| `ENABLE_QA_SEED` | Functions | `true` solo durante la preparación QA |

## Datos QA

Desde Admin > Usuarios, el botón **Datos QA** invoca `seedQaMarketplaceData`.
Solo funciona cuando `ENABLE_QA_SEED=true` y el UID actual está en
`QA_ADMIN_UIDS`. Solicita una contraseña temporal de al menos 12 caracteres.

Genera cuentas para:

- paciente sin terapia;
- paciente con terapia, cita y pago simulados confirmados;
- psicólogo remoto con cobros conectados;
- psicólogo presencial con cobros conectados;
- psicólogo sin cuenta de cobros;
- psicólogo con cuenta restringida.

Los perfiles, bloques y escenarios llevan `isTestAccount=true` y
`testAudienceUids`, por lo que solo aparecen en recomendaciones para el admin y
las cuentas QA del mismo conjunto. Al cerrar QA, desactiva `ENABLE_QA_SEED`;
elimina o desactiva las cuentas desde Admin y
conserva los registros financieros de prueba para auditoría.

## Puerta de lanzamiento

1. Configurar variables y secretos sin placeholders.
2. Mantener `PAYMENT_ENVIRONMENT=sandbox` y probar OAuth, Payment Brick, webhook,
   rechazo, expiración, reembolso y duplicados con cuentas oficiales de prueba.
3. Validar la habilitación comercial de Split Payments 1:1 para Perú y el modelo
   contractual 30/70 con asesoría legal/contable.
4. Revisar textos legales, responsable de privacidad, contacto, retención,
   consentimiento y protocolo de crisis.
5. Registrar `app.lurems.lat` en Firebase Auth, App Check, Mercado Pago OAuth y
   Webhooks.
6. Activar App Check primero en métricas y luego establecer
   `ENFORCE_APP_CHECK=true` tras confirmar clientes válidos.
7. Ejecutar `npm run verify`, `npm run test:rules` y
   `npm run test:payments:emulator` en el commit candidato.
8. Desplegar índices y reglas, después Functions y finalmente Hosting.
9. Realizar smoke test por rol con cuentas QA y revisar logs/conciliación.
10. Cambiar a credenciales de producción únicamente después de aprobar sandbox.

## Pendientes externos, no simulados

- Credenciales y aprobación marketplace de Mercado Pago.
- Revisión legal y contable para Perú.
- Correo corporativo para soporte y privacidad.
- Configuración de alertas de errores, presupuesto y facturación en Google Cloud.
- Prueba manual autenticada en Safari/Chrome iOS y navegadores desktop.
- Estrategia posterior de verificación de correo para cuentas nuevas y existentes.
- Actualización mayor de Vite para resolver 2 avisos del servidor de desarrollo y
  actualización compatible de SDKs Google/Firebase para 9 avisos moderados
  transitivos. No usar `npm audit fix --force` sin repetir emuladores.

No debe considerarse listo el cobro real hasta cerrar estos puntos. El código
falla de forma explícita si producción usa fake, sandbox, localhost, secretos
ausentes o placeholders.
