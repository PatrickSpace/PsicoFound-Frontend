> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Cierre de la revisión del paciente

Seguimiento 2026-10-09: [implementación de agenda única en Lima y regresión REV-PAC-04B](cierre-politica-horaria-mvp.md).
La política nueva sustituye la presentación en la zona de cada bloque descrita
en el cierre histórico; conserva el instante original de citas y disponibilidad.

Actualización independiente del 2026-10-08: las suites de este cierre volvieron
a pasar, pero un caso adicional dejó pendiente REV-PAC-04B: el filtro del
calendario oculta bloques futuros al cambiar el día entre zonas. Consultar la
[verificación independiente](verificacion-independiente-cierre-pacientes.md).
El resultado del 2026-10-07 que sigue se conserva como registro de esa ejecución.

Fecha: 2026-10-07 (Lima). Estado: **objetivo completado y validado localmente**.

REV-PAC-01, REV-PAC-02, REV-PAC-03, REV-PAC-04, REV-PAC-05, REV-PAC-06,
REV-PAC-07 y ENV-PAC-01 están cerrados dentro del alcance solicitado.
La ejecución definitiva terminó con código 0: 18 pruebas de integración y
34 pruebas de navegador, incluyendo las regresiones del psicólogo. No se desplegó.

## Plan

- [x] Leer revisión, evidencia, instrucciones y cambios existentes.
- [x] REV-PAC-01/02: autorizar emociones y emitir historial desde servidor.
- [x] ENV-PAC-01: importaciones modulares del SDK, sin preload ni parche al CLI.
- [x] REV-PAC-03/04: resolver citas vencidas y explicitar zonas IANA.
- [x] REV-PAC-05/06/07: visibilidad compartida, reintento móvil y contexto emocional.
- [x] Incorporar regresiones mantenibles, incluidas operaciones HTTP.
- [x] Validar escritorio/móvil y las regresiones del psicólogo.
- [x] Ejecutar unitarias/backend/lint/build/diff y documentar evidencia real.

Solo emuladores locales y datos sintéticos. Se preservan cambios previos.
Pagos continúan siendo conciliación manual; eliminación de cuenta continúa
como solicitud pendiente de política. No se despliega ni se opera sobre datos reales.

## Correcciones y evidencia por hallazgo

| Hallazgo | Estado | Corrección | Regresión mantenida en el proyecto |
| --- | --- | --- | --- |
| REV-PAC-01 | Cerrado y verificado | `createEmotionalCheckin` exige paciente propietario, modo paciente, terapia activa y profesional existente. No acepta campos de identidad/autoría del cliente; obtiene nombres de usuario/profesional. Registro e historial se escriben en una transacción idempotente. Firestore rechaza escrituras directas. | `tests/patient.integration.test.mjs`: X/C/A ajenos, identidad falsificada, terapia inactiva, lectura B/A y rechazo C/X, doble rol con terapia personal. Navegador: guardar, recargar y consultar como profesional. |
| REV-PAC-02 | Cerrado y verificado | No hay eventos de historial autorizados para escritura directa del cliente. Emociones se trasladan al servidor; objetivos, ejercicios, citas y estados de terapia conservan sus operaciones autorizadas. | Rechazo de eventos falsos, transición real a `realizada` por HTTP y un único evento tras reintento. Regresiones existentes de objetivos/ejercicios/historial. |
| REV-PAC-03 | Cerrado y verificado | Mis sesiones muestra citas abiertas pasadas o sin horario interpretable. Reutiliza `NextAppointmentCard` y `CitaDialog` para cancelación/reprogramación explícitas. Deshabilita nueva reserva mientras exista cita abierta en la terapia activa. | Pendiente y confirmada: cancelación, reprogramación, nueva reserva y cambio de estado posterior; verificación de cita, resumen, bloque, historial, notificación y pago. No hay caducidad automática ni cierre clínico. |
| REV-PAC-04 | Cerrado y verificado | Zona IANA visible en cada bloque, horario seleccionado, cotización, reprogramación, tarjeta y avisos de estado. El servidor usa la zona del bloque y conserva el instante. La conversión resuelve transiciones de horario de verano. | Paridad frontend/backend, Lima/Madrid con cambio de día, invierno/verano, salto de primavera, rechazo de horas inexistentes o ambiguas sin instante explícito. Reserva/reprogramación HTTP e interfaz de un paciente en Madrid con bloque en Lima. |
| REV-PAC-05 | Cerrado y verificado | “Nota compartida con tu profesional”, aviso previo con profesional y terapia; también se informa del acceso administrativo autorizado por las reglas. No se promete privacidad que las reglas no brindan. | Aviso antes de guardar y lectura real de la nota por A después de que B la guarda y recarga. |
| REV-PAC-06 | Cerrado y verificado | El contenido de recomendaciones conserva `--v-layout-top` de Vuetify. El aviso y botón usan distribución flexible y clases globales. | Error → clic normal en Reintentar → estado vacío, conservación de preferencias, ausencia de coincidencias y ayuda accesible con error. Escritorio/móvil, sin `force` ni modificaciones CSS desde la prueba. |
| REV-PAC-07 | Cerrado y verificado | Cambio de usuario/modo invalida cargas, limpia terapia/lista/errores/borrador y cierra el diálogo. Todas las asignaciones, incluida `activeTherapy`, y los resultados de guardado se condicionan al contexto vigente. `appContext` invalida perfiles tardíos; roles admite perfil nulo sin conceder permisos. | `setActiveMode`, la misma acción de Configuración, sin desmontar la ruta; cambios paciente ↔ psicólogo, borrador abierto, resultado demorado y cambio real de cuenta Auth A/B/C. Se comprueban datos, botones, formulario y terapia nuevos. |
| ENV-PAC-01 | Cerrado y verificado | Importaciones oficiales `FieldValue`/`Timestamp` desde `firebase-admin/firestore`. Ningún preload ni modificación del Firebase CLI instalado. | Operaciones HTTP de registro, recuperación tras inicialización fallida, onboarding, perfil, cotización/reserva/confirmación/enlace/reprogramación/cancelación, pagos manuales y soporte con respuesta. |

