# Operación y aceptación de staging

2026-10-10. Preparación local; sin despliegue, cambios de consola o autorización de
lanzamiento. La revisión administrativa adicional se documenta en
[referencia por rol](../functional/revision-funcional-por-rol.md) y
[matriz de aceptación](../functional/matriz-cierre-piloto.md).

## Configuración revisable

Copiar `config/pilot-staging.example.json` a un archivo local ignorado (`*.local.json`).
Completar referencias de aprobación sin secretos; nunca copiar API keys de proveedor,
credenciales de servicio, tokens ni contenido clínico. Ejecutar:

```
node scripts/verify-pilot-config.mjs /ruta/manifest.local.json
```

El ejemplo debe salir con código 1: todos los campos reales siguen pendientes.
`configured` significa estructura declarada válida; el validador NO consulta consola,
NO verifica que una referencia exista y NO autoriza publicar. Registrar evidencia con
`environment`, `reference`, `verifiedAt` y `verifiedBy`. Adjuntar hashes del código,
lockfiles, reglas e índices que acompaña el informe para evitar validar otro artefacto.

| Comprobación externa | Entorno/acceso | Procedimiento / resultado esperado | Responsable |
| --- | --- | --- | --- |
| Auth/domínios/OAuth | Staging, lector Auth + cuenta Google autorizada | Verificar dominios exactos y URLs de retorno; alta/login/recovery/change email, enlaces usados/expirados rechazados; Google retorna a la cuenta correcta | Por asignar |
| App Check | Staging, consola App Check | Registrar web/reCAPTCHA, observar tráfico de prueba, activar enforcement, comprobar callable sin token rechazado y sesión válida aceptada | Por asignar |
| Functions/IAM/secretos | Staging, lector IAM/Secret Manager | Identificar cuenta de ejecución, solo acceso a secretos necesarios y datos de staging; sin Owner/Editor compartidos; usuarios sin acceso Admin SDK | Por asignar |
| Reglas/índices | Staging, lector Firestore | Comparar hashes y todos los índices READY; denegación por UID/rol; no abrir reglas para pasar la prueba | Por asignar |
| Proveedor/facturación | Proyecto pagado autorizado | Evidencia de facturación del MISMO proyecto API, términos/retención/revisión clínica; una prueba real necesita autorización separada | Por asignar |
| Alertas/guardia | Staging, Monitoring/Billing | Activar notificaciones y probar incidente sintético autorizado, registrar recepción y acuse | Por asignar |
| Backup/restore | Proyecto aislado de restauración | Política aprobada, permisos y cifrado; restaurar copia autorizada, comparar conteos/referencias, probar acceso sin exponer datos | Por asignar |

## App Check web y control de consumo

Configuración de producción 2026-10-17, proyecto `psicosaas-3c819`:

- Aplicación web PsicoSaaS registrada con reCAPTCHA Enterprise, tipo `SCORE`.
- Dominios permitidos: `app.lurems.lat`, `psico-found-frontend.vercel.app` y
  `luremsapp.web.app`. No se autoriza `localhost` ni todos los dominios.
- TTL `3600s` (una hora); renovación automática del SDK, sin refresco forzado por
  cada operación. La renovación puede ocurrir antes del vencimiento del token.
- Cuota `recaptchaenterprise.googleapis.com/CreateAssessmentRequests`, unidad
  `1/d/{project}`, reducida desde ilimitada a **250 evaluaciones al día**.
  Máximo teórico de este proyecto en un mes de 31 días: 7.750 evaluaciones. Al agotar
  la cuota, las nuevas evaluaciones se rechazan; no se desactiva App Check para
  permitirlas. Tokens todavía válidos pueden seguir utilizándose.
- La clave de sitio es pública y está incluida en `src/config/appCheck.js`, con
  fallback exclusivo para este proyecto. `VITE_APP_CHECK_SITE_KEY` permite una
  configuración explícita distinta. Esto permite que Firebase Hosting y Vercel
  reciban la misma configuración por Git sin copiar credenciales secretas.
- Las callables mantienen la exigencia de App Check en producción. No se cambia
  aquí enforcement de Firestore, Authentication u otros servicios.

