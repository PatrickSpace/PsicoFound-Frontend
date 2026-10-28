# Ejecución del cierre operativo — 25 de octubre de 2026

Orden solicitado: revisión clínica/privacidad → alertas → recuperación de
contraseña → propuestas de operación y citas → tarifa de prueba. Pago al final,
sin ejecutar en esta fase. Base de código: `d8ad39c`.
Continuación de ejecución: 26 de octubre de 2026, America/Lima.

**Decisión posterior del titular, 26/10:** mantener el sistema de apoyo y dejar
su revisión de casos a psicólogos reales que contactará personalmente, sin botón
de aprobación. Reemplazar la eliminación por suspensión con conservación de
información. Esta decisión sustituye el objetivo anterior de configurar eliminación;
ver [suspensión de cuentas](../functional/suspension-cuentas.md). El diagnóstico
histórico de abajo no significa que siga pendiente habilitar borrados.

## Revisión clínica y privacidad (punto 7)

### Evidencia comprobada

- Lectura del código de señales de ayuda, retorno desde recursos, política de uso
  de IA, inventario de datos y handlers de privacidad.
- 18/18 pruebas focalizadas aprobadas: `suicideRisk.test.js` y
  `privacyHandlers.test.js`, sin llamadas al proveedor ni cambios en datos reales.
- Consulta de metadatos de Functions productivas: `sendProfileChatMessage` y
  `diagnoseAccountDeletion` están `ACTIVE`. Ambas incluyen referencias
  `project-owner-chat-2026-10-21-empathy-safety-flow` y
  `project-owner-chat-2026-10-21-history-consent-retention` en la aprobación IA.
- Ninguna de estas dos Functions tiene `PRIVACY_POLICY_JSON` configurada. El
  handler de diagnóstico conserva el bloqueo por política ausente. No se ejecutó
  diagnóstico de una cuenta ni eliminación.
- Las referencias acreditan una aprobación registrada por el proyecto; no contienen
  por sí mismas nombre, credencial ni informe de un revisor clínico independiente.
  La revisión profesional no se da por realizada en este expediente.

### Qué queda resuelto y qué sigue abierto

La contradicción documental queda identificada: el uso de IA tiene referencias
productivas de aprobación, mientras la guía de ayuda conserva una revisión
profesional pendiente. Son alcances distintos. La publicación legal `2026-10-v2`
tampoco configura automáticamente la política operativa de eliminación.

Para cerrar la revisión clínica, completar este registro con el profesional
designado. No se envía este expediente ni se contacta a terceros automáticamente.

| Elemento a revisar | Evidencia / decisión requerida |
| --- | --- |
| Responsable | Nombre, función y referencia profesional del revisor; fecha y versión revisada. |
| Textos | Preguntas, respuestas empáticas y pantalla de ayuda; límites claros del servicio y ausencia de promesas de atención inmediata. |
| Casos sintéticos | Intención propia actual, negación, terceros, cita textual, pasado, ambigüedad y corrección posterior. Registrar resultado esperado y observado. |
| Recursos | Confirmar pertinencia, vigencia y ámbito de los canales antes de aprobar su publicación; esta revisión no verificó nuevamente sus datos. |
| Persistencia | Definir qué significa la señal guardada, quién puede verla y cuándo deja de activar una redirección; nunca presentarla como diagnóstico. |
| Continuidad | Acceso manual a ayuda, retorno a encuesta y ayuda con proveedor no disponible o cuota agotada. La caída real sigue excluida. |
| Dictamen | Aprobar el alcance revisado o listar cambios requeridos; guardar referencia sin historias clínicas. |

Para cerrar privacidad, preparar una política explícita por categoría usando el
inventario de `functions/src/accounts/dataInventory.js`. No se inventan plazos ni
fundamentos jurídicos y no se despliega una configuración incompleta.

| Grupo | Decisión que debe documentarse |
| --- | --- |
| Identidad/Auth y perfil | Deshabilitar, conservar o eliminar; condiciones y autoridad. |
| Encuesta, mensajes, resúmenes y eventos de seguridad | Finalidad, plazo, inicio del cómputo y acción final. Distinguir conservación en Firebase del envío al proveedor. |
| Expediente compartido paciente/profesional | Derechos y obligaciones de ambos; qué se conserva y quién mantiene acceso. |
| Citas, pagos, recibos, obligaciones y transferencias | Conservación y trazabilidad; no borrar por arrastre de una cuenta. |
| Consentimientos, solicitudes y auditorías | Evidencia necesaria y acceso restringido. El código exige conservar `account_requests`. |
| Storage, respaldos y proveedor | Inventario real, tratamiento y límites. El ejecutor actual exige `storage: not_used_verified`; si Storage se usa, falta adaptar el contrato antes de ejecutar. |

Cada categoría necesita acción (`delete`, `redact` o `retain`), fundamento,
`minimumAgeDays` y campos a retirar cuando corresponda; además de versión,
referencia de aprobación, tratamiento de Authentication y operador autorizado.
La configuración requiere revisión de todas las categorías, incluidas las
compartidas y subcolecciones. Una simulación no equivale a autorización de borrado.

**Estado del punto 7:** revisión técnica y conciliación de evidencia realizadas;
dictamen profesional y política ejecutable de conservación pendientes de decisión.

## Recepción de alertas (punto 1)

Se consultó el buzón conectado `jplosta01@gmail.com`. Se encontraron y leyeron los
dos mensajes de Google Cloud Alerting del incidente `0.oe8bafj112jg`:

