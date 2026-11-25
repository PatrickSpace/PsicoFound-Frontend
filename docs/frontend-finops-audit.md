# Auditoría FinOps del frontend de Lurems

Fecha de línea base: 2026-07-31
Rama: `feat/frontend-finops-audit`

## 1. Resumen ejecutivo

La aplicación usa Vue 3, Vuetify, Pinia y los SDK modulares de Firebase. El acceso a Firestore está mayormente concentrado en `src/services`, pero no existe una política transversal de caché, deduplicación ni instrumentación. Las vistas vuelven a pedir los mismos recursos al navegar y varias colecciones crecientes se descargan completas.

Los riesgos económicos principales son:

- El chat escucha todos los mensajes del usuario y filtra la sesión activa en el navegador.
- El historial del psicólogo ejecuta una consulta por terapia (N+1).
- La vista administrativa de pacientes puede ejecutar dos consultas por cada usuario, además de cargar la colección completa de usuarios.
- El dashboard consulta dos veces la misma colección de terapias para obtener la lista y la terapia activa.
- Perfiles estáticos se mantienen con listeners en tiempo real fuera del chat.
- La función de matching lee todos los horarios disponibles y todos los psicólogos en cada invocación.
- No hay caché en memoria con TTL ni deduplicación de promesas en curso.
- Todas las rutas se empaquetan en un único chunk inicial.
- El paquete de iconos incluye cuatro formatos de la misma fuente y el fondo principal ocupa 1.83 MB.

No se detectó uso frontend de Firebase Storage ni Firebase Messaging. No se habilitará persistencia de Firestore en IndexedDB porque el producto procesa datos de salud mental y el repositorio no define todavía una política de cifrado y retención local para información clínica.

## 2. Arquitectura actual identificada

Flujo predominante:

```text
Vista o componente
  -> servicio JavaScript
  -> SDK modular de Firebase / callable de Cloud Functions
  -> Firestore, Auth o Functions
```

Estado global:

- `src/store/auth.js`: usuario autenticado y listener global de Auth.
- `src/store/appContext.js`: perfil, roles, modo activo y perfil profesional.
- `src/store/terapiaStore.js`: criterios y resultados temporales de matching.

Observaciones:

- Los componentes no importan Firestore directamente; `src/services` ya funciona como capa de acceso equivalente a repositorios, aunque sin políticas compartidas.
- El router registra lógica adicional de `onAuthStateChanged`, separada del store de autenticación.
- `appContext` evita recargar un UID ya resuelto, pero no comparte una promesa si dos consumidores llaman mientras la primera carga sigue pendiente.
- Firebase Hosting no está configurado. El despliegue web actual usa Vercel mediante `vercel.json`; `firebase.json` contiene Firestore, Functions y Auth.
- No existe TypeScript en el frontend ni scripts de lint/tests frontend en `package.json`.

## 3. Inventario de consultas Firestore

| Recurso | Archivo | Operación actual | Disparador | Riesgo observado |
|---|---|---|---|---|
| Usuario | `src/services/userService.js` | `getDoc(users/{uid})` | Login, guards, onboarding y configuración | Repetición entre consumidores; sin TTL |
| Usuarios | `src/services/userService.js` | `getDocs(users)` | Administración y pacientes admin | Colección completa, sin cursor |
| Perfil inicial | `src/services/userService.js` | `getDoc(profiles/{uid})` | Pacientes admin | N+1 en lista administrativa |
| Perfil inicial | `src/services/conversationService.js` | `onSnapshot(profiles/{uid})` | Chat, dashboard y progreso | Tiempo real usado también en vistas estáticas |
| Conversación | `src/services/conversationService.js` | `onSnapshot(conversations/{uid})` | Chat | Válido para sesión activa |
| Mensajes | `src/services/conversationService.js` | `onSnapshot(messages orderBy createdAt)` | Chat | Crítico: descarga todas las sesiones y filtra por `sessionId` en cliente |
| Psicólogo por UID | `src/services/psicologoService.js` | `getDocs(where uid ==)` | Contexto y vistas profesionales | Sin `limit(1)`, repetido entre rutas |
| Psicólogo por ID | `src/services/psicologoService.js` | `getDoc` | Dashboard, progreso y cita | Sin TTL |
| Psicólogos | `src/services/psicologoService.js` | `getDocs/orderBy` o `onSnapshot` | Administración | Listener de colección completa sin necesidad funcional inmediata |
| Terapias de paciente | `src/services/terapiaService.js` | `getDocs(where pacienteUid ==)` | Dashboard, sesiones, progreso y detalle | Sin caché; duplicada en dashboard |
| Terapia activa | `src/services/terapiaService.js` | Lista completa y `find` local | Varias vistas y escrituras | Lee todas las terapias para obtener una |
| Terapias de psicólogo | `src/services/terapiaService.js` | `getDocs(where terapeutaId ==)` | Agenda, pacientes, historial, herramientas | Colección creciente sin límite |
| Disponibilidad | `src/services/availabilityService.js` | `getDocs(where therapistId ==)` | Agenda y modal de cita | Incluye bloques históricos y cerrados |
| Notificaciones | `src/services/notificationService.js` | Listener con `limit(20)` | Navbar | Consulta acotada y tiempo real justificado |
| Ejercicios | `src/services/exerciseService.js` | `getDocs` por paciente/psicólogo | Dashboard y herramientas | Colecciones completas, sin caché/paginación |
| Objetivos | `src/services/therapyGoalService.js` | `getDocs` por paciente/psicólogo | Progreso | Colecciones completas, sin caché/paginación |
| Registros emocionales | `src/services/emotionalCheckinService.js` | `getDocs` por paciente/psicólogo | Registro emocional | Colecciones completas, sin cursor |
| Historial longitudinal | `src/services/longitudinalHistoryService.js` | `getDocs` por paciente o terapia | Historial | Colección completa; N+1 para psicólogo |
| Solicitudes profesionales | `src/services/psychologistRequestService.js` | `getDocs` por usuario | Onboarding/configuración | Descarga todas para elegir la última |
| Solicitudes profesionales | `src/services/psychologistRequestService.js` | `getDocs/orderBy` | Admin | Colección completa, sin cursor |
| Matching | `functions/src/matching/recommendTherapists.js` | disponibles + todos los psicólogos | Callable de recomendaciones | Dos barridos de colecciones por invocación |

