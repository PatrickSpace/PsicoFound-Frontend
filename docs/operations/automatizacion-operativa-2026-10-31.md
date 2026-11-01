# Pagos automáticos y centro de operaciones

Fecha: 31/10/2026. Alcance final autorizado para publicar: **vencimiento automático y centro del administrador, sin conexión a la API ni webhook de Mercado Pago**. Los cobros se siguen confirmando mediante conciliación administrativa. La comprobación final de publicación se registra en [la entrega a main](publicacion-main-2026-10-31.md).

El adaptador de proveedor que se describe a continuación se conserva como implementación local de referencia y pruebas sintéticas. `createPaymentCheckout`, `mercadoPagoWebhook` y `processPaymentNotification` no se exportan desde `functions/index.js`, no se despliegan y no tienen secretos vinculados. El scheduler de producción llama al mantenimiento con proveedor deshabilitado, y `PAYMENT_AUTOMATION_JSON` permanece en `enabled:false`. Habilitar ese JSON por sí solo no publica el adaptador ni constituye una activación soportada.

Las secciones sobre preferencias y confirmación automática documentan ese prototipo, no el flujo productivo autorizado. El vencimiento, la liberación del horario, las tareas de devolución, los controles del administrador y la conciliación de comprobantes sí forman parte del despliegue.

## Prototipo de confirmación por proveedor — excluido de esta publicación

1. Reserva un horario y acepta una cotización con importe, reparto y política versionados.
2. «Pagar con Mercado Pago» solicita al servidor una preferencia exclusiva para esa reserva. El servidor obtiene el importe de Firestore, nunca del navegador. El usuario autoriza el cobro en Mercado Pago; no hay cargos sin esa autorización.
3. Una notificación firmada se guarda antes de responder al proveedor. El procesador consulta el pago mediante la API autenticada y verifica comercio, entorno, reserva, moneda e importe. Volver al sitio o abrir el enlace no acredita un pago.
4. Un pago aprobado dentro del plazo, con reserva abierta, horario todavía propio y profesional disponible confirma pago y cita, crea la obligación profesional y notifica al paciente. El cliente recibe la actualización por su suscripción existente; no necesita informar que pagó.
5. Al terminar el plazo, la UI bloquea el pago y muestra «Venció tu tiempo para pagar» y «Seleccionar otro horario». Solicita el cierre de su propia reserva al servidor; además, un scheduler vence reservas aunque el navegador esté cerrado. La liberación de cita, resumen y horario es transaccional.
6. Un pago aprobado después de vencer/cerrar la reserva pasa a revisión de devolución. Nunca recupera un horario liberado o reservado por otra persona. Se abre una tarea de administración y se informa al paciente.

Las reservas anteriores conservan su conciliación y política. `submitted` con `preserve_for_review` sigue pendiente de revisión; cambiar la configuración no reescribe acuerdos anteriores. Las nuevas reservas automáticas no ofrecen «Ya realicé el pago».

## Administración dentro de la app

Nueva entrada y ruta de inicio del modo administrador: `/admin/operaciones`.

| Caso | Generación y resolución |
| --- | --- |
| Devolución | Se crea una tarea para `refund_review`. Puede asignarse, quedar en gestión o bloqueada. Se cierra cuando el pago queda resuelto en conciliación, no mediante una marca genérica de tarea completada. |
| Saldo profesional | Una obligación pendiente genera tarea. Se cierra al registrar el pago externo íntegro o al quedar anulada por devolución. El servidor bloquea transferencias mientras el pago está en revisión. |
| Recuperación de fondos | Si ya se transfirió al profesional y luego se devuelve al paciente, queda `recovery_review`. Conciliación permite registrar fondos efectivamente recuperados, con importe y referencia únicos. No aplica descuentos ni mueve fondos automáticamente. |
| Pago duplicado, importe/comercio/entorno incorrectos, fallo de proveedor o inconsistencia | Tarea crítica con referencia operativa. El administrador registra diagnóstico y evidencia de resolución. No se acredita automáticamente el pago cuestionado. Un pago adicional requiere resolver ese movimiento concreto con el proveedor. |
| Profesional inactivo o suspendido con reservas futuras abiertas | Tarea con agenda afectada paginada. El administrador coordina y cancela cada reserva con motivo y versión vigente. Los pagos confirmados pasan a revisión de devolución. Pausar la recepción de nuevas reservas no equivale a dejar de atender citas existentes. |
| Soporte | Tarea hasta que el caso se resuelva desde Soporte; conserva su respuesta al usuario. |
| Alertas | Tarea hasta que se revise y acuse la alerta. Acusar recibo no acredita por sí solo la corrección técnica. |
| Solicitudes profesionales y solicitudes heredadas de privacidad | Se enlazan a su gestión existente. No se habilita eliminación productiva ni acceso clínico adicional. |
| Revisiones periódicas | Configuración de pagos, costos, cobertura/tarifas, acceso/soporte, coordinación clínica, conservación y respaldo/recuperación. Requieren nota de evidencia y se reabren a los 7 o 30 días. Su cierre registra una gestión; no certifica cumplimiento ni ejecuta un ensayo aplazado. |

