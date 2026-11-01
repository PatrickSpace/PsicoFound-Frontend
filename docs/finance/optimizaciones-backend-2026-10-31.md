# Optimizaciones locales de backend — 31 de octubre de 2026

## Alcance y contraste con la auditoría

La auditoría del 30 de octubre contiene supuestos de planificación. No se consultaron facturas ni métricas remotas. El código previo confirma:

- Matching leía todos los perfiles ordenados por `nombre`, las cuentas y tarifas de cada perfil setup v1 elegible, y todos los slots globales `available`; después devolvía cinco resultados.
- El wrapper comprobaba mantenimiento, cuenta suspendida y bloqueo por eliminación, y `recordAccountActivity` escribía actividad en cada llamada autenticada sobre una cuenta activa.
- El job paginaba usuarios de 200 en 200, recorriendo el histórico completo. Las consultas de movimientos tenían una segunda comprobación dentro de la transacción de suspensión.

Se preservan App Check, controles por operación, permisos, idempotencia, cuotas y validaciones de reservas y precios. No se despliega ni se cambia facturación. No se modifican `functions/src/ai/**`, `functions/src/chat/**`, `src/**`, Vite, Vercel ni hosting.

## Matching

`recommendTherapists.js` mantiene la lectura de todo el catálogo y el mismo ranking estable, incluidos perfiles heredados sin `activo`/`acceptingBookings`. No se puede descartar por preferencia antes de evaluar compatibilidad: el algoritmo ofrece también coincidencias aproximadas.

Se ordena el catálogo completo por compatibilidad y se comprueban elegibilidad y disponibilidad por ese orden. Se evalúan lotes paralelos de como máximo el número de resultados todavía necesarios. Si un profesional no es elegible o no tiene slots válidos, se continúa con el siguiente; no existe un tope de candidatos. Se detiene únicamente al reunir cinco resultados válidos o agotar el catálogo.

Las tarifas y cuentas se leen una vez por ruta y solicitud, compartiendo las promesas incluso entre evaluaciones simultáneas. No hay caché entre invocaciones ni resumen persistido que requiera invalidación. Los slots se consultan por `therapistId` y `status`, conservando el conteo exacto `availableSlots`, la validación de fechas, modalidades y documentos heredados que no tienen `startAt`. La respuesta pública y sus estados se conservan.

La reserva sigue leyendo transaccionalmente perfil, cuenta del propietario setup v1, tarifa vigente y slot. Revalida recepción, modalidad, fecha futura, estado disponible, propietario del slot y `quoteId`, y reserva el slot en la misma transacción. Estos controles en `appointmentHandlers.js` no se modificaron.

### Operaciones esperadas

Definiciones: `T` perfiles leídos; `E` perfiles setup v1 preseleccionados por recepción; `S` slots globales available; `U` y `R` rutas de cuentas/tarifas distintas realmente evaluadas; `K` profesionales elegibles cuyos horarios se consultan; `s_i` slots available de cada uno.

- Antes: `T + 2E + max(1, S)` lecturas aproximadas de matching.
- Después: `T + U + R + sum(max(1, s_i))`. Las consultas vacías también tienen un mínimo de lectura facturable.
- No se incluyen guards, perfil del paciente, lecturas del navegador, entradas de índice, reintentos ni red en estas fórmulas.

Con los supuestos de la auditoría (`T=E=100`, `S=2000`), 20 slots por profesional, una tarifa compartida y cinco primeros candidatos válidos: **2300 → 206 lecturas** (`100+5+1+100`), ahorro proyectado **91,0%**. Con cinco tarifas distintas: **210**. La prueba sintética comprueba las rutas consultadas y los documentos utilizados; no mide facturación ni latencia de producción. Las lecturas auxiliares de documentos pasan de 200 llamadas a 6 en el primer ejemplo; las consultas de catálogo/horarios pasan de 2 a 6, con respuestas mucho menores.

No se alcanza el objetivo hipotético de 50 lecturas: se mantiene `T` para preservar el ranking exacto. En catálogos con pocos profesionales disponibles puede ser necesario revisar a todos; las consultas vacías por profesional pueden aumentar las lecturas mínimas y los viajes de red frente al barrido global. Los lotes acotan la concurrencia a cinco; hace falta medir la latencia con un catálogo grande y disperso antes de publicar. Se siguen leyendo slots pasados marcados available de los profesionales evaluados para no excluir formatos heredados. Una siguiente etapa podría normalizar todos los horarios y consultar por instante futuro, previa migración y cobertura de todos sus escritores.

