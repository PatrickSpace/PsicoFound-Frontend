# Diseño: onboarding del paciente después de confirmar su cita

Fecha: **30/10/2026**, America/Lima. Estado: **primera versión implementada en local; pendiente de publicación**.

## Objetivo

Que el paciente sepa dónde encontrar su sesión, qué puede hacer entre sesiones y
cómo consultar su proceso. La encuesta, elección del psicólogo y reserva ya tienen
su recorrido: esta guía empieza en la etapa de acompañamiento.

La guía actual de `ProductGuide.vue` contiene tres pasos generales centrados en
encuesta, búsqueda y sesiones. Esta propuesta añade una etapa diferenciada, con
ayudas dentro de la interfaz real y continuidad entre pantallas.

## 1. Momento de entrada

Ofrecer la bienvenida cuando el servidor confirme, para una misma cita del paciente:

- Pago confirmado (`paymentStatus: confirmed`).
- Cita confirmada (`estado: confirmada`).
- Cuenta con acceso permitido y proceso correspondiente disponible para el paciente.

Informar un pago, abrir el enlace o volver del proveedor no cumplen esta condición.
Si solo está validado el pago, la interfaz debe conservar su explicación del estado
pendiente de la cita. No se presenta el mensaje «Tu cita está confirmada» antes de tiempo.

La condición debe incluir la pertenencia de la cita al usuario y su terapia. Tener
un pago confirmado en una cita antigua y otra cita confirmada distinta no es suficiente.

Al confirmar mientras el paciente está conectado, mostrar una tarjeta discreta en
Inicio o Sesiones. Si vuelve después, ofrecerla al entrar. No abrir un modal que
intercepte el acceso a la sesión ni redirigirlo automáticamente fuera de su tarea.

### Bienvenida propuesta

> **Tu cita está confirmada**
>
> Te mostramos dónde encontrar tu sesión y cómo usar tu espacio de acompañamiento.
> Puedes recorrerlo ahora o retomarlo cuando quieras.

Acciones: **«Conocer mi espacio»**, **«Ver mi cita»** y **«Más tarde»**.

«Ver mi cita» lleva directamente a la cita correspondiente. Posponer guarda la
decisión y deja un acceso pequeño para retomar; no repite la bienvenida en cada visita.
La hora y el profesional se toman del registro real, con horario de Lima explícito.

## 2. Dos niveles de aprendizaje

### Recorrido inicial: tres paradas breves

Duración objetivo de 60–90 segundos, a validar con usuarios. Una explicación corta
por parada y el elemento real resaltado; el paciente puede avanzar, volver o salir.

1. **Encuentra tu sesión.** En Sesiones, resaltar la tarjeta de próxima cita: fecha,
   hora, profesional, estado y acceso al enlace cuando esté disponible. Es la primera
   parada porque resuelve la necesidad inmediata después del pago.
2. **Ubica el resumen de tu proceso.** En Inicio, resaltar la próxima sesión y el
   resumen del proceso activo. Explicar que puede volver aquí para orientarse.
3. **Descubre las demás secciones.** Resaltar la navegación y señalar Emociones,
   Progreso, Herramientas e Historial. Ofrecer «Explorar una sección» o «Terminar por ahora».

El recorrido inicial no obliga a visitar ni completar todas las secciones. Después,
cada una ofrece una ayuda contextual propia al abrirla por primera vez.

### Ayudas por sección

| Sección | Elementos que se señalan | Mensaje orientativo | Acción opcional |
| --- | --- | --- | --- |
| Sesiones | Próxima cita, fecha/hora, enlace, opciones de cambio. | «Aquí encuentras tus próximas citas y el acceso a la sesión cuando tu psicólogo haya añadido el enlace». | «Ver mi cita». Las opciones de cambio conservan las condiciones vigentes. |
| Inicio | Profesional/proceso activo, próxima cita y resumen. | «Este es el resumen de tu proceso. Desde aquí puedes revisar tu próxima sesión y continuar con tus actividades». | Volver al resumen o seguir explorando. |
| Emociones | «Agregar registro», campos del formulario y aviso de visibilidad. | «Puedes registrar cómo te sientes entre sesiones. Antes de guardar verás quién puede consultar el registro y su nota». | Abrir el formulario vacío, sin guardar automáticamente. |
| Progreso | Lista de objetivos, estado y acciones propias de avance. | «Aquí consultas los objetivos de tu proceso y los avances que se han registrado». | Revisar un objetivo existente; si crea uno propio, explicar sus permisos actuales. |
| Herramientas | Ejercicios asignados, instrucciones, frecuencia y realización. | «Los ejercicios que te asigne tu psicólogo aparecerán aquí. Puedes consultar las instrucciones y registrar su realización». | Abrir un ejercicio real si existe, sin marcarlo realizado por recorrer la guía. |
| Historial | Selección de terapia, filtros y línea de tiempo. | «Aquí puedes consultar las sesiones y los eventos registrados de tu proceso». | Mostrar cómo filtrar o consultar un registro disponible. |