REV-PAC-07 corrige un diálogo/datos residuales y sus carreras de carga; no se
afirma que el defecto original permitiera escribir en nombre de otro paciente.

## Causa y solución del entorno

Firebase CLI 15.15.0 representa funciones mediante `value.bind(target)` en
`functionsEmulatorRuntime.js`. La función enlazada pierde las propiedades
estáticas de `admin.firestore`: se reprodujo `typeof ...FieldValue === "undefined"`
después del enlace, mientras la importación modular conserva `serverTimestamp`.
Se adoptó el [módulo oficial de Firestore del Admin SDK](https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore),
sin cambiar versiones de dependencias, copiar propiedades al proxy o introducir
`tests/emulator-compat.cjs`.

Se actualizaron los usos de esas clases en handlers de seguimiento, citas,
registro, cuenta, soporte, pagos y sesión de conversación. La prueba HTTP es
necesaria: las pruebas directas de handlers no pasan por el proxy del emulador.

## Reproducción aislada

Entorno: macOS, Node 22.20.0, Firebase CLI 15.15.0, Firebase Admin 13.10.0,
Java 21, Playwright 1.56.1 con Chromium. Proyecto exclusivamente sintético
`demo-lurems-followup`. Resoluciones: escritorio 1440×1000 y perfil iPhone 13
390×664 CSS (Chromium, no Safari ni dispositivo físico).

```sh
npm test
npm run test:backend
npm run lint:backend
npm run build
git diff --check
PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" caffeinate -di npm run test:patient
```

`test:patient` comprueba que los puertos 8080, 9099, 5001, 5178, 4400, 4500 y 9150
estén libres antes de iniciar Firebase. Rechaza variables de emuladores heredadas
y `NODE_OPTIONS`, inicia su propio conjunto y lo cierra al terminar. No reutiliza
ni limpia emuladores de otros chats. El fixture solo reinicia Firestore del
proyecto demo después de esas comprobaciones.

El comando usa `sandbox-exec` de macOS para bloquear conexiones salientes salvo
loopback y sockets Unix locales; abarca CLI, Functions, pruebas y Chromium. Las
advertencias `EPERM` contra el endpoint de metadatos externo son evidencia del
bloqueo, no acceso a producción. Además, el navegador bloquea otros hosts y el
endpoint de IA. En otra plataforma el comando falla explícitamente: requiere
aislamiento de red equivalente, no una omisión silenciosa de la protección.
Emuladores, Java y Chromium deben estar instalados antes de ejecutarlo.

Los documentos legales del entorno se configuran con URLs `example.test` y una
versión sintética para probar el registro; no son documentos aprobados para un
despliegue. No se abren enlaces de pago, reunión o ayuda externa.

## Resultados

- Unitarias: 27/27 (`test-results/patient-fix-unit.log`).
- Backend: 53/53 (`test-results/patient-fix-backend.log`).
- Lint backend: aprobado (`test-results/patient-fix-lint.log`).
- Build: aprobado; permanece la advertencia de bundle mayor de 500 kB
  (`test-results/patient-fix-build.log`).
