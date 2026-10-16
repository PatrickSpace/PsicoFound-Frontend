> Inventario histórico preservado antes de la consolidación del 2026-10-15. Consultar la [referencia vigente por rol](../../functional/revision-funcional-por-rol.md).

# Revisión funcional por rol

Revisión administrativa en curso 2026-10-12: [inventario, hallazgos y aceptación](revision-administrador-piloto-2026-10-12.md). El alcance nuevo incorpora administrador; la exclusión de las revisiones históricas se conserva como antecedente.

Actualización horaria 2026-10-09: el MVP adopta [hora de Lima para toda la agenda](../../functional/politica-horaria-mvp.md),
independiente del país/perfil/dispositivo. Implementación, pruebas y estado de
REV-PAC-04B en el [informe horario](cierre-politica-horaria-mvp.md).

Actualización del paciente 2026-10-07: correcciones REV-PAC-01 a REV-PAC-07 y
compatibilidad ENV-PAC-01 documentadas, con estado de validación y límites, en
[el informe del paciente](cierre-revision-pacientes.md). Las observaciones del
inventario original que siguen abajo no sustituyen ese estado actualizado.

Fecha de revisión: 2026-10-04. Producto: Lurems / PsicoFound.
Actualización de seguimiento: 2026-10-05. PSI-08, PSI-09, PSI-10 y PSI-12
implementados; resultados y alcance de su validación aislada en el
[informe de seguimiento](validacion-procesos-psicologo.md). El resto conserva
el estado del inventario inicial salvo indicación explícita.

Revisión independiente del 2026-10-05: flujos principales verificados; ver
[hallazgos originales y evidencia](revision-independiente-psicologo.md).
Actualización del 2026-10-06: REV-PSI-01 (fecha en opciones) y REV-PSI-02
(correo sintético verificado) cerrados. Dos suites completas aprobadas en
escritorio/móvil, con entorno limpio y Auth persistido; ver
[reporte de cierre y limitaciones](cierre-revision-psicologo.md).

Revisión independiente del paciente del 2026-10-06: avances verificados y siete
hallazgos pendientes. El [reporte del paciente](revision-independiente-pacientes.md)
actualiza el estado por proceso con pruebas en emuladores, escritorio y móvil.
La tabla inicial de PAC y sus gaps se conserva como antecedente.

## Propósito y alcance

Documentar los procesos del psicólogo, paciente y administrador para revisar qué
permite hacer hoy la app, qué resultado produce cada acción y qué falta definir.
Esta revisión desarrolla los frentes del psicólogo y del paciente. El frente
del administrador se incorporará en una siguiente revisión.

Un **proceso** agrupa acciones para conseguir un resultado; una **funcionalidad**
es una acción concreta dentro de ese proceso. Por ejemplo, gestionar una cita
incluye confirmarla, reprogramarla y devolverla a pendiente.

El inventario inicial se basó en lectura de código. La actualización de los
cuatro procesos de seguimiento incluye recorridos autenticados sobre datos
sintéticos en emuladores; no se hicieron operaciones sobre datos reales.
La validación local no demuestra la configuración del entorno publicado.

Estados del inventario:

- **Presente:** hay una acción o consulta conectada al código de persistencia.
- **Parcial:** existe parte del proceso, con una limitación concreta identificada.
- **No expuesto:** no se encontró una acción para el rol revisado en la interfaz
  revisada, aunque pueda existir soporte en servicios o en otro rol.
- La prueba funcional del resto de procesos sigue pendiente; consultar el
  informe enlazado para los escenarios ejecutados de seguimiento.

## Documentación encontrada

Estos documentos aportan antecedentes, pero no sustituyen el inventario actual:

- [Análisis UX de journeys MVP](../mvp/ux-journey-analysis.md): recorrido general por rol.
- [Plan de entrega MVP](../mvp/mvp-delivery-plan.md): alcance previsto y tareas.
- [Registro y onboarding](../../architecture/registration-onboarding.md): solicitud y aprobación profesional.
- [Catálogo de tarifas, fase 1](../payments/rate-catalog.md): configuración de tarifa y reparto.
- [Preparación para lanzamiento](../audits/2026-10-03-launch-readiness.md): límites y verificaciones anteriores.

Cuando el plan y la interfaz difieren, se describe aquí el comportamiento del
código actual. Las decisiones propuestas no se consideran requisitos aprobados.

## Frente 1: psicólogo

### Acceso y navegación actuales

La vista profesional requiere el rol `psychologist` y un perfil de `therapists`
vinculado al UID del usuario. Elegir “Psicólogo/a” al registrarse no concede ese
acceso: se necesita aprobación administrativa. Una cuenta puede conservar
también su acceso como paciente y alternar vistas desde Configuración.

| Entrada visible | Ruta | Uso principal |
| --- | --- | --- |
| Agenda | `/psicologo/sesiones` | Disponibilidad y gestión de citas asignadas |
| Pacientes | `/pacientes` | Listado de pacientes vinculados por terapias |
| Seguimiento | `/progreso` | Objetivos y avances |
| Registros emocionales | `/registro-emocional` | Consulta de registros de pacientes |
| Historial terapéutico | `/historial` | Terapias, citas y eventos del contexto seleccionado |
| Herramientas | `/herramientas` | Asignación de ejercicios |
| Configuración | `/configuracion` | Cuenta, cambio de vista y tarifa |
| Campana y feedback | Barra superior | Avisos y observaciones sobre la app |

En móvil, las tres primeras entradas aparecen directamente y las restantes en
el menú adicional. “Historial terapéutico” no representa un expediente clínico
completo; en la navegación móvil se abrevia como “Historial”.

### Catálogo inicial

| ID | Proceso | Resultado funcional | Estado |
| --- | --- | --- | --- |
| PSI-01 | Solicitar habilitación profesional | Solicitud enviada y acceso sujeto a revisión administrativa | Presente |
| PSI-02 | Acceder y administrar la cuenta | Sesión iniciada, vista elegida y datos personales actualizados | Presente |
| PSI-03 | Gestionar disponibilidad | Bloques de una hora abiertos o cerrados | Presente |
| PSI-04 | Consultar la agenda | Citas asignadas e indicadores visibles | Presente |
| PSI-05 | Gestionar una cita existente | Confirmación, reprogramación o retorno a pendiente | Presente |
| PSI-06 | Preparar el acceso a la sesión remota | Herramienta y enlace externo guardados | Presente |
| PSI-07 | Registrar una sesión realizada | Cita cerrada con resumen compartido opcional | Presente |
| PSI-08 | Consultar pacientes y sus terapias | Terapias actuales/anteriores propias y resumen mínimo autorizado | Implementado; ver validación de seguimiento |
| PSI-09 | Definir objetivos y actualizar avances | Objetivos separados por vista, avances con nota, autor y fecha | Implementado; ver validación de seguimiento |
| PSI-10 | Asignar ejercicios y seguir su cumplimiento | Asignación, realización personal y consulta profesional del resultado | Implementado; ver validación de seguimiento |
| PSI-11 | Revisar registros emocionales | Registros vinculados al profesional disponibles para consulta | Presente |
| PSI-12 | Consultar el historial terapéutico | Terapias, citas, resúmenes y eventos de la misma selección | Implementado; ver validación de seguimiento |
| PSI-13 | Elegir la tarifa profesional | Tarifa del catálogo seleccionada y reparto mostrado | Presente, solo configuración |
| PSI-14 | Consultar notificaciones | Avisos internos abiertos y marcados como leídos | Presente |
| PSI-15 | Enviar observaciones sobre la app | Error, sugerencia o comentario guardado | Presente |

### PSI-01. Solicitar habilitación profesional

- **Objetivo y entrada:** obtener acceso profesional desde el registro o desde
  “Registrarse como psicólogo” en Configuración para una cuenta existente.
- **Acciones actuales:** crear cuenta con Google o correo y contraseña; completar
  nombre profesional, colegiatura, país, especialidades, enfoques, modalidades y
  resumen profesional; enviar la solicitud y consultar su estado. El onboarding
  también ofrece experiencia y ubicación de consulta, entre otros campos.
