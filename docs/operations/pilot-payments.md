# Tarifas, reservas y conciliación manual del piloto

Implementación técnica 2026-10-10. Activación conservadora aprobada por el titular
el 2026-10-24 para incluir enlaces reales de cobro en el flujo final. La plataforma
no ejecuta devoluciones ni transferencias y la conciliación permanece manual.

`COMMERCIAL_POLICY_JSON` es obligatorio para cotizar/reservar con pago. Contiene
version, status (`approved`; `synthetic` solo en emuladores demo), approvalReference,
merchantAccount, holdMinutes, submittedExpiration (`preserve_for_review` o `expire`),
patientCancellationCutoffMinutes, patientRescheduleCutoffMinutes, patientPastReschedule y patientPastCancellation
(`allow` o `manual_review`, cierre explícito de citas pasadas), refundMode
(`manual_review`), obligationTrigger (`payment_confirmed`) y rounding
(`floor_professional_remainder_platform`). Este MVP solo soporta ese disparador y
redondeo: necesitan aceptación comercial expresa antes de configurarse en producción.
No hay penalidades ni devolución automática. Si se requiere otro acuerdo, falta código.
La configuración productiva conserva el aviso de pago para revisión, no aplica
penalidades ni plazos adicionales de cancelación/reprogramación antes de la cita,
mantiene una reserva durante 60 minutos y envía los casos pasados y devoluciones a
revisión manual. Los números en `tests/helpers/pilot-policy.mjs` son exclusivamente
sintéticos.

La cotización incluye el hash de tarifa, selección y política. La reserva conserva
su snapshot y vence como máximo en el inicio de la cita. Cambiar configuración no
reescribe reservas anteriores. Cada nueva versión debe conservarse junto a su
aprobación fuera del despliegue. Las reservas antiguas sin snapshot necesitan
revisión/migración autorizada; no se les adjudica una política por defecto.

Servicios (todos los importes en unidades menores, PEN):

- `markPaymentSubmitted`: paciente propietario informa dentro del plazo. No acredita.
- `reviewPaymentOperation`: operador con rol admin comprueba manualmente proveedor,
  cuenta comercial, moneda, importe y destinatario; registra referencia exacta. Un
  índice documental SHA-256 de cuenta/proveedor/tipo/referencia impide acreditar dos
  citas con el mismo recibo. No cambiar mayúsculas ni formato de los IDs del proveedor.
- `expirePaymentReservation`: operador revisa una reserva vencida; solo los estados
  permitidos por SU política. Cita, resumen de terapia, bloque, pago, historial y
  notificación cambian en una transacción. Repetir es seguro. Operaciones confirmadas
  no vencen. El MVP requiere ejecutar esta cola operativa: no hay scheduler desplegado.
- `requestPaymentRefundReview`: paciente solicita revisión; el ledger impide transferir
  mientras el pago esté en revisión. Cancelar un pago acreditado también abre revisión.
- `recordProfessionalTransfer`: operador registra una transferencia YA VERIFICADA fuera
  del sistema. No envía dinero. Referencia única, moneda/importe y obligación pendientes
  se validan transaccionalmente. Repetir mismos datos no duplica; otros datos se rechazan.

`professional_obligations` separa calculatedMinor (cálculo de tarifa), pendingMinor
(obligación), paidMinor (transferencias registradas) y platformMinor. La devolución
anula pendiente sin borrar transferencias: si ya se transfirió queda recovery_review.
La recuperación real requiere revisión, no descuentos automáticos. `professional_transfers`
y `payment_receipts` son registros de servidor: no permiten escritura directa cliente.

Procedimiento de duplicado: conservar ambos expedientes; identificar el recibo único,
confirmar solo el asociado al pago real y rechazar el otro solo tras revisión del
operador. Una reserva cancelada/vencida no se resucita para imputar un pago tardío:
registrar soporte y resolver devolución/reasignación bajo autorización comercial.
Este caso sigue siendo trabajo operativo; no hay pasarela ni reasignación automática.

Antes de staging: asignar responsable comercial y conciliador; aprobar todos los
campos; preparar cuenta sandbox y comprobantes ficticios; reproducir la suite
`tests/pilot-payments.integration.test.mjs`. Verificar accesos de operador y denegación
a paciente/profesional. Esperado: una referencia acredita una sola reserva y los
seis registros permanecen consistentes. Staging/consola y operación real: no ejecutados.

## Catálogo y selección de tarifa

Administrador mantiene el catálogo desde `/admin/cobros`; el profesional selecciona
su tarifa activa en Configuración. Importe existente inmutable: un precio nuevo
requiere otra tarifa. Enlaces HTTPS de Mercado Pago Perú y marca «Prueba» no
constituyen aprobación comercial; un enlace real puede cobrar dinero real.
No se crean ni asignan tarifas de ejemplo automáticamente.


