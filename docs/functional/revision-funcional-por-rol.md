# Funcionamiento por rol

Referencia consolidada: 2026-10-15, America/Lima. Describe el alcance implementado
localmente; la aceptación y las decisiones pendientes están en la
[matriz del piloto](matriz-cierre-piloto.md). No certifica el entorno publicado.
Los resultados fechados se conservan en el [archivo histórico](../archive/functional/revision-funcional-por-rol-2026-10-15.md).

## Alcance y acceso

La aplicación permite registro, encuesta, recomendaciones, reserva con política
comercial, conciliación manual, sesión mediante enlace externo y seguimiento básico.
No dispone de pasarela automática, videollamada propia ni expediente clínico completo.
Toda la agenda se presenta en [hora de Lima](politica-horaria-mvp.md).

Elegir psicólogo al registrarse inicia una solicitud; el rol efectivo requiere
aprobación administrativa y un perfil vinculado. Una cuenta puede tener varios roles.
La vista activa determina datos y acciones visibles; servidor y reglas comprueban
identidad, rol y relación con cada proceso. Cambiar cuenta o vista limpia listeners,
selecciones y formularios y descarta respuestas de cargas anteriores.

Admin es un permiso operativo: por sí solo no permite leer perfiles de encuesta,
conversaciones o registros terapéuticos. El operador de privacidad requiere un claim
independiente. Elegibilidad, correo verificado y consentimiento se aplican también
a cuentas antiguas según la política vigente; ver [registro](../architecture/registration-onboarding.md)
y [privacidad](../operations/pilot-privacy.md).

## Paciente

Recorrido: registro y onboarding → elegibilidad/correo/consentimiento → encuesta →
recomendaciones → cotización y reserva → aviso de pago y conciliación → sesión → seguimiento.

| Proceso | Comportamiento y límites |
| --- | --- |
| Cuenta | Registro por correo o Google; recuperación de contraseña, verificación y cambio de correo; consulta/exportación propia y solicitud de eliminación. Entrega real de correo y OAuth siguen pendientes de staging. |
| Encuesta | Turno y opciones del servidor, continuidad, corrección de campos, reintento y reinicio explícito. Ayuda independiente de IA/cuota. Ver [contrato de encuesta y matching](encuesta-matching.md). |
| Recomendaciones | Profesionales activos con disponibilidad futura; criterios marcables como indispensables, coincidencias/diferencias y resultados sin coincidencias o sin horarios. |
| Reserva | Cotización y reserva son operaciones distintas; reservar revalida bloque/tarifa/política y conserva snapshot. Cancelación y reprogramación dependen de estados, permisos y condiciones capturadas. |
| Pagos | Abrir enlace e informar dentro del plazo; informar no confirma el pago. Fuera de plazo se ofrece soporte vinculado. No se cambia el estado financiero por el reloj del navegador. |
| Sesiones | Consulta de citas, próxima sesión y enlace externo aportado por el profesional. Horarios inválidos se identifican para revisión; no se inventan ni cancelan automáticamente. |
| Terapias | Consulta de procesos actuales y anteriores. Cambiar estado de terapia y cancelar una cita son operaciones distintas; el cambio de terapia no prueba devolución ni liberación de reservas. |
| Objetivos | Consulta de metas y avances compartidos; creación propia en terapias activas y actualización de objetivos propios. Avances nuevos conservan porcentaje, nota, autor y fecha; reapertura/reducción requiere nota. |
| Herramientas | Consulta de ejercicios recibidos; solo el destinatario registra realización y observación. El profesional consulta el resultado al actualizar. |
| Registro emocional | Registro propio y visibilidad compartida explícita; servidor valida identidad y relación para su consulta e historial. |
| Historial | Terapias, citas y eventos del proceso propio con filtros; no concede acciones profesionales. Los datos históricos incompletos se muestran sin reconstruir notas o autores. |
| Avisos y soporte | Avisos internos con lectura y navegación; solicitudes y respuestas visibles para titular/admin. Resolver soporte no resuelve una operación financiera. Feedback de la app sigue siendo un canal separado. |