## 4. Inventario de listeners

| Listener | Archivo | Cancelación | Evaluación |
|---|---|---|---|
| Auth global | `src/store/auth.js` | Conservado durante la app | Correcto como fuente única, pero el router abre listeners temporales adicionales |
| Perfil | `src/services/conversationService.js` | Las vistas llaman unsubscribe | Justificado en chat; innecesario en dashboard/progreso |
| Conversación activa | `src/services/conversationService.js` | Chat cancela al desmontar/cambiar usuario | Justificado |
| Mensajes | `src/services/conversationService.js` | Chat cancela al cambiar sesión/desmontar | Justificado, pero consulta no está filtrada en servidor |
| Notificaciones | `src/services/notificationService.js` | Navbar cancela al desmontar/cambiar usuario | Justificado y limitado a 20 |
| Psicólogos | `src/services/psicologoService.js` | Tabla admin cancela al desmontar | Tiempo real innecesario para un CRUD que ya actualiza su estado local |

Pico identificable por código en el chat: tres listeners de Firestore más el listener global de Auth y el listener de notificaciones del layout si estuviera montado. El número facturado real no fue medido con Emulator Suite o métricas de producción.

## 5. Inventario de escrituras

| Dominio | Escrituras | Protección actual | Riesgo |
|---|---|---|---|
| Usuarios | `setDoc`, `updateDoc`, `deleteDoc` | Botones con estados loading | Tras guardar se vuelve a leer la lista completa |
| Psicólogos | `addDoc`, `updateDoc`, `deleteDoc` | Estados saving/deleting | Listener vuelve a entregar toda la colección |
| Disponibilidad | `addDoc`, `updateDoc` | Estado saving/action id | Crear bloque lee antes toda la disponibilidad y luego recarga agenda completa |
| Citas | `addDoc`, `updateDoc`, transacciones | Bloqueos en UI y transacción de slot | Una acción puede escribir cita, terapia embebida, evento y notificación; compatibilidad impide eliminar pasos sin backend |
| Terapias | `addDoc`, `updateDoc`, `arrayUnion` | Validaciones previas | Las citas embebidas hacen crecer indefinidamente cada documento de terapia |
| Diario emocional | `addDoc` + evento longitudinal | Estado saving | Después de guardar recarga toda la colección |
| Ejercicios | `addDoc`/`updateDoc` + evento | Estados saving | Después de guardar recarga toda la colección |
| Objetivos | `addDoc`/`updateDoc` + evento | Estados saving | Después de guardar recarga toda la colección |
| Notificaciones | `addDoc`/`updateDoc` | Acción individual | Correcto; actualización parcial |
| Chat | Cloud Function escribe conversación, mensajes, perfil y eventos | Loading en UI | No hay idempotency key de backend; UI evita doble clic normal |
| Onboarding | Callables | Loading en UI | Correcto en frontend; debe mantener idempotencia backend |

No se encontraron escrituras directas en pulsaciones de teclado ni watchers profundos de autoguardado.

## 6. Riesgos de costos y priorización

