# Auditoría de costos de Lurems / PsicoFound

Fecha de corte: **30 de octubre de 2026, America/Lima**. Moneda: **USD por mes, sin impuestos**. Mes normalizado de 30 días.

## Resultado ejecutivo

La IA configurada es económica por interacción. El riesgo financiero principal es multiplicar operaciones gratuitas para usuarios que no convierten: transferir una interfaz pesada, leer todo el catálogo y sus horarios en cada búsqueda, renovar tokens de App Check y procesar muchos turnos de conversación. El costo de adquisición técnico debe repartirse entre los clientes que pagan, incluyendo lo consumido por quienes abandonan.

Con **10.000 visitantes mensuales, 3.000 participantes en la encuesta y 200 nuevos pagadores**, el caso central estima **USD 27,11/mes**: backend **15,93**, frontend **6,68** e IA **4,50**. Aplicando los objetivos de optimización planteados, estima **USD 8,27/mes**. Con 100.000 visitantes, los mismos supuestos pasan de **USD 230,83 a USD 81,85/mes**. Son resultados de un modelo, no ahorros ya realizados.

**Alcance de la evidencia:** se revisaron código, configuración local, documentación y el `dist` existente. Se contrastaron tarifas oficiales. No se accedió a facturas, métricas de tráfico, recursos remotos, plan de Vercel, cuotas consumidas por otros proyectos ni configuración realmente desplegada. Tampoco se ejecutaron inferencias, pruebas de carga, despliegues o cambios a la aplicación. La revisión es de ingeniería de costos y planificación, no una certificación contable.

Los totales contienen **USD 5 mensuales de provisión** para operaciones todavía no medidas y una simulación de siete copias diarias conservadas de Firestore. Esa provisión no es una tarifa de Firebase ni una medición de gasto. Vercel para validación, cartera histórica de pacientes y costos del negocio se explican aparte.

## 1. Qué está implementado y cómo factura

| Componente | Evidencia del repositorio | Consecuencia económica |
| --- | --- | --- |
| Frontend Vue/Vite estático | `package.json`, `vite.config.js`, `firebase.json` | Se sirve un build estático. No se identificó SSR que requiera servidores para renderizar cada página. |
| Hosting productivo documentado | Sitio `luremsapp`, dominio `app.lurems.lat`; `README.md`, `firebase.json` | Su transferencia debe contabilizarse como frontend, aunque aparezca en Cloud Billing. Es Firebase Hosting clásico, no Firebase App Hosting. |
| Vercel de validación | `README.md`, `docs/infarsetructura/plan-operativo-mvp.md` | Es otro frontend que usa el backend compartido. Dos despliegues no duplican automáticamente Firestore, pero su tráfico y pruebas sí suman consumo. |
| Backend | Functions v2, Node 22, región `southamerica-east1`; `functions/index.js` | Computación, base de datos, seguridad y operación se facturan por sus propios consumos. `maxInstances: 10` se aplica por función y no es un límite monetario del proyecto. |
| IA | `functions/src/config.js`, `ai/providerPolicy.js`, `ai/providers/OpenAIProvider.js` | OpenAI `gpt-6-luna`, Responses API, razonamiento `none`, `store: false`; encuesta sin fallback a otro proveedor. |
| Encuesta híbrida | `chat/surveyService.js`, `chat/profileChatHandlers.js` | Una opción guiada válida se resuelve sin inferencia, pero sigue ejecutando Functions y escribiendo en Firestore. El matching es determinístico y no agrega otra llamada a IA. |
| Acceso a encuesta | `accounts/accessPolicy.js` | Exige autenticación, correo verificado, consentimiento y onboarding. Un visitante de la portada no equivale a un participante ni a un cliente pagador. |
| Protección | `src/plugins/Firebase/firebase.js`, `operations/appCheckPolicy.js` | reCAPTCHA Enterprise con renovación automática de App Check. El número de evaluaciones no equivale al de mensajes enviados a la IA. |

La configuración local inspeccionada indica `SURVEY_INPUT_MODE=hybrid`, modelo `gpt-6-luna`, **30 envíos por cuenta/día y concurrencia global 2**. Parte de la planificación antigua aún describe modo guiado. Se priorizó el código y la configuración actuales para esta simulación, sin afirmar que prueben el estado remoto.

