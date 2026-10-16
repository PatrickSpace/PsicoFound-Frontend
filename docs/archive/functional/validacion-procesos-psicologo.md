> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Validación de PSI-08, PSI-09, PSI-10 y PSI-12

Fecha: 2026-10-05. Estado: **alcance funcional aprobado en entorno aislado**.
PSI-08, PSI-09, PSI-10 y PSI-12 implementados y probados. Esta aprobación no
equivale a un despliegue ni a una certificación general de seguridad del producto.

La revisión posterior y los ajustes de fecha en selectores/correo sintético
tienen su [validación del 2026-10-06](cierre-revision-psicologo.md). Los resultados
de este documento corresponden al corte original del 2026-10-05.

## Plan de ejecución

- [x] Contrastar inventario, arquitectura, permisos y cambios locales.
- [x] Compartir el contexto de vista/paciente/terapia y descartar cargas tardías.
- [x] Completar pacientes, objetivos, ejercicios e historial y autorización.
- [x] Preparar emuladores y datos sintéticos sin acceso al proyecto real.
- [x] Ejecutar recorridos A–F en navegador, escritorio y móvil, y permisos.
- [x] Ejecutar las comprobaciones del README y actualizar el informe funcional.

## Entorno y aislamiento

El `.env` existente apunta a `psicosaas-3c819`. No se modificó ni se utilizó para
escrituras. Las pruebas usan `demo-lurems-followup`, Auth `127.0.0.1:9099`, Firestore
`:8080`, Functions `:5001` y Vite `:5178`. La conexión al emulador es opt-in y
rechaza proyectos sin prefijo `demo-` o acceso desde otro host. El navegador
bloquea solicitudes fuera de localhost/127.0.0.1, incluidas fuentes externas.

Versiones usadas: Node 22.20.0, npm 10.9.3, Firebase CLI 15.15.0, Java 21,
Playwright 1.56.1 y Chromium 141. Escritorio 1440×1000; móvil con el perfil
iPhone 13 de Playwright. Es emulación de viewport/táctil, no Safari ni hardware
iOS. No se validó un dispositivo físico ni carga de producción.

El runner crea y cierra sus servidores; exige libre el puerto 5178 para no
aprovechar por error un frontend ya abierto. Cada caso reinicia únicamente los
datos de Firestore del proyecto demo. No se contactó a proveedores de IA/pagos.

## Identidades y datos sintéticos

| Identidad | UID | Relación |
| --- | --- | --- |
| A | `professional-a` | Psicólogo de B/C y paciente de D |
| B | `patient-b` | Paciente de A; también tiene antecedente con D |
| C | `patient-c` | Paciente de A, solo con terapia anterior |
| D | `professional-d` | Psicólogo de A; sin acceso a la terapia de B con A |
| X | `unlinked-x` | Cuenta sin vínculo para intentos de acceso ajeno |

Correo: `<UID>@example.test`. Contraseña exclusivamente sintética:
`SyntheticOnly-2026!`. Las cuentas se crean en Auth Emulator, no en Firebase real.

Terapias: `b-active` (B/A, activa), `b-old` (B/A, pausada), `c-old` (C/A,
finalizada), `a-personal` (A/D, activa), `b-other` (B/D, finalizada).
Cada una tiene una cita realizada con resumen y un evento longitudinal. Las
anteriores y `a-personal` incluyen objetivos/ejercicios de muestra. El perfil de
B contiene motivo, temas y campos privados de control; C no tiene perfil.

## Causa y cambios implementados

- Las consultas antes mezclaban la identidad del usuario con su rol profesional.
  `useTherapyWorkspace` determina el conjunto por `appContext.activeMode`, UID y
  relación con la terapia; comparte selección, filtros, contadores y estados.
  Una generación invalida respuestas tardías y formularios del contexto anterior.
- Pacientes abría solo terapias activas y mostraba indicadores derivados de un
  perfil no cargado. Ahora permite antecedentes propios y consulta un resumen
  mínimo autorizado, sin abrir `profiles` ni `conversations` completos.
- Objetivos sustituía la nota anterior. Ahora cada avance crea un registro
  inmutable con porcentaje, nota, autor, fecha y versión, junto con el evento
  longitudinal en una transacción. Las correcciones/reaperturas exigen motivo;
  100% determina alcanzado. La nota antigua se conserva como `legacyNote` al
  primer avance nuevo, sin inventarle fecha/autor ni entradas históricas.
- Herramientas cargaba asignaciones profesionales, pero representaba la lista
  personal. Ahora muestra las asignaciones de A a sus pacientes; solo el paciente
  completa/observa y A consulta el resultado tras Actualizar.
- Las tablas del historial tenían consultas propias y controles de modificación.
  Ahora reciben el mismo contexto de la línea de tiempo y reutilizan una tabla
  de consulta y su diálogo de resumen. Se incluyen filtros por periodo y evento.