| Hallazgo | Archivo | Impacto | Frecuencia | Riesgo económico | Solución |
|---|---|---|---|---|---|
| Listener de mensajes descarga sesiones completas | `conversationService.js` | Documentos de chat | Cada cambio de mensaje | Crítico | Filtrar por `sessionId` en la consulta y añadir índice |
| N+1 de historial del psicólogo | `HistorialView.vue` | 1 consulta por terapia | Cada entrada a historial | Alto | Consulta `in` por lotes y cursor/limit |
| N+1 de pacientes admin | `PacientesView.vue` | 2 consultas por usuario | Cada entrada del admin | Alto | Carga por lotes y paginación; agregado backend pendiente |
| Barrido de matching | `recommendTherapists.js` | Horarios y psicólogos completos | Cada solicitud de recomendaciones | Alto | Filtrar fecha en servidor y leer psicólogos por ID en lotes; caché corta en frontend |
| Dashboard duplica terapias | `DashboardView.vue` | Misma consulta dos veces | Cada entrada al dashboard | Alto | Obtener lista una vez y derivar terapia activa |
| Sin caché/deduplicación transversal | Servicios | Consultas repetidas | Cada navegación | Alto | Caché en memoria por usuario con TTL e in-flight dedupe |
| Listeners de perfil estático | Dashboard/Progreso | Lecturas reactivas innecesarias | Mientras la vista está abierta | Medio-Alto | Lectura puntual cacheada; mantener tiempo real en chat |
| Listener de psicólogos admin | `DataTablePsicologos.vue` | Colección completa por cambio | Mientras admin está abierto | Medio | Lectura puntual y actualización local |
| Auth duplicada en router | `router/index.js` | Listener temporal | Navegación antes de resolver sesión | Medio | Esperar el store global de Auth |
| Disponibilidad histórica completa | `availabilityService.js` | Bloques viejos/cerrados | Agenda y modal | Medio | Filtrar desde fecha actual, ordenar y limitar |
| Todas las rutas son eager | `router/index.js` | JS no utilizado por rol | Primera carga | Alto transferencia | Imports dinámicos por ruta |
| Vuetify registra todos los componentes | `plugins/theme/index.js` | JS/CSS no utilizado | Primera carga | Medio | Auto-import/tree shaking con plugin oficial |
| Fuente MDI completa en 4 formatos | `@mdi/font` | 3,606,740 bytes | Primera instalación/caché fría | Alto transferencia/hosting | Subconjunto CSS y solo WOFF2 |
| Fondo JPG sobredimensionado | `src/assets/img/bg-home.jpg` | 1,827,674 bytes | Vistas públicas/onboarding | Medio | AVIF optimizado sin pérdida perceptible |
| Axios sin consumidores | `main.js`, `plugins/axios.js` | Dependencia y código muerto | Primera carga | Bajo-Medio | Retirar tras confirmar ausencia de uso |
| Google Fonts solicita peso 300 no usado | `index.html` | Transferencia externa | Primera carga | Bajo | Limitar pesos a 400-700 |
| Sin headers explícitos para assets | `vercel.json` | Revalidación/transferencia | Navegaciones/deploys | Medio | Caché immutable para `/assets`, corta para `/brand` |
| Dependencias transitivas vulnerables | `package-lock.json` | Riesgo de disponibilidad y seguridad | Build/SDK | Alto | Aplicar actualizaciones compatibles y volver a auditar |

## 7. Problemas de bundle

- Un solo chunk JS contiene autenticación, paciente, psicólogo, administración, chat y calendarios.
- `createVuetify` recibe `* as components` y `* as directives`, lo que impide una selección eficiente.
- `@mdi/font/css/materialdesignicons.css` incorpora el mapa completo y genera EOT, TTF, WOFF y WOFF2.
- Axios está registrado globalmente, pero no se encontraron consumidores de `$axios` ni `apiClient` fuera de su inicialización.
- No hay source maps de producción configurados; Vite los mantiene desactivados por defecto.

## 8. Problemas de transferencia

- Fondo principal JPG: 1,827,674 bytes.
- Cuatro formatos MDI: 3,606,740 bytes combinados.
- Logos públicos: 263,658 bytes combinados. Se usan por URL estable y no tienen hash.
- Poppins se descarga desde Google Fonts; el tamaño real depende de negociación y caché del navegador, por lo que no se midió localmente.
- Los documentos de terapias incluyen arreglos embebidos de citas, por lo que cada lectura vuelve a transferir el historial completo de citas de la terapia.

## 9. Problemas de caché

- No existe caché de aplicación con TTL.
- No se comparten promesas en curso.
- No hay invalidación central tras escrituras.
- Los resultados de matching pueden volver a invocar la función al remontar la vista.
- No se debe usar `localStorage` para perfiles, diarios, objetivos, sesiones o mensajes. La optimización se implementará exclusivamente en memoria para datos sensibles.

## 10. Problemas de solicitudes externas