Cada tarea tiene estado, prioridad, responsable, versión, nota e historial paginado. Los filtros de estado/tipo/prioridad consultan la colección completa y la lista carga páginas de 50. Los detalles de reservas afectadas contienen solo fecha, paciente, estado y pago. La cancelación operativa tiene un callable propio: no permite registrar atención, editar notas terapéuticas o reasignar tratamientos.

Los casos previos pendientes se incorporan por lotes con cursor persistente, sin perder los que excedan la primera página. Las escrituras posteriores sincronizan tareas mediante triggers que releen las fuentes dentro de una transacción. Solo el servidor escribe tareas e historial; solo administradores pueden leerlos.

## Referencia del prototipo de proveedor — excluido de esta publicación

Mantener `PAYMENT_AUTOMATION_JSON={"enabled":false}` hasta preparar y comprobar la integración. No se han cambiado las credenciales ni la configuración productiva en esta entrega.

Configuración no secreta de Functions, con valores reales verificados:

```json
{"enabled":true,"mode":"production","collectorId":"ID_NUMERICO_DEL_COMERCIO","publicOrigin":"https://app.lurems.lat"}
```

- Una futura activación requeriría restaurar explícitamente las exportaciones y vinculaciones de secretos, nueva autorización y validación. Guardar `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` exclusivamente en Secret Manager. Son el token privado y la firma secreta de la misma aplicación/cuenta. No almacenarlos en Firestore, Vite, documentos ni chat.
- Habilitar notificaciones de pagos para esa aplicación y verificar la firma `x-signature`/`x-request-id`. La URL de Functions es `https://southamerica-east1-PROYECTO.cloudfunctions.net/mercadoPagoWebhook`; las preferencias incluyen esa URL automáticamente.
- El webhook debe admitir llamadas públicas del proveedor. Su autenticación es HMAC; los callables de la app mantienen Auth, rol, propiedad, App Check y mantenimiento. Comprobar IAM del endpoint al publicar.
- `publicOrigin` debe ser un origen HTTPS propio, sin ruta, y servir `/sesiones`. El retorno de Checkout solo navega: no modifica estados financieros.
- `collectorId` debe corresponder al token. `mode=production` solo acepta pagos `live_mode=true`. Las pruebas se restringen a un backend aislado `APP_ENV=staging` o emuladores `demo-`; el backend compartido por Vercel y Hosting es producción.
- Las tarifas y `COMMERCIAL_POLICY_JSON` siguen necesitando aprobación comercial. El enlace fijo permanece para compatibilidad con reservas anteriores; la reserva automática crea su preferencia con el importe inmutable.
- Publicar índices y esperar READY, reglas, Functions y frontend compatibles. Los secretos deben existir antes de publicar las Functions que los vinculan. Verificar el Scheduler, invocador y permisos de Eventarc/Firestore.
- Comprobar primero con datos sintéticos; el pago controlado real y su devolución permanecen para la fase financiera expresamente autorizada. Una configuración habilitada no equivale a una integración probada.

Servicios del despliegue: `refreshOwnPaymentReservation`, `maintainPaymentReservations`, `getAdminOperationsOverview`, `updateAdminTask`, `getAdminTaskHistory`, `getAdminAffectedAppointments`, `cancelAdminReservation`, `recordProfessionalRecovery` y triggers `syncTasks_*`.

## Fiabilidad, costos y operación

