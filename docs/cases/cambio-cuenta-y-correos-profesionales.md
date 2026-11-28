# Traspaso a desarrollo para el registro y los correos profesionales de Lurems

Archivo elaborado por Arquitecto el 28 de noviembre de 2026, a petición expresa del usuario, para entregarlo completo a otro chat de desarrollo. El objetivo es resolver los pendientes de cambio de cuenta y comunicación por correo identificados en la revisión funcional y QA.

## Encargo al chat desarrollador

Tu rol propuesto es **Desarrollador de mejoras** de Lurems, en `PatrickSpace/PsicoFound-Frontend`. Pide al usuario que confirme el rol antes de continuar. Lee este archivo completo y aplica `AGENTS.md` y la sección de tu rol en `docs/agents/roles.md`.

Una vez confirmado el rol, activa el modo Objetivo si está disponible. La condición de término de desarrollo es implementar los requisitos A y B, demostrar los criterios de desarrollo de la matriz y comprobar la regresión indicada. Prepara también la configuración y las evidencias necesarias para que QA complete C con buzones reales. Si falta una dependencia externa, entrega el avance comprobado e identifica exactamente qué comprobación depende de ella.

Parte de una base que incluya `main` en `e4fb5613175336c14fd8d2440854090976c1e3d9`. Consulta el estado actual de la rama antes de aplicar cambios. El checkout de origen está en `feat/frontend-finops-audit` y contiene trabajo local ajeno a esta entrega. Reutiliza un checkout adecuado o una rama `codex/` según las instrucciones del repositorio.

## Resultado y alcance

| Bloque | Resultado esperado | Responsable de completar la evidencia |
| --- | --- | --- |
| A | Una persona puede usar otra cuenta desde el registro y la revisión profesional. Cada cuenta recupera sus datos y su paso guardado. | Desarrollo y QA |
| B | Cada aprobación o rechazo profesional confirmado genera un correo recuperable ante fallos. El enlace permite continuar con la cuenta titular y el estado vigente. | Desarrollo y QA |
| C | Se comprueba la entrega efectiva y el funcionamiento de los seis tipos de correo en Outlook y Gmail. Se investiga y corrige el caso recibido en Spam. | Desarrollo prepara y corrige, QA valida en entorno autorizado |
| D | La propuesta de DNI y reconocimiento facial queda registrada con las decisiones necesarias para especificarla. | Arquitecto y usuario, antes de un traspaso propio a diseño y desarrollo |