`payment_rates/{id}` contiene `name`, `amountMinor`, `currency: PEN`,
`paymentUrl`, `active`, `isTest`, `version`, porcentajes y montos del reparto,
`createdAt`, `createdBy`, `updatedAt` y `updatedBy`.

El importe es inmutable; un precio distinto requiere otra tarifa.
Cada cambio genera una copia completa en `payment_rates/{id}/versions/{version}`
con autor y fecha. La vista administrativa consulta las ultimas 20 versiones;
las anteriores permanecen almacenadas. No hay borrado desde el cliente.

El perfil `therapists/{id}` referencia `paymentRateId` y conserva
`paymentRateSelectionVersion` / `paymentRateUpdatedAt`. Cada seleccion genera
`therapists/{id}/rate_history/{version}`, sin tocar `citas` ni `terapias`.
El link vigente se resuelve desde el catalogo, no se duplica en el perfil.
La desactivacion conserva la seleccion antigua y pide elegir otra tarifa.

Las escrituras pasan por `savePaymentRate` (admin) y
`setPsychologistPaymentRate` (psicologo propietario con perfil activo).
Ambas usan transacciones, versiones esperadas y reintentos idempotentes.
El cliente no puede escribir tarifas/historiales ni los campos de seleccion
del perfil, incluso usando el editor administrativo anterior.
Solo administradores y profesionales pueden leer el catalogo; el historial
del catalogo es administrativo. El historial de seleccion tambien es legible
por el profesional propietario.

Los montos son enteros en centimos (1 a 10,000,000). La parte profesional es
70% redondeado hacia abajo al céntimo y Lurems recibe el resto: ambos suman
siempre el total. El sistema no obtiene ni calcula comisiones del proveedor. Su tratamiento requiere
acuerdo comercial explícito; no debe deducirse automáticamente del reparto.

El redondeo vigente coincide con `floor_professional_remainder_platform`:
profesional recibe el 70% truncado en céntimos y plataforma el resto. La corrección
administrativa no reescribe versiones ni reservas históricas. Cotizar/reservar
revalida tarifa activa, selección y política; tarifas de prueba no habilitan cobro
bajo política real. Cada reserva conserva las condiciones capturadas.

Pruebas: `npm run test:payment-rules`, `npm run test:backend` y `npm run test:pilot`;
ver [guía de validación](validation.md). El [informe de fase 1](../archive/payments/rate-catalog.md)
se conserva como antecedente, incluida su regla de redondeo anterior.

## Plazo visible y revisión de pagos tardíos (REV-PIL-01)

Actualización 2026-10-11. La tarjeta usa exclusivamente `expiresAt` de la operación;
lo presenta en hora de Lima, Perú, y lo reevalúa al llegar al plazo y al recuperar
foco/visibilidad. También comprueba el instante al pulsar el enlace. El reloj del
dispositivo ayuda a la presentación: el servidor conserva la autoridad para aceptar
el aviso. Una hora incorrecta en el dispositivo no autoriza cambios financieros.

`pending` dentro del plazo permite abrir el enlace e informar el pago. Al terminar,
se retiran ambas acciones y aparece «Ya pagué: solicitar revisión». Un vencimiento
ausente o malformado requiere revisión y tampoco invita a pagar. La tarjeta no
escribe `expired`, libera bloques ni recalcula plazos a partir de la política actual.
Para `submitted` muestra la regla `submittedExpiration` de su snapshot y nunca invita
a repetir el pago. Confirmados/devoluciones mantienen su estado; cancelados, vencidos
y rechazados permiten registrar soporte por un pago ya realizado.

La acción abre el soporte existente para que el paciente revise y envíe su solicitud.
El servidor valida propiedad y conserva `paymentOperationId` y la referencia obtenida
de la operación, no una referencia arbitraria enviada por el navegador. Reintentos
con el mismo ID y contenido conservan una sola solicitud; contenido distinto se rechaza.
Registrar soporte no confirma, devuelve, transfiere ni reasigna dinero. La solicitud
y las respuestas se consultan en «Mis solicitudes» del soporte existente.

### Cola manual obligatoria del piloto

Antes de abrir el piloto, asignar un conciliador y un suplente y aprobar su frecuencia
de revisión. No hay scheduler. La frecuencia y los tiempos de respuesta no están
definidos por este código; deben registrarse como acuerdo operativo, sin prometer al
paciente atención inmediata.

1. En el entorno autorizado, identificar operaciones `pending` cuyo `expiresAt` terminó
   y `submitted` cuya política capturada permita vencer. Separar fechas/políticas
   inválidas y avisos tardíos para investigación; no aplicar la configuración nueva
   retroactivamente ni estimar un plazo que falta.