- **Resultado:** solicitud pendiente; tras aprobación, perfil vinculado y rol
  profesional. El rechazo permite volver al formulario. La pantalla pendiente
  tiene “Revisar estado”; no se presupone actualización automática.
- **Por validar/definir:** paridad entre los dos formularios, corrección tras
  rechazo y acceso después de aprobar sin volver a iniciar sesión. La validación
  de credenciales corresponde al proceso administrativo, no al solicitante.
- **Evidencia:** [onboarding profesional](../../../src/views/onboarding/PsychologistOnboardingView.vue),
  [consulta de estado](../../../src/views/onboarding/PsychologistPendingView.vue),
  [operaciones de registro y revisión](../../../functions/src/onboarding/registrationHandlers.js).

### PSI-02. Acceder y administrar la cuenta

- **Objetivo y entrada:** ingresar por `/login` y gestionar la cuenta desde
  Configuración.
- **Acciones actuales:** iniciar sesión con Google o correo/contraseña, elegir
  una vista autorizada, editar nombre, nacimiento y teléfono, consultar correo,
  nombre profesional y estado del perfil, y cerrar sesión.
- **Resultado:** datos personales guardados y modo de navegación seleccionado.
  El correo se muestra como solo lectura; editar datos personales no equivale
  a editar el perfil público profesional.
- **Por validar/definir:** comportamiento de cuentas con ambos roles y de perfiles
  desactivados. La condición de acceso a la vista comprueba rol y vínculo, pero
  no comprueba `activo`; la selección de tarifa sí bloquea perfiles inactivos.
- **Evidencia:** [login](../../../src/components/auth/LoginForm.vue),
  [contexto de roles](../../../src/store/appContext.js),
  [configuración](../../../src/views/mainviews/ConfiguracionView.vue).

### PSI-03. Gestionar disponibilidad

- **Objetivo y entrada:** publicar horarios reservables desde Agenda → Abrir bloque.
- **Acciones actuales:** elegir fecha, hora de inicio, modalidad remota,
  presencial o híbrida y ubicación; abrir un bloque de 60 minutos; consultar
  bloques disponibles/reservados y cerrar uno disponible.
- **Resultado:** bloque guardado con estado `available`; al reservarlo pasa a
  `booked`; al cerrarlo pasa a `closed`. La interfaz solo ofrece cerrar disponibles.
- **Por validar/definir:** horarios pasados, solapamientos parciales, concurrencia,
  zona horaria y bloques que cruzan medianoche. El servicio comprueba duplicados
  de fecha/hora exactas, no todos los solapamientos. No hay recurrencia semanal
  ni edición directa de un bloque; la vista muestra hasta 18 bloques desde hoy.
- **Evidencia:** [agenda](../../../src/views/psicologo/PsicologoSesionesView.vue),
  [disponibilidad](../../../src/services/availabilityService.js).

### PSI-04. Consultar la agenda

- **Objetivo y entrada:** identificar qué sesiones requieren atención en Agenda.
- **Acciones actuales:** actualizar la lista, buscar por paciente/estado/fecha,
  consultar hora, modalidad y enlace, y ver contadores de citas próximas,
  pacientes activos y enlaces pendientes.
- **Resultado:** tabla construida con las citas incluidas en las terapias
  asignadas al profesional; desde cada fila se accede a las acciones de gestión.
- **Por validar/definir:** “Citas próximas” cuenta pendientes/confirmadas sin
  filtrar fecha; “Pacientes activos” cuenta pacientes de todas las terapias
  cargadas sin filtrar su estado. Acordar el significado de ambos indicadores.
- **Evidencia:** [agenda y sus indicadores](../../../src/views/psicologo/PsicologoSesionesView.vue).

### PSI-05. Gestionar una cita existente

- **Objetivo y entrada:** organizar una cita recibida mediante las acciones de Agenda.
- **Acciones actuales:** confirmar, editar fecha/hora, notas y ubicación, o
  devolver a pendiente. Cambiar fecha u hora devuelve la cita a `pendiente`.
  Confirmar comprueba que no exista otra cita confirmada en la misma terapia.
- **Resultado:** cambio en la cita y su copia dentro de la terapia, con intento
  de registro de historial y avisos según la acción.
- **Por validar/definir:** el profesional introduce fecha/hora libremente; este
  recorrido no elige otro bloque ni actualiza automáticamente la reserva del
  bloque anterior. La modalidad aparece de solo lectura, pese al texto de la
  agenda que sugiere editarla. No hay botón para cancelar una cita o registrar
  inasistencia. “Regresar a pendiente” también está disponible para realizadas.
- **Evidencia:** [acciones de agenda](../../../src/views/psicologo/PsicologoSesionesView.vue),
  [diálogo de cita](../../../src/components/Terapias/CitaDialog.vue),
  [servicio de citas](../../../src/services/citaService.js).

### PSI-06. Preparar el acceso a la sesión remota

- **Objetivo y entrada:** compartir el acceso a la videollamada desde Agregar/Editar link.
- **Acciones actuales:** seleccionar herramienta de videollamada, escribir su
  URL, guardar y abrir el enlace en otra pestaña. Los campos se habilitan para
  la modalidad remota y para psicólogo/administrador.
- **Resultado:** enlace asociado a la cita y disponible para el paciente;
  guardar un enlace nuevo o modificado intenta generar un aviso interno.
- **Por validar/definir:** visibilidad desde la cuenta del paciente, URL inválida,
  modalidad híbrida y política sobre confirmar una cita remota sin enlace.
  La app no crea la reunión ni integra la videollamada: el profesional aporta la URL.
- **Evidencia:** [diálogo de cita](../../../src/components/Terapias/CitaDialog.vue),
  [actualización y avisos](../../../src/services/citaService.js).

### PSI-07. Registrar una sesión realizada

- **Objetivo y entrada:** dejar constancia de atención desde Agenda → Marcar sesión como realizada.
- **Acciones actuales:** abrir el cierre, escribir un resumen compartido opcional
  y marcar la cita como `realizada`.
- **Resultado:** estado, resumen y fecha de cierre guardados en la cita y en la
  terapia; se intenta registrar el evento y avisar al paciente. El historial
  registra que existe resumen, pero no incluye su texto en el evento.
- **Por validar/definir:** puede cerrarse una cita pendiente, sin comprobación de
  fecha de atención. El resumen es compartido, no una nota privada profesional.
  Volver a pendiente no limpia el resumen ni la fecha de cierre anterior.
  Definir correcciones y lectura posterior del resumen por el profesional.
- **Evidencia:** [formulario de cierre](../../../src/views/psicologo/PsicologoSesionesView.vue),
  [persistencia del cierre](../../../src/services/citaService.js).

### PSI-08. Consultar pacientes y sus terapias

- **Objetivo y entrada:** localizar a un paciente asignado desde Pacientes, aunque
  solo tenga terapias anteriores, y seleccionar su proceso.
- **Acciones actuales:** buscar; consultar nombre/correo, citas y estado; elegir
  terapias actuales/anteriores vinculadas al profesional; abrir resúmenes de
  sesiones y continuar a objetivos, herramientas o historial conservando contexto.
- **Resumen inicial:** un callable comprueba identidad, rol y relación con la
  terapia y devuelve exclusivamente motivo, temas, origen y fecha disponibles.
  `profiles` y `conversations` continúan privados para propietario/administrador.
  La lista y el detalle distinguen disponible, ausente, restringido y error.
- **Límite:** no hay alta/reasignación manual ni nuevas facultades sobre citas o
  estados de terapia. No se muestran terapias del paciente con otro profesional.
- **Evidencia:** [pacientes](../../../src/views/PacientesView.vue),
  [detalle de terapia](../../../src/views/terapias/TerapiaDetailView.vue),
  [citas del detalle](../../../src/components/Terapias/TherapyAppointmentsTable.vue).

### PSI-09. Definir objetivos y actualizar avances

- **Objetivo y entrada:** establecer metas y registrar su evolución desde Seguimiento.
- **Acciones actuales:** filtros por paciente/terapia/estado, identificación del
  proceso y contadores del conjunto visible. La vista profesional consulta solo
  sus pacientes; la personal solo el proceso propio.
