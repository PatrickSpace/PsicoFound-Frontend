> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Cierre de REV-PSI-01 y REV-PSI-02

Fecha: 2026-10-06 (Lima). Estado: **REV-PSI-01 y REV-PSI-02 cerrados**.

Ambos ajustes están implementados y las dos ejecuciones completas terminaron
con código 0: entorno limpio y repetición importando las mismas cuentas de
Auth Emulator. No quedan impedimentos atribuibles a estos dos hallazgos.
Esto no significa que todos los controles generales del repositorio estén
en verde: Knip completo mantiene los hallazgos ajenos indicados más abajo.

## Plan

- [x] Confirmar los dos hallazgos sobre el workspace actual y revisar dependencias.
- [x] Incorporar fecha y presentación legible en los selectores compartidos.
- [x] Crear/actualizar solo las cuentas sintéticas de seguimiento como verificadas.
- [x] Añadir regresiones de fechas, contexto, resembrado y bloqueo de correo.
- [x] Ejecutar la suite limpia y repetir conservando Auth Emulator.
- [x] Ejecutar comprobaciones del repositorio e inspeccionar evidencia visual.
- [x] Documentar resultados e incidencias reales y cerrar los hallazgos.

Se preservan los cambios previos y concurrentes de pacientes. No se modifica
la protección de rutas ni la autenticación de producción, y no se despliega.

## Cambios y causa

### REV-PSI-01

La etiqueta compartida omitía `fechaCreacion`. Ahora conserva paciente, ID y
estado e incorpora `Creación: <fecha>` en formato `es-PE`. Las fechas ausentes,
inválidas o con desbordamiento de calendario, como 30 de febrero, muestran
`Fecha no disponible`; no se sustituyen por la fecha actual.

`TherapySelect` reutiliza `v-select`, `v-list-item` y las utilidades de Vuetify
`text-wrap`/`text-break`. Se usa en el detalle, los filtros compartidos y los
formularios de objetivos y ejercicios. No añade colores ni CSS global.
El detalle usa el mismo formateador. La selección y las autorizaciones no cambian.

Las pruebas versionadas preparan B con una terapia activa, dos pausadas con
fechas diferentes, otra sin fecha y otra inválida. En ambos tamaños comprueban
las cinco opciones, el texto completo sin recortes y cada navegación contextual
a objetivos, ejercicios e historial. También inspeccionan los formularios.

### REV-PSI-02

El fixture no satisfacía la protección de correo verificado. `seedFollowup`
crea las cinco cuentas conocidas con `emailVerified: true` y actualiza esa
propiedad si ya existen. No elimina ni recrea los usuarios de Auth.

Se conservan los límites al proyecto `demo-lurems-followup` y a hosts locales,
y se valida también el proyecto de una instancia Admin reutilizada. La prueba
de integración desverifica las cuentas conocidas, reejecuta el fixture y
comprueba la verificación y la misma fecha de creación. Una cuenta independiente
`followup-unverified-control` permanece sin verificar. El navegador comprueba
que no puede entrar en las rutas protegidas ni eludir el guard pulsando
«Ya verifiqué mi correo». No se cambió el router ni la autenticación real.

## Incidencias encontradas durante la validación

- El runner incluye seis pruebas de citas añadidas por el trabajo paralelo.
  Fallaron inicialmente porque la reserva ahora exige una tarifa y una
  cotización. Se adaptó únicamente su preparación sintética: tarifa local y
  obtención de `quoteId` mediante el handler existente. Las seis pruebas pasaron
  después. No se modificaron pagos, servicios, reglas ni el contrato de reserva.
- Hubo ejecuciones con suspensiones de macOS y fallos de timeout. Las trazas
  incluyen pausas prolongadas y `pmset -g log` registra Sleep/DarkWake durante
  esos intervalos. Una repetición ni siquiera inició Firestore dentro de 60 s.
  Esas ejecuciones no se consideran aprobadas. Se conservan sus artefactos;
  no se omiten casos ni se incrementan sus tiempos límite para ocultar fallos.