El lenguaje del paciente debe explicar el siguiente paso. Los estados vacíos deben
orientar a una acción útil; la validación UX con usuarios y teléfonos reales está pendiente.

## Psicólogo

Recorrido: solicitar habilitación → aprobación → seleccionar tarifa y abrir bloques →
consultar agenda → gestionar sesión y enlace → registrar realización → seguimiento.

| ID | Proceso | Comportamiento y límites |
| --- | --- | --- |
| PSI-01/02 | Habilitación y cuenta | Solicitud pendiente/aprobada/rechazada; aprobación vincula perfil y rol. Perfil inactivo conserva registros, pero pierde acceso profesional y nuevas cotizaciones. |
| PSI-03 | Disponibilidad | Apertura/cierre manual de bloques propios mediante servidor; futuro, solapamiento y concurrencia validados. Sin recurrencia ni sincronización de calendario externo. |
| PSI-04/05 | Agenda y cita | Consulta de citas asignadas y gestión autorizada de estado/reprogramación. Puede rechazar pendiente/confirmada con motivo obligatorio y solicitar al paciente otro horario; la cita se cancela y el bloque propio queda cerrado. Pago confirmado pasa a revisión de devolución. |
| PSI-06/07 | Sesión | Aporta enlace externo y registra realización con resumen compartido opcional. Se registra la fecha real de atención aparte de la fecha automática de registro. Solo se completa una confirmada cuando llegó su hora; correcciones con motivo e historial, y deshacer si no ocurrió vuelve a confirmada. No modifica pagos. No hay notas clínicas privadas. |
| PSI-08 | Pacientes | Consulta de terapias actuales/anteriores vinculadas al profesional. Resumen inicial mínimo mediante callable autorizado: motivo, temas, origen y fecha disponibles; no acceso al perfil/chat íntegro. |
| PSI-09 | Objetivos | Filtros por paciente/terapia/estado; crear y registrar avances en terapias activas mediante transacciones con versión. Las anteriores son consultables. Notas antiguas se conservan sin inventar historia. |
| PSI-10 | Ejercicios | Asignación en terapia activa con instrucciones, frecuencia y límite; consulta de realización/fecha/observación. No completa por el paciente ni dispone de edición/retiro de asignaciones en este alcance. |
| PSI-11 | Emociones | Consulta autorizada de registros compartidos del paciente vinculado; el rol profesional no abre registros privados. |
| PSI-12 | Historial | Terapias, sesiones y eventos usan el mismo contexto de paciente/terapia; filtros por periodo/tipo. No reasigna pacientes ni concede facultades nuevas sobre estados desde el historial. |
| PSI-13 | Tarifa | Selecciona tarifa activa propia desde Configuración; el catálogo lo administra admin. Reservas previas conservan su snapshot. |
| PSI-14/15 | Avisos y feedback | Avisos internos y observaciones sobre la aplicación; no equivalen a recordatorio externo ni atención inmediata. |

La cuenta dual consulta en vista paciente sus propios procesos y en vista profesional
los de sus pacientes. Contadores y formularios deben seguir esa separación incluso
al cambiar de vista durante una carga. La edición del perfil público está en
administración; alta terapéutica formal, notas privadas y contabilidad completa quedan
fuera del alcance documentado.

## Administrador

El inventario siguiente procede de la implementación revisada entre el 12 y el 14 de
octubre. Su aceptación local está verificada en la entrega del 15 de octubre; consultar ADM-A01 a ADM-A14 y los límites externos en la matriz.
La navegación de escritorio y móvil incluye usuarios, solicitudes, directorio,
tarifas, conciliación y soporte. Los filtros/paginación son de interfaz sobre el
conjunto del piloto; no acreditan escalabilidad para volúmenes mayores.

