# Resultados de optimización FinOps del frontend de Lurems

Fecha: 2026-07-31
Rama: `feat/frontend-finops-audit`

## Resumen

Se implementaron las optimizaciones de mayor retorno y menor riesgo identificadas en la auditoría: caché en memoria con TTL, deduplicación de solicitudes, suscripciones compartidas, una sola fuente de Auth, consultas más precisas, eliminación de N+1 prioritarios, carga diferida por ruta, tree shaking de Vuetify, reducción de iconos e imagen principal y políticas de caché para Vercel.

No se desplegaron Functions, índices ni cambios a producción. Las métricas de build son locales y reproducibles. Las lecturas facturadas reales dependen de los datos, reconexiones y patrones de uso de producción, por lo que no se presentan porcentajes económicos inventados.

## Métricas antes y después

| Métrica | Antes | Después | Variación | Método de medición |
|---|---:|---:|---:|---|
| Bundle inicial JS + CSS comprimido | 550.05 KiB | 255.11 KiB | -294.94 KiB | Suma gzip reportada por Vite |
| JS inicial comprimido | 417.42 KiB | 212.63 KiB | -204.79 KiB | `npm run build` |
| CSS inicial comprimido | 132.63 KiB | 42.48 KiB | -90.15 KiB | `npm run build` |
| Tamaño total del build | 8,068 KiB | 2,744 KiB | -5,324 KiB | `du -sk dist` |
| Número de chunks JS | 1 | 68 | +67, por división intencional de rutas | Conteo de archivos en `dist/assets` |
| Número de chunks CSS | 1 | 48 | +47, cargados según los componentes usados | Conteo de archivos en `dist/assets` |
| Módulos transformados | 758 | 506 | -252 | Salida de Vite |
| Fondo principal | 1,827,674 B JPG | 298,111 B AVIF | -1,529,563 B | `stat` sobre el asset generado |
| Fuente local de iconos | 3,606,740 B en 4 formatos | 8,872 B WOFF2 | -3,597,868 B | Suma de archivos antes; `stat` después |
| Consultas en login | No medido de forma concluyente | No medido de forma concluyente | Se centralizó Auth y se deduplicó el contexto | Inspección de código y prueba sin credenciales |
| Consultas del dashboard | Perfil en listener y terapias solicitadas dos veces | Perfil puntual cacheado y una consulta de terapias | Una consulta redundante y un listener estático eliminados | Inspección del flujo de `DashboardView` |
| Listeners activos | No medido de forma concluyente | No medido de forma concluyente | Tres listeners estáticos eliminados; suscripciones equivalentes se comparten | Inventario de `onSnapshot` y revisión de desmontaje |
| Solicitudes duplicadas | No medido de forma concluyente | No medido de forma concluyente | Mitigadas mediante promesas en curso compartidas | Instrumentación de desarrollo y revisión de código |
| Recursos estáticos | JPG de 1.83 MB y familia MDI completa | AVIF de 298 KB y subset WOFF2 de 8.9 KB | Reducción medida por recurso | Build local y `stat` |
| Vulnerabilidades npm | 8 (2 moderadas, 4 altas, 2 críticas) | 3 del toolchain Vite 5 (2 moderadas, 1 alta) | 5 corregidas; ninguna crítica pendiente | `npm audit` después de actualizaciones compatibles |

El aumento de chunks es deliberado: pacientes, psicólogos, administración, onboarding y componentes Vuetify ya no se descargan como un único archivo inicial. El navegador solicita únicamente los chunks de la ruta visitada y puede cachearlos de forma independiente.

## Cambios implementados

### Datos y Firestore