El proyecto ya tenía facturación habilitada antes de esta configuración. El nivel
Premium de reCAPTCHA se aplica a proyectos con facturación; no es posible afirmar
que el cupo gratuito sea un tope de gasto. Las primeras 10.000 evaluaciones gratuitas
se comparten entre proyectos y sitios de la organización: el límite de este proyecto
reduce su consumo, pero no garantiza coste cero si hay consumo en otros proyectos.
No desactivar la facturación general: afectaría a los servicios desplegados.

Una alerta de presupuesto no detiene cobros. No se han creado destinatarios ni
alertas nuevas en esta tarea. Revisar consumo y facturación en Google Cloud y
probar una sesión real antes de ampliar las cuotas. Los emuladores siguen usando
exclusivamente los proyectos demo y no consumen reCAPTCHA.

Referencias: [App Check web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider),
[facturación](https://docs.cloud.google.com/recaptcha/docs/billing-information),
[cuotas](https://docs.cloud.google.com/recaptcha/quotas).

## Despliegue coordinado (solo después de autorización)

Comprobación local 2026-10-11: `firebase.json` fija `hosting.site: luremsapp`.
Cambiar solo `--project` no selecciona otro sitio de Hosting. Antes de cualquier
publicación de staging, preparar y revisar una configuración/target con sitio de
staging explícito, cuenta y proyecto autorizados; registrar esa selección en la
evidencia del release. No se cambió aquí el destino existente ni se desplegó.
El frontend y Functions usan `southamerica-east1`; las configuraciones de despliegue
y emulador apuntan a los mismos archivos de reglas/índices. Es coherencia local,
no prueba de que esos artefactos estén desplegados ni de que los índices estén READY.

1. Congelar artefacto probado, revisar diff y manifiesto; registrar release anterior,
   versiones de políticas, exports de configuración, índices y respaldo aprobado.
2. Mantener recorridos nuevos cerrados mientras falten aprobaciones. Activar mantenimiento
   de aplicación y esperar al menos 180 segundos; detener escritores privilegiados,
   jobs e integraciones (el flag no bloquea Admin SDK). Verificar ausencia de operaciones.
3. Desplegar índices y esperar READY; reglas, Functions y frontend del mismo artefacto,
   mediante cuenta de despliegue con privilegios necesarios. Nunca copiar `.env.local`
   de pruebas. No sustituir un proyecto mediante un alias implícito.
4. Smoke de staging paciente/psicólogo/administrador con cuentas sintéticas separadas:
   revocación de roles, aprobación/rechazo y acceso efectivo, tarifas/snapshots,
   conciliación-vencimiento-transferencia-devolución sintéticas, soporte solo titular
   y separación de `privacyOperator`. Verificar también App Check, legal, cuotas y ayuda.
   Registrar resultado, no solo salida de deploy. Reabrir únicamente con autorización.
5. Comprobar errores, pendientes de conciliación/privacidad y alertas tras reabrir.

Rollback: activar mantenimiento y drenar; restaurar frontend y Functions del release
compatible anterior. Conservar campos/ledgers nuevos y no relajar reglas o cuotas.
Si el anterior no comprende snapshots/políticas nuevos, mantener cerrado y corregir
hacia adelante. No borrar operaciones de pago ni restaurar una base antigua sobre
pagos recientes. Una restauración de datos exige revisión de consistencia, autorización
y entorno separado antes de cualquier corte. Guardar también reglas e índices anteriores;
no eliminar índices durante un rollback urgente.

## Alertas y respuesta a incidentes

Los logs de callables incluyen operación, correlationId, elapsedMs y código; nunca
registrar cuerpo de solicitud, prompts, mensajes, notas, email, credenciales o tokens.
En Monitoring crear métricas de `callable failed` por código/operación, latencia y
`ai provider failure`; excluir UID como etiqueta. Elegir umbral/ventana con tráfico
esperado aprobado. Preparar alerta de error sostenido y de agotamiento de cuota,
panel de operaciones con lease vencido y privacidad parcial. No están activados por
existir esta guía. Configurar presupuesto del proyecto pagado y destinatarios de aviso:
una alerta de Billing no corta gasto; los límites de servidor son un control separado.

Ante incidente: responsable asignado registra correlationId, intervalo, release e
impacto (sin contenido sensible); si corresponde cierra mantenimiento/uso IA, drena,
conserva evidencia mínima, diagnostica, decide rollback compatible y confirma recuperación.
No ejecutar reintentos de IA inciertos ni transferencias/cobros automáticos para recuperar.
La comunicación a afectados requiere decisión/obligaciones legales y autorización;
esta tarea no envía mensajes externos.

## CI y aislamiento

macOS usa sandbox-exec. Linux usa `sudo -n unshare --net`, solo interfaz loopback,
sin rutas externas; baja UID/GID, elimina grupos/capacidades y activa no-new-privs antes
de Firebase/Node/Chromium. Si falta aislamiento, falla antes de iniciar la suite.
Descargar Firestore/Chromium y dependencias ANTES. CI usa Ubuntu 22.04, Java 21 y Node 22.
En Linux se exige además el sandbox de Chromium. macOS conserva la configuración
previa de Chromium dentro de sandbox-exec: el intento de anidar el sandbox de Chromium
fue rechazado por el sistema (sandbox initialization failed: Operation not permitted).
No desactivar el sandbox de Chromium en Linux ni usar puertos de otro chat, proyectos reales, mocks de fetch como
sustituto del bloqueo de red, ni excepciones de egress para lograr verde.
La ejecución Linux en GitHub sigue pendiente hasta tener resultado del workflow remoto.

`config/pilot-alerts.example.json` separa filtros y etiquetas permitidas de los
umbrales, ventanas, canales y presupuesto pendientes. Es un contrato de revisión,
no un recurso ya desplegado: convertirlo a Monitoring/Billing tras aprobación,
verificar el formato de logs del runtime en staging y ensayar la notificación.
No incluir contenido personal ni identificadores de usuario como etiquetas.

El ensayo `tests/pilot-operations.integration.test.mjs` copia exclusivamente datos
sintéticos entre dos proyectos demo dentro del emulador propio, verifica hash,
subcolecciones y timestamps y conserva origen. Ese codec de prueba no es un backup
productivo ni cubre Auth, Storage, cifrado, IAM, TTL o recuperación ante desastre.
La restauración administrada real sigue pendiente según la tabla de consola.


Actualización administrativa 2026-10-14: desplegar las nuevas Functions de usuarios,
directorio y consultas operativas junto con reglas, frontend y política de retención
revisada. No habilitar temporalmente escrituras cliente a usuarios, profesionales,
solicitudes o pagos para compatibilizar una versión vieja. El administrador ordinario
no debe recibir `privacyOperator` ni acceso IAM a datos clínicos por este cambio.
Designar cuentas operativas y suplente mediante el procedimiento de acceso autorizado;
probar la retirada de permisos con una segunda sesión abierta y registrar evidencia.

## Entrega de fechas de atención — 2026-10-15

El usuario autorizó push y despliegue de todo el estado local validado. El proyecto
configurado es `psicosaas-3c819`, Hosting `luremsapp`, región `southamerica-east1`.
La consulta remota inicial encontró solo nueve Functions antiguas; la entrega del
frontend actual requiere también sus Functions, reglas e índices compatibles.

El `.env` local no contiene App Check ni URLs/versión legales; no hay archivo local
con políticas de producción. No se copiarán las políticas sintéticas ni se desactivará
App Check para publicar. El usuario reiteró el despliegue desde la terminal con las sesiones ya iniciadas;
se publicará el código con los controles cerrados donde falte configuración. Código listo no implica activación
de recorridos comerciales ni autorizaciones clínicas/legales.

Destinos confirmados por el usuario: Firebase principal `https://app.lurems.lat` y
Vercel `https://psico-found-frontend.vercel.app`. Vercel despliega automáticamente al
hacer push a `main`. Para coordinar esta entrega, preparar el commit local, desplegar
primero backend/reglas/índices compatibles, hacer push a main y desplegar Hosting
con el mismo artefacto; verificar ambos dominios y restaurar mantenimiento.

Se incorporaron al archivo de índices los índices remotos anteriores que no estaban
en el árbol local, para preservarlos durante el despliegue sin usar `--force` ni
autorizar borrados de índices ajenos a esta entrega.