### ADM-P01. Acceso y contexto

- **Objetivo/actor:** acceder a funciones operativas mediante rol admin vigente.
- **Entrada:** Auth autenticado; ruta y modo autorizados. El servidor y las reglas
  deciden los permisos efectivos, aunque se llame sin usar botones.
- **Recorrido/resultado:** navegación de escritorio/móvil, rutas administrativas;
  cuenta/vista distintas limpian datos, listeners, selección y borradores. Revocar
  el rol impide operaciones posteriores y actualiza el contexto de la sesión.
- **Errores/reintentos:** carga fallida muestra error y Actualizar; respuestas de una
  generación anterior no publican resultados. No se degrada un permiso en servidor.
- **Auditoría:** operaciones mutantes registran actor y fecha; consultas sin contenido
  en telemetría. No se registra el cuerpo de la petición.

### ADM-P02. Solicitar, aprobar y rechazar profesionales

- **Objetivo/actor:** admin decide sobre solicitud declarada; el solicitante mantiene
  su cuenta paciente. No hay acreditación externa automática.
- **Entrada:** solicitud pendiente vigente, usuario existente; aprobación sin perfil
  duplicado. Rechazo exige motivo visible.
- **Pasos/estados:** buscar/filtrar → revisar detalle → seleccionar aprobar/rechazar →
  confirmar. `pending → approved|rejected`; una decisión distinta posterior se rechaza.
  Rechazado puede presentar una nueva solicitud; la anterior no modifica la nueva.
- **Resultado:** transacción entre solicitud, usuario/roles, perfil y auditoría. Aprobación
  concede acceso con el mismo UID; rechazo deja motivo y permite corregir formulario.
- **Errores/concurrencia:** un envío o decisión gana; reintento idéntico conserva resultado;
  perfil existente inconsistente exige revisar, nunca duplicar. Dos operadores no pueden
  aprobar y rechazar simultáneamente con resultados contradictorios.
- **Auditoría:** `reviewedBy`, `reviewedAt`, motivo y evento administrativo.

### ADM-P03. Editar y activar perfil profesional

- **Objetivo/actor:** admin mantiene datos públicos y estado de un profesional habilitado.
- **Entrada:** perfil existente con UID profesional; versión actual. No permite crear ni
  eliminar perfiles sueltos, cambiar UID, colegiatura declarada o tarifa por este canal.
- **Pasos/resultado:** directorio → buscar → editar nombre/resumen/dirección/especialidades,
  enfoques/modalidades/actividad → confirmar → guardar. Desactivar retira acceso profesional
  y nuevas reservas; conserva historial. Reactivar recupera acceso por rol/vínculo.
- **Errores/concurrencia:** versión obsoleta rechazada, formulario conserva error; recargar
  y volver a revisar. Servidor valida campos permitidos y límites.
- **Auditoría:** `adminVersion`, `updatedBy/At`, evento con campos modificados y actividad,
  sin duplicar descripciones ni contenido sensible.

### ADM-P04. Gestionar usuarios y roles

- **Objetivo/actor:** admin consulta cuentas y edita nombre/teléfono/acceso paciente/admin.
- **Entrada:** cuenta en Auth y perfil existente, versión actual; al menos un rol válido.
- **Pasos/resultado:** buscar → editar → confirmar → callable → actualizar. Auth conserva
  correo y credenciales. Rol profesional solo mediante solicitud; actividad en directorio.
  Altas usan registro real; eliminación usa solicitud del titular/proceso de privacidad.
- **Errores/concurrencia:** una versión antigua no sobrescribe. Cambios administrativos
  se serializan para impedir dos bajas del último administrador; documentos huérfanos
  o cuentas Auth deshabilitadas no cuentan como sustitutos; nunca se confía en la
  protección visual del propio usuario. Falta de Auth bloquea edición del documento.
