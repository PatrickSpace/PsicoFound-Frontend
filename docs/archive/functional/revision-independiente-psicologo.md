> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Revisión independiente de los procesos del psicólogo

Actualización del 2026-10-06: **REV-PSI-01 y REV-PSI-02 cerrados**, con dos
suites completas aprobadas (limpia y conservando Auth). Los ajustes, evidencia
y límites se documentan en el [informe de cierre](cierre-revision-psicologo.md).
Lo que sigue conserva la revisión original del 2026-10-05 como antecedente.

Fecha: 2026-10-05. Revisión solicitada después de la implementación de PSI-08,
PSI-09, PSI-10 y PSI-12. Resultado: **flujos principales verificados, con un
detalle funcional pendiente y un ajuste necesario en las pruebas**.

No se detectaron bloqueos en la consulta de pacientes, el seguimiento de
objetivos, el ciclo de ejercicios ni el historial dentro de los casos ejecutados.
No corresponde declarar cerrado el 100 % del alcance mientras se omita la fecha
en la selección de terapias y el comando de validación sin ajustes se detenga
en la verificación de correo.

## Hallazgos pendientes

### REV-PSI-01 · P3: falta la fecha en las opciones de terapia

El alcance de PSI-08 pide mostrar los procesos del paciente identificados por
fecha y estado para elegir cuál consultar. `therapyLabel()` muestra únicamente
paciente, ID y estado. El detalle de la terapia elegida sí muestra su fecha,
pero las opciones del selector no la incluyen. Con varios procesos anteriores,
el profesional debe abrirlos uno a uno para distinguirlos por fecha.

- Código: [etiqueta compartida](../../../src/utils/therapyContext.js), línea 4;
  [selector del detalle](../../../src/views/terapias/TerapiaDetailView.vue), línea 205.
- Reproducción: entrar como A psicólogo, abrir B y desplegar “Terapia del
  paciente”. Las opciones son `Paciente B · b-active · activo` y
  `Paciente B · b-old · pausa`, aunque ambas tienen `fechaCreacion` guardada.
- Evidencia: la comprobación adicional de fecha falla en escritorio y móvil;
  [captura del selector](../../../test-results/psychologist-review-2026-10-05/independent/independent-review-therapy-1d0bc-h-process-by-date-and-state-desktop/test-failed-1.png).
- Propuesta: añadir la fecha de creación a la etiqueta compartida, manteniendo
  una identificación inequívoca y el estado; si falta, indicar que no está
  registrada. Comprobar dos terapias anteriores del mismo paciente con fechas
  diferentes. La función también alimenta los filtros y formularios.

### REV-PSI-02 · P2: la suite original no contempla el correo verificado

Los datos sintéticos de `seedFollowup()` crean cuentas sin `emailVerified`.
La protección de rutas añadida durante el trabajo de pacientes exige verificar
el correo. Al ejecutar `npm run test:followup` sin ajustes, el navegador queda
en “Verifica tu correo” y las pruebas esperan el selector “Vista activa” en
Configuración, sin llegar a los procesos del psicólogo.

- Código: [cuentas sintéticas](../../../tests/helpers/followup-fixtures.mjs), líneas
  27–29; [protección de rutas](../../../src/router/index.js), condición
  `!user.emailVerified`.
- La primera ejecución tuvo seis fallos por ese prerrequisito; se interrumpió
  el séptimo caso y no se ejecutó el octavo, porque compartían el mismo bloqueo.
- Para validar la funcionalidad se marcaron como verificadas exclusivamente las
  cuentas del Auth Emulator en una copia aislada. Con ese ajuste pasaron los
  ocho casos originales de navegador.
- Propuesta: crear las cuentas sintéticas de seguimiento con
  `emailVerified: true` y actualizar también las ya existentes al resembrar.
  Mantener cuentas no verificadas en pruebas específicas del nuevo flujo de
  verificación. Repetir el comando original y exigir salida 0.

## Resultado por proceso

| Proceso | Resultado observado |
| --- | --- |
| PSI-08 · Pacientes y terapias | Se puede abrir un paciente con terapia anterior, cambiar entre procesos propios y continuar a objetivos, ejercicios e historial con su contexto. Resumen mínimo autorizado, ausente, restringido y error diferenciados. La terapia de otro profesional queda excluida. Pendiente REV-PSI-01. |
| PSI-09 · Objetivos | Creación, avances persistentes con autor/fecha, dos notas distintas y visibilidad para el paciente. 100 % determina alcanzado; reapertura exige motivo. Nota antigua conservada y nueva evolución sin sobrescribirla. Filtros y contadores coherentes; profesional no modifica terapias inactivas. |
| PSI-10 · Ejercicios | Asignación profesional, realización por el paciente con observación y consulta del resultado tras actualizar. Separación de roles, filtros de estado y prohibición de completar por terceros. Un fallo de asignación conserva el borrador y el reintento genera un solo ejercicio y evento en el caso probado. |
| PSI-12 · Historial | Terapias, citas, resúmenes y eventos corresponden a la selección. Filtros de periodo/tipo, consulta de terapia anterior y acceso al origen conservan el contexto. Los eventos del esquema anterior, sin `terapeutaId` superior, siguen visibles. |