## Actividad y wrapper

Cada operación sigue leyendo la cuenta actual en una transacción. Una ventana persistida de **15 minutos** permite que llamadas simultáneas reintenten y observen el timestamp confirmado, evitando que cada instancia escriba su propia actualización. No se utiliza memoria local como autoridad de acceso.

La primera llamada de la ventana escribe `lastActivityAt` y `activityWindowUntil`. Las llamadas dentro de ella conservan lecturas y controles, pero omiten la escritura. La expiración abre una nueva ventana. Estados suspendidos o restringidos y documentos ausentes nunca se reactivan ni crean mediante este mecanismo. Una actualización financiera de actividad sigue siendo autoritativa.

La revisión de inactividad considera también `activityWindowUntil`: representa el límite superior conservador de la actividad que pudo omitirse. Esto evita suspender hasta 15 minutos antes por el muestreo de actividad. Puede retrasar la elegibilidad de suspensión hasta 15 minutos; al ejecutarse una vez al día, una cuenta junto al corte puede pasar a la ejecución del día siguiente. Se conserva el corte de tres meses calendario en Lima y su ajuste de fin de mes. Reactivar elimina la ventana antigua.

Para `A` llamadas concentradas en una ventana: antes `A` escrituras, después **1**, con lecturas transaccionales en las `A` llamadas y posibles reintentos por contención. Ejemplo: 20 llamadas → 1 escritura (95% menos); llamadas separadas por más de 15 minutos no garantizan ahorro. No se atribuye una reducción fija de 90% al tráfico real. También se evita potencialmente una actualización del listener de usuario por cada escritura omitida; el número de lectores conectados determina ese efecto.

## Revisión diaria e información heredada

La consulta principal selecciona `users` con `accountStatus == active` y `lastActivityAt <= cutoff`, ordenando y paginando por actividad. Excluye cuentas suspendidas y actividad persistida reciente antes de transferir sus documentos. Mantiene los controles de administrador, estados, creación, ventana de actividad, metadata de Auth y movimientos, y la segunda comprobación transaccional de cuenta, profesionales y movimientos antes de suspender. Un cambio concurrente de actividad o movimientos conserva la cuenta activa.

Como Firestore no selecciona campos ausentes mediante una comparación de fecha, cada ejecución lee además **una sola página de hasta 200 usuarios por ID**. El cursor persistido está en `runtime_controls/inactivity_legacy_scan`. Solo se normalizan documentos activos/heredados que lo necesitan, con relectura transaccional:

- Estado ausente se explicita como `active`, igual que su semántica anterior.
- Actividad ISO/ausente se convierte a `Timestamp` con el máximo de actividad/creación ya conocido, sin inventar actividad actual.
- Sin fechas se usa epoch como clave de índice; no es prueba de inactividad. Auth sigue consultándose y, si tampoco aporta fecha, se marca revisión manual sin suspender.
- Estados restringidos se preservan. Fallos al normalizar no adelantan el cursor. Errores posteriores de revisión conservan candidatos en el índice para el día siguiente y no bloquean la preparación de otras cuentas.

Las nuevas cuentas creadas en los tres caminos del registro ya incluyen `lastActivityAt` sin añadir una escritura. El recorrido acotado también cubre creaciones de clientes antiguos o importaciones sin campos nuevos.

Con `N` cuentas históricas, `C` candidatos canónicos y `B<=200` documentos de compatibilidad: lectura inicial esperada **N → C+B+1**, más mínimos de consultas/paginación y las relecturas de normalización que sean necesarias. El `+1` es el checkpoint; se añade **una escritura de checkpoint al día**, además de hasta una escritura por documento que necesite normalización. Las lecturas de Auth, movimientos y transacciones finales siguen dependiendo de los candidatos y no están incluidas en esa reducción. Con pocas cuentas y muchos candidatos, el coste de la página de compatibilidad puede superar el ahorro del barrido inicial. Las consultas de movimientos aún pueden recorrer todo el historial de un candidato; se mantienen para cubrir timestamps y campos heredados sin perder protección financiera.

