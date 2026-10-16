# Guía de validación local

Referencia: 2026-10-15. Comandos contrastados con `package.json` y los runners actuales.
Esta guía explica cómo reproducir pruebas; no afirma una ejecución nueva.
Los resultados fechados están en los [informes históricos](../archive/functional/informe-cierre-tecnico-piloto.md)
y la aceptación pendiente en la [matriz](../functional/matriz-cierre-piloto.md).

## Preparación

Node.js 22.20 o posterior compatible con Node 22, npm, Java 21 en `PATH` y Firebase
CLI 15.15.0. Desde la raíz, descargar dependencias, Chromium y los binarios de
emuladores antes de iniciar el aislamiento de red:

```sh
npm ci
npm --prefix functions ci
npm install --global firebase-tools@15.15.0
npx playwright install chromium
firebase setup:emulators:firestore
```

No usar `NODE_OPTIONS`, preload ni emuladores existentes. Deben estar libres
8080, 9099, 5001, 5178, 4400, 4500 y 9150. El runner falla si un puerto está ocupado;
no reutiliza ni reinicia servicios de otra sesión. Ejecutar las suites de emulador
secuencialmente, pues comparten puertos y artefactos.

## Comprobaciones sin emuladores

```sh
npm test
npm run test:backend
npm run lint:backend
npm run audit:unused
npm run audit:unused -- --production --include files,dependencies,unlisted,unresolved,binaries
npm run build
npm audit
npm --prefix functions audit
```

Las unitarias cubren utilidades y dominio; backend cubre handlers, perfiles, matching,
IA, cuentas, tarifas y políticas. Knip normal y producción tienen alcances diferentes:
no borrar exports usados en pruebas por un aviso exclusivo de producción. Functions
exportadas por `functions/index.js` son entradas públicas. No aplicar actualizaciones
forzadas de dependencias como parte de validar.

## Suites aisladas

| Comando | Alcance actual |
| --- | --- |
| `npm run test:payment-rules` | Integración de tarifas y permisos; termina antes de navegador. |
| `npm run test:followup` | Seguimiento, citas, paciente y navegador general. El nombre conserva el origen de la suite; actualmente ejecuta más que seguimiento. |
| `npm run test:patient` | Mismo runner base que seguimiento. |
| `npm run test:agenda` | Runner base más integración de agenda y matriz horaria Lima. |
| `npm run test:payment-deadline` | Navegador dirigido a vencimiento/pago tardío. |
| `npm run test:admin` | Integración administrativa dirigida. |
| `npm run test:admin-browser` | Navegador administrativo en escritorio/móvil. |
| `npm run test:pilot` | Integraciones de seguimiento, citas, admin, operación, tarifas, pagos, cuentas, encuesta, paciente y agenda; matriz Lima y navegador general. |

Todos estos comandos usan `tests/run-patient-isolated.mjs`, Auth/Firestore/Functions
locales y el proyecto `demo-lurems-followup`, también tarifas. El frontend de prueba
usa exclusivamente emuladores. Las políticas, identidades y URLs son sintéticas.
El proveedor real está bloqueado. El runner descarta variables ajenas a su entorno
permitido y no usa el `.env` de desarrollo para elegir un proyecto real.

macOS usa `sandbox-exec`; Linux necesita namespace de red, inicialización mediante
`sudo -n`, descenso de privilegios y sandbox Chromium según los scripts y CI.
La red saliente se limita a loopback/IPC para CLI, Functions, Node y navegador.
No desactivar ese aislamiento para hacer pasar una prueba. La ejecución real de
Ubuntu y sus permisos sigue pendiente de evidencia; Windows no está admitido por
este runner.

## Escenarios que debe conservar la regresión

| Área | Comprobaciones relevantes |
| --- | --- |
| Seguimiento | Profesional con dos pacientes y terapia anterior; resumen disponible/ausente/restringido/error; dos avances persistidos; reapertura con motivo y versión obsoleta rechazada. |
| Ejercicios | Asignar en activa; paciente completa con observación; profesional consulta al actualizar; tercero y doble finalización rechazados. |
| Contexto | Cambio de cuenta/vista durante carga y con formulario abierto; datos, filtros y contadores correctos; respuesta tardía descartada. |
| Historial y emociones | Mismo paciente/terapia en tablas y eventos; periodos/tipos; privacidad del registro y persistencia; no reconstruir notas antiguas. |
| Agenda | Bloques futuros, solapamientos, carreras de reserva/reprogramación y horas inválidas; misma presentación en Lima, Madrid, Tokio y Honolulu. |
| Pagos | Cotización/snapshot/versiones, recibo único, vencimiento, cancelación concurrente, devolución y saldo/transferencias; soporte de pago tardío no acredita dinero. |
| Cuenta y encuesta | Elegibilidad/consentimiento, exportación, privacidad privilegiada, recuperación en Auth emulator; turnos, concurrencia, reintento incierto, corrección y reset tardío. |
| Administración | Permisos directos, solicitud vigente/decisión única, último admin utilizable, edición con versión, soporte exclusivo del titular y separación de operación/privacidad. |

Playwright prueba escritorio y móvil emulado. La matriz horaria está en
`playwright.lima.config.js`; los fallos/consultas retenidas son inyecciones de pruebas,
no controles del producto. Fixtures: `tests/helpers/followup-fixtures.mjs` y
`tests/helpers/pilot-policy.mjs`.

## Evidencia y límites

Guardar comando, fecha, artefacto/revisión probada, salida y límites. `test-results/`
contiene informes y capturas locales ignorados por Git; su enlace no garantiza que
existan en un clon nuevo. Para navegador general:

```sh
npx playwright show-report test-results/followup-report
```

Una prueba existente no es una prueba ejecutada. No trasladar los conteos de un informe
a cambios posteriores. Chromium móvil no certifica Safari, teléfonos físicos ni UX
con usuarios reales. Emuladores no validan correo entregado, Google, facturación,
App Check, IAM, reglas publicadas ni restauración productiva.

Ante timeout del CLI después de terminar el script, revisar `firebase-debug.log` y
la salida de cada etapa antes de atribuirlo a pruebas o telemetría; un incidente
histórico no explica automáticamente un fallo nuevo.

El manifiesto offline se comprueba con:

```sh
npm run verify:pilot-config -- config/pilot-staging.example.json
```

El ejemplo incompleto debe salir con código 1. El validador no consulta consola ni
aprueba referencias. Despliegue, staging y rollback: [procedimiento de release](pilot-release.md).

Para una pasada dirigida de navegador sin perder el aislamiento del runner:

```sh
PILOT_BROWSER_ONLY=true VALIDATION_GREP='attendance:' npm run test:patient
```

El filtro se pasa a Playwright; no sustituye la pasada completa de aceptación.