También se verificaron una cuenta de doble rol, respuestas tardías después de
cambiar de vista, limpieza de formularios, errores de carga con reintento y un
psicólogo sin pacientes asignados. En este último caso no aparecen sus propios
objetivos, ejercicios o sesiones personales en la vista profesional.

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 14/14 aprobadas |
| `npm run test:backend` | 48/48 aprobadas |
| `npm run build` | Aprobada; aviso de tamaño de bundle |
| `npm run lint:backend`, copia fija | Aprobada |
| Integración de seguimiento | 5/5 aprobadas: permisos, resumen mínimo, persistencia, identidad, versiones, terapias inactivas y doble rol |
| Integración de citas, incluida por el runner actual | 6/6 aprobadas; no amplía por sí sola el alcance de esta revisión a toda la agenda |
| Navegador original, cuentas sintéticas verificadas | 8/8 aprobadas: cuatro casos en escritorio y móvil |
| Navegador independiente | 6 aprobadas y 2 fallidas: el mismo requisito de fecha omitida en las dos resoluciones |

Las tres comprobaciones adicionales aprobadas en ambas resoluciones fueron:
datos heredados/reapertura/filtros, profesional sin pacientes y recuperación de
asignación fallida. Los dos fallos adicionales son evidencia de REV-PSI-01;
no se excluyeron para presentar una suite completamente aprobada.

## Entorno, evidencia y reproducción

Se utilizó el proyecto sintético `demo-lurems-followup`, Auth en `9099`,
Firestore en `8080`, Functions en `5001` y frontend en `5178`, todos en localhost.
El navegador bloqueó solicitudes a otros hosts. No se utilizaron datos reales
ni se desplegó código.

Había modificaciones de pacientes entrando al directorio mientras se validaba.
Se tomó una copia fija de los archivos de trabajo a las 18:34 aproximadamente
(Lima), conservando su [manifiesto de hashes](../../../test-results/psychologist-review-2026-10-05/audit-source-manifest.json).
El código funcional se mantuvo igual. Los únicos ajustes de entorno fueron las
cuentas sintéticas verificadas y permitir a Vite servir las fuentes locales de
las dependencias compartidas con la copia. Se añadieron pruebas independientes
solo a esa copia. El primer recorrido aislado pasó aun con un aviso de Vite
sobre esas fuentes; las capturas adicionales se tomaron con las fuentes locales
habilitadas y se inspeccionaron visualmente.

- [Registro de la suite original aislada](../../../test-results/psychologist-review-2026-10-05/audit-baseline.log).
- [Informe HTML de los ocho recorridos originales](../../../test-results/psychologist-review-2026-10-05/followup-report/index.html).
- [Registro de la revisión adicional](../../../test-results/psychologist-review-2026-10-05/audit-independent.log).
- [Informe HTML de la revisión adicional](../../../test-results/psychologist-review-2026-10-05/independent-report/index.html).
- [Casos adicionales ejecutados](../../../test-results/psychologist-review-2026-10-05/reproduction/tests/browser/independent-review.spec.mjs).
- [Fixture de revisión con correos verificados](../../../test-results/psychologist-review-2026-10-05/reproduction/tests/helpers/followup-fixtures.mjs).

Los artefactos de `test-results/` son locales, están ignorados por Git y contienen
solo datos de prueba. Se conserva la copia ejecutable en:

```text
/var/folders/51/4qm_p26s07scx6cxw6l40vdw0000gn/T/psicologo-audit-m3nrvmg6
```

Para repetir exclusivamente los casos adicionales en esa copia, con puertos
libres y Java 21 disponible:

```sh
PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" firebase emulators:exec \
  --config firebase.followup-test.json --only auth,firestore,functions \
  --project demo-lurems-followup "node tests/run-independent-review.mjs"
```

Al terminar se comparó la copia con el workspace. Las modificaciones posteriores
observadas eran de Configuración y del perfil conversacional del paciente; las
adiciones a reglas y exports correspondían a ese perfil. No habían cambiado los
cuatro componentes de seguimiento, su contexto compartido ni los handlers de
objetivos/ejercicios revisados. Los cambios posteriores a este corte requieren
su propia validación de integración.

Esta revisión no certifica el módulo completo del psicólogo, la administración,
el flujo integral del paciente, el perfil profesional inactivo, producción,
Safari ni dispositivos físicos. El móvil se probó con el perfil iPhone 13 de
Playwright sobre Chromium. El resumen inicial sigue siendo el perfil compartido
actual, no una instantánea histórica por terapia, tal como documentó la entrega.

## Cambios realizados durante esta revisión

Se añadió este informe, se enlazó desde el inventario y se guardaron evidencias
locales. No se modificó el comportamiento de la aplicación ni las cuentas o
fixtures del workspace principal. REV-PSI-01 y REV-PSI-02 quedan como ajustes
concretos para cerrar la entrega y repetir la validación sin excepciones.