- **Persistencia:** crear y avanzar mediante transacciones autorizadas. Cada
  avance nuevo conserva porcentaje, nota, autor y fecha en `progress`, junto con
  el evento longitudinal. El 100% determina alcanzado; reducir o reabrir exige
  nota. Una versión obsoleta se rechaza para no sobrescribir avances.
- **Compatibilidad:** las notas antiguas sin historial se conservan aparte sin
  inventar autor/fecha. El profesional solo crea/avanza en terapias activas;
  las anteriores son de consulta. El paciente conserva creación en activas y
  actualización de objetivos propios, incluso anteriores.
- **Cambio de vista:** se limpian formularios, selección, datos y errores; las
  consultas tardías de una generación anterior no publican resultados.
- **Evidencia:** [seguimiento](../../../src/views/mainviews/ProgresoView.vue),
  [objetivos](../../../src/services/therapyGoalService.js).

### PSI-10. Asignar ejercicios y seguir su cumplimiento

- **Objetivo y entrada:** proponer actividades entre sesiones desde Herramientas.
- **Acciones actuales:** seleccionar paciente/terapia y registrar título,
  instrucciones, categoría, frecuencia sugerida y fecha límite.
- **Resultado:** el profesional ve los ejercicios que asignó, con paciente,
  terapia, instrucciones, frecuencia, límite y estado; nuevas asignaciones solo
  en terapias activas. Las anteriores siguen consultables.
- **Realización:** solo el paciente destinatario completa y escribe la
  observación. El profesional usa Actualizar para ver resultado, fecha y nota.
  Escritura y evento longitudinal son atómicos y verificados en backend.
- **Separación:** la cuenta dual ve únicamente ejercicios recibidos en vista
  paciente, sin controles de asignación; filtros, contadores y formularios siguen
  la vista activa. No se implementó edición/retiro ni corrección de respuestas.
- **Evidencia:** [herramientas](../../../src/views/mainviews/HerramientasView.vue),
  [ejercicios](../../../src/services/exerciseService.js).

### PSI-11. Revisar registros emocionales

- **Objetivo y entrada:** consultar lo registrado por sus pacientes entre sesiones
  desde Registros emocionales.
- **Acciones actuales:** leer estado emocional, intensidad, energía, sueño, nota,
  etiquetas y nombre del paciente; consultar cantidad de registros, intensidad
  promedio y último estado registrado.
- **Resultado:** lista de registros asociados al identificador del profesional.
  Crear registros se ofrece al paciente, no al psicólogo en esta vista.
- **Por validar/definir:** los indicadores agregan todos los registros recuperados,
  sin selección individual de paciente ni periodo. Definir si ese agregado aporta
  valor y cómo debería consultarse la evolución de cada paciente.
- **Evidencia:** [registros emocionales](../../../src/views/mainviews/RegistroEmocionalView.vue),
  [servicio de registros](../../../src/services/emotionalCheckinService.js).

### PSI-12. Consultar el historial terapéutico

- **Objetivo y entrada:** reconstruir el proceso desde Historial terapéutico.
- **Acciones actuales:** elegir paciente/terapia y periodo; filtrar tipo de evento;
  consultar las mismas terapias en tablas y línea de tiempo, incluidos procesos
  anteriores y resúmenes compartidos. Se muestran fecha y autor disponibles.
- **Composición:** las tablas reciben datos del contexto común, sin consultas
  personales internas. La tabla de citas reutiliza la tabla de consulta del detalle
  y no ofrece transiciones de estado ni altas desde el historial. Esas acciones
  permanecen en sus flujos específicos (Mis sesiones/detalle/Agenda).
- **Estados:** un fallo de carga no se presenta como ausencia de actividad;
  una lista vacía solo indica que no hay eventos registrados para esos filtros.
  No es un expediente completo con diagnósticos, adjuntos o notas privadas.
- **Evidencia:** [historial](../../../src/views/mainviews/HistorialView.vue),
  [tabla de citas](../../../src/components/Terapias/CitasDatatable.vue),
  [eventos longitudinales](../../../src/services/longitudinalHistoryService.js).

### PSI-13. Elegir la tarifa profesional

- **Objetivo y entrada:** seleccionar una tarifa habilitada por administración en
  Configuración → Mi tarifa.
- **Acciones actuales:** consultar tarifa actual, seleccionar una activa, ver el
  precio en soles y reparto 70% profesional / 30% Lurems, y guardar la elección.
  Si se desactiva la tarifa seleccionada, se muestra un aviso para elegir otra.
- **Resultado:** selección guardada y versionada en el perfil profesional y su
  historial. Se requiere perfil propio activo; el profesional no crea importes
  ni enlaces del catálogo.
- **Límite de alcance:** no cobra, confirma pagos, calcula ingresos cobrados ni
  liquida dinero. Las citas todavía no guardan el importe de esta selección.
  El texto sobre nuevas reservas y conservación de precios anticipa una
  integración futura; no describe una integración ya terminada.
- **Evidencia:** [tarifa profesional](../../../src/components/Payments/PsychologistRateCard.vue),
  [operaciones de tarifas](../../../functions/src/payments/paymentRateHandlers.js),
  [alcance de pagos](../payments/rate-catalog.md).

### PSI-14. Consultar notificaciones

- **Objetivo y entrada:** enterarse de novedades desde la campana de la barra superior.
- **Acciones actuales:** consultar avisos de nuevas citas o cambios realizados
  por el paciente; abrir un aviso, marcarlo como leído y navegar a su destino.
- **Resultado:** avisos persistentes dentro de la app; se consultan los últimos
  20 y el contador de no leídos se calcula sobre ese conjunto.
- **Por validar/definir:** comprobar destinatarios y navegación entre roles.
  Los errores al crear avisos se capturan sin impedir el cambio de la cita;
  guardar una cita no garantiza que se haya entregado su notificación. No se
  encontró envío por correo, SMS, WhatsApp ni recordatorios programados.
- **Evidencia:** [campana](../../../src/components/Navigation/NavBar.vue),
  [notificaciones](../../../src/services/notificationService.js),
  [generación de avisos de citas](../../../src/services/citaService.js).

### PSI-15. Enviar observaciones sobre la app

- **Objetivo y entrada:** reportar un problema o sugerencia desde el botón de feedback.
- **Acciones actuales:** elegir Error, Sugerencia o Comentario, escribir la
  observación y enviarla.
- **Resultado:** observación guardada con identificación del usuario y fecha,
  seguida de confirmación en pantalla.
- **Por validar/definir:** recepción y gestión administrativa. No hay seguimiento
  de tickets o conversación de soporte en este recorrido.
- **Evidencia:** [formulario](../../../src/components/Navigation/FeedbackDialog.vue),
  [persistencia](../../../src/services/feedbackService.js).

### Propuesta inicial conservada como antecedente (implementada en seguimiento)

Esta sección registra el diagnóstico y criterios anteriores a la implementación.
No describe carencias actuales de PSI-08/09/10/12. Su resolución y evidencia están
en las secciones actualizadas arriba y en el [informe de validación](validacion-procesos-psicologo.md).

Fecha: 2026-10-04. Estado: propuesta funcional para discutir, sin implementación.

“Completo” significa que el profesional puede ejecutar y consultar el resultado
del proceso para el paciente y la terapia correctos, con datos persistidos y
permisos comprobados. Las cuatro clasificaciones responden a interrupciones o
inconsistencias concretas del recorrido actual. Las capacidades adicionales
enumeradas más abajo requieren una decisión de alcance propia; por ejemplo, un
expediente clínico completo no es un requisito para corregir la consulta del
historial terapéutico existente.

#### PSI-08: una consulta de pacientes utilizable de principio a fin

**Por qué es parcial.** La lista permite localizar al paciente, pero presenta
“En progreso” y “Sin temas” a partir de datos que no recupera para el profesional.
Además, cuando la terapia deja de estar activa, el acceso al detalle desde esta
lista queda deshabilitado. El recorrido de consulta de antecedentes se interrumpe.