## 2. Qué puede causar más costos

### 2.1. Frontend: imagen de portada, fuentes y revalidación global

`firebase.json:47` y `vercel.json` aplican `Cache-Control: no-cache, max-age=0, must-revalidate` a todas las rutas. `no-cache` permite almacenar y revalidar, por lo que **no implica descargar todos los bytes en cada visita**. Sí impide aprovechar una política larga de caché del navegador para los assets con hash y genera peticiones de validación adicionales.

En el `dist` local, la imagen de portada pesa **1.827.674 bytes**, WOFF2 de Material Design Icons **403.216 bytes** y los dos grandes paquetes de Firebase/Vuetify aproximadamente **173 KB y 165 KB en gzip teórico**. El build entero pesa 8,37 MB en disco; **no se usó ese total como descarga por visitante**, porque el navegador no carga todas las rutas ni todos los formatos de fuente.

Objetivo: portada AVIF/WebP adaptable, subconjunto de iconos, carga diferida de rutas y de Firebase en la entrada pública, HTML revalidable y assets con hash `public, max-age=31536000, immutable`. Conservar la recuperación de chunks y verificar pestañas abiertas al desplegar. El modelo usa **3,5 MB efectivos por carga en el caso base y 1,2 MB como objetivo**; se deben reemplazar por mediciones de red con caché fría y caliente.

### 2.2. Backend: cada recomendación escanea catálogo y disponibilidad

