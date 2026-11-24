# Popup «Tu primer paso en Lurems»

## Ficha del caso

- Fecha y etapa — 16/11/2026, especificación de mejora.
- Flujo — acceso autenticado a Inicio (`/dashboard`) en modo paciente, en la app web de Lurems.
- Evidencia — la captura adjunta muestra la bienvenida encima de Inicio para una cuenta con cero sesiones próximas y dos sesiones tomadas.
- Resultado esperado — ofrecer la bienvenida en un diálogo a quien todavía no ha concretado su primera cita.
- Base revisada — `origin/main` en `d0734c49da8a`, donde aparece el cuadro de la captura. La rama de trabajo actual, `feat/frontend-finops-audit`, no contiene el componente.
- Entorno de validación del candidato — emuladores y navegador en escritorio y móvil con cuentas y citas sintéticas. [Guía de validación](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/d0734c49da8a/docs/operations/validation.md)

## Comportamiento

1. Al abrir Inicio en modo paciente, mostrar «Tu primer paso en Lurems» como diálogo modal sobre la pantalla. Conservar el texto y las acciones «Conocer Lurems» y «Más tarde». Esperar a que se resuelva la elegibilidad de la cuenta activa y aplicar la regla de progreso existente de la guía.
2. Una cita se considera concretada desde que queda confirmada. Cuenta una confirmación pasada o futura, una sesión realizada o completada y una inasistencia registrada tras confirmación. Se considera todo el historial de la cuenta, incluidas terapias anteriores y citas sin pago asociado.
3. Una solicitud pendiente, un pago en revisión o una cancelación previa a la confirmación dejan a la persona elegible. Una cita cancelada después de confirmarse cuenta cuando existe evidencia de esa confirmación. Una cancelación histórica sin ese dato, por sí sola, deja el caso elegible.
4. «Conocer Lurems» abre el recorrido existente. «Más tarde» guarda el descarte por cuenta y rol mediante el mecanismo actual y cierra el diálogo. Cerrar con Escape tiene el mismo efecto que «Más tarde». Si guardar falla, el diálogo muestra el error y permite reintentar, y la persona puede cerrarlo para continuar durante esa visita.
5. La entrada manual a la guía sigue las reglas vigentes. Mientras la guía de acompañamiento o el recorrido estén activos, se evita abrir el diálogo de bienvenida.

## Requisitos técnicos