Ejemplo puramente ilustrativo: `N=1.000.000`, `C=1000`, `B=200` → unas **1201** lecturas iniciales frente a un millón (99,88% menos), antes de movimientos, reintentos, preparación y mínimos adicionales. `C` no está medido y no es una garantía. Sin preparación inicial, un documento heredado puede tardar hasta `ceil(N/200)` ejecuciones en entrar al índice; **ejecutar el backfill antes de activar el nuevo job en producción** evita ese retraso para el histórico existente.

## Preparación para publicar

1. Revisar/publicar los índices agregados y esperar a que estén listos: `users(accountStatus ASC,lastActivityAt ASC)` y `therapist_availability(therapistId ASC,status ASC)`. No sustituir los índices existentes. El emulador verifica consultas y transacciones, pero no certifica la construcción ni el costo de índices de producción.
2. Ejecutar el backfill por lotes con un operador autorizado. La herramienta local se deja lista, **no se ejecutó contra datos remotos**. Ejemplo de inspección de 200 documentos:

   ```sh
   node functions/scripts/prepareActivityIndex.js --project PROYECTO --pages 1
   ```

   Sin `--apply` solo lee. Tras revisar el proyecto y el resultado, repetir con `--apply` escribe únicamente los campos de índice necesarios, releyendo cada documento dentro de una transacción. Continuar con `--after ULTIMO_CURSOR` hasta `done:true`. `--pages` acota trabajo por ejecución. Repetir es idempotente y no elimina datos. Ejecutar una última pasada de inspección para confirmar que no quedan documentos pendientes; registrar aparte casos que requieren revisión y asegurar que los importadores no vuelven a introducir fechas incompatibles.
3. Publicar Functions solo después de preparar índices y datos. El código usa las consultas nuevas directamente; no activa un fallback global silencioso cuando falta un índice. No se modifican límites de instancia, memoria ni CPU sin mediciones que los justifiquen.
4. Verificar con datos representativos: equivalencia de recomendaciones, dispersión de disponibilidad, latencia p50/p95, lecturas y escrituras por endpoint/job y contención. Comparar cargos observados y alertas con la proyección. No registrar texto clínico.

Dependencias de otros chats: no se requiere cambio de contrato en IA ni frontend. El frontend debe tolerar que el listener de usuario reciba actividad con menor frecuencia; no debe tratar `lastActivityAt` como presencia exacta. Las escrituras directas heredadas de usuario siguen cubiertas por compatibilidad, aunque conviene migrarlas al registro backend. Los nuevos campos son exclusivamente de servidor; no hay que habilitar escrituras de clientes.

## Proyección monetaria limitada

Usando únicamente la tarifa supuesta en la auditoría (USD 0,045 por 100.000 lecturas), las 2094 lecturas evitadas del ejemplo de matching equivalen a **USD 2,04/mes con 2160 búsquedas**, o **USD 20,35 con 21.600**, antes de franquicias y otros consumos. El ahorro efectivo puede ser cero dentro de cuotas gratuitas. No se recalculan los totales generales de la auditoría ni se atribuyen ahorros de IA, hosting o App Check a estos cambios. El ahorro en cómputo, transferencia y listeners requiere medición; consultas pequeñas adicionales pueden elevar latencia en casos dispersos.

## Archivos propios de esta implementación

- `functions/src/matching/recommendTherapists.js` y su nuevo `recommendTherapists.test.js`.
- `functions/src/accounts/accountLifecycle.js`, `inactivity.test.js` y el nuevo `activityWindow.test.js`.
- `functions/src/operations/suspensionGate.test.js`: comprobación del wrapper dentro de una ventana vigente.
- `functions/src/onboarding/registrationHandlers.js`: actividad inicial en nuevas cuentas.
- `functions/scripts/prepareActivityIndex.js`: preparación resumible y dry run por defecto.
- `firestore.indexes.json`: dos índices adicionales.
- `tests/account-inactivity.integration.test.mjs`: concurrencia, paginación y backfill reales en emulador.
- `tests/matching-cost.integration.test.mjs`: contrato HTTP, ranking completo y cambios de elegibilidad/disponibilidad.
- `tests/run-patient-isolated.mjs` y `tests/run-followup.mjs`: selector `BACKEND_COST_ONLY` reutilizando aislamiento de red y proyecto demo.
- Este documento. Los cambios simultáneos de otros chats quedan fuera de esta lista.