En [`recommendTherapists.js`](../../functions/src/matching/recommendTherapists.js#L74), `getActiveTherapists` lee la colección completa. Para perfiles `setupVersion === 1` elegibles consulta además la tarifa y la cuenta del profesional. Después, [`getFutureAvailabilityByTherapist`](../../functions/src/matching/recommendTherapists.js#L98) consulta todos los slots con `status == available` y descarta en memoria los pasados o no elegibles. Mostrar cinco resultados al final no limita las lecturas anteriores.

Con **T profesionales, todos elegibles y con setup v1**, y **S slots marcados disponibles**, la lectura de catálogo se aproxima a **3T + S por búsqueda**, antes de las lecturas de acceso y perfil. Con 100 profesionales y 2.000 slots son unas **2.300 lecturas**, no cinco. También se pagan documentos descartados después de recibirlos.

Objetivo: consultar candidatos elegibles e indexados antes de leer horarios, mantener un resumen de próxima disponibilidad, consultar ventanas futuras y reutilizar tarifas compartidas. El objetivo modelado es **50 lecturas por búsqueda**, más provisión de mantenimiento del índice. Ese valor debe demostrarse con datos y no se alcanza agregando `.limit(5)` al final del ranking: hay que conservar la calidad del matching. La disponibilidad y el precio definitivos se deben volver a validar al reservar.

### 2.3. Backend: turnos guiados y libres siguen teniendo costo de persistencia

Un turno exitoso de [`surveyService.js`](../../functions/src/chat/surveyService.js#L56) realiza dos transacciones, guarda usuario/asistente, perfil, conversación, operación idempotente y cuotas. El wrapper añade comprobaciones y actualiza actividad. El recuento mínimo del camino normal es aproximadamente **14 lecturas de servidor y 12 escrituras**, más historial, listeners, reglas, reintentos y escrituras condicionales. El modelo incorpora 26 lecturas por turno antes del historial y un margen adicional de lecturas del 10%.

[`recordAccountActivity`](../../functions/src/accounts/accountLifecycle.js#L31) escribe `lastActivityAt` en cada callable. Hay un listener del documento de usuario en `src/store/appContext.js`, por lo que esa escritura puede provocar otra lectura. Reducir la frecuencia de escritura de actividad, por ejemplo a una ventana de 15–30 minutos, conservando la evaluación de acceso por llamada, evita operaciones repetidas. El modelo optimizado supone reducir el 90% de esas escrituras, no retirar controles.

El historial de IA lee hasta **60 documentos** y luego selecciona **15 intercambios completos** (`chat/history.js`). El prompt limita el historial a **12.000 caracteres**, que no son 12.000 tokens (`ai/profilePrompt.js:56`). Reducir lectura y contexto de forma coordinada evita pagar datos que después se descartan. Las sesiones largas aumentan tanto lecturas como tokens de entrada.

### 2.4. Backend: reCAPTCHA puede costar tanto como la IA

La app inicializa App Check desde el módulo común de Firebase. Visitantes de páginas públicas también pueden originar evaluaciones por sus lecturas y tokens. No debe asumirse una evaluación por usuario ni una por mensaje. El TTL y la renovación influyen en la relación entre sesiones y evaluaciones. [Documentación de App Check](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).

Con **126.400 evaluaciones** el cargo modelado es **USD 34,40**. Con una entrada pública que no solicite recursos protegidos y posponga App Check hasta necesitarlos, el supuesto baja a 58.400 y **USD 8**. La protección sigue siendo obligatoria para los recursos protegidos; se optimiza cuándo se inicia su uso. La franquicia es compartida y debe verificarse en la organización. [Facturación de reCAPTCHA](https://docs.cloud.google.com/recaptcha/docs/billing-information).

### 2.5. Backend: listeners y procesos que crecen con el histórico

[`watchAdminCollection`](../../src/services/adminService.js#L12) escucha colecciones completas. Usuarios, auditorías, pagos y soporte pueden acumular muchas lecturas al abrir paneles o volver a conectarlos. Notificaciones, pagos del paciente e historiales también tienen consultas sin paginación en varios servicios. Priorizar cursores y límites por fecha, estado y rol.

El job diario [`suspendInactiveAccounts`](../../functions/src/accounts/accountLifecycle.js#L130) pagina de 200 en 200, pero recorre **todos los usuarios** y consulta movimientos de ciertos candidatos. Paginar acota memoria, no el total mensual de lecturas. Un millón de cuentas conservadas implica al menos 30 millones de lecturas/mes del barrido, antes de movimientos; una suspensión no borra datos ni elimina este recorrido. Diseñar una consulta de candidatos inactivos y conservar la comprobación transaccional final.

### 2.6. IA: el costo depende de uso gratuito, longitud y conversión

El servidor admite mensajes de hasta 1.200 caracteres, configura un máximo de **700 tokens de salida** y desactiva fallback para la encuesta. La idempotencia reduce inferencias duplicadas del mismo envío. Son buenas bases.

Faltan un presupuesto global de inferencia por período y una asignación diferenciada para captación. El límite de 30 cuenta tanto opciones guiadas como texto libre, y una persona puede volver al día siguiente o crear más cuentas. La concurrencia 2 acota operaciones simultáneas, no el gasto mensual.

Mantener el modelo actual y probar **2–4 intervenciones de IA de admisión**, seguidas de preferencias guiadas, resumen y agenda. No convertir el acceso gratuito en conversación indefinida. El objetivo optimizado de 200 tokens es un **promedio**, no una propuesta de reducir el límite de salida a 200 y arriesgar JSON truncado. Cualquier cambio de prompt debe conservar las señales de ayuda y la revisión clínica/funcional; los recursos de ayuda deben seguir accesibles.

`AIService.js` ya registra tokens de entrada y salida en éxitos. Conviene agregar métricas de tokens cacheados, costo estimado y conversión agregada sin texto clínico. Si una respuesta consume tokens y falla al interpretar su JSON, el camino de error puede no registrar ese uso como éxito; conciliar con el consumo del proveedor evita subestimar gasto.

## 3. Tarifas utilizadas

| Servicio | Tarifa y franquicia del modelo | Fuente |
| --- | --- | --- |
| Firestore Standard, São Paulo | USD 0,045/100.000 lecturas; 0,135/100.000 escrituras; 0,135/GiB-mes de datos; 0,045/GiB-mes de backup | [Precios regionales](https://cloud.google.com/firestore/pricing), selector São Paulo, sin CUD |
| Franquicias Firestore | 50.000 lecturas y 20.000 escrituras/día; 1 GiB; red saliente 10 GiB/mes. Base elegible única por proyecto | [Firestore](https://firebase.google.com/docs/firestore/pricing) |
| Functions v2 / Cloud Run, São Paulo | USD 0,0000336/vCPU-segundo, 0,0000035/GiB-segundo y 0,40/millón de requests | [Cloud Run](https://cloud.google.com/run/pricing), request-based |
| Franquicia de cómputo | Crédito equivalente a 180.000 vCPU-s y 360.000 GiB-s a precio Tier 1; 2 millones de requests/mes | [Cloud Run](https://cloud.google.com/run/pricing) |
| Firebase Hosting clásico | 360 MB/día sin cargo; excedente USD 0,15/GB. Almacenamiento 10 GB sin cargo | [Firebase](https://firebase.google.com/pricing) |
| OpenAI gpt-6-luna Standard | USD 0,10 por millón de tokens de entrada y 0,50 de salida. Sin ahorro de caché aplicado | [OpenAI Docs](https://developers.openai.com/api/docs/pricing) |
| reCAPTCHA Premium | Hasta 10.000 evaluaciones/mes sin cargo; USD 8 entre 10.001–100.000; después USD 0,001 por evaluación adicional | [Google Cloud](https://docs.cloud.google.com/recaptcha/docs/billing-information) |
| Cloud Scheduler | Tres jobs gratis por cuenta de facturación; USD 0,10/job/mes después | [Scheduler](https://cloud.google.com/scheduler/pricing) |

Los precios regionales de Firestore y Cloud Run se contrastaron también contra las tablas regionales incluidas en el HTML oficial; la vista textual muestra Iowa por defecto. Se usa GB decimal para Hosting y GiB para Firestore. Las cuotas diarias se aplican por día, no como una bolsa mensual. Las franquicias de cómputo, reCAPTCHA y Scheduler pueden estar compartidas con otros proyectos.

No se modela una suscripción fija a Blaze: el cálculo es por uso. Authentication por correo/Google se presupone sin Identity Platform. Si el proyecto está actualizado a Identity Platform, sus usuarios activos se cuentan aunque no paguen: sobre 50.000 MAU aparece la tarifa del tramo correspondiente. Por ejemplo, 100.000 MAU Tier 1 añaden **USD 275/mes**. No se confunden visitas con MAU. [Identity Platform](https://cloud.google.com/identity-platform/pricing).

## 4. Supuestos del embudo

| Variable | Caso base | Caso optimizado |
| --- | --- | --- |
| Visitantes mensuales | 1.000 / 10.000 / 100.000 personas nuevas | Igual |
| Registrados con actividad | 40% de visitantes | Igual |
| Entran a la encuesta | 30% de visitantes, con acceso válido | Igual |
| Llegan a recomendaciones | 60% de participantes | Igual |
| Consultas de recomendaciones | 1,2 por participante que llega a esta etapa | Igual |
| Conversión a primera cita pagada | 0,5% / 2% / 5% de visitantes | Igual |
| Turnos por participante | Promedio 8, incluyendo abandonos | Igual |
| Turnos que usan IA | Promedio 4 de los 8 | Promedio 2 de los 8 |
| Tokens por inferencia | 2.500 entrada + 250 salida | 1.600 entrada + 200 salida |
| Catálogo de cálculo | 100 profesionales, 2.000 slots marcados disponibles | Mismo catálogo, búsqueda optimizada |
| Lecturas por búsqueda, sin guards | 2.300 | Objetivo 50 |
| Descargas frontend | 1,5 cargas por visitante y otras 4 por nuevo pagador | Igual |
| MB transferidos por carga | Promedio efectivo 3,5 MB | Objetivo 1,2 MB |
| Evaluaciones reCAPTCHA | 1,2 por visitante + 3,2 por pagador | 1,3 por registrado + 3,2 por pagador |
| Backend por paciente atendido en el mes | Bolsa de 12 callables, 500 lecturas y 50 escrituras adicionales | Igual |
| Tiempo Functions | 6 s con IA, 0,35 s guiado y 0,3 s otras; 20% adicional | Igual por tipo de llamada |
| Recursos Functions | 1 vCPU, 256 MiB, mínimo cero, concurrencia efectiva de facturación 1 | Igual |
| Datos existentes | 10.000 cuentas y 1 GiB de base; sin cartera clínica activa previa | Igual |

Estas cifras son **supuestos editables, no métricas obtenidas de producción**. La concurrencia efectiva 1 es conservadora: Cloud Run puede compartir instancias para varias solicitudes, pero no se presupone un ahorro sin medirlo. Las bolsas por paciente cubren uso ligero de agenda/seguimiento y se deben calibrar con sesiones reales.

La conversión se aplica a visitantes y no al subconjunto que usa la encuesta. Por ejemplo, 10.000 visitantes → 4.000 registrados → 3.000 participantes → 1.800 que llegan a recomendaciones → 200 pagadores al 2%. Los otros **2.800 participantes también generan costos**.

## 5. Resumen de costos por componente

Conversión central de 2%. El frontend de esta tabla es **solo Firebase Hosting productivo**. Backend incluye la provisión operativa de USD 5 y backup hipotético descritos arriba.

| Visitantes/mes | Pagadores | Backend base | Frontend base | IA base | Total base | Presupuesto base con 30% adicional |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 20 | 5,32 | 0,00 | 0,45 | **5,77** | **8** |
| 10.000 | 200 | 15,93 | 6,68 | 4,50 | **27,11** | **36** |
| 100.000 | 2.000 | 104,50 | 81,33 | 45,00 | **230,83** | **301** |

| Visitantes/mes | Backend optimizado | Frontend optimizado | IA optimizada | Total optimizado | Presupuesto optimizado con 30% adicional |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 5,32 | 0,00 | 0,16 | **5,48** | **8** |
| 10.000 | 5,49 | 1,22 | 1,56 | **8,27** | **11** |
| 100.000 | 39,43 | 26,82 | 15,60 | **81,85** | **107** |

En 100.000 visitantes el ahorro objetivo es **USD 148,97/mes, aproximadamente 65%**. La reducción modelada de backend es USD 65,06; hosting USD 54,51; IA USD 29,40. No se conoce aún el esfuerzo de implementación ni su retorno efectivo. A 10.000 visitantes el ahorro aproximado de USD 19/mes favorece priorizar cambios simples y diferir infraestructura nueva.

### Desglose del backend con 100.000 visitantes y 2% de conversión

| Concepto | Base | Optimizado |
| --- | ---: | ---: |
| Lecturas Firestore | 30,45 | 6,03 |
| Escrituras Firestore | 4,22 | 3,64 |
| Almacenamiento Firestore | 0,18 | 0,18 |
| Red Firestore al navegador | 0,00 | 0,00 |
| Backup simulado | 0,72 | 0,72 |
| Functions, cómputo y requests | 29,53 | 15,87 |
| reCAPTCHA | 34,40 | 8,00 |
| Auth y Scheduler bajo los supuestos | 0,00 | 0,00 |
| Provisión de operaciones no medidas | 5,00 | 5,00 |
| **Total backend** | **104,50** | **39,43** |

Los ceros corresponden a supuestos dentro de franquicias, no a servicios universalmente gratuitos. El redondeo de renglones puede diferir un centavo del total calculado sin redondear.

## 6. Escenarios de conversión

Se mantiene el mismo tráfico y uso medio de encuesta. La mayor conversión solo añade la bolsa de uso del pagador y sus cargas posteriores; no elimina el costo previo de quienes abandonaron.

| Visitantes | Conversión a pago | Nuevos pagadores | Total base | Total optimizado | Costo técnico por pagador, base | Costo técnico por pagador, optimizado |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 0,5% | 5 | 5,77 | 5,48 | 1,154 | 1,095 |
| 1.000 | 2% | 20 | 5,77 | 5,48 | 0,289 | 0,274 |
| 1.000 | 5% | 50 | 5,77 | 5,48 | 0,115 | 0,110 |
| 10.000 | 0,5% | 50 | 26,75 | 8,13 | 0,535 | 0,163 |
| 10.000 | 2% | 200 | 27,11 | 8,27 | 0,136 | 0,041 |
| 10.000 | 5% | 500 | 27,82 | 8,57 | 0,056 | 0,017 |
| 100.000 | 0,5% | 500 | 222,13 | 80,05 | 0,444 | 0,160 |
| 100.000 | 2% | 2.000 | 230,83 | 81,85 | 0,115 | 0,041 |
| 100.000 | 5% | 5.000 | 248,25 | 85,49 | 0,050 | 0,017 |

Con 10.000 visitantes y conversión de 2%, el gasto IA de USD 4,50 se divide entre 200 pagadores: **USD 0,0225 de IA por cliente captado**, incluyendo el uso gratuito previo. Si todos los participantes consumen parecido, unos **USD 4,20** de esa IA se imputan a los 2.800 que no pagaron. Es una asignación de costo, no una observación del comportamiento de ambas cohortes.

El **costo técnico por pagador no es CAC completo ni margen neto**. Para evaluar rentabilidad hace falta sumar publicidad, soporte, conciliación, devoluciones y costos profesionales. El importe total de una cita tampoco es ingreso íntegro de la plataforma.

## 7. Sensibilidades que cambian la decisión

### Mayor intensidad de conversación gratuita

10.000 visitantes, 30% de participación y 2% de conversión. Para 12 y 30 llamadas se usan 5.000 tokens de entrada y 700 de salida por inferencia, y 30 documentos de historial medio. Es demanda mensual, no un límite impuesto al usuario.

| Llamadas IA por participante | IA mensual | Total mensual con backend/hosting base |
| ---: | ---: | ---: |
| 0, ocho turnos guiados | 0,00 | 22,56 |
| 2 | 2,25 | 24,83 |
| 4, caso central | 4,50 | 27,11 |
| 12, conversación más larga | 30,60 | 58,59 |
| 30, conversación prolongada | 76,50 | 119,93 |

Quitar la inferencia no lleva backend ni hosting a cero. En el extremo de uso recurrente gratuito, **100 cuentas × 30 mensajes IA/día × 30 días = 90.000 inferencias**, que a 2.500/250 tokens representan **USD 33,75 de proveedor**, más backend y hosting. El volumen es demanda potencial; la capacidad y distribución horaria pueden impedir atenderlo.

### Más visitantes usan IA, sin aumentar conversión

100.000 visitantes y 2.000 pagadores. Los registros suben cuando hacen falta para admitir la participación supuesta. La columna optimizada conserva dos llamadas IA por participante.

| Participación en encuesta | Participantes | IA base | Total base | Total optimizado |
| ---: | ---: | ---: | ---: | ---: |
| 10% | 10.000 | 15,00 | 156,51 | 52,81 |
| 30% | 30.000 | 45,00 | 230,83 | 81,85 |
| 60% | 60.000 | 90,00 | 345,10 | 127,44 |
| 100% | 100.000 | 150,00 | 498,78 | 226,34 |

Esta tabla demuestra por qué facturar solo los pagadores subestima el costo. Las filas de mayor participación representan **demanda económica potencial**: la concurrencia global actual de dos puede rechazar parte de ella. Si hubiera Identity Platform, con 100.000 registrados activos el último escenario sumaría además USD 275 bajo la tarifa Tier 1.

### Crece el catálogo sin optimizar búsquedas

Mismos 100.000 visitantes y conversión 2%. Se modifica únicamente el catálogo consultado; no se agrega aquí todo el trabajo administrativo de más profesionales.

| Profesionales | Slots marcados disponibles | Lecturas Firestore mensuales aproximadas | Backend base | Total base |
| ---: | ---: | ---: | ---: | ---: |
| 20 | 200 | 20,69 millones | 82,69 | 209,02 |
| 100 | 2.000 | 69,16 millones | 104,50 | 230,83 |
| 500 | 10.000 | 287,75 millones | 202,87 | 329,20 |
| 1.000 | 50.000 | 1.273,79 millones | 646,58 | 772,91 |

Los slots son inventario consultable, no citas vendidas en el mes. El costo y la latencia de esta consulta deben resolverse antes de crecer el directorio.

### Cartera activa que vuelve, aparte de los clientes nuevos

El caso central no presupone pacientes antiguos activos. Manteniendo 10.000 visitantes y 200 nuevos pagadores, añadir pacientes anteriores con el mismo uso ligero de agenda/seguimiento cambia el total:

| Pacientes antiguos activos adicionales | Total base | Total optimizado |
| ---: | ---: | ---: |
| 0 | 27,11 | 8,27 |
| 1.000 | 29,48 | 9,26 |
| 10.000 | 51,86 | 26,51 |

No incluye que los pacientes antiguos vuelvan a hacer la encuesta IA ni consultas completas repetidas de paneles administrativos. Para presupuestar una cartera real hay que medir frecuencia de uso, citas mensuales, eventos por paciente y acumulación histórica. Los datos no desaparecen al terminar el mes: actualizar `existing_users` y `existing_storage_gib` en cada nuevo período.

### Campañas y límites de capacidad

Concentrar los mismos 10.000 visitantes en un día aumenta el cálculo base de USD 27,11 a **USD 29,64** por perder franquicias diarias aprovechables. Es un cálculo financiero de demanda: **no certifica capacidad para atender la campaña**.

Con dos operaciones simultáneas y seis segundos por inferencia, el techo ideal sería 28.800 turnos IA/día si funcionara continuamente y sin otros turnos. También las respuestas guiadas compiten por el control global y se escribe un documento de concurrencia compartido dos veces por turno. Los picos pueden generar rechazos y reintentos con lecturas, aunque no lleguen a producir una inferencia. No aumentar concurrencia o instancias sin una prueba aislada y un presupuesto global de uso.

## 8. Hosting por separado: Firebase frente a Vercel

Comparación de frontend estático para el mismo tráfico al 2% de conversión. Vercel es una **alternativa**, no un costo que deba sumarse automáticamente a Firebase Hosting.

| Visitantes/mes | GB base / optimizados | Firebase Hosting base | Firebase Hosting optimizado | Vercel Pro, capacidad CDN prevista |
| ---: | ---: | ---: | ---: | ---: |
| 1.000 | 5,53 / 1,90 | 0,00 | 0,00 | 20,00 |
| 10.000 | 55,30 / 18,96 | 6,68 | 1,22 | 20,00 |
| 100.000 | 553,00 / 189,60 | 81,33 | 26,82 | 40,00 |

Vercel Pro parte de USD 20/mes para el supuesto de un asiento. Flat Rate CDN incluye 1 millón de requests y 1 TB; el siguiente nivel añade USD 20 para 10 millones y 50 TB. A 100.000 visitantes se presupuestó ese nivel porque el modelo calcula 2,37 millones de requests base y 1,58 millones optimizados. Se simula capacidad sostenida, no un cargo obligatorio por un pico aislado. La modalidad activa de una cuenta existente puede ser distinta. [Pro](https://vercel.com/docs/plans/pro-plan), [Flat Rate CDN](https://vercel.com/docs/pricing/flat-rate-cdn).

Los créditos de uso no eliminan la suscripción. Hobby está limitado a uso personal no comercial y no se presupuestó para esta app comercial. [Condiciones de Hobby](https://vercel.com/docs/plans/hobby).

**Decisión propuesta:** mantener Firebase Hosting en el piloto y optimizar transferencia primero. En 100.000 visitantes, Vercel puede ser más económico que el hosting sin optimizar (40 frente a 81,33), mientras Firebase optimizado queda por debajo (26,82). El dominio de validación Vercel puede conservar valor operativo; si exige un Pro dedicado de USD 20 que hoy no está incluido en otra suscripción, sumar ese fijo al total, sin atribuirle otra vez todo el tráfico productivo. Verificar plan, seats, analítica y builds reales antes de contratar o cancelar.

Para 10.000 visitantes: Firebase productivo base + Pro de validación dedicado ≈ **USD 47,11/mes**; optimizado ≈ **USD 28,27/mes**. No se sostiene que esa sea la suscripción actual.

## 9. Fórmulas y reproducción

Variables: V = visitantes nuevos, a = participación en encuesta, c = conversión a primera cita pagada, q = inferencias medias por participante, Ti/To = tokens medios, Pi/Po = USD por millón de tokens.

```text
Participantes = V × a
Pagadores nuevos = V × c
Llamadas IA = V × a × q
Costo IA = llamadas × (Ti × Pi + To × Po) / 1.000.000
Costo IA por nuevo pagador = costo IA / (V × c)
Costo técnico por nuevo pagador = (backend + frontend + IA) / (V × c)
Hosting = suma por día de max(GB_día − 0,36; 0) × 0,15
Lecturas Firestore = suma por día de max(lecturas_día − 50.000; 0) × tarifa
Escrituras Firestore = suma por día de max(escrituras_día − 20.000; 0) × tarifa
Presupuesto orientativo = techo(total × 1,30)
```

La división por cero se representa como ausencia de costo unitario si nadie paga. El modelo no convierte automáticamente reservas o pagos declarados en pagos efectivamente conciliados. Para medición real, definir conversión con el primer pago confirmado, tratar reembolsos por separado y mantener una ventana de atribución consistente.

Archivos del modelo:

- [Supuestos y tarifas editables](simulaciones/supuestos.json).
- [Calculadora reproducible en Python](simulaciones/simular_costos.py), sin dependencias externas ni solicitudes a servicios.
- [Resultados de los escenarios](simulaciones/resultados.json).

```bash
python3 docs/finance/simulaciones/simular_costos.py
```

Se verificaron reconciliación de componentes, límites gratuitos diarios, escalones de reCAPTCHA, cero conversiones, caso sin IA y cálculo independiente del caso de 10.000 visitantes. No se modificó código de aplicación ni se ejecutaron llamadas de pago.

## 10. Prioridades y datos necesarios para convertirlo en presupuesto real

| Prioridad | Acción | Resultado medible |
| --- | --- | --- |
| 1 | Medir siete días de consumo y separar facturación en backend, Hosting e IA; registrar modalidad de Vercel y estado de Identity Platform | USD por visitante, por participante y por primer pago conciliado, con conteos reales |
| 1 | Fijar presupuesto de captación IA por período y límites por cuenta, con continuación guiada | Al agotarlo, la agenda y los recursos de ayuda siguen disponibles |
| 1 | Reducir imagen/fuentes y aplicar caché larga a assets con hash | Acercarse a 1,2 MB efectivos por carga y menos revalidaciones, con red medida |
| 1 | Sustituir barridos de matching por candidatos y disponibilidad indexados | Acercarse a 50 lecturas por búsqueda y conservar calidad de recomendaciones |
| 2 | Evitar tokens App Check innecesarios en la entrada pública, manteniendo enforcement donde corresponde | Menos evaluaciones por visitante y por sesión activa |
| 2 | Reducir escrituras de actividad y paginar paneles e históricos | Menos escrituras por callable y lecturas por apertura de pantalla |
| 2 | Hacer coincidir historial leído y contexto enviado al modelo | Menos documentos y tokens por conversación larga, sin perder preferencias necesarias |
| 3 | Consultar candidatos de inactividad, configurar retención de artefactos y revisar logs/backups | Costo estable por operación y recuperación preservada |

Los presupuestos y avisos de Google Cloud **no detienen el consumo por sí solos**. El control monetario requiere una regla efectiva de uso antes de llamar a IA, alertas y una respuesta operativa. No deshabilitar facturación ni protecciones como mecanismo ordinario de ahorro. [Gestión del gasto de Firestore](https://cloud.google.com/firestore/pricing#managing-spending).

Quedan fuera de los totales: impuestos, tipo de cambio y recargos de tarjeta, dominio y renovaciones, horas de desarrollo, personal clínico, publicidad, comisiones de pasarela, soporte, conciliación, devoluciones, SMS, videollamadas, archivos o grabaciones, PITR, restores y exportaciones extraordinarias, grandes paneles administrativos y otros proyectos que consuman franquicias compartidas. No se encontró un flujo activo de carga a Storage en el código revisado; eso no demuestra que no haya buckets o contenido facturado en la cuenta.

El gasto de operación no medido de USD 5 es una provisión pequeña para el piloto, no un máximo garantizado. Con datos reales, sustituirla por partidas de red de Functions, Secret Manager, Cloud Logging, Artifact Registry, builds y pruebas remotas. El 30% adicional es una reserva de planificación elegida para estos escenarios y tampoco constituye un techo de factura.