Configuración se explica como ayuda secundaria: actualizar datos, revisar acceso y
seguridad, y encontrar la guía de nuevo. No se mezcla con tareas de configuración profesional.

En móvil hay que explicar expresamente el botón **«Más»**: algunas secciones están
dentro de ese menú y no se ven en la barra inferior. En escritorio se señalan los
elementos equivalentes de la navegación lateral.

## 3. Cómo funciona dentro de las pantallas

- En escritorio, indicaciones junto a un elemento estable: título breve, una o dos
  frases y controles «Anterior», «Siguiente» y «Cerrar».
- En móvil, panel compacto que deje visible el elemento explicado. Si el panel
  ocultaría una acción, mostrar la explicación antes o después de ese elemento.
- Cada paso navega a su pantalla real, espera a que terminen las cargas y luego
  resalta el elemento. Conservar el paciente, terapia y cita correctos al navegar.
- Al abrir «Más», señalar la sección dentro del menú, sin depender de coordenadas
  fijas. No resaltar opciones que el usuario no tiene disponibles.
- Si el elemento esperado no existe, usar una explicación del estado actual y
  permitir continuar. Una carga fallida ofrece reintento; no se describe como una
  lista vacía ni deja la guía bloqueada esperando un elemento inexistente.
- Al cerrar, el paciente permanece en la pantalla en la que estaba. Se puede
  retomar desde «Guía de mi proceso» o repetir la ayuda de una sección.
- Respetar teclado, foco, lectores de pantalla y reducción de movimiento. Los
  indicadores resaltados no deben depender solo de un cambio de color.

## 4. Enseñar según lo que ya existe

**Enlace de sesión pendiente:** mostrar «Tu psicólogo todavía no ha añadido el enlace».
No presentar «Entrar a la sesión» como disponible. Si ya está disponible, explicar
que abre la herramienta externa de atención; la guía no lo abre por sí sola.

**Sin objetivos:** explicar dónde aparecerán los objetivos y cómo funcionan las
acciones propias existentes. No crear un objetivo ficticio ni afirmar que el psicólogo
ya ha definido uno. La sección admite objetivos propios según sus permisos actuales.

**Sin herramientas:** mostrar «Cuando tu psicólogo te asigne un ejercicio, aparecerá aquí».
Al llegar el primero, ofrecer una ayuda breve sobre sus instrucciones y realización,
aunque el paciente ya haya visto la explicación de la sección vacía.

**Sin registros emocionales:** permitir conocer el formulario sin exigir una
revelación personal para terminar el onboarding. Explicar la visibilidad real del
registro según el aviso vigente; no presentarlo como un diario privado ni como un
canal con respuesta inmediata o vigilancia permanente.

**Sin eventos en un filtro de historial:** ayudar a revisar el periodo o la terapia
seleccionada. No afirmar que nunca hubo actividad por no encontrar resultados.

**Cita cancelada o pago revertido durante el recorrido:** actualizar los mensajes y
retirar el acceso a esa cita según sus reglas. Conservar lo aprendido; no usar el
onboarding como fuente de autorización ni seguir mostrando confirmaciones antiguas.

**Proceso anterior o sin terapia activa:** ofrecer consulta de lo disponible y
explicar las acciones que requieren un proceso activo. Haber visto la guía no
habilita registros, reservas ni acciones terapéuticas.

## 5. Continuidad y estados

Separar esta etapa del onboarding de búsqueda y del recorrido profesional. Haber
terminado la guía inicial de paciente no debe ocultar la nueva guía de acompañamiento.

Guardar por usuario y versión del recorrido:

- Bienvenida ofrecida/pospuesta y última parada del recorrido inicial.
- Secciones conocidas, ayudas pospuestas y ayuda sobre el primer ejercicio recibido.
- Finalización del recorrido y acceso para repetirlo.

La cita/terapia sirve como contexto de navegación, sin duplicar su información clínica
en el progreso de la guía. Cambiar de cuenta o vista descarta diálogos y respuestas
pendientes del usuario anterior.

No volver a comenzar el recorrido completo con cada pago o cita. Para pacientes
existentes con un proceso de atención, ofrecer una vez un acceso opcional. Los
estados de suspensión y las restricciones de acceso siguen siendo independientes.

Mostrar, si resulta útil, «Secciones que ya conoces»; nunca mezclar ese progreso
con resultados terapéuticos. Leer una explicación, guardar una emoción y realizar
un ejercicio son acciones distintas.