- Los cinco callables validan identidad/relación en el servidor. Los documentos
  de objetivos/ejercicios y sus avances no admiten escrituras directas de cliente.
  Tampoco se pueden fabricar sus eventos longitudinales desde el cliente ni
  insertar eventos en una terapia ajena usando el UID propio.

Se reutilizaron Vuetify, filtros/tabla/resumen compartidos, los tokens existentes
y clases `pf-btn-*`/`card-backgoundcustom`. No se añadieron colores globales ni se
reescribió el diseño. No se incorporaron notas clínicas privadas, cobros, alta o
reasignación de pacientes ni edición/retiro de ejercicios.

## Reproducción

Desde la raíz, con Node 22, Firebase CLI y Java 21 disponibles:

```sh
npm ci
npm --prefix functions ci
npx playwright install chromium
npm run test:followup
```

La última ejecución completa terminó con código 0: cinco pruebas de integración
y ocho de navegador (cuatro casos repetidos en escritorio y móvil). Las pruebas
autenticadas de navegador invocan las Functions HTTP locales reales; las de
integración invocan handlers y usan clientes Firestore separados para verificar
las reglas y leer lo persistido.

| Escenario | Pasos reproducidos | Esperado y observado |
| --- | --- | --- |
| A · Pacientes | Entrar como A psicólogo; abrir B; seleccionar activa y anterior; verificar que C se puede abrir sin activa; probar resumen C, error 500, rechazo 403 y reintento | B muestra motivo/temas autorizados; C muestra ausente; error y acceso restringido son distintos; `b-other` no aparece. Aprobado en ambas resoluciones |
| B · Objetivos | Crear “Meta B navegador”; guardar 30%/“Primer avance B” y 100%/“Segundo avance B”; recargar; abrir historial de avances; entrar como B | Dos notas distintas persistidas, porcentaje coherente, identidad, autor y fecha; B ve el mismo resultado. Aprobado |
| C · Ejercicios | A asigna título/instrucciones/frecuencia/límite a B; B completa con “Me ayudó a respirar con calma”; recarga; A pulsa Actualizar; filtra C | B conserva observación y fecha; A ve realizado sin poder completarlo; C queda separado y su terapia inactiva no permite nueva asignación. Aprobado |
| D · Historial | A selecciona B/activa; abre resumen; cambia a `b-old`; filtra tipo y periodo; restablece fecha | Tablas, citas, resumen y eventos corresponden a la terapia elegida; no aparecen A personal ni C; el periodo excluye cita/evento y permite recuperarlos. Aprobado |
| E · Doble rol | Alternar A en objetivos/herramientas; crear objetivo propio; abrir formularios antes de cambiar; retener una carga profesional y liberarla cuando ya está en paciente | Títulos, controles, filtros, contadores y tarjetas corresponden a la vista; borradores se limpian; se espera explícitamente el fin de la consulta vieja y no contamina la nueva. Aprobado |
| F · Permisos | A intenta `/terapiadetail?id=b-other`; C/D/X intentan lecturas por ID y consultas de B/A; prueban escritura y finalización ajenas | Lecturas/escrituras rechazadas; profiles/conversations íntegros denegados a A; solo el paciente completa; modo falsificado no suplanta relación. Aprobado |
| Recuperación | Inyectar fallo de carga en objetivos, herramientas e historial y pulsar Actualizar | Error visible, sin estado vacío engañoso; al reintentar vuelven los datos. Aprobado |

La retención de consultas y los fallos sintéticos se inyectan desde Playwright,
no mediante controles de depuración en el código de producción. El cambio en
pantalla montada usa la misma acción de Pinia que Configuración; el inicio de
sesión y selección inicial de modo se hacen por la interfaz real.

La integración comprueba además reapertura con motivo, rechazo de versión
obsoleta, nota antigua conservada sin historia inventada, identidad derivada de
la terapia aunque el cliente envíe otro paciente, consulta de procesos inactivos,
acciones personales conservadas y rechazo de doble finalización de ejercicio.

## Evidencia

- [Pruebas de navegador](../../../tests/browser/followup.spec.mjs).
- [Permisos y persistencia](../../../tests/followup.integration.test.mjs).
- [Datos sintéticos](../../../tests/helpers/followup-fixtures.mjs).
- [Informe HTML local](../../../test-results/followup-report/index.html), que también
  se abre con `npx playwright show-report test-results/followup-report`.
- [Objetivo: dos notas, autor y fechas, escritorio](../../../test-results/followup/followup-A-D-patients-two--5b21e--consistent-earlier-history-desktop/objetivos-profesional.png).
- [Objetivo: móvil](../../../test-results/followup/followup-A-D-patients-two--5b21e--consistent-earlier-history-mobile/objetivos-profesional.png).
- [Ejercicio completado: escritorio](../../../test-results/followup/followup-A-D-patients-two--5b21e--consistent-earlier-history-desktop/ejercicio-paciente.png).
- [Ejercicio completado: móvil](../../../test-results/followup/followup-A-D-patients-two--5b21e--consistent-earlier-history-mobile/ejercicio-paciente.png).
- [Cambio al proceso personal](../../../test-results/followup/followup-E-dual-role-empty-1585d-te-requests-and-stale-forms-desktop/doble-rol-paciente.png).
- [Terapia ajena rechazada](../../../test-results/followup/followup-A-F-summary-absen-c1cfb-nd-direct-unrelated-therapy-desktop/acceso-ajeno-denegado.png).

