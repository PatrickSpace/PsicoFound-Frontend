> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Cierre de la política horaria del MVP

Fecha de informe: 2026-10-09, America/Lima.
Estado: **implementado y validado localmente; objetivo completado**. No se ha desplegado.

REV-PAC-04B queda corregido y cubierto por una regresión mantenida. La pasada
definitiva terminó con código 0: 21 pruebas de integración y 66 de navegador.

Objetivo: unificar la agenda de paciente, psicólogo y administrador en
America/Lima, conservar los instantes de las citas existentes y verificar que
los horarios no dependan de la zona del dispositivo.

## Implementación

- Política compartida por frontend y Functions: conversión IANA, resolución de
  instantes, presentación en Lima y límites de calendario. Corrige REV-PAC-04B:
  el selector no compara el día del bloque con el día local del dispositivo.
- Selección, cotización, reprogramación, próxima sesión, Home, disponibilidad,
  tablas compartidas y avisos identifican la hora de Lima. Administrador utiliza
  la misma tabla en el detalle de terapia. No se crean tablas o estilos paralelos.
- Disponibilidad nueva mediante callable autorizado y transaccional, con futuro,
  solapamiento, concurrencia, reintento y propiedad del profesional. Reglas
  deniegan escrituras directas. No se amplían permisos a bloques ajenos.
- Reserva y reprogramación rechazan zonas de entrada distintas de Lima. El
  bloque heredado se interpreta en su zona original y conserva su instante.
  Cotización con bloque devuelve horario validado; reservar vuelve a comprobarlo.
- Configuración/onboarding explican la política y no ofrecen una elección de zona
  para la agenda. Editar país u otros datos conserva `zonaHoraria` histórica.
- Las vistas reevalúan el reloj mientras permanecen abiertas. No hay cancelación,
  vencimiento ni cierre clínico automáticos.

La decisión y el contrato detallados están en
[Política horaria del MVP](../../functional/politica-horaria-mvp.md).

## Datos existentes

Las consultas convierten solo la presentación. Se usa el instante UTC cuando
es válido y concordante; sin él, la fecha/hora/zona original. También se admite
el campo histórico `timezone`. La ausencia de zona mantiene el supuesto previo
de Lima. Un instante explícito desambigua una hora repetida por DST; los horarios
inexistentes, inválidos o contradictorios requieren revisión.

Los bloques reservados conservan fecha/hora/zona originales; la cita nueva y su
copia en terapia almacenan el mismo instante expresado en Lima. Editar notas de
una cita antigua no desplaza su instante. La reprogramación explícita sí lo cambia.
No se ejecutó ninguna migración ni se necesita una migración masiva para mostrar
los datos en Lima. No se inspeccionaron documentos reales.

Los casos no resolubles se identifican como “Horario por revisar”; no se ofrecen
para reserva. Las citas abiertas siguen accesibles para resolverlas. Los avisos
históricos sin horario estructurado verificable remiten a la cita. Los eventos
conservan su texto como registro original, separado del horario normalizado.

## Escenarios mantenidos

| Suite | Cobertura |
| --- | --- |
| `tests/unit/dateTime.test.mjs` y `agendaPolicy.test.mjs` | Lima/Madrid, verano/invierno, DST repetido/inexistente, ISO inválido o sin zona, contradicciones, alias histórico, límites de semana/mes/año y REV-PAC-04B |
| `tests/agenda.integration.test.mjs` | HTTP real de callable: zona distinta, pasado, propiedad, administrador sin nuevo permiso, escrituras directas denegadas, solapamiento concurrente, reintento, legado, cita ajena, edición sin desplazar y reprogramación manual explícita |
| `tests/browser/agenda-lima.spec.mjs` | Cuatro recorridos por contexto: ciclo completo de los tres roles; cruce de mes/año; día nuevo de Lima frente a Honolulu; consulta de citas heredadas, Home e historial sin mutarlas |
| Regresiones existentes | Emociones, autoría e historial, citas vencidas, cuenta/registro, soporte, recomendaciones, pagos manuales, seguimiento profesional y separación de vistas |