El ajuste A reutiliza las pantallas de autenticación y onboarding. El bloque B reutiliza la plantilla de aprobación y su patrón visual para el rechazo. Estos ajustes pasan directamente a desarrollo siguiendo el [Brand System](https://patrickspace.github.io/lurems-brand-system/).

Las decisiones de alcance de esta entrega son aplicar la verificación de correo vigente según Firebase Auth, mantener los estados profesionales `pending`, `approved` y `rejected`, y preservar la edición profesional por estado que QA comprobó. Las preguntas del análisis original sobre esos comportamientos quedan respondidas en la evidencia. La edición autónoma del perfil profesional después de aprobarlo y un estado adicional de solicitud observada requieren un requerimiento propio si el usuario desea incorporarlos. El botón de cierre de sesión de Configuración queda fuera del cambio solicitado.

## Base comprobada

QA revisó los 19 puntos del documento original. Ejecutó 36 comprobaciones de navegador y seis de integración en `e4fb561`, y repitió ocho comprobaciones específicas en `240c9fc`. Las 44 comprobaciones de navegador y seis de integración aprobaron. Algunas reproducen carencias existentes, por lo que su aprobación confirma la ausencia de funcionalidad.

Los formularios de paciente y psicólogo y la pantalla de solicitud pendiente carecen de una acción para cambiar de cuenta. La pantalla de verificación ya tiene «Usar otra cuenta». La aprobación y el rechazo funcionan dentro de la app. El rechazo permite recuperar los datos, corregirlos y crear una nueva solicitud pendiente. El envío de la decisión profesional por correo todavía carece de integración.

El último despliegue Production identificado en GitHub corresponde a `240c9fcf9321cc16788a29cf6f42124de10bd05a`. La inspección de la app publicada cubrió las pantallas públicas. Las pruebas autenticadas usaron emuladores y cuentas sintéticas. La recepción en buzones reales, Google real y la identidad exacta del backend publicado siguen pendientes de comprobar.

El [informe QA](../../test-results/qa-observaciones-2026-11-28/resultado-qa.md) contiene resultados, capturas y salidas locales. Esos archivos de `test-results/` pueden faltar en otro clon. Este archivo y las referencias versionadas permiten comenzar la implementación con ese límite explícito.

## A Cambio de cuenta durante el registro

### Requisitos funcionales

**A1.** Ofrece la acción visible «Usar otra cuenta», con icono de salida y nombre accesible, en los pasos autenticados de `/registro`, en la recuperación de `/onboarding`, en `/onboarding/paciente`, en `/onboarding/psicologo` y en `/onboarding/psicologo/pendiente`. Contempla las variantes de consentimiento, recuperación y error que mantienen una sesión autenticada. Usa una acción de baja jerarquía visual coherente con la verificación actual, accesible por teclado y visible en móvil.

**A2.** La acción cierra la sesión de Firebase y lleva a `/login` al completarse. Muestra progreso y evita envíos repetidos mientras se procesa. Si falla el cierre, muestra «No pudimos cerrar la sesión. Intenta nuevamente.» y permite reintentar con la cuenta original.

**A3.** Al autenticar otra cuenta, resuelve la navegación con el perfil y los permisos de su UID. Una cuenta sin verificar continúa a verificación. Una cuenta con onboarding pendiente vuelve a su formulario. Una solicitud pendiente abre revisión, una rechazada permite corregir y una aprobada abre el espacio autorizado. Si falta el perfil, continúa la recuperación del registro con la identidad activa.

**A4.** Al volver a la primera cuenta, recupera el progreso ya persistido en servidor. Los valores temporales de un formulario pertenecen a la sesión que los creó. El alcance se refiere al avance guardado por las operaciones existentes.

**A5.** Al abandonar una cuenta, invalida sus cargas, avisos, formularios y redirecciones pendientes. Una respuesta tardía de esa cuenta nunca debe poblar la segunda ni navegar en su nombre. Si una escritura ya enviada termina en el servidor, su resultado pertenece al UID con el que fue autenticada y se recupera al volver a esa cuenta.

### Requisitos técnicos

- Reutiliza Firebase `signOut`, el observador de Auth y el patrón de `appContext.reset()`. Centraliza el cierre de sesión de estas pantallas en una única operación o componente reutilizable de alcance acotado. Usa `OnboardingShell` cuando evite duplicar la misma acción y mantén su comportamiento para los consumidores existentes.
- Asocia las lecturas y las actualizaciones de estado a un UID y una generación de sesión. Aplica la comprobación después de cada `await` que pueda actualizar la vista o redirigir, incluidos la solicitud profesional y `checkStatus` de la pantalla pendiente.
- Revisa las suscripciones y cachés que realmente usan estas pantallas. Detén las de la cuenta anterior e invalida el contexto correspondiente. Reutiliza los mecanismos existentes cuando tengan ese efecto.
- La intención de registro local debe pertenecer al UID que la originó. Revisa `REGISTRATION_INTENT_STORAGE_KEY`, actualmente global en `sessionStorage`. Al cambiar de cuenta, evita que la intención de A configure a B. Para cuentas con perfil, el estado persistido determina el recorrido. Para cuentas sin perfil, usa una intención atribuible a su UID o la selección del registro correspondiente. Contempla las sesiones previas que todavía tengan la clave antigua.
- Usa `/login` como salida neutral de «Usar otra cuenta». Los enlaces de un correo pueden conservar un destino local validado por `safeReturnPath`, y el acceso efectivo se decide con la cuenta recién autenticada. El historial del navegador debe seguir pasando por los controles de Auth y rol.

## B Correo de aprobación y rechazo profesional

### Comportamiento y contenido

**B1.** Una transición confirmada de una solicitud pendiente a aprobada o rechazada debe crear una notificación de correo para el solicitante. La revisión administrativa devuelve su resultado aunque el envío posterior tenga un fallo recuperable.

**B2.** El correo de aprobación comunica el resultado y ofrece «Ir a mi espacio profesional». Reutiliza `docs/email/psicologo-aprobado.html` y su alternativa de texto, con recursos HTTPS reales y las decisiones del Brand System. Informa el siguiente paso de preparación de la consulta conforme al estado actual de la app.

**B3.** El correo de rechazo comunica que la solicitud requiere correcciones y ofrece «Revisar y corregir mi solicitud». El motivo detallado se consulta dentro de Lurems con la cuenta titular. Usa el patrón de la plantilla existente, en HTML y texto, y un asunto inequívoco en español. Presenta ambas variantes como evidencia antes del traspaso a QA.

**B4.** Ambos correos identifican que se debe entrar con la misma cuenta utilizada al solicitar la revisión. Incluyen una referencia comprensible a la solicitud o a la fecha de decisión. El enlace conduce al recorrido autenticado adecuado. Si ya existe otra solicitud más reciente, la app muestra el estado actual al que el titular tiene acceso.

**B5.** El enlace admite sesión cerrada, sesión correcta y sesión de otra cuenta. Con la cuenta incorrecta, los controles de acceso muestran únicamente el recorrido de esa cuenta. La acción A permite salir y entrar con la titular. El contenido privado de la solicitud se obtiene después de autenticar y comprobar el UID.

### Persistencia y envío

Usa un registro duradero de envíos pendientes en Firestore, creado en la misma transacción que confirma la revisión. Una colección dedicada como `professional_review_emails` permite desacoplar la entrega del cambio de roles y recuperar fallos. Mantén el contrato callable de revisión que usa la interfaz actual.

| Dato | Uso requerido |
| --- | --- |
| Clave determinista por solicitud y decisión | Evitar eventos nuevos al repetir la misma decisión. La nueva solicitud de un reenvío tiene otra clave. |
| `requestId`, `userUid`, `decision`, `reviewedAt`, `templateVersion` | Identificar la decisión confirmada y el contenido que debe enviarse. |
| Estado de procesamiento e intentos | Identificar pendiente, en proceso, aceptado por el proveedor, reintento o revisión operativa. |
| Destinatario y huella del contenido del primer intento | Mantener un payload estable durante los reintentos idempotentes. |
| Propietario y vencimiento de la reserva de procesamiento | Coordinar trabajadores concurrentes y recuperar una ejecución interrumpida. |
| `nextAttemptAt`, tiempos de intento y aceptación, identificador del proveedor y error resumido | Permitir recuperación y evidencia de la entrega al proveedor. |

**B6.** Crea el evento únicamente cuando la transacción aplica la transición. Las llamadas repetidas que devuelven una decisión ya guardada conservan su resultado idempotente. Los permisos denegados, las validaciones fallidas y una transacción abortada dejan la cola sin ese nuevo evento. La activación inicial procesa decisiones nuevas del candidato.

**B7.** El trabajador toma el evento mediante una reserva transaccional con vencimiento. Hace la petición de correo fuera de la transacción de Firestore. Un mecanismo de recuperación vuelve a atender los registros pendientes, los errores transitorios y las reservas vencidas. Reutiliza la infraestructura de Functions del proyecto y documenta el disparador y la recuperación que implementes. Si usas eventos de Firestore, contempla la entrega repetida del mismo evento. [Contrato de disparadores de Firebase](https://firebase.google.com/docs/functions/firestore-events)

**B8.** Antes del primer envío, resuelve el destinatario desde Firebase Auth mediante el `userUid` confirmado por servidor. Usa el correo verificado vigente. Si falta o no está verificado, deja el caso identificable para resolución y conserva la decisión administrativa. Una vez iniciado el envío, conserva el destinatario, el contenido y la clave de idempotencia de ese intento lógico.

**B9.** El adaptador de correo recibe clave de idempotencia, destinatario, asunto, HTML y texto. Devuelve la referencia del proveedor y clasifica los resultados en aceptación, error transitorio, error permanente o resultado incierto. Usa las credenciales desde secretos de Functions y una configuración explícita de remitente y dominio. La región vigente es `southamerica-east1`.

**B10.** El proveedor seleccionado debe permitir evitar duplicados o reconciliar una petición cuyo resultado se perdió. Documenta la ventana de idempotencia real de su API. Un timeout posterior a la aceptación reutiliza la misma clave y payload o se reconcilia mediante la referencia disponible. Al agotarse esa ventana o quedar un resultado imposible de resolver, pasa a revisión operativa antes de otro envío. Prueba ese caso con el adaptador de prueba.

**B11.** Aplica reintentos con espera creciente y límite explícito para fallos transitorios, respetando los límites del proveedor. Los fallos permanentes y el agotamiento de intentos deben quedar localizables por el operador. El registro «aceptado» significa que el proveedor aceptó el mensaje. La carpeta observada en el buzón es la evidencia que completa C.

**B12.** El cliente tiene denegada la lectura y escritura directa de la colección de envíos. Verifica las reglas con un paciente, un psicólogo y una sesión sin autenticar. Los logs registran la referencia del evento, el intento y el error resumido. El contenido del correo, los códigos de Auth y las credenciales se manejan en los canales de servidor apropiados para esa operación.

**B13.** Añade un adaptador de prueba determinista para los emuladores. Debe permitir inyectar aceptación, error transitorio, rechazo permanente, timeout después de aceptar y entrega repetida del evento. Las suites aisladas dirigen el transporte a ese adaptador.

### Proveedor y configuración externa

La revisión del repositorio encontró correos de Auth gestionados por Firebase y plantillas de decisión pendientes de integrar. Falta identificar un proveedor transaccional habilitado, un remitente autorizado y las credenciales de su entorno de prueba.

Al comenzar, consulta la configuración disponible del proyecto. Reutiliza un proveedor habilitado que cumpla B9 y B10. Si falta, prepara la cola, las plantillas y el adaptador de prueba, y presenta una selección concreta del servicio junto con los datos que se requieren para conectarlo. La configuración externa condiciona la comprobación de envío real.

La migración de los correos de Auth a otro transporte depende del diagnóstico de C. El flujo nativo de Firebase sirve como punto de partida para medir y corregir la entregabilidad.

## C Recepción y enlaces en Outlook y Gmail

El hallazgo original es un correo de verificación recibido en Spam de Outlook. El requisito comprobable es registrar la ubicación efectiva de los mensajes y corregir las causas detectadas hasta lograr la recepción en Entrada en los buzones de prueba definidos para la aceptación.

QA prepara al menos un buzón Outlook y uno Gmail con acceso autorizado, el entorno de envío y una ventana de observación explícita. Como criterio operativo inicial de esta especificación, revisa al enviar y de nuevo a los 15 minutos. Un mensaje posterior se registra como recepción tardía. La ubicación inicial se observa antes de moverlo o añadir el remitente a contactos o listas seguras.

| Tipo de envío, en cada buzón | Acción y resultado que se comprobarán |
| --- | --- |
| Verificación inicial | Alta con contraseña, recepción y apertura del enlace. Firebase confirma el correo y la app retoma el registro de esa cuenta. |
| Reenvío de verificación | Solicitar otro enlace tras la espera de 60 s. Recibirlo y confirmar una cuenta aún pendiente. |
| Recuperación de contraseña | Solicitar el enlace, establecer otra contraseña y entrar con ella. Aplican los controles de seguridad vigentes de Auth. |
| Confirmación de cambio de correo | Solicitar el cambio hacia el buzón de prueba nuevo. Tras confirmar y renovar la sesión, Auth y el perfil muestran la dirección actualizada. Registrar también cualquier aviso adicional que genere el proveedor. |
| Aprobación profesional | Aprobar una solicitud de la cuenta de prueba, recibir el mensaje y entrar a su espacio profesional. |
| Rechazo profesional | Rechazar otra solicitud de prueba, recibir el mensaje, entrar con el titular, ver el motivo, corregir y reenviar. |

La matriz mínima tiene 12 casos. Registra por caso el SHA, el entorno, el proveedor de salida, el buzón de prueba, la hora de solicitud y recepción, Entrada/Spam/ausente, la referencia de envío disponible y el resultado del enlace. Anonimiza las evidencias compartidas y conserva los códigos de acción fuera del informe.

Si llega a Spam o queda ausente, consulta los encabezados, las respuestas del proveedor y la autenticación del remitente. Contrasta SPF, DKIM y DMARC según el dominio y servicio de salida realmente usados. Repite el caso después de corregir la causa. Un bloqueo externo pendiente se declara junto con su evidencia y responsable. [Directrices de Gmail](https://support.google.com/a/answer/81126), [Postmaster de Outlook](https://substrate.office.com/ip-domain-management-snds/postmaster)

La aceptación acredita los buzones, la configuración y la fecha probados. Los filtros del destinatario siguen siendo un factor externo que debe aparecer en el registro de futuras incidencias.

## Matriz de aceptación

Cada fila indica la condición inicial, la acción y el resultado observable. Desarrollo demuestra las filas D con emuladores y datos sintéticos. QA las repite sobre el candidato y completa las filas Q en un entorno autorizado.

| ID | Condición y acción | Resultado observable | Etapa |
| --- | --- | --- | --- |
| CA01 | Entrar autenticado en cada pantalla definida en A1, en escritorio y móvil. | «Usar otra cuenta» es visible, operable por teclado y tiene nombre accesible. | D y QA |
| CA02 | Pulsar dos veces la acción de salida. Simular por separado un fallo de `signOut`. | Una sola operación de salida. Éxito lleva a login. El fallo muestra error y permite reintentar con la identidad original. | D y QA |
| CA03 | Cambiar de una cuenta paciente incompleta a una profesional pendiente y volver. Repetir con cuenta sin perfil y con correo sin verificar. | Cada identidad muestra sus datos y su paso. La primera recupera el avance guardado. La intención local de A nunca configura a B. | D y QA |
| CA04 | Retener una consulta o guardado de A, cambiar a B y liberar la respuesta. Usar también Atrás y otra pestaña de prueba. | La respuesta de A carece de efectos visuales o de navegación en B. Las escrituras ya autenticadas se atribuyen a A. | D y QA |
| CA05 | Aprobar y rechazar solicitudes pendientes con un administrador válido. | Cada transacción confirma la decisión y crea un único evento de correo asociado. El estado de la app se puede consultar aunque falle el transporte. | D y QA |
| CA06 | Repetir la decisión, enviar dos decisiones concurrentes y forzar un aborto de transacción. | Solo la decisión confirmada produce evento. Los reintentos conservan una notificación por solicitud y decisión. | D y QA |
| CA07 | Ejecutar dos trabajadores para un evento y recuperar una reserva vencida. | La coordinación y la idempotencia del proveedor evitan una segunda aceptación del mismo envío lógico. | D y QA |
| CA08 | Hacer que el proveedor acepte y después simular timeout o fallo al guardar la respuesta. | La recuperación conserva clave y payload, reconcilia el resultado o deja revisión operativa explícita. Prueba también el vencimiento de la ventana de idempotencia. | D y QA |
| CA09 | Inyectar error transitorio, permanente y agotamiento de reintentos. | Esperas y límite comprobables, estado consultable por operador y decisión administrativa persistida. | D y QA |
| CA10 | Cambiar y confirmar el correo del solicitante antes del primer envío. Probar también correo ausente o sin verificar. | Se usa la dirección vigente verificada. Los casos sin destinatario válido quedan identificados. Un reintento conserva el payload del intento lógico iniciado. | D y QA |
| CA11 | Abrir los enlaces de aprobación y rechazo con sesión cerrada, sesión titular y cuenta distinta. | El titular llega al paso autorizado. La otra cuenta conserva su recorrido y puede salir con A. Los datos privados se consultan únicamente con el titular. | D y QA |
| CA12 | Recibir un rechazo, corregir un campo y enviar desde la interfaz con la misma cuenta. | Motivo y datos recuperados, nueva solicitud pendiente con el cambio y referencia vigente. La anterior conserva el rechazo. El acceso profesional se concede al aprobar la nueva. | D y QA |
| CA13 | Abrir un correo antiguo cuando ya existe una solicitud posterior o cambió el estado de la cuenta. | La app presenta el estado vigente y aplica sus permisos. La URL antigua carece de autoridad para alterar el estado. | D y QA |
| CA14 | Intentar acceso a la cola desde clientes sin autenticar, paciente y psicólogo. Inspeccionar HTML y TXT con caracteres especiales. | Acceso denegado. Contenido escapado y legible, URLs autorizadas, recursos HTTPS y datos mínimos del caso. | D y QA |
| CA15 | Ejecutar la regresión de registro, verificación de ambos perfiles, preparación profesional y encuesta guiada. | Continúan los recorridos ya comprobados por QA, incluido el bloqueo profesional antes de aprobar y la edición posterior de datos personales. | D y QA |
| CA16 | Ejecutar los 12 casos de C en Outlook y Gmail. | Cada caso tiene carpeta de recepción y evidencia del enlace. La aceptación de Entrada y enlaces se basa en la matriz real. | Q |
| CA17 | Autenticar una cuenta Gmail real mediante Google y otra cuenta mediante contraseña en el entorno autorizado. | Google conserva la acreditación que entrega Auth. La cuenta con contraseña confirma mediante su enlace. Ambas resuelven el onboarding por UID. | Q |

## Puntos de cambio y referencias

Las rutas se expresan desde la raíz del repositorio. El prefijo versionado para abrirlas en GitHub es `https://github.com/PatrickSpace/PsicoFound-Frontend/blob/e4fb561/`.

| Área | Archivos existentes que debe consultar desarrollo |
| --- | --- |
| Acceso y cierre de sesión | `src/views/Auth/VerifyEmailView.vue`, `src/components/auth/SignUpForm.vue`, `src/components/auth/LoginForm.vue` |
| Presentación del onboarding | `src/components/onboarding/OnboardingShell.vue`, `src/views/onboarding/OnboardingEntryView.vue`, `src/views/onboarding/PatientOnboardingView.vue`, `src/views/onboarding/PsychologistOnboardingView.vue`, `src/views/onboarding/PsychologistPendingView.vue` |
| Sesión y navegación | `src/store/auth.js`, `src/store/appContext.js`, `src/plugins/Firebase/authObserver.js`, `src/router/index.js`, `src/services/onboardingService.js`, `src/utils/returnPath.js` |
| Datos de solicitudes y decisión | `src/services/psychologistRequestService.js`, `functions/src/onboarding/registrationHandlers.js`, `functions/src/accounts/adminHandlers.js` |
| Transporte y contratos de Auth | `src/services/emailVerificationService.js`, `src/utils/emailVerification.js`, `src/views/mainviews/ConfiguracionView.vue`, `functions/src/accounts/accountHandlers.js` |
| Plantillas, Functions y permisos | `docs/email/README.md`, `docs/email/psicologo-aprobado.html`, `docs/email/psicologo-aprobado.txt`, `functions/index.js`, `firestore.rules`, `firestore.indexes.json` |
| Procedimientos y pruebas | `docs/operations/validation.md`, `docs/operations/pilot-release.md`, `tests/browser/patient-http.spec.mjs`, `tests/browser/admin-pilot.spec.mjs`, `tests/browser/pilot-closure.spec.mjs`, `tests/admin-pilot.integration.test.mjs`, `tests/professional-setup.integration.test.mjs` |

## Verificación de desarrollo y entrega a QA

Aprovecha las pruebas existentes de registro, correo, solicitudes y permisos. Añade las pruebas dirigidas necesarias para las carreras de cambio de cuenta, el transporte idempotente y la cola. Las pruebas locales de la revisión QA que afirman la ausencia de «Usar otra cuenta» deben transformarse en comprobaciones del comportamiento solicitado.

Ejecuta las suites pertinentes del candidato según la guía de validación. Como referencia, el proyecto dispone de `npm test`, `npm run test:backend`, `npm run lint:backend`, `npm run build`, `npm run test:admin`, `npm run test:setup` y navegador dirigido mediante `PILOT_BROWSER_ONLY=true VALIDATION_GREP='...' npm run test:patient`. El filtro final debe incluir las pruebas nuevas y los flujos de regresión pertinentes. Los runners aislados requieren los puertos libres y dependencias que describe la guía.

Entrega el PR o SHA probado, entorno, resultado por CA, comandos, evidencias y fallos o dependencias pendientes. Incluye el proveedor implementado, su contrato de idempotencia, los nombres de los secretos y variables que requiere y el comportamiento cuando falte configuración. La evidencia de configuración debe permitir reproducir el entorno sin exponer sus valores secretos.

QA valida el candidato por su cuenta, completa la recepción real y entrega al Documentador el alcance validado. El Documentador registra el cambio en Notion y evalúa las guías afectadas. QA ejecuta un eventual pase con autorización explícita para integrar en `main` y desplegar, siguiendo el procedimiento de release, verifica producción y coordina la actualización documental final.

## D Decisiones pendientes sobre DNI y biometría

El documento original propone verificar la identidad del profesional después de autenticarse y antes de enviar su solicitud. La revisión encontró esa capacidad pendiente. Para que un desarrollador pueda implementarla se necesitan decisiones adicionales que el documento original todavía deja abiertas.

| Decisión requerida | Resultado que debe aportar el siguiente trabajo de Arquitecto |
| --- | --- |
| Cobertura | Países, documentos y perfiles a los que se aplicará, incluidas cuentas existentes y reenvíos. |
| Fuente e integración | Fuente oficial autorizada o proveedor habilitado, credenciales de prueba, contrato técnico y disponibilidad del servicio. |
| Resultado e intervención humana | Condiciones de coincidencia, prueba de presencia, error, reintento y resolución manual. |
| Tratamiento de información | Datos que se capturan, responsable, conservación, eliminación y acceso, acordados con el responsable correspondiente. |
| Experiencia y accesibilidad | Recorrido de cámara o alternativa, permisos, rechazo y recuperación, con diseño de pantallas y estados. |

Estas decisiones dan lugar a una especificación y un diseño propios para ese flujo nuevo. Los bloques A, B y C tienen sus requisitos y criterios de aceptación completos en esta entrega y pueden avanzar con las dependencias externas ya identificadas.

## Prompt de entrega del desarrollador a QA

```text
Rol propuesto — QA y producción de Lurems. Confirma el rol antes de continuar y aplica AGENTS.md y docs/agents/roles.md.

Recibe la implementación de docs/cases/cambio-cuenta-y-correos-profesionales.md. Desarrollo debe completar este traspaso con el PR o SHA candidato exacto y adjuntar el entorno, los resultados por CA y las evidencias obtenidas.

Valida los bloques A y B y repite su regresión. Completa la matriz C de Outlook/Gmail con los buzones y el entorno autorizados y comprueba Google real. Revisa los reintentos de correo, el resultado incierto del proveedor, el aislamiento por cuenta y la corrección/reenvío tras un rechazo. Contrasta cada pendiente de configuración con el candidato y la evidencia.

Entrega los hallazgos al responsable que pueda resolverlos. Tras validar, pasa al Documentador el SHA, el alcance y la evidencia. Coordina el pase según el procedimiento del repositorio y la autorización explícita para integrar y desplegar.
```