- **Auditoría:** actor, fecha, campos afectados y roles antes/después; no copia teléfono,
  nacimiento ni credenciales al historial. Historial consultable por usuario en edición.

### ADM-P05. Catálogo de tarifas

- **Objetivo/actor:** admin mantiene precios ofrecidos; profesional elige tarifa propia.
- **Entrada:** PEN, importe entero en céntimos y límites válidos, reparto fijo 70/30,
  URL HTTPS permitida y banderas booleanas; versión de tarifa/selección vigente.
- **Pasos/estados:** crear → editar nombre/enlace/marca → confirmar activación/desactivación → historial.
  Importe existente es inmutable: crear otra tarifa. Seleccionar desde Configuración
  profesional; nuevas cotizaciones reflejan la selección y versión.
- **Resultado:** reservas anteriores conservan snapshot de tarifa/política. Una cotización
  obsoleta o tarifa desactivada no autoriza reservar. Test no permite cobro bajo política real.
- **Errores/concurrencia:** compare-and-set de versión, reintento idéntico no duplica versión.
- **Auditoría:** catálogo `versions`, profesional `rate_history`, autor/fecha Lima explícita.

### ADM-P06. Conciliar, vencer y registrar devolución

- **Objetivo/actor:** conciliador admin revisa operación y evidencia externa.
- **Entrada:** snapshot válido; proveedor/referencia verificable para confirmación/devolución.
- **Pasos:** filtrar estado/plazo/referencia/participantes → detalle y política capturada →
  revisar soporte vinculado → elegir transición válida → anotar evidencia → confirmar.
- **Estados:** pendiente admite rechazo; enviada admite confirmación/rechazo; vencimiento
  usa callable propio y plazo real, respetando `submittedExpiration`; revisión de devolución
  admite devolución verificada o conservar confirmación original si la reserva sigue abierta.
  Canceladas no resucitan; realizadas no ofrecen rechazo ni vencimiento; confirmadas no vencen. Fechas inválidas requieren revisión.
- **Resultado:** cita, resumen de terapia, slot, pago, historial y notificación coherentes.
  El slot solo se libera si sigue perteneciendo a esa cita. La interfaz nunca cambia
  estados financieros directamente ni aplica condiciones comerciales actuales a una reserva.
- **Errores/concurrencia:** referencia única por proveedor/comercio/tipo; estado transaccional
  decide ante cancelación/confirmación/vencimiento. Reintento no duplica recibos/obligaciones.
- **Auditoría:** conciliador/fecha en pago, eventos, recibo y `payment_audit` de cada decisión.

- **Externo:** conciliador/suplente, frecuencia, cuenta/comprobantes y política aprobados.
  No hay scheduler. Registrar devolución no envía dinero.

### ADM-P07. Obligaciones y transferencias

- **Objetivo/actor:** admin controla saldo y registra transferencia ya verificada externamente.
- **Entrada:** obligación reconciliada, pago confirmado, saldo positivo, moneda/importe y
  referencia externa. Revisión de devolución bloquea nuevas transferencias.
- **Pasos:** detalle de pago → calculado/pendiente/transferido → referencia e importe →
  confirmar verificación externa → registrar → saldo y ledger visibles.
- **Resultado:** referencia única, saldo disminuye/transferido aumenta. Devolución anula
  pendiente; transferido se conserva y queda `recovery_review` si corresponde.
- **Errores/concurrencia:** transacción serializa transferencia/devolución y rechaza moneda
  distinta, saldo excedido o misma referencia con datos distintos; repetición idéntica segura.
- **Auditoría:** ledger conserva operador, fecha, importe/moneda y referencia. Sin banco automático.

### ADM-P08. Soporte y pagos tardíos

- **Objetivo/actor:** admin responde al titular y documenta solución autorizada.
- **Entrada:** solicitud existente; versión vigente e ID de reintento. Enlace a pago validado
  por propiedad en servidor; referencia obtenida del registro, no del texto del navegador.