**Propuesta mínima:**

1. Mantener una fila por paciente vinculado al profesional y permitir abrirla
   aunque ya no tenga una terapia activa.
2. Mostrar las terapias de ese paciente con ese profesional, identificadas por
   fecha y estado, para elegir cuál consultar. Conservar el contexto elegido al
   pasar a objetivos, ejercicios e historial.
3. Definir un resumen inicial compartido con los campos acordados para el
   profesional, por ejemplo motivo y temas, con fecha/origen. Su consulta debe
   autorizarse por vínculo con la terapia. Las reglas actuales restringen el
   perfil completo y la conversación al propietario y al administrador; el
   resumen requiere un acceso específico. Mientras no esté disponible, mostrar
   “Resumen no disponible” sin inferir que el paciente no terminó la encuesta.
4. Propuesta de estados: consulta de terapias propias anteriores; creación de
   objetivos y asignación de ejercicios solo en activas. La continuidad de
   acceso al resumen inicial al terminar la relación queda por acordar.

**Criterio de aceptación:** con un paciente que tenga terapias activa y pausada
con el mismo profesional, ambas se pueden abrir y sus datos se distinguen. Un
resumen ausente, restringido o que falló al cargar se identifica correctamente.
El profesional no accede a terapias de ese paciente con otros profesionales.

La creación manual de pacientes y la facultad de pausar/finalizar terapias son
decisiones separadas; no se añaden como condición para completar esta consulta.

#### PSI-09: seguimiento de objetivos identificado y trazable

**Regla acordada:** el contenido y los controles dependen de la vista activa
(psicólogo o paciente), aunque la misma cuenta tenga ambos roles. Esta regla
también aplica a PSI-10.

| Proceso | Vista de psicólogo | Vista de paciente |
| --- | --- | --- |
| Objetivos (PSI-09) | Objetivos de sus pacientes en terapias asignadas al profesional; identificación y filtros por paciente/terapia | Únicamente objetivos de su propio proceso, con sus acciones personales de consulta, creación y actualización según las reglas del proceso |
| Ejercicios (PSI-10) | Ejercicios que asignó a sus pacientes; acciones de asignación y consulta de cumplimiento/observaciones | Únicamente ejercicios asignados a él como paciente; acciones para consultar instrucciones, completar y añadir observaciones |

Títulos, botones, filtros, contadores y estados vacíos deben corresponder a esa
misma vista. Tener el rol profesional no convierte la vista de paciente en una
vista profesional. Esta separación no cambia por sí sola quién puede crear o
actualizar objetivos: esas reglas se mantienen o se acuerdan explícitamente.

**Por qué es parcial.** Se pueden crear objetivos y guardar avances, pero se
mezclan los objetivos del profesional como paciente con los de las personas que
atiende. Las tarjetas omiten el paciente, y el selector admite terapias en
cualquier estado. También se pierde el texto de las notas anteriores al guardar
una nueva nota.

**Propuesta mínima:**

1. En modo profesional, consultar exclusivamente objetivos de terapias asignadas
   a ese profesional. Mostrar paciente y terapia en cada tarjeta. En modo paciente,
   consultar exclusivamente objetivos propios, sin combinar ambas listas.
2. En modo profesional, filtrar por paciente, terapia y estado del objetivo;
   ajustar los contadores a la selección visible. Al entrar desde un paciente,
   conservar esa selección dentro de la vista profesional. En modo paciente,
   los filtros y contadores se limitan al proceso propio.
3. Proponer creación y actualización en terapias activas, con consulta de los
   objetivos de terapias anteriores. Si se necesita corregir un objetivo de una
   terapia inactiva, definir una acción explícita de corrección.
4. Guardar cada avance con porcentaje, nota, autor y fecha para poder consultar
   la evolución. Acordar una regla coherente entre porcentaje y estado: propuesta,
   100% equivale a alcanzado; reabrir requiere registrar el cambio y su motivo.

**Criterio de aceptación:** una cuenta con ambos roles ve los objetivos de las
personas que atiende al activar la vista de psicólogo, y únicamente sus objetivos
personales al activar la vista de paciente. Tras registrar dos avances y
recargar, se conservan ambas notas, autores y fechas en el proceso correcto;
el paciente correspondiente ve el resultado. Los controles y contadores
cambian junto con los datos al alternar la vista.

#### PSI-10: cerrar el ciclo asignación → realización → consulta

**Por qué es parcial.** Asignar un ejercicio funciona en el código, y el paciente
tiene una acción para completarlo. Sin embargo, la lista profesional recuperada
no se representa: tarjetas y contadores muestran los ejercicios del propio
usuario como paciente. Falta el tramo donde el psicólogo revisa el cumplimiento.

**Propuesta mínima:**

1. En vista de psicólogo, mostrar los ejercicios asignados por él, con paciente,
   terapia, instrucciones, frecuencia sugerida, fecha límite y estado. En vista
   de paciente, mostrar únicamente los ejercicios que le asignaron a ese usuario.
2. En vista de psicólogo, filtrar por paciente, terapia y estado. En vista de
   paciente, limitar los filtros al proceso propio. Calcular los contadores y
   estados vacíos sobre los datos de la vista activa.
3. Mantener el registro de realización a cargo del paciente y mostrar al
   profesional la fecha de realización y la observación que haya compartido.
4. Proponer nuevas asignaciones solo en terapias activas; mantener consulta de
   asignaciones anteriores. Permitir actualizar la lista para ver los cambios
   persistidos sin exigir una sincronización en tiempo real para este alcance.

**Criterio de aceptación:** el psicólogo asigna un ejercicio a un paciente, lo ve
como pendiente, el paciente lo completa con una observación y el psicólogo lo
consulta como completado al actualizar. Si el profesional también recibe
ejercicios como paciente, estos aparecen al activar su vista de paciente, donde
puede completarlos; en su vista profesional aparecen los que asignó, con acciones
de asignación y revisión. Ninguna vista combina ambos conjuntos.

Editar instrucciones, retirar asignaciones y añadir una valoración profesional
son posibles ampliaciones. Si se incorporan, deben preservar lo que el paciente
ya respondió; no son necesarias para corregir el ciclo básico descrito.

**Validación común del cambio de vista (PSI-09 y PSI-10):** alternar entre
psicólogo y paciente, incluso durante una carga, no debe dejar datos, contadores,
selecciones o formularios del contexto anterior en la nueva vista. Una respuesta
tardía de la consulta anterior no debe reemplazar los datos de la vista activa.
No se deben guardar cambios sobre un paciente seleccionado en la vista anterior.
Comprobar también acceso directo a estas rutas, recarga y estado vacío en cada
vista. La selección de vista determina la experiencia; los permisos de datos
siguen validándose por identidad y vínculo con el proceso.

#### PSI-12: un historial consistente del paciente y la terapia elegidos

**Por qué es parcial.** La línea de tiempo usa terapias asignadas al profesional,
pero “Sesiones y citas” consulta las terapias del usuario como paciente. Además,
“Terapias registradas” sustituye la lista por un aviso en modo profesional. Las
secciones de una misma pantalla no representan el mismo conjunto de datos.

**Propuesta mínima:**

1. Usar el mismo contexto de profesional, paciente y terapia para las tres
   secciones: terapias, sesiones y línea de tiempo.
2. Mostrar terapias activas y anteriores vinculadas al profesional, con acceso a
   sus citas, estado y resumen compartido de cada sesión cuando exista.
3. Incorporar filtros por paciente, terapia, periodo y tipo de evento, y permitir
   abrir el elemento de origen cuando tenga detalle disponible.
4. Mostrar fecha y responsable de los cambios cuando estén registrados. Hacer
   visibles los fallos de carga o registro y evitar presentar una línea vacía
   como prueba de que nunca hubo actividad. No reconstruir notas o eventos que
   no se conservaron.

**Criterio de aceptación:** al seleccionar una terapia, sus citas y eventos
corresponden al mismo paciente y profesional; se puede abrir un resumen de sesión
y consultar una terapia anterior. La cuenta con doble rol no mezcla aquí sus
sesiones personales. Un tercero sin vínculo no puede consultar esos datos.