Matriz de navegador: `America/Lima`, `Europe/Madrid`, `Asia/Tokyo` y
`Pacific/Honolulu`, cada una en escritorio 1440×1000 y perfil iPhone 13
390×664 CSS, Chromium. Son 32 casos de agenda y 34 regresiones previas en
escritorio/móvil. No es una prueba de Safari ni de dispositivos físicos.

El recorrido completo abre disponibilidad desde la interfaz del psicólogo,
selecciona/cotiza/reserva como paciente, confirma como psicólogo, consulta como
administrador, abre el aviso del paciente, reprograma a un bloque heredado y
cancela. Comprueba cita, copia de terapia, bloque, historial, notificación y pago.
Todos los contextos comprueban los mismos horarios e instantes esperados.

El reloj controlado pertenece al navegador, no al servidor ni al sistema:

- `2099-01-16T00:30:00Z`: Lima sigue en el día 15; Madrid/Tokio ya están en el 16.
  El bloque 23:30 de Lima permanece seleccionable y guarda `2099-01-16T04:30:00Z`.
- `2099-01-01T02:00:00Z`: cruce de año/mes; Lima todavía está en diciembre.
- `2099-01-01T06:00:00Z`: Lima ya está en enero; Honolulu todavía en diciembre.
- Bloques realmente pasados respecto al reloj de interfaz no aparecen; el
  servidor rechaza además solicitudes pasadas respecto a su propio reloj real.

## Ejecución y evidencia

```sh
npm test
npm run test:backend
npm run lint:backend
npm run build
git diff --check
npm run audit:unused -- --production --include files,dependencies,unlisted,unresolved,binaries
PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" caffeinate -di npm run test:agenda
```

El runner comprueba siete puertos libres antes de iniciar su propio conjunto
Auth/Firestore/Functions/Vite. Proyecto `demo-lurems-followup`, usuarios y datos
sintéticos. `sandbox-exec` bloquea red saliente excepto loopback y sockets IPC;
el navegador bloquea también destinos externos e IA. Sin `NODE_OPTIONS`, preload,
parches del CLI, cobros ni apertura de enlaces externos. No se limpian emuladores
de otros chats. El runner falla expresamente fuera de macOS hasta disponer de un
aislamiento equivalente.

Resultados definitivos:

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Unitarias | 30/30 aprobadas | `test-results/lima-unit-final.log` |
| Backend | 53/53 aprobadas | `test-results/lima-backend-final.log` |
| Lint backend, incluidos módulos `.mjs` | Aprobado | `test-results/lima-lint-final.log` |
| Build | Aprobado; advertencia conocida de bundle >500 kB | `test-results/lima-build-final.log` |
| `git diff --check` | Aprobado | Comprobación sobre el workspace al cierre |
| Knip de archivos/dependencias de runtime | Aprobado | `test-results/lima-knip-runtime.log` |
| Integración | 21/21: 7 seguimiento + 6 citas + 5 paciente + 3 agenda | `test-results/lima-acceptance.log` |
| Agenda en navegador | 32/32, cuatro zonas × dos resoluciones × cuatro recorridos | `test-results/lima-acceptance.log` |
| Regresiones de navegador | 34/34, paciente y psicólogo en escritorio/móvil | `test-results/lima-acceptance.log` |

La aceptación se ejecutó sin modificar el código funcional durante la pasada.
Se revisaron visualmente las capturas de cotización de escritorio/Madrid y
móvil/Tokio: el horario de Lima es legible y el recorrido confirma con clics
normales. Emuladores y Vite propios quedaron cerrados; no hay listeners en
8080, 9099, 5001 ni 5178. Se conservaron intactos los otros servidores locales.