## 6. Primera entrega recomendada

1. Bienvenida tras pago y cita confirmados, recorrido inicial de tres paradas,
   pausa/reanudación y acceso permanente para repetirlo.
2. Ayudas contextuales de las seis secciones, con variantes para datos existentes,
   estados vacíos, enlace pendiente y navegación móvil mediante «Más».
3. Ayuda al recibir el primer ejercicio y revisión de la experiencia con pacientes
   reales para ajustar qué explicaciones llegan demasiado pronto o faltan.

Reutilizar las pantallas y componentes de Lurems. No requiere una plataforma externa
de onboarding ni llamadas a IA. El recorrido genérico actual puede mantenerse para
la etapa previa a la reserva; «Guía de mi proceso» pasa a ser la opción principal
para pacientes que ya están en acompañamiento.

## 7. Consideraciones para la futura implementación

El guardado actual de `saveProductGuide` solo admite tres pasos para el rol paciente.
No basta con ampliar el arreglo de textos: hay que introducir una etapa validada
por el servidor y conservar los progresos anteriores sin sobrescribirlos.

La elegibilidad de la bienvenida se calcula con los estados de la cita y su pago,
incluida la pertenencia al usuario. No se utiliza una marca del navegador como
prueba de pago ni se concede un permiso al completar la guía.

Los elementos resaltados necesitarán identificadores estables. Se reutilizan los
formularios actuales; la guía no debe crear versiones alternativas para emociones,
objetivos, ejercicios o cambios de cita.

## 8. Criterios de aceptación

- Pago informado, pago confirmado sin cita confirmada y cita confirmada sin pago
  confirmado muestran mensajes distintos; solo la combinación válida ofrece la bienvenida automática.
- El paciente encuentra su próxima cita y entiende qué sucede si falta el enlace.
- Puede posponer, retomar tras recargar y repetir una sección sin perder el contexto.
- En móvil identifica dónde están las secciones dentro de «Más»; el panel no tapa
  controles ni deja el foco atrapado.
- Objetivos, herramientas e historial explican correctamente estados vacíos y
  errores, y permiten continuar la guía en ambos casos.
- Se explica la visibilidad antes de guardar un registro emocional. Ningún dato
  terapéutico se crea o modifica por avanzar en el recorrido.
- Cambiar de cuenta, de vista o de terapia no expone ni mantiene información anterior.
- Nuevas citas no reinician toda la guía. Cancelaciones y cambios de acceso no
  dejan mensajes de confirmación obsoletos ni acciones que hayan dejado de estar permitidas.

Referencias internas: [diseño general de onboarding](onboarding-guiado.md),
[funciones por rol](revision-funcional-por-rol.md) y
[registro/onboarding](../architecture/registration-onboarding.md).


## Implementación de la primera versión

- `PatientCareGuide.vue` presenta una tarjeta opcional y un panel integrado en la página, sin tapar los controles. El botón «Localizar en pantalla» lleva al elemento resaltado. No se bloquea la navegación.
- Recorrido inicial de tres pasos: Sesiones, Inicio y navegación. En móvil se explica el botón Más. El menú «Guía de mi proceso» permite repetirlo y abrir las seis ayudas por sección.
- El servidor comprueba la propiedad de la terapia activa, la cita y la operación de pago confirmada vinculada a esa misma cita. Los estados enviados por el navegador no sirven para habilitar la bienvenida.
- El avance se guarda en `users/{uid}.productGuides.patientCare`, separado de las guías anteriores. Cerrar o posponer conserva el paso. El cambio de cuenta o de vista paciente/profesional limpia el recorrido en memoria.
- Los objetivos y ejercicios distinguen carga, error, selección vacía y datos disponibles. Si Herramientas ya se exploró vacía, una primera asignación ofrece otra ayuda opcional al visitar esa sección.
- Haber guardado avance permite volver a consultar las ayudas después de una cancelación, pero no muestra una cita como confirmada ni habilita acciones de terapia. Los requisitos de acceso de la cuenta siguen aplicándose.
- No se crean registros emocionales, objetivos, ejercicios ni cambios de cita al completar la guía. La ayuda de Emociones explica la visibilidad del registro y que no es un canal de urgencias.
- Funciones nuevas para publicar junto al frontend: `getPatientCareGuide` y `savePatientCareGuide`. No se añade un servicio externo de analítica, IA ni onboarding.

Validación reproducible: `CARE_GUIDE_VALIDATION=true node tests/run-patient-isolated.mjs` (Java 21 en PATH). Demostración local: `CARE_GUIDE_REVIEW=true node tests/run-patient-isolated.mjs`. Ambos usan exclusivamente emuladores y el proyecto `demo-lurems-followup`; fallan si alguno de los puertos de pruebas ya está ocupado.