2. Conciliar comprobantes y solicitudes vinculadas antes de decidir. Un `submitted`
   con `preserve_for_review` se conserva para revisión. No hacer expirar un confirmado.
3. Con sesión de operador autorizada, invocar el callable `expirePaymentReservation`
   con `{operationId}`. El servidor decide según el snapshot y el estado actuales;
   si hubo una confirmación concurrente, revisar el resultado y no forzar la escritura.
4. Registrar operador, fecha, operación, versión de política, resultado y evidencia de
   la decisión. Verificar cita, resumen de terapia, bloque, pago, historial y aviso.
   Un reintento del mismo vencimiento es idempotente.
5. Para un pago real después del plazo/cierre, conservar el comprobante y la solicitud
   vinculada y resolver bajo la política aprobada. No resucitar una reserva cerrada ni
   acreditar otra cita usando un recibo ya registrado. Responder por soporte tras revisión.

Responsable principal de alertas: `jplosta01@gmail.com`. La frecuencia de
conciliación, el suplente y los comprobantes autorizados siguen pendientes externos.
Este procedimiento se ensaya localmente con datos ficticios; no certifica la interfaz
administrativa ni una operación real de Mercado Pago.

## Recorrido de administración implementado en 2026-10-12

La implementación y los resultados parciales de la interfaz se registran en la
[revisión del administrador](../archive/functional/revision-administrador-piloto-2026-10-12.md).
La aceptación completa sigue abierta en la [matriz](../functional/matriz-cierre-piloto.md).
El recorrido vigente está en la [referencia por rol](../functional/revision-funcional-por-rol.md).

- **Conciliación:** buscar referencia/UID/operación, filtrar estado y plazo, abrir
  detalle. Contrastar importe/moneda, cita, profesional y condiciones capturadas.
  Abrir soporte vinculado antes de decidir sobre un pago tardío. Elegir acción,
  registrar evidencia y confirmar; el servidor vuelve a validar estado y política.
- **Cola manual:** «Vencer y liberar reserva» invoca `expirePaymentReservation`.
  Solo se ofrece con plazo válido terminado y estado/política compatibles. El paso 3
  del procedimiento anterior se ejecuta desde esta acción; no editar documentos.
- **Devolución:** desde revisión, registrar comprobante de devolución ya verificada
  externamente. Un pago cerrado no se reasigna ni resucita; documentar solución
  comercial por soporte y conservar evidencia externa.
- **Obligación/transferencia:** el mismo detalle separa calculado, pendiente y
  transferido registrado. Introducir importe y referencia de transferencia externa
  ya verificada; comprobar saldo e historial tras guardar. Revisión de devolución
  bloquea transferencias y recuperación posterior se muestra sin descuentos automáticos.
- **Auditoría:** `payment_audit` conserva cada decisión con operador, fecha y evidencia;
  recibos y transferencias siguen protegidos por referencias únicas. La fecha se
  presenta en hora de Lima, Perú, independiente del dispositivo.

Asignar responsable/suplente y frecuencia sigue siendo obligatorio antes de operar.
Ningún botón paga, devuelve o transfiere fondos; tampoco existe scheduler. Marcar una
verificación en la interfaz no acredita por sí mismo que el proveedor movió dinero.

## Rechazo de horario por el profesional

Cambio local 2026-10-15. Un profesional vinculado puede rechazar una cita pendiente
o confirmada por un percance, con motivo obligatorio y versión vigente de la cita.
No se aplican los plazos de cancelación del paciente al profesional; el servidor
conserva la validación de la política capturada y rechaza una versión obsoleta.

La cita queda `cancelada`, conserva motivo/actor y `rescheduleRequested`; el bloque
solo se cierra si todavía pertenece a esa cita. No vuelve a ofrecerse automáticamente
un horario que el profesional no puede atender. La terapia y el aviso al paciente se
actualizan en la misma transacción. El paciente recibe el motivo y la solicitud de
elegir otro horario desde Mis sesiones; puede reservar un nuevo bloque disponible.

Pagos pendientes/enviados quedan cancelados según el flujo existente; confirmados
o en revisión mantienen `refund_review`. La obligación correspondiente queda bloqueada
para transferencias. El pago anterior no se aplica automáticamente a la nueva reserva,
ni se devuelve dinero desde esta acción. Un pago enviado todavía no conciliado necesita
la revisión operativa de comprobantes/soporte ya descrita en esta guía.

El botón «Regresar a pendiente» de la agenda se sustituye por «Rechazar cita»;
las sesiones realizadas/canceladas no ofrecen ese rechazo. Confirmar solo está
habilitado en pendiente y completar solo en confirmada. Las correcciones de sesiones
realizadas y la política sobre fecha de atención siguen siendo decisiones separadas.