- `sendProfileChatMessage` invoca IA por mensaje; la UI bloquea doble envío, pero el backend no recibe una clave de idempotencia.
- `getRecommendedTherapists` puede repetirse al remontar la vista; se aplicará TTL corto y refresh explícito.
- Las callables de onboarding están protegidas por estados loading.
- `@vercel/analytics` se carga globalmente. Se conserva porque corresponde a observabilidad explícita del producto.
- No se encontraron polling ni reintentos ilimitados.

## 11. Cambios que se implementarán

1. Caché en memoria por ámbito de usuario, TTL, deduplicación e invalidación.
2. Instrumentación FinOps solo en desarrollo, sin payloads ni datos clínicos.
3. Unificar la espera de Auth en el store global.
4. Filtrar mensajes por sesión en Firestore y compartir suscripciones equivalentes.
5. Sustituir listeners estáticos por lecturas puntuales cacheadas.
6. Eliminar la consulta duplicada del dashboard.
7. Consultas acotadas para terapia activa, psicólogo por UID, solicitud más reciente y disponibilidad futura.
8. Reducir N+1 del historial mediante consultas `in` por lotes.
9. Retirar listener en CRUD de psicólogos.
10. Caché corta y deduplicación para matching.
11. Lazy loading de rutas y auto-import de Vuetify.
12. Subconjunto MDI WOFF2, optimización de imagen y eliminación de Axios sin uso.
13. Headers de caché seguros para Vercel.
14. Índices de Firestore requeridos por las consultas optimizadas.

## 12. Cambios que requieren backend o modelo de datos

| Riesgo actual | Cambio backend requerido | Contrato esperado | Criterio de validación |
|---|---|---|---|
| Citas embebidas hacen crecer `terapias` | Separar proyección/resumen de citas del documento principal o mantener contadores agregados | Documento de terapia liviano con `nextAppointment`, contadores y datos activos | Leer dashboard sin transferir todo el historial |
| Métricas recorren arreglos completos | Mantener documentos agregados por usuario/terapeuta | Contadores de citas, ejercicios y objetivos actualizados de forma idempotente | Dashboard con 1-5 lecturas acotadas |
| Admin de pacientes requiere perfiles y terapias | Crear vista/proyección administrativa sin notas clínicas | Documento de resumen con identidad mínima, estado de perfil y terapia | Lista paginada sin N+1 y sin exponer contenido clínico |
| Chat no usa idempotency key | Aceptar `clientMessageId` y rechazar duplicados por sesión | Callable idempotente por `uid + sessionId + clientMessageId` | Reintento de red no crea dos mensajes ni dos invocaciones de IA |
| Historial profesional depende de IDs de terapia | Añadir `terapeutaId` de primer nivel en todos los eventos nuevos y migrar antiguos | Consulta directa por terapeuta con cursor | Una consulta paginada por página de historial |
| Matching consulta disponibilidad en vivo | Mantener agregado de psicólogos con disponibilidad futura | Colección/proyección sin detalles clínicos | Matching no recorre todos los slots disponibles |

El frontend quedará compatible con paginación, caché e invalidación; no se simularán agregados inexistentes.

## 13. Métricas de línea base

Build ejecutado con `npm run build` el 2026-07-31.

| Métrica | Línea base | Método |
|---|---:|---|
| Tamaño total de `dist` | 8,068 KiB (`du -sk`) | Build local de producción |
| JS inicial | 1,489,748 B / 417.42 KiB gzip | Salida de Vite |
| CSS inicial | 926,009 B / 132.63 KiB gzip | Salida de Vite |
| JS + CSS inicial gzip | 550.05 KiB | Suma de salida Vite |
| Chunks JS | 1 | Archivos generados |
| Chunks CSS | 1 | Archivos generados |
| Fondo principal | 1,827,674 B | `stat` |
| Fuentes MDI locales | 3,606,740 B | Suma EOT/TTF/WOFF/WOFF2 |
| Módulos transformados | 758 | Salida de Vite |
| Vulnerabilidades reportadas por npm | 8 (2 moderadas, 4 altas, 2 críticas) | `npm audit --omit=dev` |
| Consultas reales en login | No medido de forma concluyente | Requiere sesión instrumentada/emulador |
| Consultas reales de dashboard | No medido de forma concluyente | Requiere sesión instrumentada/emulador |
| Listeners activos reales | No medido de forma concluyente | Se infiere el código, no la facturación |
| Solicitudes duplicadas reales | No medido de forma concluyente | Sin traza de red de producción |

## 14. Límites de la medición

Las métricas de código y build son exactas para la máquina y commit auditados. El número de documentos facturados depende del contenido de producción, reconexiones, caché interna del SDK y actividad del usuario. La instrumentación añadida contará operaciones lógicas y documentos recibidos en desarrollo, pero no afirmará equivalencia exacta con la factura de Firestore.