- Reutilizar `ProductGuide`, el progreso persistido en `users.productGuides.patient` y el diálogo de Vuetify con título accesible, foco inicial dentro del diálogo y retorno a un control visible de Inicio al cerrar sin navegar. Aplicar el patrón de modal del Brand System. El alcance permite un traspaso directo a desarrollo. [Componente actual](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/d0734c49da8a/src/components/onboarding/ProductGuide.vue) · [Brand System](https://patrickspace.github.io/lurems-brand-system/)
- Evaluar las citas autorizadas del paciente, con precedencia del documento oficial en `citas` y compatibilidad con resúmenes históricos en `terapias.citas`. Para una cancelación, usar evidencia de confirmación ya disponible, como el evento `appointment_confirmed` o un estado de pago que acredite una confirmación previa de esa cita. Normalizar los estados legados. Los contadores de Inicio y `careGuide.available` tienen reglas propias. [Inicio](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/d0734c49da8a/src/views/mainviews/DashboardView.vue) · [Citas e historial](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/d0734c49da8a/functions/src/appointments/appointmentHandlers.js) · [Elegibilidad de acompañamiento](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/d0734c49da8a/functions/src/onboarding/patientCareHandlers.js)
- Mantener el diálogo cerrado durante la carga inicial, si falla la lectura de elegibilidad o si cambia el usuario o el modo. Descartar respuestas tardías de otra cuenta. Si llega una confirmación válida mientras Inicio sigue abierto, cerrar el diálogo sin guardar un descarte.

## Criterios de aceptación

| Condición inicial | Acción | Resultado observable |
| --- | --- | --- |
| Paciente sin citas y sin progreso de bienvenida | Entrar a Inicio en escritorio y móvil | Tras la carga aparece un solo diálogo. El cuadro deja de ocupar espacio encima del encabezado. Las dos acciones son accesibles por teclado. |
| Cita pendiente, pago en revisión o cita cancelada antes de confirmar, sin otro antecedente | Entrar a Inicio | La bienvenida aparece si sigue pendiente. |
| Cita confirmada, realizada, completada o con inasistencia tras confirmación, incluida una cita sin pago o de una terapia anterior | Entrar a Inicio con la bienvenida pendiente | Inicio se muestra con el diálogo cerrado, incluso con cero sesiones próximas. |
| Cita cancelada con confirmación previa acreditada | Volver a Inicio | El diálogo permanece cerrado. |
| Bienvenida abierta y primera confirmación recibida | Mantener Inicio abierto y luego recargar | El diálogo se cierra al actualizarse los datos y sigue cerrado tras recargar. |
| Bienvenida abierta y persistencia disponible | Elegir «Más tarde» o pulsar Escape y volver a entrar con la misma cuenta | El diálogo se cierra, el foco vuelve a Inicio y el descarte se respeta. |
| Bienvenida abierta | Elegir «Conocer Lurems» | Se abre el recorrido existente sin superponer dos diálogos. La entrada manual permite retomarlo donde corresponda. |
| Lectura lenta, fallida o de una cuenta anterior | Entrar a Inicio o alternar cuenta o modo | El diálogo permanece cerrado hasta que haya datos válidos para el paciente actual. La vista profesional no muestra esta bienvenida. |

## Traspaso a desarrollo de mejoras

La revisión estática identificó el componente de la captura y la diferencia entre la regla de acompañamiento y el historial de citas. Quedan por implementar el diálogo y su condición de apertura y por validar el candidato en un entorno aislado.

> Confirma el rol de Desarrollador de mejoras. Lee esta ficha y usa una base que contenga `ProductGuide.vue`, como `origin/main` en `d0734c49da8a`. Implementa el diálogo opcional de Inicio y determina la elegibilidad por el historial de citas del paciente. Verifica la matriz de aceptación con datos sintéticos, en especial el caso de cero sesiones próximas y sesiones ya tomadas. Registra el PR o SHA y la evidencia para QA en esta ficha.

## Validación de QA · 16/11/2026, America/Lima

- Candidato — `29cb8afb32924b57e864a753a87d062ad30d9627` en `codex/bienvenida-paciente`. Resultado **aprobado en emuladores**. Pase a producción pendiente.
- Entorno — `http://127.0.0.1:5178/dashboard`, proyecto `demo-lurems-followup`, Auth, Firestore y Functions locales con reglas del candidato y datos sintéticos. `sandbox-exec` limitó la salida a loopback y sockets Unix. macOS 26.5.2, Node 22.23.5, Java 21.0.12.1, Firebase CLI 15.15.0 y Playwright 1.56.1. Chromium 141.0.7390.37 con escritorio de 1440 × 1000 y perfil móvil iPhone 13 emulado de 390 × 664 con entrada táctil.
- Suite del candidato — `PILOT_BROWSER_ONLY=true VALIDATION_GREP='patient welcome:' npm run test:patient`. **28/28** en 48,6 s, 14 por perfil. [Informe de Playwright](<../../test-results/qa-29cb8af.HpzW5D/patient-welcome-report/index.html>) · [Salida](<../../test-results/qa-29cb8af.HpzW5D/patient-welcome-retry.log>)
- Regresión de navegador — `PILOT_BROWSER_ONLY=true VALIDATION_GREP='QA dashboard:|REV-PAC-07:' npm run test:patient`. **8/8** en 28,2 s, cuatro por perfil. Incluyó tres pruebas locales dirigidas y `REV-PAC-07` del repositorio. Para reproducir las tres pruebas con el mismo runner, importar el archivo local de pruebas desde un archivo temporal `*.spec.mjs` en `tests/browser/`. [Pruebas locales](<../../test-results/qa-29cb8af.HpzW5D/dashboard-qa.spec.mjs>) · [Informe de Playwright](<../../test-results/qa-29cb8af.HpzW5D/dashboard-report-final/index.html>) · [Salida](<../../test-results/qa-29cb8af.HpzW5D/dashboard-regression-final.log>)
- Integración — `CARE_GUIDE_VALIDATION=true npm run test:patient`. **11/11**. Cinco de acompañamiento y seis de preparación profesional, incluida la persistencia por rol. [Salida](<../../test-results/qa-29cb8af.HpzW5D/care-integration.log>)

| Verificación | Resultado en escritorio y móvil |
| --- | --- |
| Precedencia y elegibilidad inicial | El documento cancelado en `citas` prevaleció sobre el resumen confirmado con el mismo ID. La bienvenida apareció con solicitud pendiente, pago en revisión y cancelaciones previas a la confirmación, incluida una en revisión de devolución. |
| Historial y contadores | Confirmación histórica sin pago, sesión completada en un resumen legado, inasistencia y cancelación con evidencia de cita o pago confirmado excluyeron la bienvenida con cero próximas. El tablero mostró 0 agendadas, 2 tomadas y 1 herramienta aprendida. Con una solicitud y una confirmación futuras mostró 2 agendadas, 2 tomadas y 1 herramienta. La cancelada futura quedó fuera del conteo. [Captura de escritorio](<../../test-results/qa-29cb8af.HpzW5D/dashboard-artifacts-final/dashboard-qa-local-QA-dash-982a7-ose-reload-and-all-counters-desktop/historical-dashboard.png>) · [Captura móvil](<../../test-results/qa-29cb8af.HpzW5D/dashboard-artifacts-final/dashboard-qa-local-QA-dash-982a7-ose-reload-and-all-counters-mobile/historical-dashboard.png>) |
| Confirmación en vivo | Al actualizar a confirmada la cita oficial, el diálogo se cerró y siguió cerrado al recargar de inmediato con el mismo historial. El progreso de bienvenida quedó sin descarte. El foco volvió a «Encontrar terapeuta» sin terapia activa y a «Ver progreso» con terapia activa. |
| Recorrido y teclado | Se mostró un solo diálogo con foco inicial en el título. Tab recorrió las dos acciones y permaneció en el diálogo. Enter abrió el recorrido. Se verificaron las tres paradas, retroceso, finalización y progreso persistido. |
| Descarte y guardado fallido | «Más tarde» y Escape guardaron el descarte, devolvieron el foco a «Guía de funciones» y permitieron iniciar el recorrido manualmente tras recargar. Ante un 503 de guardado, el diálogo ofreció reintentar o cerrar por la visita. La siguiente entrada permitió guardarlo con el servicio restaurado. |
| Lectura y cambio de contexto | Con 503 de `getPatientCareGuide` se mostró «Reintentar guía» y la bienvenida siguió cerrada. Con historial denegado permaneció cerrada y volvió a mostrarse tras restaurar el acceso y recargar. Se descartó una respuesta retenida tras cambiar primero a modo psicólogo y luego a otra cuenta. |
| Guía de acompañamiento | La confirmación de cita y pago en vivo dio paso a «Tu cita está confirmada». Se verificaron pausa, reanudación, las tres paradas y finalización con progreso separado de la guía inicial. La integración verificó pertenencia y correspondencia entre pago y cita, disponibilidad con sesiones realizadas y retiro del aviso tras cancelar. |

### Hallazgos y traspaso

- Hallazgos de producto — 0 en la cobertura ejecutada.
- Hallazgo de entorno — el arranque inicial terminó antes de Playwright por un 503 al registrar un disparador Eventarc. El registro de macOS mostró una denegación de la conexión saliente de Java al puerto 8080. Se forzó IPv4 en el lanzador local de Java y se repitieron las pruebas con el mismo perfil de aislamiento. Las ejecuciones aprobadas usaron los lanzadores locales al inicio de `PATH`, con Node 22 y `JAVA_HOME` apuntando al JDK 21. El lanzador de Firebase usó una configuración local. [Arranque inicial](<../../test-results/qa-29cb8af.HpzW5D/patient-welcome.log>) · [Lanzadores locales](<../../test-results/qa-29cb8af.HpzW5D/bin>)
- El perfil móvil corresponde a Chromium emulado. La aprobación cubre el SHA y el entorno descritos.

> Rol propuesto — Documentador. Confirma el rol y usa esta ficha para registrar en Lurems en Notion la validación de `29cb8afb32924b57e864a753a87d062ad30d9627` en `/dashboard`. QA comprobó 28 casos de la suite, 8 de regresión de navegador y 11 de integración con emuladores y datos sintéticos. Evalúa la actualización de las guías afectadas y devuelve a QA los enlaces y pendientes. El pase a producción sigue pendiente.