- Se añadió una capa de repositorio instrumentada para lecturas, escrituras y listeners.
- Se creó caché exclusivamente en memoria con TTL, ámbito por usuario, invalidación y deduplicación de promesas.
- Se creó un registro compartido de listeners con conteo de consumidores y cierre automático.
- Los listeners de perfil usados por dashboard y progreso se sustituyeron por lecturas puntuales cacheadas.
- El listener de la tabla administrativa de psicólogos se sustituyó por carga puntual y actualización local.
- El chat ahora consulta mensajes únicamente de la sesión activa.
- La terapia activa usa una consulta `pacienteUid + estado + limit(1)`.
- El psicólogo por UID y la última solicitud profesional usan `limit(1)`.
- La disponibilidad se limita a fechas actuales o futuras y a los estados relevantes.
- El historial profesional y los datos administrativos se agrupan en consultas `in` de hasta 30 IDs, eliminando los N+1 principales.
- Las escrituras invalidan solo las familias de caché relacionadas.
- Matching reutiliza una respuesta corta por usuario y evita invocaciones simultáneas duplicadas.

### Autenticación y estado

- El store de Auth es la única fuente de `onAuthStateChanged`.
- Los guards esperan el estado ya inicializado en vez de abrir listeners temporales.
- `appContext` comparte la carga en curso para el mismo UID.
- Al cambiar o cerrar la sesión se cierran listeners y se limpia toda la caché en memoria.
- No se persisten perfiles, diarios, mensajes ni información clínica en `localStorage`.

### Build, recursos y red

- Todas las vistas del router usan imports dinámicos.
- Vuetify usa auto-import en lugar de registrar todos sus componentes y directivas.
- Se retiraron Axios y su plugin global porque no tenían consumidores.
- Se generó un subset local de Material Design Icons en WOFF2.
- El subset puede regenerarse con `npm run icons:build`; requiere `pyftsubset` de FontTools en `PATH` o en la variable `PYFTSUBSET`.
- El fondo JPG se reemplazó por AVIF con inspección visual.
- Se retiró el peso 300 no utilizado de Poppins.
- Source maps de producción permanecen desactivados.
- Vercel usa caché inmutable para assets con hash y revalidación obligatoria para `index.html`.

### Matching backend preparado

- La función consulta solo disponibilidad futura con estado `available`.
- Solo recupera `therapistId` de los slots.
- Lee los documentos de los terapeutas candidatos por ID en lotes de 30, en lugar de barrer todo el directorio.
- Se añadieron los índices requeridos por las nuevas consultas.

## Reducciones derivadas por código

Estas expresiones describen operaciones lógicas, no una equivalencia garantizada con la factura de Firestore:

| Flujo | Antes | Después |
|---|---|---|
| Dashboard del paciente | Dos consultas de terapias | Una consulta compartida; terapia activa derivada en memoria |
| Historial del psicólogo con `N` terapias | Hasta `N` consultas de historial | `ceil(N / 30)` consultas por lotes |
| Pacientes admin con `N` usuarios | Lista de usuarios + hasta `2N` consultas | Lista de usuarios + `ceil(N / 30)` perfiles + `ceil(N / 30)` grupos de terapias |
| Mensajes del chat | Todos los mensajes del usuario | Solo mensajes del `sessionId` activo |
| Matching | Todos los slots disponibles y todos los psicólogos | Slots futuros y psicólogos que tienen disponibilidad |
| Consumidores simultáneos del mismo recurso | Solicitudes/listeners independientes | Una promesa o suscripción compartida por clave |

## Instrumentación FinOps

En desarrollo se expone `window.__LUREMS_FINOPS__` con:

- consultas y documentos recibidos;
- escrituras;
- listeners abiertos, compartidos, actualizados y cerrados;
- cache hit y cache miss;
- solicitudes deduplicadas;
- duración y tipo de error.