Para este alcance, se propone el nombre “Historial terapéutico”, coherente con
lo disponible. Diagnósticos, adjuntos y notas privadas requerirían definir otro
proceso si se decide incorporar un expediente clínico.

#### Orden propuesto y condición de cierre

1. Separar las consultas por rol y establecer el contexto de paciente/terapia;
   esto corrige la causa común de PSI-09, PSI-10 y PSI-12.
2. Completar la consulta de pacientes y terapias anteriores, incluyendo el
   contrato de datos del resumen inicial en PSI-08.
3. Conectar la consulta de ejercicios realizados y unificar las secciones del
   historial; completar identificación y trazabilidad de objetivos.
4. Ejecutar los criterios de aceptación con un profesional que también tenga
   rol paciente, dos pacientes atendidos, una terapia inactiva y una cuenta sin
   vínculo. Comprobar persistencia al recargar y permisos de lectura/escritura.

Cada proceso pasará de parcial a completo cuando su alcance esté acordado, el
recorrido se pueda terminar desde ambas cuentas involucradas y las pruebas
funcionales y de permisos relevantes estén aprobadas. La presente documentación
no modifica los permisos ni el comportamiento de la app.

### Capacidades no expuestas al psicólogo en la interfaz revisada

Se registran para discutir el alcance, sin asumir que deban implementarse todas:

| Capacidad | Situación actual |
| --- | --- |
| Crear una cita por cuenta del paciente | La creación se ofrece desde modo paciente; la agenda profesional edita existentes |
| Cancelar una cita o registrar inasistencia | No se encontró acción profesional; el color/estado `cancelada` por sí solo no constituye un flujo |
| Pausar, reactivar o cancelar una terapia | Botones visibles solo en modo paciente |
| Dar alta o finalizar formalmente una terapia | No se encontró proceso profesional de alta terapéutica |
| Editar el perfil público profesional | Configuración muestra nombre/estado; editar especialidades, enfoques y otros datos está en administración |
| Gestionar expediente y notas privadas | Hay resumen compartido y eventos; no se encontró expediente clínico completo |
| Gestionar cobros, ingresos y liquidaciones | Solo selección de tarifa disponible |
| Programar horarios recurrentes o sincronizar calendarios | Disponibilidad manual por bloques |
| Recuperar contraseña o cambiar correo desde la app | No se encontró flujo implementado en las pantallas revisadas |

### Decisiones funcionales pendientes

| ID | Decisión por acordar | Procesos afectados |
| --- | --- | --- |
| DEF-01 | Quién puede crear, cancelar y reprogramar citas; cómo se conserva la disponibilidad al hacerlo | PSI-03, PSI-05 |
| DEF-02 | Facultades para pausar/finalizar/reactivar: fuera de esta tarea. Consulta de procesos anteriores ya implementada | PSI-08 |
| DEF-03 | Resumen mínimo de motivo/temas y resúmenes compartidos implementados. Notas privadas fuera de alcance | PSI-07, PSI-08, PSI-12 |
| DEF-04 | Separación por vista y filtros implementados en objetivos/ejercicios/historial; queda revisión específica de emociones | PSI-11 |
| DEF-05 | Qué acciones quedan disponibles si se desactiva el perfil profesional | PSI-02 y operaciones profesionales |
| DEF-06 | Qué significa sesión realizada, si requiere confirmación previa y cómo se corrige un cierre | PSI-05, PSI-07 |
| DEF-07 | Si esta revisión incluye completar cobros o se mantiene el alcance de configuración de tarifa | PSI-13 |

### Recorrido propuesto para la siguiente validación

Usar cuentas de prueba separadas para profesional, paciente y administrador,
con datos sintéticos. Registrar resultado real, evidencia e incidencia; esta
lista no indica que las pruebas ya se hayan realizado.

| Prueba | Recorrido | Resultado a comprobar | Estado |
| --- | --- | --- | --- |
| QA-PSI-01 | Solicitar acceso → revisar pendiente/rechazo → aprobar como administrador → entrar como psicólogo | Rol, vínculo y navegación correctos | Pendiente |
| QA-PSI-02 | Abrir disponibilidad → paciente reserva → profesional consulta agenda | Misma fecha/hora/paciente y bloque reservado | Pendiente |
| QA-PSI-03 | Confirmar → agregar enlace → paciente consulta sesión y aviso | Estado, URL y notificaciones consistentes | Pendiente |
| QA-PSI-04 | Reprogramar → revisar horario anterior y nuevo desde ambos roles | Detectar y resolver la desincronización potencial de bloques | Pendiente |
| QA-PSI-05 | Marcar realizada con resumen → consultar desde paciente y profesional → volver a pendiente | Estado y resumen visibles donde corresponda; corrección coherente | Pendiente |
| QA-PSI-06 | Buscar paciente → abrir terapia → repetir con terapia pausada | Acceso correcto a asignados y antecedentes | Ejecutado en emuladores; escenario A |
| QA-PSI-07 | Crear objetivo → registrar avance → alcanzar objetivo | Paciente, terapia y avances persistidos sin mezcla de vistas | Ejecutado en emuladores; escenarios B/E |
| QA-PSI-08 | Asignar ejercicio → paciente completa y anota → profesional revisa | Resultado compartido persistido | Ejecutado en emuladores; escenario C |
| QA-PSI-09 | Paciente registra emoción → psicólogo consulta emociones e historial | Datos del paciente correcto y eventos asociados | Pendiente |
| QA-PSI-10 | Elegir tarifa → recargar → administrador desactiva opción | Selección persistida y aviso; sin asumir cobro de citas | Pendiente |
| QA-PSI-11 | Cambiar vista → editar cuenta → abrir aviso → enviar feedback → cerrar sesión | Operaciones compartidas y navegación coherentes | Pendiente |
| QA-PSI-12 | Cuenta profesional sin pacientes, con ambos roles y con perfil inactivo; acceso a terapia ajena | Estados vacíos claros y permisos verificados | Doble rol, selección vacía y acceso ajeno ejecutados; perfil inactivo y cuenta sin vínculos pendientes |

Repetir los recorridos principales en escritorio y móvil. La revisión de
permisos debe comprobar acceso permitido y rechazado; ocultar un botón o filtrar
una lista no demuestra aislamiento de datos en Firestore.

## Frente 2: paciente

Inventario inicial: 2026-10-04. Actualización de seguimiento: 2026-10-05.
La integración de resumen, objetivos y ejercicios está conectada a las vistas y
se probó con identidades sintéticas en emuladores, sin operaciones reales.
Los resultados específicos están en el informe de seguimiento; no se extienden
a registro, reserva, pagos ni al resto de gaps del inventario.

### Alcance y regla de vista activa

El recorrido disponible es: registro y datos básicos → encuesta conversacional
→ recomendaciones → reserva → consulta de sesión/enlace → seguimiento con
objetivos, ejercicios, registros emocionales e historial.

Una cuenta con ambos roles debe ver exclusivamente su proceso personal cuando
esté en vista de paciente. En objetivos conserva sus acciones personales de
consulta, creación y actualización; en ejercicios consulta lo que le asignaron,
lo completa y añade observaciones. La separación acordada para PSI-09 y PSI-10
también aplica a botones, filtros, contadores y formularios al alternar vistas.

La navegación del paciente contiene Home, Mis sesiones, Registro emocional,
Progreso en terapia, Herramientas aprendidas e Historial terapéutico. Desde la
barra superior accede a Configuración, notificaciones y feedback.

### Catálogo de funcionalidades y gaps

“Presente” describe una funcionalidad conectada en el código; puede tener límites
o mejoras pendientes sin que eso interrumpa su recorrido básico. “Parcial” señala
una inconsistencia o tramo faltante concreto. Una capacidad no expuesta no se
convierte automáticamente en requisito de implementación.