- Al revisar la nueva prueba se acotó el enlace de historial a `main`, para
  comprobar la acción contextual y no el enlace homónimo de navegación.

## Resultados finales

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 17/17 aprobadas |
| `npm run test:backend` | 53/53 aprobadas |
| `npm run lint:backend` | Salida 0 |
| `npm run build` | Salida 0; aviso de bundle mayor de 500 kB |
| `git diff --check` | Salida 0 |
| Knip de runtime (`--production --include files,dependencies,unlisted,unresolved,binaries`) | Salida 0 |
| `npm run audit:unused` | Salida 1: dependencia Admin no listada en prueba de citas y siete exports ajenos sin uso |
| `test:followup`, limpio | Salida 0: 7/7 integración de seguimiento + 6/6 citas + 12/12 navegador; 0 omitidas |
| `test:followup`, importando Auth | Salida 0: 7/7 integración de seguimiento + 6/6 citas + 12/12 navegador; 0 omitidas |
| Comparación de exports de Auth | Salida 0: mismos seis UID y `createdAt`; cinco cuentas verificadas y control sin verificar |
| Inspección visual | Opciones y selección legibles en escritorio/móvil; fechas y fallback completos, formularios sin recortar la etiqueta |

Cada suite conserva los ocho casos originales de navegador (cuatro en cada
resolución) y añade cuatro comprobaciones de los hallazgos (dos en cada una).
Los 12 casos tardaron aproximadamente 2,2 minutos en limpio y 2,0 en repetición.

La regresión mantiene PSI-08 (pacientes, terapias previas y resumen mínimo),
PSI-09 (avances, notas, autoría, persistencia y versiones), PSI-10 (asignación,
realización personal y consulta profesional) y PSI-12 (historial y filtros
contextuales). También se ejecutaron separación de doble rol, contadores,
formularios obsoletos, respuestas tardías, permisos y errores/reintentos.

Los siete exports informados son `ROLE_TRANSITIONS`, `isFinalAppointment`,
`normalizeRequiredCriteria`, `createNotification`, `updateUserProfile`,
`DEFAULT_TIME_ZONE` e `isFutureAppointment`. No se eliminaron APIs ni se
ampliaron exclusiones de Knip para ocultar trabajo paralelo.

## Evidencia local

- [Registro del recorrido limpio](../../../test-results/rev-psi-clean-pm.log).
- [Informe HTML limpio](../../../test-results/rev-psi-clean-pm/followup-report/index.html).
- [Registro de la repetición con import de Auth](../../../test-results/rev-psi-repeat-pm.log).
- [Informe HTML de repetición](../../../test-results/rev-psi-repeat-pm/followup-report/index.html).
- [Comparación de identidades y verificación](../../../test-results/rev-psi-auth-comparison-pm.log).
- [Unitarias, backend, lint y build](../../../test-results/rev-psi-checks-pm.log).
- [Knip completo](../../../test-results/rev-psi-knip-pm.log) y [runtime](../../../test-results/rev-psi-knip-runtime-pm.log).
- [Selector con fechas en móvil](../../../test-results/rev-psi-clean-pm/followup/followup-REV-PSI-01-dated--78cae-t-across-all-followup-views-mobile/REV-PSI-01-selector-fechas.png).
- [Formulario de ejercicios en escritorio](../../../test-results/rev-psi-clean-pm/followup/followup-REV-PSI-01-dated--78cae-t-across-all-followup-views-desktop/REV-PSI-01-formulario-herramientas.png).
- [Control de correo no verificado en móvil](../../../test-results/rev-psi-repeat-pm/followup/followup-REV-PSI-02-a-sepa-6f199-ays-blocked-after-reseeding-mobile/REV-PSI-02-correo-no-verificado.png).