La instrumentación no registra UID, nombres, mensajes, prompts, notas, diagnósticos ni contenido clínico. Está desactivada en producción y puede desactivarse también en desarrollo con `VITE_FINOPS_DEBUG=false`.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Build de producción frontend | Correcto: 506 módulos, 68 chunks JS y 48 CSS |
| Regeneración del subset MDI | Correcto: 153 iconos, WOFF2 de 8,872 B |
| Lint de Cloud Functions | Correcto |
| Tests unitarios frontend | Correcto: 3 de 3 para caché, separación por usuario y listeners compartidos |
| Tests unitarios de Cloud Functions | Correcto: 19 de 19 |
| Validación JSON de Vercel e índices | Correcto |
| Árbol de dependencias npm | Correcto, sin dependencias faltantes |
| Auditoría npm compatible | Se corrigieron alertas transitivas sin cambios mayores; quedan 3 del toolchain Vite 5 |
| Login público en preview de producción | Correcto, sin errores ni warnings de consola |
| Protección de `/dashboard` sin sesión | Correcto, redirige a `/login?redirect=/dashboard` |
| Home móvil 430 x 932 | Correcto, sin overflow horizontal ni iconos faltantes |
| Login móvil 430 x 932 | Correcto, sin overflow horizontal ni iconos faltantes |
| Lint frontend | No disponible: el repositorio no define ESLint para frontend |
| TypeScript check frontend | No aplica: el frontend actual es JavaScript |
| Tests de integración frontend autenticados | No disponibles: el repositorio no tiene harness E2E ni credenciales de staging |
| Flujos autenticados paciente/psicólogo/admin | No ejecutados: no se usaron credenciales ni datos de producción |
| Emulador Firestore y conteo facturable real | No medido de forma concluyente |

## Riesgos y pendientes

### Requieren despliegue o backend

1. Desplegar `firestore.indexes.json` antes de publicar el frontend que usa las consultas compuestas.
2. Desplegar la función de matching optimizada después de validarla en el proyecto Firebase correspondiente.
3. Añadir idempotencia de backend al chat mediante `clientMessageId` para cubrir reintentos de red, no solo doble clic.
4. Crear proyecciones agregadas para dashboards y administración; la estructura actual embebe citas en terapias y aumenta transferencia con el tiempo.
5. Añadir `terapeutaId` de primer nivel a eventos longitudinales nuevos y migrar eventos antiguos para una consulta profesional directa y paginada.

### Pendientes de frontend o validación

- Las listas clínicas conservan su comportamiento completo para no ocultar datos antiguos. La paginación con cursor debe introducirse junto con orden estable, UX de “cargar más” y pruebas sobre datos reales.
- Las listas admin de usuarios y solicitudes siguen cargando una página amplia en memoria; la proyección administrativa propuesta evitará exponer campos clínicos y permitirá cursor fiable.
- El chunk inicial JS conserva Firebase, Vue, Pinia, router y Vuetify y supera 500 KB sin comprimir, aunque queda en 212.63 KiB gzip. Separarlo más requiere medir la latencia real para no generar fragmentación excesiva.
- Actualizar a Vite 8 eliminaría las alertas restantes de `esbuild`, pero es un cambio mayor y se dejó fuera de una optimización conservadora.
- Debe ejecutarse una prueba autenticada por cada rol contra emuladores o un entorno de staging antes de fusionar.

## Posibles regresiones verificadas

- La compilación resuelve todos los imports dinámicos y componentes Vuetify.
- El subset MDI contiene los iconos renderizados en Home y Login.
- La protección de rutas sigue operativa sin sesión.
- No existe overflow horizontal en las vistas públicas verificadas a 430 px.
- Las funciones mantienen las 19 pruebas existentes.

No se verificaron visualmente datos clínicos, agenda real ni permisos por rol porque hacerlo requeriría una sesión autenticada de staging.

## Próximas tres optimizaciones con mayor retorno

1. Crear proyecciones agregadas de dashboard y listas administrativas mantenidas por Functions idempotentes.
2. Introducir paginación por cursor en historial, usuarios, solicitudes, terapias y registros emocionales con pruebas sobre datos reales.
3. Implementar idempotencia end-to-end para chat/IA y medir invocaciones evitadas con Emulator Suite y métricas agregadas.