- `git diff --check`: aprobado.
- Knip completo: salida 1, mantiene una dependencia no declarada en la prueba
  previa de citas y siete exportaciones sin uso; coincide con el cierre previo
  del psicólogo (`test-results/patient-fix-knip.log`). La variante
  `--production` informa 16 exportaciones al excluir pruebas
  (`test-results/patient-fix-knip-runtime.log`). No se eliminaron APIs ajenas.
- Knip de dependencias/archivos de runtime
  (`--production --include files,dependencies,unlisted,unresolved,binaries`):
  salida 0 (`test-results/patient-fix-knip-runtime-scope.log`).
- Control de aislamiento: un segundo intento mientras Auth estaba ocupado
  fue rechazado antes de iniciar emuladores, con salida 1 esperada
  (`test-results/patient-fix-port-guard.log`); no alteró la suite activa.
- Integración local: **18/18**, desglosadas en 7 de seguimiento + 6 de citas +
  5 del paciente/HTTP. Ejecución conjunta definitiva, salida 0, en
  [`test-results/patient-fix-final.log`](../../../test-results/patient-fix-final.log).
- Navegador: **34/34** (17 en cada resolución), incluidos permisos/contexto,
  citas vencidas, zona IANA larga sin recortes y recorridos HTTP. La pasada
  anterior también aprobó 34/34 (`test-results/patient-fix-acceptance.log`);
  después se amplió la comprobación visual del horario y se repitió toda la suite.
- Capturas revisadas en ambas resoluciones: error/reintento de recomendaciones,
  horario/cotización y flujo emocional. Emuladores y Vite cerrados al finalizar;
  no quedan listeners en los cuatro puertos de servicios principales.

Una pasada preliminar obtuvo 33/34: el fallo restante fue una carrera del harness
al navegar antes de terminar el cierre de sesión. Se añadió la espera de la ruta
de login, sin alterar la app ni forzar clics; ambas repeticiones posteriores pasaron.

La primera pasada también detectó la configuración legal sintética ausente y el
acceso a roles con perfil nulo; ambos se corrigieron. Un intento de endurecer el
aislamiento fue detenido porque bloqueaba el socket Unix interno de Functions;
la política final permite ese IPC local, no conexiones externas. Se conservan
logs de esas pasadas y no se presentan como ejecuciones aprobadas.

Pruebas versionables: `tests/patient.integration.test.mjs`,
`tests/browser/patient-http.spec.mjs`, `tests/helpers/patient-http.mjs`,
`tests/run-patient-isolated.mjs`, `tests/unit/dateTime.test.mjs` y regresiones
actualizadas de seguimiento/roles. Capturas y trazas locales quedan en
`test-results/followup/`; el HTML en `test-results/followup-report/`.

## Archivos y límites

Cambios de esta corrección, además de pruebas/documentación:

- Seguridad y operaciones: `firestore.rules`, `functions/index.js`,
  `functions/src/therapy/followupHandlers.js`,
  `functions/src/appointments/appointmentDomain.js` y `appointmentHandlers.js`.
- Compatibilidad modular: `functions/src/accounts/accountHandlers.js`,
  `support/supportHandlers.js`, `onboarding/registrationHandlers.js`,
  `chat/profileChatHandlers.js`, `chat/session.js`,
  `payments/paymentOperationHandlers.js` y `payments/paymentRateHandlers.js`.
- Interfaz/contexto: `src/views/mainviews/RegistroEmocionalView.vue`,
  `MisSesionesView.vue`, `src/views/encuesta/ElegirTerapeuta.vue`,
  `src/components/Terapias/CitaDialog.vue`, `NextAppointmentCard.vue`,
  `src/store/appContext.js`, `src/utils/roles.js`, `src/utils/dateTime.js`.
- Servicios: `src/services/emotionalCheckinService.js`,
  `src/services/longitudinalHistoryService.js`, `src/services/availabilityService.js`;
  scripts: `package.json`,
  `tests/run-followup.mjs`.

Se conservaron las modificaciones previas sin commit. No se revirtió el trabajo
de otros frentes ni se hizo commit/deploy.

Límites: conciliación de pagos manual, sin cobros/devoluciones reales; eliminación
de cuenta solo `pending_policy`; sin auditoría administrativa completa, cambios
clínicos ni validación de recursos externos de emergencia. Los datos históricos
reales no fueron inspeccionados, corregidos ni migrados. Para publicar estos cambios
se necesitará desplegar coordinadamente frontend, Functions y reglas; hacerlo no
está autorizado ni forma parte de esta validación local.