- Activación recibida el **25/10/2026 a las 01:38:01, America/Lima**.
- Recuperación recibida el **25/10/2026 a las 01:42:55, America/Lima**.
- Proyecto `psicosaas-3c819`; política `10439234832844937304` y métrica
  `logging.googleapis.com/user/lurems_callable_failures`.

Se acredita entrega al buzón y lectura mediante el conector; no una respuesta humana
operativa dentro de un SLA. No se provocaron errores ni se modificaron umbrales.
No se determina en este paso la causa del incidente ni se asume que fuera sintético.

**Estado:** recepción técnica comprobada. La responsabilidad y frecuencia de
respuesta se proponen abajo.

## Recuperación de contraseña (punto 2)

El titular autorizó usar correo temporal para una identidad QA. No se utiliza la
cuenta administrativa ni se envían datos clínicos o financieros al buzón temporal.
Se creó una identidad exclusivamente en Authentication, sin contraseña inicial,
roles ni expediente, y Firebase aceptó la solicitud de correo de recuperación.
El inventario de UID/correo está fuera del repositorio, en un archivo local con
permisos restringidos. Aún no se acredita la entrega al buzón ni el cambio final.
El buzón temporal seguía vacío después de actualizarlo; no se presenta la respuesta
exitosa de Firebase como prueba de entrega. La prueba se detiene en ese punto,
con la bandeja abierta para continuar; no se configuró una contraseña por el agente.
La entrada, confirmación y envío de la nueva contraseña requieren intervención
del usuario según las reglas del navegador. La entrega del correo no bastará para
marcar completado el cambio y posterior inicio de sesión.

## Propuesta de operación de pagos (punto 5)

Propuesta para un MVP con coste mínimo, aún no aprobada como compromiso público:

1. Un conciliador principal y un suplente identificados. El titular puede cubrir
   inicialmente el puesto principal; el suplente necesita una persona real.
2. Revisar la cola cada **15 minutos durante la cobertura de reservas**, porque
   la retención vigente es de 60 minutos. Confirmar comprobantes antes de acreditar;
   conservar `submitted` para revisión conforme a su snapshot.
3. Revisar soporte al inicio y cierre de cada jornada y asignar cada caso abierto.
   Publicar tiempos de respuesta solo cuando exista cobertura acordada.
4. No prometer cobertura permanente. Si se admiten reservas fuera de la cobertura,
   decidir cómo evitar pagos desatendidos: personal de guardia o un control de
   horarios de reservas. Ese control horario no se presume implementado.
5. Usar Administración para conciliar y vencer; registrar operador, referencia,
   importe y decisión. Mantener comprobantes en un expediente restringido, sin
   trasladarlos al repositorio ni a correos de alertas.
6. Ante incidencia, principal acusa recibo y suplente asume si no hay respuesta
   dentro del plazo interno acordado. Como punto inicial, proponer 15 minutos
   para tomar un incidente crítico durante cobertura; medir antes de prometerlo.

Para comenzar, recomiendo principal + suplente y revisión manual. Automatizar
vencimientos solo después de observar volumen y excepciones; no contratar otra
herramienta para llevar esta cola.

## Propuesta para profesionales inactivos y citas (punto 6)

Procedimiento propuesto, sin reasignación de personas ni expedientes automática:

1. Distinguir pausa temporal, percance para una cita y baja permanente.
2. Antes de una baja planificada, listar citas futuras y pagos asociados. La
   desactivación evita nuevas acciones, pero no resuelve las citas anteriores.
3. Para un percance puntual, usar el rechazo con motivo mientras el profesional
   autorizado pueda actuar. El flujo existente cancela, avisa y solicita otro horario;
   el pago anterior no se aplica automáticamente a una reserva nueva.
4. Si la cuenta ya está inactiva o no puede operar, escalar a soporte/administración.
   Revisar qué acciones permite el producto; no reactivar accesos solo para sortear
   restricciones ni editar estados directamente en Firestore.
5. Ofrecer al paciente revisión de un nuevo horario o solución del pago según la
   política vigente. Un cambio de profesional requiere elección del paciente y
   revisión de acceso/consentimiento; no copiar el transcript al reemplazo.
6. Conservar motivos y trazabilidad. Comprobar bloque de agenda, cita, pago,
   obligación y notificación al cerrar cada caso. La devolución se gestiona fuera
   del sistema y se registra después de verificarla.

Mejora posterior sugerida: una cola «Profesional inactivo con citas futuras» y un
asistente de resolución caso por caso. Requiere acordar permisos y escenarios;
este documento no implementa ni autoriza una cancelación masiva.

## Tarifa existente (punto 3)

Por indicación del titular se seleccionó la tarifa **prueba, S/1.10**, para el perfil
profesional de la sesión actual. La interfaz confirmó «Tarifa actual: S/1.10».
Se reutilizó el enlace existente `https://mpago.la/169KZdW`; no se abrió ni cobró.

La selección utiliza el flujo normal con historial y afecta nuevas reservas.
No asigna tarifas a otros profesionales. La autorización del servidor permite
solo al propietario activo cambiar su tarifa; no se omitió esa validación.

**Importante para el cierre:** las tarifas `isTest` no habilitan cobros bajo la
política comercial real. Esta selección prepara el perfil QA; OP-03 de apertura
con tarifas reales continúa pendiente. No desmarcar «Prueba» para forzar un cobro.

## Pago controlado (punto 4)

Sin ejecutar por instrucción del titular. Antes de retomarlo, definir si se ensaya
el circuito QA o se autoriza un cobro real con importe, reserva y destino exactos.
Ninguna prueba de esta fase mueve fondos.