| ID | Proceso | Funcionalidades actuales | Estado | Gaps relacionados |
| --- | --- | --- | --- | --- |
| PAC-01 | Registrarse e iniciar sesión | Google o correo/contraseña; intención de cuenta paciente; aceptación visual de términos | Presente con límites | GAP-PAC-01 |
| PAC-02 | Completar y administrar su cuenta | Onboarding con nombre, nacimiento, teléfono, país y zona horaria; editar nombre/nacimiento/teléfono; cambiar vista autorizada y cerrar sesión | Presente con límites | GAP-PAC-01 |
| PAC-03 | Completar y reiniciar la encuesta | Conversar, responder opciones, ver resumen de perfil, reanudar la sesión guardada y reiniciar | Presente con límites | GAP-PAC-02 |
| PAC-04 | Elegir un psicólogo recomendado | Hasta cinco perfiles con descripción, especialidades, enfoques y modalidades; acceso a reserva | Parcial | GAP-PAC-03 |
| PAC-05 | Reservar una cita | Elegir bloque disponible de una hora; crear terapia si corresponde; reservar bloque y registrar cita pendiente | Parcial | GAP-PAC-04, GAP-PAC-05 |
| PAC-06 | Reprogramar o cancelar una cita | Elegir otro bloque; liberar el anterior en el recorrido de reprogramación; regresar a pendiente | Parcial: cancelación no expuesta | GAP-PAC-04, GAP-PAC-05, GAP-PAC-06 |
| PAC-07 | Consultar sus sesiones y acceder a la sesión remota | Próxima cita, estado, fecha/hora, modalidad, ubicación y enlace externo aportado por el profesional | Parcial | GAP-PAC-05, GAP-PAC-07 |
| PAC-08 | Gestionar su terapia y cambiar de profesional | Consultar detalle; pausar, cancelar y reactivar; iniciar otra terapia tras dejar la actual inactiva | Parcial | GAP-PAC-06 |
| PAC-09 | Gestionar objetivos y avances personales | Crear en terapia activa; registrar cada avance con nota, autor y fecha; conservar acciones personales anteriores | Implementado y probado en seguimiento | GAP-PAC-08 actualizado |
| PAC-10 | Realizar ejercicios asignados | Consultar instrucciones/frecuencia, completar y observar; resultado visible al profesional tras actualizar | Implementado y probado en seguimiento | PSI-10 completado en su alcance |
| PAC-11 | Registrar y consultar emociones | Estado emocional, intensidad, energía, sueño, etiquetas y nota; lista e indicadores personales | Presente con límites | GAP-PAC-09 |
| PAC-12 | Consultar historial y resúmenes | Línea de tiempo, terapias anteriores, citas, notas y resúmenes compartidos de sesión | Parcial | GAP-PAC-10 |
| PAC-13 | Recibir y abrir notificaciones | Avisos internos de confirmación, reprogramación, enlace y sesión realizada; marcar leído y navegar | Presente con límites | GAP-PAC-07 |
| PAC-14 | Enviar feedback | Reportar error, sugerencia o comentario con confirmación de guardado | Presente, envío básico | GAP-PAC-11 |
| PAC-15 | Solicitar acceso profesional con la misma cuenta | Enviar solicitud desde Configuración, consultar pendiente/rechazo y acceder a vista profesional al aprobar | Presente | Validar continuidad del proceso personal; ver PSI-01 |
| PAC-16 | Pagar y consultar cobros | No hay recorrido de pago del paciente ni importe de tarifa incorporado a la cita | No expuesto | GAP-PAC-12 |
| PAC-17 | Acceder a ayuda ante una señal de riesgo | Redirección a una pantalla con recursos externos cuando el perfil activa la señal de riesgo | Presente; validación específica pendiente | GAP-PAC-02 |

### GAP-PAC-01. Recuperación de acceso y gestión de cuenta incompletas

**Hechos observados:** hay registro e inicio de sesión, pero no se encontró flujo
de recuperación de contraseña ni verificación de correo en la app. El correo
es de solo lectura en Configuración; tampoco hay eliminación de cuenta/datos ni
exportación desde la interfaz. País y zona horaria se guardan en onboarding,
pero no se editan en el formulario actual de Configuración.

La casilla de términos no enlaza documentos y `finalizeRegistration` no guarda
versión ni fecha de aceptación. La fecha de nacimiento se recoge, pero no hay
una regla de elegibilidad por edad aplicada en ese handler de onboarding.

**Impacto:** una persona que pierde la contraseña carece de un recorrido de
recuperación dentro de la app; aceptación y opciones de cuenta tienen un alcance
menor al que sugiere la pantalla. Estos son hechos de producto, no una evaluación
legal de los documentos ni de edades permitidas.

**Propuesta:** priorizar recuperación de acceso y documentos accesibles con
aceptación trazable; acordar elegibilidad y el alcance de edición/eliminación de
cuenta. Mantener separadas la modificación de datos personales y las credenciales
de autenticación.

**Evidencia:** [registro](../../../src/components/auth/SignUpForm.vue),
[login](../../../src/components/auth/LoginForm.vue),
[onboarding](../../../src/views/onboarding/PatientOnboardingView.vue),
[handlers](../../../functions/src/onboarding/registrationHandlers.js),
[configuración](../../../src/views/mainviews/ConfiguracionView.vue).

### GAP-PAC-02. Encuesta: corrección, recuperación de fallos y reinicio

**Hechos observados:** el resumen de perfil es de consulta; corregir preferencias
requiere conversar o reiniciar, sin formulario de edición directa. Un mensaje
fallido queda como “No enviado”, pero no tiene un botón de reintento individual.
Algunos errores de IA remiten al paciente a logs de Firebase Functions.

La sesión conversacional tiene duración configurada de cinco minutos; el backend
resuelve una nueva sesión al continuar una vencida. Reiniciar sustituye el perfil
actual y cambia la sesión, pero no borra la colección de mensajes históricos.
No debe describirse como eliminación de datos.

La ayuda ante riesgo se activa mediante el perfil y una ruta con `crisis=1`.
La existencia de esa pantalla no demuestra que la detección o sus recursos
externos estén validados. Esta revisión no verificó la vigencia de esos recursos.

**Propuesta:** facilitar la corrección del resumen, un reintento claro y mensajes
de error accionables para el paciente; explicar qué conserva el reinicio y qué
sucede al vencer la sesión. Validar la entrada a ayuda, fallos del proveedor y
continuidad de acceso a recursos mediante un recorrido específico.

**Evidencia:** [encuesta](../../../src/components/encuesta/ConversationalSurvey.vue),
[errores de conversación](../../../src/services/conversationService.js),
[reinicio](../../../functions/src/chat/profileChatHandlers.js),
[sesión](../../../functions/src/chat/session.js),
[configuración temporal](../../../functions/src/config.js),
[pantalla de ayuda](../../../src/views/encuesta/ElegirTerapeuta.vue).

### GAP-PAC-03. Elección de profesional sin salida suficiente ante resultados vacíos

**Hechos observados:** se devuelven hasta cinco profesionales activos con algún
bloque disponible desde hoy. La clasificación usa un puntaje: coincidir en un
criterio puede bastar, sin exigir todas las preferencias ni que el bloque abierto
coincida con la modalidad deseada.

La búsqueda por nombre y el botón de perfil ampliado están comentados. Si no hay
resultados, la principal acción ofrecida es reiniciar la encuesta; no hay control
explícito para repetir la búsqueda conservando el perfil ni ajustar filtros. Un
error de consulta también deja la lista vacía y puede convivir con el mensaje
“No hay horarios disponibles”.

**Propuesta:** distinguir error, falta de afinidad y falta de disponibilidad;
permitir reintentar conservando respuestas y ajustar preferencias. Acordar cuáles
son preferencias flexibles y cuáles son requisitos obligatorios. Consultar el
detalle útil del profesional antes de reservar es una ampliación a definir.

**Evidencia:** [recomendaciones](../../../src/views/encuesta/ElegirTerapeuta.vue),
[tarjetas](../../../src/components/encuesta/TerapeutaLista.vue),
[candidatos disponibles](../../../functions/src/matching/recommendTherapists.js),
[criterio de afinidad](../../../functions/src/matching/therapistMatching.js).