Log: `test-results/lima-acceptance.log`; capturas/trazas: `test-results/lima-browser/`
y `test-results/followup/`; HTML: `test-results/lima-report/` y
`test-results/followup-report/`. Las carpetas de evidencia están ignoradas por Git;
las pruebas y los comandos quedan mantenidos en el repositorio.

Ejecuciones anteriores conservadas:

- `lima-validation-1.log`: una expectativa antigua exigía zona Madrid en un aviso;
  se actualizó para comprobar su horario equivalente de Lima, sin retirar la
  comprobación UTC.
- `lima-validation-2.log`: el harness intentaba escribir un Timestamp del SDK Admin
  con el SDK cliente. Se convirtió a Date para probar efectivamente el rechazo
  de reglas, en lugar de fallar antes de llegar al emulador.
- `lima-validation-3.log`: 4 fallos de historial detectaron que la presentación
  reemplazaba el texto del evento. Se corrigió conservando el registro original.
- `lima-validation-4.log`: 20 integraciones + 32 casos de agenda + 34 regresiones
  aprobados. Después se amplió cobertura de Home, perfiles y casos inválidos.
- `lima-validation-final.log`: ejecución intermedia detenida voluntariamente
  tras ajustes finales; no se cuenta como pasada completa. La aceptación se
  repite sin modificar código mientras corre.

## Archivos de esta tarea

- Política: `functions/src/appointments/schedulePolicy.mjs`,
  `src/utils/dateTime.js`, `src/composables/useAgendaClock.js`.
- Servidor/reglas: `functions/src/appointments/appointmentDomain.js`,
  `appointmentHandlers.js`, `functions/src/payments/paymentOperationHandlers.js`,
  `functions/src/accounts/accountHandlers.js`, `functions/index.js`,
  `firestore.rules`.
- Servicios: `src/services/availabilityService.js`, `terapiaService.js`,
  `paymentService.js`, `notificationService.js`.
- UI: `src/components/Terapias/CitaDialog.vue`, `NextAppointmentCard.vue`,
  `TherapyAppointmentsTable.vue`; `src/views/psicologo/PsicologoSesionesView.vue`;
  `src/views/mainviews/DashboardView.vue`, `HistorialView.vue`,
  `ConfiguracionView.vue`; `src/views/onboarding/PatientOnboardingView.vue`.
- Pruebas/configuración: `tests/unit/agendaPolicy.test.mjs`,
  `tests/agenda.integration.test.mjs`, `tests/browser/agenda-lima.spec.mjs`,
  `tests/patient.integration.test.mjs`, `tests/browser/patient-http.spec.mjs`,
  `tests/run-followup.mjs`, `playwright.config.js`, `playwright.lima.config.js`,
  `package.json`, `functions/package.json`, `functions/.eslintrc.js`.
- Documentación: `README.md`, `docs/functional/politica-horaria-mvp.md`,
  `cierre-politica-horaria-mvp.md`, `revision-funcional-por-rol.md`,
  `revision-independiente-pacientes.md`, `cierre-revision-pacientes.md` y
  `verificacion-independiente-cierre-pacientes.md`.
  Se preservan los cambios anteriores sin commit; el diff total del
  workspace incluye trabajo previo y no representa únicamente esta tarea.

## Límites y operación posterior

No se desplegó frontend, Functions ni reglas. Publicar requiere coordinación de
los tres: un frontend antiguo con escrituras directas de disponibilidad será
rechazado por las nuevas reglas. Node 22 es el runtime declarado y probado para
el módulo compartido. No se certifica el entorno publicado.

No hay migración pendiente necesaria para este comportamiento. La resolución de
un dato histórico realmente inválido requiere información/decisión explícita de
sus responsables; no se fabrican instantes ni se ejecutan correcciones masivas.
Se mantienen los límites de pagos manuales, eliminación `pending_policy` y
recursos clínicos/multipaís fuera del alcance. Permanece la advertencia conocida
de bundle mayor de 500 kB.
