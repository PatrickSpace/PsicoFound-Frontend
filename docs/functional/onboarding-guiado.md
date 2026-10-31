# Plan de onboarding guiado para Lurems

Fecha de propuesta: **27 de octubre de 2026**, America/Lima.
Implementación: **29 de octubre de 2026**. La evidencia de publicación y pruebas se
registra en [validación de la entrega](../operations/onboarding-2026-10-29.md).

Actualización visual del **30 de octubre de 2026**: ambas guías usan fondo oscurecido,
el elemento real iluminado y una explicación junto a él. También se aplica a las
cuatro tareas de preparación profesional. Se conserva el progreso por rol y los
controles de servidor para revisión, tarifa, horarios y activación. Véase la
[validación unificada](../operations/onboarding-unificado-2026-10-30.md).

### Alcance de la implementación

Se implementaron las cuatro tareas profesionales, la revisión final, activación y
pausa de nuevas reservas, la guía de funciones por rol y la bienvenida de pacientes.
Administración dispone de **Ver preparación** en el directorio de psicólogos.
Se reutilizan los formularios existentes y la corrección del perfil se solicita por
el correo de soporte publicado. No se añadió un editor público autónomo.

Compatibilidad: los perfiles anteriores sin `setupVersion: 1` conservan su operación
previa. No se escribió masivamente en sus documentos. Las nuevas aprobaciones nacen
con `setupVersion: 1` y `acceptingBookings: false`; adoptar la nueva activación exige
perfil revisado, tarifa real y horarios compatibles. Una pausa explícita siempre
bloquea nuevas reservas, incluidos perfiles anteriores. Las citas existentes y su
reprogramación mantienen sus reglas previas.

El progreso del recorrido se conserva en `users.productGuides`, separado por rol.
La revisión, decisión de recepción y versión de concurrencia se guardan en el perfil
profesional. `professional_setup_events` conserva acciones y fechas sin información
clínica. Los requisitos de preparación se calculan en el servidor; no se almacenan
porcentajes de progreso como una autorización de reservas.

Quedan como evaluación posterior las pruebas de usabilidad con psicólogos reales,
la medición de abandono y los ajustes derivados de esas observaciones. No se
incorporaron recordatorios externos, servicios de pago adicionales ni consumo de IA.

## 1. Objetivo y alcance

Ayudar al psicólogo aprobado a dejar preparada su consulta: revisar su perfil,
seleccionar una tarifa, abrir horarios y decidir cuándo empezar a recibir reservas.
Después, enseñar las funciones principales con un recorrido breve y opcional.

El resultado del onboarding será **«Consulta lista para recibir reservas»**. No se
exigirá conseguir un paciente, cobrar ni realizar una sesión para completarlo.

Esta propuesta complementa el registro y la solicitud profesional existentes.
Prioriza psicólogos; incluye una ampliación pequeña para pacientes en una segunda
entrega. No propone contratar una plataforma externa ni añadir consumo de IA.

## 2. Referencias y adaptación

Se consultó documentación oficial de los productos; no se completaron registros ni
pruebas dentro de sus cuentas. Las decisiones para Lurems son propuestas propias.