### GAP-PAC-04. Reserva y reprogramación no forman una operación completa única

**Hechos observados:** reservar un bloque y crear su cita sí utiliza transacción.
Sin embargo, la creación de terapia, la comprobación de otra cita abierta y la
copia de la cita en la terapia ocurren fuera de esa transacción. La agenda y las
vistas personales leen esa copia dentro de la terapia.

En reprogramación, reservar el bloque nuevo y liberar el anterior ocurre en una
transacción; después se actualizan cita y copia en terapia por separado.

**Impacto:** un fallo intermedio puede dejar un bloque reservado y una cita que
la vista no refleja correctamente, o una terapia creada sin completar la reserva.
La prevención de dos citas abiertas por terapia necesita validación de concurrencia;
no basta con la comprobación previa del cliente. Son riesgos inferidos de la
secuencia de escrituras; no se reprodujeron fallos en un entorno conectado.

**Propuesta:** completar reserva/reprogramación de forma consistente, incluyendo
la restricción de cita abierta y recuperación segura ante reintentos. Probar
fallos entre pasos y dos solicitudes simultáneas, además del recorrido exitoso.

**Evidencia:** [operaciones de citas](../../../src/services/citaService.js),
[persistencia de terapias](../../../src/services/terapiaService.js).

### GAP-PAC-05. Horarios pasados y zona horaria sin criterio uniforme

**Hechos observados:** la disponibilidad del cliente y la próxima cita se filtran
desde el inicio del día, no desde la hora actual; un horario que ya pasó hoy
puede seguir apareciendo. Las transacciones de reserva revisan disponibilidad y
profesional, pero no rechazan por fecha/hora pasada.

El backend de recomendaciones calcula “hoy” en Lima; el cliente interpreta las
fechas con la zona del dispositivo. Aunque se guarda `zonaHoraria` en el usuario,
las citas conservan fecha/hora como cadenas sin una conversión común en estos
recorridos.

**Propuesta:** definir la zona de la cita, mostrarla y usar el instante real en
la disponibilidad, la reserva y la próxima sesión. Diferenciar próximas,
pasadas sin cerrar y realizadas, sin ocultar una cita que aún necesita resolución.

**Evidencia:** [disponibilidad](../../../src/services/availabilityService.js),
[recomendaciones](../../../functions/src/matching/recommendTherapists.js),
[citas](../../../src/services/citaService.js),
[Mis sesiones](../../../src/views/mainviews/MisSesionesView.vue),
[Home](../../../src/views/mainviews/DashboardView.vue).

### GAP-PAC-06. Cancelar una cita y cambiar el estado de terapia son procesos distintos

**Hechos observados:** el paciente puede reprogramar, pero no tiene una acción
para cancelar una cita individual. En detalle de terapia sí puede pausar,
cancelar o reactivar el proceso. `updateTherapyStatus` solo cambia el estado de
la terapia y su fecha de actualización: no resuelve citas abiertas, libera bloques
ni genera un evento o aviso al profesional.

La consulta de próxima cita en Mis sesiones incluye citas de todas sus terapias,
sin excluir las pausadas/canceladas. Además, una cita pendiente de un día anterior
puede impedir reservar otra por la regla de cita abierta aunque ya no aparezca
como próxima.

**Propuesta:** acordar qué pasa con cada cita al pausar/cancelar una terapia;
definir cancelación individual, liberación del horario y aviso a los participantes.
Resolver citas vencidas y permitir iniciar otro proceso sin perder antecedentes.
Finalizar una terapia por alta es una decisión adicional de alcance.

**Evidencia:** [detalle](../../../src/views/terapias/TerapiaDetailView.vue),
[cambio de estado](../../../src/services/terapiaService.js),
[restricción de cita abierta](../../../src/services/citaService.js),
[próxima sesión](../../../src/views/mainviews/MisSesionesView.vue).

### GAP-PAC-07. Avisos y datos de sesión pueden quedar desactualizados

**Hechos observados:** la campana escucha notificaciones, pero Home y Mis sesiones
cargan las terapias al entrar/cambiar usuario o guardar desde su propio diálogo;
no escuchan cambios del profesional. Recibir el aviso no actualiza por sí mismo
la cita o su enlace en una pantalla ya abierta. Ir a la misma ruta desde un aviso
no garantiza volver a ejecutar esa carga.

Al fallar Home o Mis sesiones, se vacían datos y se registra el error en consola,
sin un estado específico de error en esas vistas. La creación de avisos es de
mejor esfuerzo: su fallo no impide guardar la cita. La campana consulta los
últimos 20 y cuenta no leídos solo en ese conjunto. No hay recordatorios por
correo/SMS/WhatsApp o programados.

**Propuesta:** actualizar la consulta al recibir/abrir avisos o proporcionar una
actualización explícita; distinguir carga fallida de ausencia de terapia/citas.
Definir la confiabilidad requerida para avisos y el alcance de recordatorios.
Probar especialmente una sesión cuyo enlace agrega el profesional mientras el
paciente permanece en la pantalla.

**Evidencia:** [Home](../../../src/views/mainviews/DashboardView.vue),
[Mis sesiones](../../../src/views/mainviews/MisSesionesView.vue),
[tarjeta de sesión](../../../src/components/Terapias/NextAppointmentCard.vue),
[campana](../../../src/components/Navigation/NavBar.vue),
[notificaciones](../../../src/services/notificationService.js).

### GAP-PAC-08. Continuidad e identificación del seguimiento personal

**Actualización 2026-10-05:** resuelta la separación por vista activa, identificación
y filtro por terapia, historial persistente de avances y visualización de la
frecuencia. Se mantienen creación personal en terapia activa y avances propios
en terapias anteriores; solo el paciente completa ejercicios. No se añade edición
de una respuesta ya completada. Escenarios B/C/E y pruebas directas documentados
en el [informe de validación](validacion-procesos-psicologo.md).

**Diagnóstico inicial conservado:** en vista paciente, las consultas de objetivos y ejercicios
son por su UID y recuperan sus distintos procesos. Las tarjetas no identifican
claramente terapia/profesional ni ofrecen filtros por proceso. En objetivos,
`lastNote` reemplaza la nota anterior y los eventos no conservan su texto; el
porcentaje 100 y el checkbox de alcanzado pueden guardarse sin una regla uniforme.
La acción de actualizar un objetivo no comprueba que su terapia siga activa.

En ejercicios sí existe el recorrido personal de completar y observar, pero la
frecuencia guardada no se muestra en la tarjeta y no hay corrección de la respuesta
desde la UI tras completar. El seguimiento por el psicólogo depende del gap PSI-10.
Estas limitaciones no significan que los ejercicios personales se consulten con
el identificador del profesional en la vista paciente: esa consulta sí usa su UID.

**Propuesta:** preservar las acciones personales acordadas, identificar el proceso
y conservar historial de avances. Mostrar frecuencia y definir si se permite
corregir respuestas o trabajar sobre terapias inactivas. Validar el cambio de vista
con una cuenta de doble rol y solicitudes pendientes, según la regla de PSI-09/10.

**Evidencia:** [objetivos](../../../src/views/mainviews/ProgresoView.vue),
[persistencia de avances](../../../src/services/therapyGoalService.js),
[herramientas](../../../src/views/mainviews/HerramientasView.vue),
[ejercicios](../../../src/services/exerciseService.js).

### GAP-PAC-09. Alcance y visibilidad del registro emocional poco explícitos

**Hechos observados:** crear requiere terapia activa en la interfaz; el paciente
puede consultar sus registros anteriores. La nota se etiqueta “Nota personal”,
pero el psicólogo vinculado al registro puede leerla. La lista del paciente agrega
registros de distintos procesos sin filtro por terapia/periodo. No hay edición
ni borrado desde la UI, y las reglas tampoco los permiten.

**Propuesta:** indicar que la nota se comparte con el profesional vinculado al
registro; mostrar proceso y fecha de manera útil y definir filtros. Acordar si
se permite registrar sin terapia activa o corregir un registro; ambas serían
ampliaciones, no fallos de guardado demostrados.