Las capturas de objetivos/ejercicios se inspeccionaron visualmente en escritorio
y móvil. Las pruebas también comprueban ausencia de desbordamiento horizontal.
Los artefactos se generan localmente, están ignorados por Git y se regeneran al
repetir la suite; no contienen información real.

## Comprobaciones adicionales

| Comando | Resultado observado |
| --- | --- |
| `npm test` | 14/14 aprobadas |
| `npm run test:backend` | 48/48 aprobadas en el árbol compartido |
| `npm run lint:backend` | Aprobado |
| `npm run test:followup` | 5/5 integración + 8/8 navegador aprobadas |
| `npm run test:payment-rules` | 6/6 aprobadas en `demo-lurems-rates` |
| `npm run build` | Aprobado; aviso de chunk mayor de 500 kB |
| `git diff --check` | Aprobado |
| `npm run audit:unused -- --production --include files,dependencies,unlisted,unresolved,binaries` | Aprobado |
| `npm run audit:unused` | No aprobado globalmente: exports sin uso en cambios concurrentes fuera de este alcance |
| `npm audit` | 6 avisos: 5 altos y 1 moderado; no se aplicó actualización forzada |
| `npm --prefix functions audit` | 9 avisos moderados; no se modificaron dependencias del backend |

En la última comprobación completa de Knip: `ROLE_TRANSITIONS`,
`isFinalAppointment` (dominio de citas), `createNotification`, `DEFAULT_TIME_ZONE`
y `isFutureAppointment`. No se eliminaron ni se añadieron excepciones para
ocultar estos exports. Los avisos de npm audit no prueban explotabilidad de los
recorridos probados, pero requieren revisión antes de publicar.

## Archivos de esta tarea

- Vistas: `PacientesView.vue`, `mainviews/ProgresoView.vue`,
  `mainviews/HerramientasView.vue`, `mainviews/HistorialView.vue`,
  `terapias/TerapiaDetailView.vue`.
- Componentes: `Navigation/NavDrawer.vue`; `Terapias/CitasDatatable.vue`,
  `TerapiasDatatable.vue`, `TherapyAppointmentsTable.vue`; nuevos
  `SharedInitialSummary.vue` y `TherapyContextFilters.vue`.
- Contexto: nuevos `src/composables/useTherapyWorkspace.js` y
  `src/utils/therapyContext.js`.
- Servicios: nuevo `followupService.js`; `therapyGoalService.js`,
  `exerciseService.js`, `longitudinalHistoryService.js`.
- Backend/autorización: nuevo `functions/src/therapy/followupHandlers.js`,
  exports de seguimiento en `functions/index.js`, bloques de seguimiento de
  `firestore.rules`.
- Entorno/pruebas: `src/plugins/Firebase/firebase.js`, `firestore.js`,
  `firebase.followup-test.json`, `playwright.config.js`,
  `tests/browser/followup.spec.mjs`, `tests/followup.integration.test.mjs`,
  `tests/helpers/followup-fixtures.mjs`, `tests/run-followup.mjs`,
  `tests/unit/therapyContext.test.mjs`, `package.json`, `package-lock.json`,
  `knip.jsonc` y `.gitignore`.
- Documentación: `README.md`, este informe y `revision-funcional-por-rol.md`.

Al comenzar ya existían cambios en README.md y docs/functional/; se preservaron.
Durante el trabajo aparecieron cambios concurrentes de citas/disponibilidad,
Home/Mis sesiones y sus reglas/servicios. No se revirtieron ni se atribuyen a
esta tarea; el informe no acredita esos recorridos como implementados aquí.

## Límites y publicación pendiente

1. No se desplegó, publicó, hizo merge ni se modificaron datos reales. Para llevar
   este alcance a producción se requiere una entrega coordinada de los cinco
   callables, las reglas y el frontend: el cliente antiguo ya no podrá escribir
   directamente objetivos/ejercicios con las reglas nuevas.
2. El resumen inicial es la información mínima actualmente disponible en el
   perfil, no una fotografía histórica de cada terapia. Los historiales antiguos
   solo muestran eventos/notas que realmente existían; no se reconstruyen pérdidas.
3. El historial es de consulta. La gestión de citas y estados de terapia conserva
   sus flujos específicos y su auditoría independiente. No se concede ninguna
   facultad profesional nueva para estos procesos desde el historial.
4. La aprobación cubre los datos sintéticos y navegadores descritos. No cubre
   escala, navegadores distintos, dispositivos físicos, perfil profesional
   desactivado ni la configuración actualmente desplegada.
5. La auditoría global de exports y las advertencias de dependencias siguen como
   pendientes independientes. No bloquean la evidencia funcional obtenida, pero
   no deben interpretarse como un estado global sin incidencias.