| Referencia | Patrón documentado | Aplicación propuesta en Lurems |
| --- | --- | --- |
| [Calendly: configuración inicial](https://calendly.com/learn/calendly-setup) | Organiza la preparación en pasos y propone probar la configuración antes de compartirla. | Configurar tarifa y horarios; terminar con una revisión de lo que verá el paciente antes de activar reservas. |
| [SimplePractice: primera configuración de disponibilidad](https://support.simplepractice.com/hc/en-us/articles/42030644855309-Setting-up-availability-for-the-first-time) | Ofrece una guía de disponibilidad con revisión final. Distingue los bloques horarios del estado de aceptación de nuevos pacientes. | Separar «Tengo horarios» de «Quiero recibir reservas». Reutilizar los bloques actuales de Lurems, sin copiar recurrencias que aún no existen. |
| [Intercom: listas de tareas](https://www.intercom.com/help/en/articles/6612245-checklists-explained) | Lista contextual que puede retomarse; permite resolver tareas según atributos y acciones reales y abrir recorridos desde los pasos. | Mostrar progreso persistente y completar tareas al guardar datos válidos, no al pulsar «Siguiente». |
| [Intercom: compartir recorridos](https://www.intercom.com/help/en/articles/2901144-share-your-product-tours) | Permite ofrecer accesos al recorrido en distintos puntos del producto. | Mantener «Ver guía de nuevo» en Configuración y en la ayuda contextual. |

Fuentes consultadas el 27/10/2026. Se adoptan patrones de interacción; no se propone
incorporar las integraciones, el catálogo de funciones o los servicios de esas apps.

## 3. Qué existe y qué falta

Base revisada en el código local y en la documentación funcional. Esta revisión no
es una nueva prueba del entorno publicado.

| Área | Estado observado | Trabajo propuesto |
| --- | --- | --- |
| Registro profesional | Solicitud, revisión administrativa y pantalla de espera. | Mantenerlo; explicar qué ocurrirá tras la aprobación. |
| Habilitación | Al aprobar, se crea el perfil con `activo: true` y se concede el rol. | Conservar la aprobación administrativa; separar la decisión de recibir reservas. |
| Perfil profesional | Datos de la solicitud; edición pública gestionada por administración. | Mostrar un resumen reutilizando esos datos. Ofrecer solicitar corrección; no prometer edición propia que no existe. |
| Tarifa | El psicólogo selecciona una tarifa activa del catálogo en Configuración. | Abrir esa selección desde la guía y explicar importe, reparto y condiciones vigentes. |
| Agenda | Apertura/cierre manual de bloques de una hora en la vista profesional. | Guiar la creación del primer bloque futuro; mostrar hora de Lima. |
| Recomendaciones | Filtran profesionales activos con disponibilidad futura. | Añadir la condición de recepción de reservas y preparación comercial válida. |
| Tutorial | No hay un proceso consolidado de preparación con progreso. | Añadir tarjeta de tareas y recorrido contextual opcional. |

Referencias internas: [registro](../architecture/registration-onboarding.md),
[funciones por rol](revision-funcional-por-rol.md),
[encuesta y recomendaciones](encuesta-matching.md) y
[suspensión de cuentas](suspension-cuentas.md).

Archivos revisados: `src/services/onboardingService.js`,
`src/views/onboarding/PsychologistOnboardingView.vue`,
`src/views/mainviews/ConfiguracionView.vue`,
`src/views/psicologo/PsicologoSesionesView.vue`,
`functions/src/onboarding/registrationHandlers.js`,
`functions/src/payments/paymentRateHandlers.js` y
`functions/src/matching/recommendTherapists.js`.

## 4. Experiencia propuesta para el psicólogo

### Entrada y bienvenida

Tras la aprobación, al entrar a la vista profesional, mostrar una bienvenida corta:

> Bienvenido a tu consulta en Lurems. Revisa tus datos, elige tu tarifa y abre tus
> primeros horarios. Tú decides cuándo empezar a recibir reservas.

Acciones: **«Preparar mi consulta»**, **«Conocer las funciones»** y **«Más tarde»**.
La configuración seguirá disponible aunque se cierre la bienvenida. Tiempo objetivo
de preparación: 5–10 minutos, pendiente de validar con psicólogos reales.

En `/psicologo/sesiones`, mostrar una tarjeta **«Prepara tu consulta — 2 de 4»**.
Cada tarea tiene una explicación, estado y acción que abre el formulario existente.
Al guardar, volver al punto de la guía desde el que se inició. No duplicar formularios.

### Lista de preparación

| Orden | Tarea y texto orientativo | Acción | Cuándo se completa |
| --- | --- | --- | --- |
| 1 | **Revisa tu perfil.** «Así se presentará tu información profesional». Mostrar nombre, especialidades, enfoques, modalidades y ubicación cuando corresponda. | «Revisar perfil»; si hay errores, «Solicitar corrección». | Datos mínimos completos y confirmación de revisión de la versión mostrada. Una corrección pendiente en datos esenciales mantiene esta tarea pendiente. |
| 2 | **Elige tu tarifa.** «Selecciona el precio de tus sesiones entre las tarifas disponibles». Mostrar importe para el paciente y reparto aplicable. | «Elegir tarifa», en `/configuracion`, con contexto profesional. | Selección guardada y válida para atención real. Una tarifa de prueba no completa la preparación comercial. |
| 3 | **Abre tus primeros horarios.** «Añade al menos un bloque futuro para que puedan reservar contigo». | «Abrir horario», en `/psicologo/sesiones`. | Existe al menos un bloque propio disponible, futuro y compatible con la modalidad ofertada. |
| 4 | **Empieza a recibir reservas.** Revisar perfil, tarifa y próximos bloques, con un aviso de lo que habilita esta acción. | «Empezar a recibir reservas». | El servidor valida los requisitos y guarda la decisión explícita del profesional. |

Detalles de interacción:

- Marcar automáticamente lo que ya esté configurado. No pedir reingresar datos de
  la solicitud, volver a verificar correo ni aceptar otra vez documentos vigentes.
- La revisión del perfil puede ser explícita; tarifa y horarios requieren datos
  guardados. Ver una explicación o pulsar «Siguiente» no acredita configuración.
- Mostrar **hora de Lima (UTC−5)** junto al selector y al resumen. Mantener bloques
  de una hora. Recurrencia semanal y sincronización externa quedan para otra mejora.
- Si el catálogo no ofrece una tarifa válida, explicar «Necesitas una tarifa de
  atención disponible» y ofrecer soporte. No pedir al psicólogo crear enlaces de pago.
- La vista previa debe usar los datos reales, sin crear pacientes, citas o pagos.
- Al finalizar: **«Tu consulta está lista para recibir reservas»** y acciones
  «Ir a mi agenda» / «Ver guía de funciones». No prometer pacientes inmediatos.

### Qué significa activar

Se proponen tres conceptos separados:

1. **Habilitación profesional:** la administra Lurems tras revisar la solicitud.
2. **Cuenta activa o suspendida:** conserva el comportamiento de suspensión y
   reactivación acordado; no se utiliza para gestionar la visibilidad comercial.
3. **Recepción de nuevas reservas:** decisión del psicólogo una vez preparado.

El tercer concepto requiere un estado nuevo, por ejemplo `acceptingBookings`, cuya
definición técnica se cerrará al implementar. No debe reutilizar `activo`: ese campo
ya interviene en permisos, agenda, tarifa y suspensión. Un profesional aprobado debe
poder preparar su consulta aunque todavía no haya habilitado nuevas reservas.

La activación exige aprobación profesional, cuenta activa, perfil habilitado,
información esencial completa, tarifa comercial válida y disponibilidad futura.
La misma regla debe aplicarse en recomendaciones, cotización y reserva, con
revalidación del servidor. Una tarjeta completada en el navegador no concede acceso.

Después de activar, ofrecer **«Pausar nuevas reservas»** en Configuración. Pausar
mantiene acceso a pacientes, sesiones ya acordadas y seguimiento. No cancela citas
existentes ni suspende la cuenta. La comunicación debe indicar que las citas ya
confirmadas mantienen sus obligaciones.

Si se agotan los horarios, mostrar **«Añade horarios para recibir nuevas reservas»**.
Conservar el historial de onboarding completado; la disponibilidad operativa se
recalcula por separado. Al añadir nuevos bloques, puede recuperarse la recepción si
el profesional no la había pausado y los demás requisitos siguen vigentes.

## 5. Recorrido de funcionalidades

Recorrido opcional de cuatro paradas, con objetivo de duración de 60–90 segundos.
Se puede cerrar, retomar y repetir. No es requisito para activar reservas.

| Parada | Qué explica | Acción contextual |
| --- | --- | --- |
| Agenda | Dónde abrir horarios, consultar citas y gestionar solicitudes o cambios con motivo. | «Ver mi agenda». |
| Pacientes | Dónde consultar los pacientes vinculados y la información compartida disponible. | «Ver pacientes»; explicar el estado vacío si aún no tiene pacientes. |
| Seguimiento | Dónde encontrar objetivos, ejercicios e historial del proceso seleccionado. | Mostrar una explicación; no exigir un paciente real ni escribir en registros. |
| Configuración | Dónde cambiar tarifa, consultar perfil, alternar vistas y pausar nuevas reservas. | «Ir a configuración». |

Mostrar cada explicación junto a la función cuando esté disponible. En móvil usar
tarjetas o paneles breves que no tapen botones; en escritorio se pueden utilizar
indicaciones ancladas. Evitar un recorrido largo por pantallas sin contexto.

Los canales de apoyo deben seguir accesibles sin completar recorridos. El tutorial
no presenta como realizada la revisión humana del protocolo de ayuda pendiente.

## 6. Estados, continuidad y usuarios existentes

- **Solicitud pendiente/rechazada:** mostrar el proceso de solicitud correspondiente.
  No ofrecer autoaprobación profesional.
- **Aprobado sin preparar:** mostrar las tareas pendientes y permitir configurar.
- **Preparado sin activar:** destacar la revisión final y el botón de recepción.
- **Recepción habilitada:** reemplazar la tarjeta grande por un resumen discreto.
- **Cuenta suspendida:** usar la reactivación existente; después recalcular requisitos.
- **Perfil deshabilitado por administración:** informar el motivo disponible y
  ofrecer soporte. No confundirlo con una tarea que el psicólogo pueda resolver.
- **Usuarios actuales:** reconocer su configuración. Solicitar revisión y decisión
  de recepción sin interrumpir sus citas. Antes de introducir el nuevo estado, definir
  una migración explícita que conserve la operación de los profesionales ya activos.
- **Sin cambios:** no repetir automáticamente la bienvenida en cada inicio.

Guardar progreso por usuario y rol para retomarlo desde otro dispositivo. Separar
la versión del recorrido, su último paso y su cierre voluntario de los requisitos
calculados desde los datos reales. Los estados de campañas futuros no deben mezclarse
con la configuración del onboarding.

Si cambia la tarifa o se retira, si se cierra un bloque o interviene administración,
recalcular la preparación y mostrar la acción concreta que falta. Resolver cambios
simultáneos sin sobrescribir decisiones recientes con una pantalla antigua.

## 7. Ampliación posterior para pacientes

Después del registro, una bienvenida opcional de tres pasos:
**«Cuéntanos cómo te sientes» → «Encuentra un profesional» → «Reserva y sigue tu proceso»**.
Cada paso lleva a la función existente y reconoce lo que el paciente ya completó.

Enseñar pagos y seguimiento cuando sean relevantes. No pedir toda la configuración
al inicio ni reemplazar la encuesta actual. La aceptación legal permanece en registro,
con retorno al destino original cuando corresponda; no se introduce otro banner legal
dentro de la encuesta.

El administrador solo necesita visibilidad operativa de qué preparación falta por
profesional, sin acceso añadido a información terapéutica. Este panel es posterior;
no se necesita un nuevo botón administrativo de aprobación para este onboarding.

## 8. Orden de entrega recomendado

1. **Preparación y recepción:** definir el estado separado y la migración; crear
   tarjeta de cuatro tareas, enlaces a formularios existentes, revisión final y
   validación del servidor. Incluir pausa y mensajes específicos de bloqueo.
2. **Guía de funciones:** recorrido opcional, repetición, adaptación móvil y
   continuidad entre dispositivos.
3. **Extensión y evaluación:** bienvenida de pacientes y visibilidad operativa para
   administración. Ajustar textos tras observar a psicólogos usar la primera entrega.

Reutilizar Vue/Vuetify y Firebase actuales. Preferir una implementación pequeña de
tarjeta y ayudas contextuales; no contratar Intercom ni otra suscripción para esta
primera versión. No se incluye una estimación de coste o plazo sin descomponer antes
la implementación, especialmente la migración y las validaciones de recepción.

## 9. Criterios de aceptación y medición

Antes de publicar, comprobar:

- Psicólogo nuevo aprobado completa la preparación sin ayuda externa y ve un resumen
  coherente con lo que se guardó.
- Usuario existente reconoce sus tareas completas; salir y volver, cambiar de
  dispositivo o alternar a paciente no pierde ni mezcla el progreso.
- Tarifas de prueba/inactivas y ausencia de horarios explican por qué no se puede
  activar atención comercial; ninguna ruta alternativa evita la validación.
- Solicitud pendiente, perfil inactivo y cuenta suspendida muestran acciones distintas.
- Dos pestañas y cambios administrativos durante la configuración no permiten activar
  con datos obsoletos.
- Pausar reservas mantiene citas y seguimiento existentes; agotarse los horarios no
  borra la finalización histórica del tutorial.
- Se puede omitir y repetir la guía; teclado, lectores de pantalla y móvil permiten
  operar sin elementos tapados ni navegación atrapada.
- No se crean registros clínicos, citas, cobros ni aprobaciones de protocolos para
  demostrar una función durante el recorrido.

Medir inicialmente: proporción de aprobados que quedan preparados, tiempo hasta la
primera activación, paso en que abandonan y solicitudes de ayuda. Medir primera reserva
por separado, porque depende también de demanda y disponibilidad.

Registrar solo eventos de navegación/configuración necesarios para evaluar esta guía;
excluir respuestas de encuesta, información clínica y contenido de conversaciones.
Se pueden aprovechar marcas de tiempo existentes y evitar una plataforma analítica
adicional en la primera entrega.

## 10. Decisiones recomendadas para implementar después

- Adoptar las cuatro tareas y el recorrido opcional como primera versión profesional.
- Mantener la aprobación administrativa y añadir recepción de reservas independiente.
- Reutilizar el catálogo de tarifas y los bloques actuales; la edición autónoma del
  perfil público, horarios recurrentes y calendarios externos quedan fuera de esta entrega.
- Conservar la operación de usuarios actuales mediante migración revisable antes de
  activar la nueva condición de recepción en producción.
- Validar el prototipo con 2–3 psicólogos reales antes de fijar objetivos de tiempo y
  dar por concluida la experiencia. Esa prueba de usabilidad es distinta de la revisión
  profesional pendiente del protocolo de apoyo.