**Evidencia:** [registro emocional](../../../src/views/mainviews/RegistroEmocionalView.vue),
[datos almacenados](../../../src/services/emotionalCheckinService.js),
[permisos](../../../firestore.rules).

### GAP-PAC-10. Historial expone acciones profesionales al paciente

**Actualización 2026-10-05:** el historial ahora es de consulta. Sus tablas reciben
el mismo contexto que la línea de tiempo y no exponen transiciones de cita ni
altas. Se eliminaron métricas que confundían citas con sesiones realizadas.
Los eventos nuevos de objetivos/ejercicios se guardan atómicamente. Esta tarea no
implementa ni acredita la matriz general de citas/terapias: su autorización
completa sigue siendo un trabajo separado y no se infiere del ocultamiento.

**Diagnóstico inicial conservado:** `HistorialView` incluye `CitasDatatable`. Esta tabla muestra
Confirmar cita, Marcar como realizada y Volver a pendiente sin condición de rol;
los handlers llaman a los mismos servicios utilizados por la agenda profesional.
Las reglas del repositorio permiten actualizar citas/terapias propias sin
restringir suficientemente esos campos y transiciones por rol. No se verificó
la correspondencia con las reglas desplegadas ni se ejercitaron esas acciones.

Además, “Sesiones” en la tabla de terapias cuenta todas las citas, aunque estén
pendientes; la línea de tiempo no tiene filtros y varios fallos de registro de
eventos se capturan sin hacer fallar la operación principal.

**Impacto:** la consulta de antecedentes contiene controles que contradicen la
responsabilidad profesional descrita en el recorrido. Los contadores y eventos
tampoco deben interpretarse como prueba de todas las atenciones efectivamente realizadas.

**Propuesta prioritaria:** acordar y aplicar la matriz de transiciones por rol en
UI y autorización; conservar consulta, resumen y acciones personales permitidas.
Corregir métricas, identificar procesos y validar integridad del historial.
La prueba debe incluir intentos directos de modificar estados, no solo botones ocultos.

**Evidencia:** [historial](../../../src/views/mainviews/HistorialView.vue),
[tabla y acciones](../../../src/components/Terapias/CitasDatatable.vue),
[contador de sesiones](../../../src/components/Terapias/TerapiasDatatable.vue),
[servicios](../../../src/services/citaService.js),
[reglas](../../../firestore.rules).

### GAP-PAC-11. Feedback disponible; soporte con seguimiento no expuesto

**Hechos observados:** el formulario guarda error/sugerencia/comentario y confirma
el envío. El paciente no consulta su estado ni recibe una respuesta dentro de
este recorrido. No es una conversación con el psicólogo ni un sistema de tickets.

**Propuesta:** mantenerlo como envío de feedback si ese es el alcance. Si se
requiere soporte para problemas de citas o acceso, definir canal, recepción y
seguimiento como un proceso adicional.

**Evidencia:** [formulario](../../../src/components/Navigation/FeedbackDialog.vue),
[persistencia](../../../src/services/feedbackService.js).

### GAP-PAC-12. Pago del paciente pendiente de implementación

**Hechos observados:** existe catálogo administrativo y selección de tarifa
profesional, pero las recomendaciones y la reserva no muestran una cotización
conectada al cobro; la cita no guarda importe/versionado de tarifa ni pago.
No hay comprobantes, estado de pago, devolución ni historial de cobros del paciente.

**Propuesta:** conservar este gap como alcance comercial separado. Si se acuerda
habilitar pagos, definir cotización previa, registro de operación, confirmación,
reserva y cancelación/reembolso como un flujo completo. La ausencia es consistente
con el MVP de citas sin pago; no es una regresión de esa funcionalidad.

**Evidencia:** [alcance de pagos](../payments/rate-catalog.md),
[reserva](../../../src/services/citaService.js),
[tarjetas de recomendación](../../../src/components/encuesta/TerapeutaLista.vue).

### Prioridad propuesta para discutir

1. **Acciones y consistencia:** GAP-PAC-10 (acciones profesionales desde paciente),
   GAP-PAC-04 (reserva/reprogramación), GAP-PAC-05 (horarios) y GAP-PAC-06 (citas al
   cambiar estado de terapia). Afectan el recorrido central de una sesión.
2. **Continuidad de uso:** GAP-PAC-07 (datos actualizados y errores), GAP-PAC-03
   (salida cuando no hay recomendaciones), recuperación de acceso de GAP-PAC-01
   y trazabilidad de objetivos de GAP-PAC-08.
3. **Definición explícita:** aceptación y opciones de cuenta, continuidad de encuesta,
   visibilidad de notas emocionales y alcance de soporte. La validación específica
   de ayuda ante riesgo sigue pendiente y no se sustituye por pruebas de navegación.
4. **Alcance comercial separado:** GAP-PAC-12. Resolver primero si esta iteración
   incluye cobros; no incorporarlos por inferencia a los otros procesos.

### Validación funcional propuesta

QA-PAC-08/09 están cubiertos por los escenarios de seguimiento B/C/E y sus
pruebas de persistencia. QA-PAC-11 tiene cubierta la consulta sin controles
profesionales; la matriz general de transiciones no se acredita aquí.
El resto sigue pendiente de su validación específica. Usar entorno aislado y
datos sintéticos, y registrar resultado real y evidencia.

| Caso | Recorrido | Comprobación |
| --- | --- | --- |
| QA-PAC-01 | Registro → onboarding → salir/entrar | Datos conservados, vista paciente y navegación correctas; verificar opciones de recuperación disponibles |
| QA-PAC-02 | Encuesta → recarga → fallo de envío → reinicio/vencimiento | Mensajes y perfil coherentes con sesión; errores comprensibles; no presentar reinicio como borrado de datos |
| QA-PAC-03 | Recomendaciones con coincidencias, sin disponibilidad y con error de consulta | Estados diferenciados y forma de continuar sin perder respuestas innecesariamente |
| QA-PAC-04 | Dos pacientes intentan el mismo bloque; dos reservas del mismo paciente en distintos bloques | Consistencia de cita, terapia y disponibilidad; restricción de cita abierta y reintentos |
| QA-PAC-05 | Reprogramar con fallo entre pasos; repetir en otra zona horaria y con horario pasado hoy | Reserva anterior/nueva coherentes y horario correcto |
| QA-PAC-06 | Profesional confirma/agrega enlace mientras paciente mantiene Mis sesiones abierto | El paciente recibe aviso y puede consultar datos actuales y abrir el enlace |
| QA-PAC-07 | Pausar/cancelar terapia con cita abierta; intentar iniciar otra | Comportamiento acordado de citas/bloques y conservación de antecedentes |
| QA-PAC-08 | Crear objetivo → dos avances → recarga; completar ejercicio con observación | Autoría/proceso identificables, persistencia y resultado consultable por el profesional |
| QA-PAC-09 | Alternar vistas con cuenta de doble rol y una carga pendiente | Objetivos, ejercicios, acciones, contadores y formularios pertenecen a la vista activa |
| QA-PAC-10 | Registro emocional → consulta desde paciente y profesional | Alcance compartido claro y acceso correcto; comportamiento ante terapia inactiva |
| QA-PAC-11 | Consultar historial e intentar confirmar/cerrar/restablecer cita desde paciente | Matriz de acciones por rol aplicada también a operaciones directas sobre datos |
| QA-PAC-12 | Fallo de carga en Home/Mis sesiones y apertura de notificación en la misma ruta | Error diferenciado de vacío; posibilidad de recuperar datos actualizados |
| QA-PAC-13 | Entrada a ayuda y error de IA/recomendaciones con datos sintéticos | Acceso a la pantalla y manejo de fallos; validación del contenido/recursos registrada por separado |

Repetir los recorridos principales en escritorio y móvil. No se marca ningún gap
como resuelto hasta acordar su alcance, implementar el comportamiento y obtener
evidencia de la validación correspondiente.

## Frente 3: administrador

Pendiente de inventario y definición. Incluir la aprobación profesional y el
catálogo de tarifas como dependencias de los procesos del psicólogo.