## Validación

- `npm --prefix functions test`: **152/152** pruebas correctas en el estado compartido del repositorio al finalizar. Una ejecución intermedia falló en `chat/history.test.js` durante cambios concurrentes de IA; no se editó esa zona y la ejecución final pasó.
- Suite dirigida a cuentas, matching, operaciones, onboarding, pagos y citas: **83/83** correctas.
- `npm --prefix functions run lint`: correcto, sin errores. `git diff --check` sobre archivos propios y comprobaciones sintácticas de herramientas/pruebas: correctos.
- Integración con Auth, Firestore y Functions reales del emulador: **35/35** correctas, usando el selector nuevo y el runner existente:

  ```sh
  BACKEND_COST_ONLY=true \
  JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH \
  node tests/run-patient-isolated.mjs
  ```

  Se reutilizó Java 21 ya instalado; no se instaló software. El runner exigió puertos libres, proyecto `demo-lurems-followup`, ausencia de preloads y aislamiento de salida de red a loopback/Unix sockets. Ningún dato remoto se modificó.

  Desglose: matching HTTP 2; setup profesional 6; inactividad/actividad/preparación 5; tarifas 6; citas 6; flujos de paciente 10. Incluye contrato público, selección más allá de cinco candidatos, suspensión/pausa, tarifa comercial, reservas concurrentes/idempotentes, intercambio atómico de slots, actividad simultánea (20 llamadas), ausencia de escrituras en otras 20 llamadas de la misma ventana, paginación de 201 candidatos y preparación concurrente/idempotente.

Una primera ejecución general de cuentas llegó a 9/10 y falló con `fetch failed` durante recarga de Functions por cambios concurrentes; se ejecutó después la suite dirigida completa sobre fuentes estables, con resultado 35/35. Estos resultados son validación local, no medición de ahorro en producción. No se hicieron pruebas de carga ni se certificó disponibilidad de los índices remotos.

## Actualización: índices publicados en Firebase

El 31 de octubre de 2026, con autorización explícita posterior del usuario para construir los índices, se ejecutó:

```sh
firebase deploy --only firestore:indexes --project psicosaas-3c819 --non-interactive
```

Se verificó antes que los 12 índices remotos existentes estaban contemplados en el archivo local. El despliegue agregó únicamente los dos índices nuevos. La comprobación posterior con `firebase firestore:indexes --project psicosaas-3c819 --non-interactive --pretty` confirmó **14 índices en estado READY**, incluidos:

- `users`: `accountStatus ASC`, `lastActivityAt ASC`.
- `therapist_availability`: `therapistId ASC`, `status ASC`.

No se desplegaron Functions, hosting ni reglas. No se ejecutó el backfill ni se modificaron documentos remotos. La preparación de datos y el despliegue de Functions siguen pendientes. Esta actualización reemplaza únicamente el estado pendiente de publicación de índices descrito antes.

## Actualización: entrega publicada y preparación completada

Con la autorización posterior para desplegar, se completó la preparación de los
12 usuarios existentes: cuatro normalizaciones transaccionales y cero pendientes
en la segunda inspección. Se publicaron las 57 Functions, las reglas/índices y
Hosting del candidato congelado. La validación final reúne **452 casos correctos**
(212 unitarios, 102 de integración y 138 de navegador), más 15 comprobaciones HTTP
de Hosting y cuatro denegaciones esperadas de Functions en producción.

La autorización posterior también permitió aplicar los límites de IA de USD 50
mensuales, 20 inferencias por encuesta y diez intentos por cuenta, y corregir los
problemas necesarios para publicar. El detalle, los archivos adicionales, los
hallazgos estáticos pendientes y los límites de las pruebas están en
[el informe de despliegue](../operations/despliegue-optimizaciones-2026-10-31.md).
Esta actualización sustituye los estados históricos de preparación/publicación
pendiente del documento; las fórmulas y cifras de ahorro siguen siendo
proyecciones, sin medición de facturación o latencia de producción.