Los intentos con suspensiones se conservaron en
`test-results/rev-psi-attempt-2026-10-06/` y
`test-results/rev-psi-attempt-2026-10-06-am/`, junto con el registro
`test-results/rev-psi-clean-final.log` del segundo. Sus fallos no se borraron
ni se contaron como éxitos; la aprobación procede de las dos ejecuciones
posteriores completas, no de sumar casos aprobados en intentos fallidos.

## Reproducción

Requisitos del README: Node 22, dependencias instaladas, Firebase CLI 15.15,
Java 21 y Chromium de Playwright. Mantener el equipo despierto, con puertos
8080, 9099, 5001 y 5178 libres. Desde la raíz del repositorio, en macOS:

```sh
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
XDG_CONFIG_HOME="$(mktemp -d)" caffeinate -di npm run test:followup -- \
  --export-on-exit test-results/rev-psi-auth-clean-pm

XDG_CONFIG_HOME="$(mktemp -d)" caffeinate -di npm run test:followup -- \
  --import test-results/rev-psi-auth-clean-pm \
  --export-on-exit test-results/rev-psi-auth-repeat-pm
```

El primer comando no importa datos: arranca limpio. El segundo importa las
cuentas de Auth exportadas por el primero; Firestore se vuelve a sembrar por
caso. Usar nombres nuevos de directorio al reproducir si ya existen, y mantener
la misma ruta del primer export en el segundo `--import`. `caffeinate` solo
evita el reposo por inactividad mientras se ejecuta el comando; no modifica
preferencias persistentes ni evita el reposo al cerrar la tapa.

No hay filtros `--grep`, casos omitidos, modificaciones manuales de las cuentas
ni desactivación del guard de rutas en estos comandos.

Para comprobar que se conservaron las mismas cuentas entre ambas ejecuciones:

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (run) => JSON.parse(readFileSync(
  `test-results/rev-psi-auth-${run}-pm/auth_export/accounts.json`, 'utf8'
)).users;
const before = read('clean');
const after = new Map(read('repeat').map((user) => [user.localId, user]));
assert.equal(before.length, 6);
assert.equal(after.size, before.length);
for (const user of before) {
  const same = after.get(user.localId);
  assert.ok(same);
  assert.equal(same.createdAt, user.createdAt);
  assert.equal(same.emailVerified, user.localId !== 'followup-unverified-control');
}
console.log('6 cuentas conservadas: 5 verificadas y 1 control sin verificar');
NODE
```

## Archivos de este ajuste

- `src/utils/therapyContext.js`: etiqueta y formateador.
- `src/components/Terapias/TherapySelect.vue`: presentación compartida.
- `src/components/Terapias/TherapyContextFilters.vue`: reutilización del selector.
- `src/views/terapias/TerapiaDetailView.vue`: selector y fecha del detalle.
- `src/views/mainviews/ProgresoView.vue` y `HerramientasView.vue`: selector de formularios.
- `tests/helpers/followup-fixtures.mjs`: cuentas verificadas y casos de fechas.
- `tests/unit/therapyContext.test.mjs`: regresiones del formateador.
- `tests/followup.integration.test.mjs`: resembrado y restricciones de emuladores.
- `tests/browser/followup.spec.mjs`: fechas/contexto y bloqueo de correo.
- `tests/appointments.integration.test.mjs`: prerrequisitos sintéticos de reserva.
- `docs/functional/cierre-revision-psicologo.md`: este reporte.
- `docs/functional/revision-independiente-psicologo.md`,
  `validacion-procesos-psicologo.md` y `revision-funcional-por-rol.md`: estado y enlaces.
- `README.md`: enlace a la repetición con Auth persistido.

El árbol de trabajo contiene además numerosos cambios previos/concurrentes.
Esta lista describe el alcance de este ajuste, no atribuye todo `git diff`
a esta tarea.

## Límites

Solo datos sintéticos en emuladores locales y Chromium. El perfil móvil de
Playwright no equivale a Safari ni a un dispositivo físico. No se certifican
producción, pagos, administración ni el módulo completo del psicólogo. Los
artefactos bajo `test-results/` son locales e ignorados por Git; las pruebas
reproducibles permanecen en `tests/`.