- Scheduler nominal cada minuto, una instancia y concurrencia uno. Cada pasada recorre hasta 100 vencimientos con cursor, 10 notificaciones pendientes y 10 conciliaciones de respaldo. El tiempo real de ejecución y la cola pueden añadir retraso; la UI bloquea el pago al vencer y el servidor siempre verifica el plazo.
- Los avisos preservados y registros inconsistentes no bloquean las páginas posteriores de vencimientos. Las inconsistencias generan tareas.
- Las notificaciones se guardan en `payment_webhook_inbox`, inaccesible para clientes. Una interrupción se reintenta con espera creciente hasta una hora; al persistir el error se genera tarea. Una entrega duplicada no vuelve a crear el mismo evento.
- La consulta de respaldo busca pagos por referencia de reserva: controles frecuentes durante el plazo y primera hora, después diarios hasta siete días. Los webhooks siguen atendiendo eventos posteriores. Conservar acceso al panel del proveedor para investigación y movimientos antiguos.
- No se guardan respuestas completas del proveedor, datos de tarjetas, secretos ni datos clínicos en la bandeja de pagos. Los identificadores y eventos financieros sí permanecen para trazabilidad; su conservación debe formar parte de la política aprobada.
- El scheduler supone unas 43.200 ejecuciones en 30 días, más lecturas/escrituras y cómputo. Las revisiones económicas deben incluir este costo, triggers y consultas al proveedor. No hay sondeo periódico del navegador ni listeners generales de todas las colecciones administrativas.
- El centro muestra última pasada y última comunicación correcta con el proveedor. Una pasada ausente durante más de cinco minutos presenta advertencia. La guardia debe seguir recibiendo y atendiendo las alertas externas existentes; una pantalla cerrada no envía avisos.
- Mantenimiento de la app bloquea acciones interactivas. Los eventos financieros firmados, la conciliación y los vencimientos continúan para conservar consistencia de fondos y horarios.

## Verificación

Se añadieron pruebas unitarias de firma, cuenta/entorno/importe, configuración, URLs y transporte; pruebas integradas de confirmación, duplicados, carreras, vencimiento, devolución, tareas, permisos, historial, cursor y reservas afectadas. La evidencia de la ejecución final está en `output/operaciones-2026-10-31/` y se resume al cerrar la entrega.

Fuentes oficiales consultadas: [notificaciones de Checkout Pro](https://www.mercadopago.com.pe/developers/es/docs/checkout-pro-preferences/payment-notifications), [creación de preferencias](https://www.mercadopago.com.pe/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post), [vigencia de preferencias](https://www.mercadopago.com.pe/developers/en/docs/checkout-pro-preferences/additional-settings/term-of-preference), [consulta autenticada del pago](https://www.mercadopago.com.pe/developers/es/reference/online-payments/checkout-pro-preferences/get-payment/get).

### Resultado de la pasada final

- Frontend: **50/50** unitarias; backend: **168/168** unitarias, incluidas las nuevas verificaciones del proveedor.
- Integración aislada: **17/17** casos de automatización y administración y **8/8** de compatibilidad de pagos anteriores.
- Lint de Functions, compilación productiva, Knip y `git diff --check`: aprobados. Knip conserva cuatro recomendaciones de configuración anteriores.
- Chromium con identidades sintéticas: ingreso del administrador a Operaciones, asignación y nota de devolución, historial persistido, apertura directa de conciliación, aviso de vencimiento del paciente y navegación a selección de horario. Consolas sin errores en ambos recorridos.
- Ancho móvil de 390 px sin desbordamiento horizontal de la página. La bandeja usa tarjetas en móvil y tabla en escritorio. No acredita dispositivos físicos ni otros motores de navegador.
- El proveedor real se bloquea en emuladores; los pagos verificados en estas pruebas son objetos sintéticos inyectados. No se ejecutaron cargos, devoluciones ni transferencias reales. No se publicó esta ampliación desde esta entrega.

Evidencia local: [integración](../../output/operaciones-2026-10-31/integration.log), [unitarias backend](../../output/operaciones-2026-10-31/backend-unit.log), [unitarias frontend](../../output/operaciones-2026-10-31/frontend-unit.log), [build](../../output/operaciones-2026-10-31/build.log), [lint](../../output/operaciones-2026-10-31/lint.log), [Knip](../../output/operaciones-2026-10-31/knip.log), [bandeja](../../output/operaciones-2026-10-31/admin-operaciones.png), [gestión de devolución](../../output/operaciones-2026-10-31/admin-devolucion.png), [tarjetas móviles](../../output/operaciones-2026-10-31/admin-movil.png) y [vencimiento del paciente](../../output/operaciones-2026-10-31/paciente-vencimiento-movil.png).

Esta implementación admite un pago completo por reserva. Antes de activarla, comprobar que la cuenta no ofrece pagos combinados con dos medios: su conciliación agregada no está implementada. Un importe parcial se bloquea y genera incidencia administrativa, sin habilitar la sesión.

Los enlaces a `output/` son evidencia local excluida de Git. Las capturas anteriores muestran el prototipo previo a la decisión de publicar sin conexión al proveedor; no acreditan una integración productiva.