- **Pasos/estados:** buscar/filtrar → detalle/historial → respuesta visible → confirmar →
  `open → in_progress|resolved`; `in_progress → in_progress|resolved`; `resolved → in_progress`.
  Cada cambio exige respuesta. No hay notas internas en este módulo.
- **Resultado:** respuesta/autor/fecha/estado y aviso visibles solo para titular/admin;
  otro paciente no lee la solicitud. Resolver soporte no confirma ni devuelve dinero.
- **Errores/concurrencia:** versión desfasada rechazada; mismo autor/ID/payload no duplica;
  aviso por versión, sin sobrescribir un aviso previo de igual estado.
- **Auditoría:** respuestas append-only con actor/fecha/transición y `updatedBy/At`.

### ADM-P09. Solicitudes de cuenta y privacidad

- **Objetivo/actores:** admin recibe y sigue; operador `privacyOperator` ejecuta política.
- **Entrada:** solicitud explícita del titular; configuración/aprobación y autorización
  específica, autenticación reciente y mantenimiento para operaciones privilegiadas.
- **Pasos:** titular confirma solicitud → admin consulta recibo → operador diagnostica y
  revisa bloqueantes → autoriza fingerprint → ejecuta por lotes → seguimiento de estado.
- **Resultado:** proyección administrativa muestra conteo/cursor/estado/tipos de bloqueante;
  no entrega manifiestos ni rutas clínicas. `completed_under_policy` conserva datos que
  la política exige; nunca se presenta como borrado de todos los sistemas/respaldos.
- **Errores/concurrencia:** política ausente, inventario desconocido, retención, cambio del
  manifiesto, lease y ejecución parcial siguen protegidos por el servicio existente.
- **Auditoría:** solicitud, job/manifiesto, autor/fecha de autorización y ejecución;
  categorías nuevas de auditoría requieren decisión de retención explícita.

## Validación y evolución

La [guía de validación](../operations/validation.md) reúne comandos y escenarios
reproducibles. La [matriz](matriz-cierre-piloto.md) concentra pendientes y condiciones
de aceptación; los informes históricos mantienen sus resultados originales.
Las guías de [pagos](../operations/pilot-payments.md),
[privacidad](../operations/pilot-privacy.md) y [release](../operations/pilot-release.md)
definen procedimientos operativos. Cambiar esta referencia no cambia permisos ni
aprueba políticas o despliegues.

## Fecha de atención y correcciones de sesiones

Contrato implementado el 2026-10-15:

- Horario programado: conserva la reserva original. `attendedAt` indica el inicio real
  de atención en ISO; `completedAt` es la fecha automática de registro en servidor y
  `completedBy` identifica al profesional que lo registró. La interfaz muestra Lima.
- Completar exige cita confirmada y hora programada ya alcanzada. Atención no futura;
  si difiere del horario propuesto al menos un minuto, se exige motivo.
- Corregir mantiene realizada y permite cambiar fecha/hora/resumen, con motivo obligatorio,
  versión vigente y profesional vinculado activo, sin plazo máximo. No cambia la fecha
  original de registro ni el horario reservado. Datos antiguos sin atención registrada
  se identifican como tales, sin inventar fecha real.
- Deshacer exige motivo y confirmación explícita de que la sesión no ocurrió. Vuelve a
  confirmada, limpia los datos de atención actuales y conserva los anteriores en historial.
  Se rechaza si otra cita del mismo proceso ya está abierta.
- Cada registro/corrección/deshacer crea un evento inmutable en `longitudinal_history`,
  con valores anteriores/nuevos, motivo, actor y fecha; el paciente puede consultar el
  historial desde el detalle compartido y recibe un aviso interno. No cambia pagos,
  devoluciones, transferencias ni disponibilidad al corregir o deshacer.
- El control de versión y los IDs de operación evitan sobrescrituras y duplicados.
  Admin operativo, paciente y profesionales ajenos no pueden registrar estas acciones.
