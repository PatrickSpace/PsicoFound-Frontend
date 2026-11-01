# Control de consumo de IA de admisión

Implementación de la auditoría del 2026-10-30. Alcance: `functions/src/ai/**`,
`functions/src/chat/**` y pruebas locales. Sin inferencias reales ni despliegues.
Base verificada: commit `48967838c3762be13e0dbdaa92d8d2ab0fc2fd9c`.

## Archivos modificados

- Control nuevo: `admissionPolicy.js`, `admissionControl.js`, `usage.js`.
- Contexto: `profileContext.js`, `profilePrompt.js`, `../chat/history.js`.
- Proveedor y telemetría: `providers/OpenAIProvider.js`, `AIService.js`,
  `errors.js`, `types.js`, `types.d.ts`.
- Orquestación: `../chat/surveyService.js`, `../chat/profileChatHandlers.js`.
- Pruebas: `admissionControl.test.js`, `AIService.test.js`,
  `providers/OpenAIProvider.test.js`, `../chat/history.test.js`,
  `../chat/surveyService.test.js`.
- Herramientas y resultado sintético: `../chat/testing/memoryFirestore.js`,
  `../chat/testing/compareHistory.js`, `../chat/testing/compareTokens.py`,
  `../chat/testing/history-comparison.json` y este documento.

## Comportamiento

- La encuesta sigue siendo híbrida. Un chip validado se interpreta usando su
  valor canónico, incluso si el texto enviado no coincide. Nunca deriva al proveedor.
  El texto libre puede usar una inferencia. El matching sigue siendo determinístico.
- La pregunta pendiente la decide el servidor. Perfil completo -> resumen,
  confirmación existente -> recomendaciones y agenda. Un mensaje posterior a
  completar el perfil recuerda el resumen; las correcciones siguen disponibles.
- Si se agota la IA, falta configuración, falla el control o hay concurrencia
  ocupada, el texto libre recibe una continuación guiada con los mismos campos del
  contrato anterior. No se inventan preferencias ni se pierde una confirmación
  de sobrescritura pendiente.
- `aiAvailability: {mode: "guided" | "hybrid", reason?: string}` es opcional y
  aditivo. Describe este envío, no garantiza cupo para el siguiente. El frontend
  actual puede ignorarlo: ya recibe `reply`, `suggestedOptions`, `activeTurn`,
  `summaryRequired` y `readyForRecommendations`. Integración opcional pendiente:
  mostrar un aviso de continuación guiada usando este campo.
- El fallo del proveedor conserva el contrato de error previo (`unavailable`,
  `historyPersisted: true`) y guarda un par usuario/asistente con las opciones
  actuales. Repetir ese `requestId` no vuelve a llamar al proveedor. Un envío
  guiado nuevo permite seguir.
- Las señales literales de riesgo se tratan localmente, incluso sin presupuesto
  o políticas de IA. Las señales contextuales siguen funcionando cuando hay
  inferencia. El recordatorio de ayuda persiste y su estado mínimo llega al prompt.
  No se envían a IA los intercambios que mostraron ayuda ni los fallbacks técnicos.
  Sin IA no existe clasificación semántica contextual: no afirmar cobertura clínica
  completa. Los recursos de ayuda existentes siguen accesibles y no consumen cuota.
- La referencia de **2–4 inferencias promedio por participante** es una hipótesis
  económica para contrastar con datos, no un nuevo límite clínico o comercial.

## Configuración explícita

Se conserva `CHAT_LIMITS_JSON`:

```json
{"version":"admission-v1","requestsPerDay":30,"globalConcurrency":2}
```

`requestsPerDay` cuenta **todos los envíos nuevos** en días UTC, incluidos chips
(y consume un turno aunque falle el proveedor). Al alcanzarlo, el texto libre
pasa a guiado. Chips y ayuda literal están exceptuados del bloqueo para poder
terminar la admisión: el contador puede superar ese umbral. Esto es un límite de
conversación libre, no un corte de agenda ni un contador de inferencias.
`globalConcurrency` ahora limita inferencias, no respuestas guiadas. Se mantiene
la exclusión de envíos simultáneos de una misma cuenta.

Nueva `AI_ADMISSION_LIMITS_JSON`. Este ejemplo **deshabilita** nuevas inferencias
al iniciar un período sin ledger; los ceros son deliberados y no un presupuesto
recomendado. Los responsables deben sustituirlos por sus decisiones:

```json
{
  "version": "admission-v1",
  "periodId": "2026-11",
  "startsAt": "2026-11-01T00:00:00-05:00",
  "endsAt": "2026-12-01T00:00:00-05:00",
  "accountInferenceLimit": 0,
  "budgetNanoUsd": 0,
  "pricingVersion": "openai-standard-2026-10-31"
}
```

- `accountInferenceLimit`: asignación gratuita acumulada por cuenta, persistente
  entre días, períodos y reinicios de encuesta. Es conservadora: cada reserva
  cuenta, incluso si falla el proveedor o se pierde la confirmación. No implica
  acceso ilimitado para cuentas que pagaron; no se inventó un beneficio pospago.
  No incluye automáticamente inferencias anteriores a esta implementación.
- `sessionInferenceLimit`: entero opcional >= 0. Omitirlo no añade límite por
  sesión. Reiniciar la encuesta nunca repone la asignación de cuenta.
- `budgetNanoUsd`: entero >= 0 en nano-USD; USD 1 = 1.000.000.000 nano-USD.
  Es el presupuesto inicial del período. No se usan números monetarios flotantes.
- Período `[startsAt, endsAt)`: fechas explícitas con zona horaria. El ejemplo usa
  Lima. El cambio de período es explícito; no hay un cron ni renovación automática.
  Usar períodos sin superposición y no cambiar su identificador para reponer saldo.
- Se mantienen `AI_USE_APPROVAL_JSON`, `SURVEY_INPUT_MODE` y las comprobaciones
  existentes de proveedor, acceso y consentimiento. El emulador sigue impidiendo
  llamadas al proveedor real. No se alteraron secretos.

El primer permiso inicializa `ai_usage_periods/{periodId}.budgetNanoUsd`.
**A partir de entonces ese campo compartido es la autoridad**, leído dentro de
cada transacción. Bajar solo la variable de entorno no cambia un período ya
inicializado. El responsable puede bajar el campo compartido, incluso a cero,
mediante una operación administrativa autorizada, conservando los acumulados.
También puede precrear ese campo antes de habilitar el período. Si se reduce por
debajo del gasto o reservas existentes, no se permite otra inferencia. No borra
las operaciones ya iniciadas. Subirlo exige una decisión explícita del responsable.

El responsable debe definir: presupuesto de captación, ventana y zona horaria,
asignación por cuenta y eventualmente por sesión, revisión de tarifas, alertas,
retención y reconciliación de reservas inciertas. No hay monto definitivo elegido
por el código. Configuración ausente, inválida o fuera de período -> guiado.
Las fechas y versión de precios del ledger son inmutables durante el período;
una discrepancia cierra el acceso a IA.

## Reservas, fallos y concurrencia

Antes de llamar a OpenAI, una transacción comprueba operación/lease/pregunta/sesión,
asignación de cuenta y sesión, presupuesto del período y concurrencia global.
En esa misma transacción crea la operación financiera, aumenta la asignación y
reserva dinero. Dos cuentas no pueden gastar la misma última reserva. El callback
transaccional nunca llama al proveedor.

La reserva valora todo el contexto al mayor precio de entrada, suma el máximo de
700 tokens de salida y no anticipa descuentos. La asignación conservadora de
entrada usa bytes UTF-8 de mensajes/esquema serializados más 1.024 unidades de
framing. **No es un conteo de tokens ni una equivalencia caracteres/tokens**.
Sirve de margen previo: tokens reales y costo estimado provienen de `usage`.
Se rechazan contextos cuya asignación exceda 272.000 para evitar usar la tarifa
corta con un contexto largo.

Resultados con uso conocido, incluido JSON inválido/truncado/vacío, liquidan una
sola vez la reserva contra el costo estimado y suman los tokens al período. Un
reset o corrección que descarte una respuesta tardía no borra su consumo.
Uso desconocido -> `unconfirmed`, conserva toda la reserva; un crash deja
`reserved`, también conservado. No se libera dinero por caducidad de un lease.
Si falla la escritura de liquidación, se mantiene la reserva y se registra un
aviso sin datos clínicos. La respuesta puede completarse y su replay no infiere.

Los leases de concurrencia duran 90 s y expiran para recuperar capacidad. No son
reservas financieras. El timeout de OpenAI es como máximo **25 s**, incluye la
lectura del cuerpo, aborta la petición y no reintenta. El envío deja 15 s de su
ventana de 60 s para persistencia: usa como máximo lo restante de 45 s desde el
inicio del servicio; si ya venció, no despacha. El wrapper y el acceso previo
pueden añadir latencia y Firestore no tiene garantía de completar en ese margen.
No se modificó `functions/index.js` (timeout de la Function: 60 s).

La operación idempotente original no se repite aunque su lease expire. La reserva
financiera tiene otra clave estable y tampoco se recrea. Las claves deben
conservarse durante toda la ventana de posibles reintentos: no añadir TTL corto.
Un timeout no demuestra que el proveedor canceló el cómputo remoto. No hay retry
HTTP automático ni proveedor de respaldo en el recorrido de encuesta.

### Sobreconsumo residual

Este es un control de **presupuesto estimado**, no un interruptor de facturación
con garantía absoluta. Puede haber diferencia si la representación interna
supera la asignación conservadora, cambian las tarifas/modelo/tier, faltan datos
de caché, o el proveedor cobra una petición sin devolver uso. Las operaciones ya
despachadas continúan si se baja el presupuesto. Un timeout puede seguir
consumiendo remotamente; una petición alrededor del cierre puede facturarse en
otro período del proveedor. Las llamadas de otros servicios/claves quedan fuera
de este ledger. Varias cuentas pueden consumir asignaciones distintas, pero
comparten el presupuesto global del período.

`reservationExceeded` y el aviso correspondiente detectan costos conocidos por
encima de la reserva. Los siguientes permisos usan el gasto actualizado. Mantener
reservas desconocidas reduce exposición, a costa de poder cerrar el cupo antes
de tiempo. Reconciliar con el consumo/factura del proveedor antes de ajustar una
reserva incierta; no borrarla ni reintentar su inferencia para averiguar el costo.

## Datos y medición

Tarifas consultadas el **2026-10-31**, [modelo oficial GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna):
Standard, contexto corto: USD 0,10 entrada, 0,01 entrada cacheada, 0,125 escritura
de caché y 0,50 salida por millón de tokens. Se fija `service_tier: "default"`,
`store: false`, `reasoning.effort: "none"` y el máximo de **700**, no 200.

La [documentación oficial de prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
describe `cached_tokens` y `cache_write_tokens`. Se descuentan ambas clases de la
entrada ordinaria y se aplican sus tarifas; los tokens de razonamiento ya están
incluidos en salida y no se cobran dos veces. Si faltan entrada o salida, costo
`unknown`; si faltan detalles de caché, se valora como entrada ordinaria, con esa
incertidumbre pendiente de conciliación. No se presupone ahorro de caché. La tabla de tarifas tiene versión;
actualizarla y la configuración tras verificar nuevos precios o modalidades.

Datos nuevos, accesibles solo desde servidor con las reglas actuales de denegación
por defecto (sin cambios de reglas ni índices):

- `ai_usage_operations/{sha256(uid:requestId)}`: cuenta seudónima, período,
  reserva, tarifa/versionado, estado, resultado técnico, tokens, costo estimado y
  posible exceso. Nunca mensaje, respuesta, preferencias o clasificación de riesgo.
- `ai_usage_accounts/{sha256(uid)}`: contador acumulado y contador/clave seudónima
  de sesión. Evita reponer la asignación al reiniciar.
- `ai_usage_periods/{periodId}`: presupuesto, reserva pendiente, gasto conocido,
  cantidad de reservas y tokens acumulados. `inferenceCount` cuenta reservas,
  no garantiza que se despacharon ni que fueron exitosas.
- Log `survey admission operation`: claves seudónimas de cuenta/sesión/operación,
  día UTC, ruta técnica (IA/guiado), resultado y motivo técnico de degradación.
  Incluye participantes sin IA y sin pago. No incluye señales clínicas.
  Los replays completados no emiten otro evento. Ante caída antes del log,
  contrastar con operaciones financieras para no perder consumo.
- `AIService` amplía los logs existentes con tokens cacheados/escritos,
  razonamiento y costo estimado, también en fallos con uso conocido.

Los identificadores hash son seudónimos, no datos anónimos. El ledger no duplica
el historial clínico. Los documentos originales de conversación y eventos de
ayuda mantienen su función anterior. Los estados de IA incierta deben mostrarse
separados del gasto conocido; `spent + reserved` es exposición conservadora,
no gasto efectivamente facturado.

Integración pendiente con los otros chats (fuera de este alcance): atribución de
primer pago **confirmado/conciliado**, reembolsos, panel/reportes/alertas y política
de retención/borrado de estos identificadores y operaciones. No se tocaron ciclo
de cuentas, pagos ni frontend. Aplicar la misma ventana de atribución a todas las
cohortes. No usar reservas o pagos declarados como clientes pagadores.

```text
participantes = cuentas únicas de admisión en el período (incluye guiados)
costo por participante = costo de TODAS las inferencias de la cohorte / participantes
costo por primer pagador = ese MISMO costo total / primeros pagadores confirmados
inferencias promedio = despachos IA / participantes, incluidos los de cero IA
```

La clave `sha256(uid)` permite una unión de servidor con pagos sin transportar
texto clínico. Deduplicar por operación. Si no hay pagadores, costo unitario
indefinido, nunca cero. Reconciliar datos tardíos y costos desconocidos; retener
el gasto de quienes abandonan. No es CAC completo ni margen de la plataforma.

## Historial: antes y después

Se leen hasta **8 documentos**, en lugar de 60, sin expandir consultas para llenar
huecos. Se conservan hasta **4 intercambios completos** en orden cronológico, de
la sesión activa. Pueden ser menos por pares incompletos, inicio, ayuda o fallbacks.
Las preferencias relevantes siguen presentes en el perfil estructurado; la
pregunta y confirmación pendientes se envían explícitamente. El guard de 12.000
caracteres selecciona pares recientes completos, nunca fragmentos. No se hace un
segundo corte de texto que quite la respuesta de un intercambio.

La ventana de cuatro permite contextualizar respuestas breves entre los pocos
campos de admisión, conservados además en el perfil; no pretende sostener terapia
ni referencias arbitrarias a todo el pasado. Una preferencia antigua no extraída
que ya salió de la ventana requerirá aclaración/corrección. Validar referencias
ambiguas y calidad del recorrido con datos autorizados antes de atribuir ahorros
reales o cobertura clínica a esta ventana.

Comparación reproducible con texto **sintético**, no conversaciones reales:

| Intercambios previos | Documentos antes -> después | Proxy tokens de contenido o200k_base antes -> después |
| ---: | ---: | ---: |
| 0 | 0 -> 0 | 564 -> 608 |
| 2 | 4 -> 4 | 776 -> 814 |
| 4 | 8 -> 8 | 992 -> 1.020 |
| 15 | 30 -> 8 | 2.180 -> 1.020 |
| 30 | 60 -> 8 | 2.180 -> 1.020 |

`tiktoken 0.14.0` no tiene mapping para `gpt-6-luna`: no se sustituyó su encoding
silenciosamente. Son proxies BPE identificados, excluyen framing/esquema y no
son tokens facturados de Luna. La segunda comparación `cl100k_base` pasa de
2.667 a 1.237 en el escenario largo. Resultado completo en
`../chat/testing/history-comparison.json`. No se convirtieron caracteres en tokens.

La reducción máxima de documentos de historial es **86,7%** (60 -> 8). El proxy
largo baja aproximadamente **53%** de contenido total. Los recorridos cortos
pueden subir ligeramente por el contexto explícito de pregunta/ayuda. No prometer
ese ahorro por participante ni extrapolarlo a tokens reales de producción.

Los controles añaden operaciones de Firestore: camino normal, sin wrappers,
reintentos ni eventos condicionales, guiado = **7 lecturas / 9 escrituras**;
IA liquidada = **16 lecturas / 16 escrituras + historial**. El camino anterior
normal era 9 lecturas / 11 escrituras + historial. Así, un camino IA con 60 docs
pasa de 69 a 24 lecturas, pero con 4 docs pasa de 13 a 20. Las escrituras IA
suben en cinco. No se presenta la reserva presupuestaria como ahorro universal
de backend; su fin principal es controlar gasto.

## Proyección económica, no ahorro observado

Manteniendo el supuesto base de la auditoría (4 inferencias x 2.500/250 tokens)
y sin caché: USD **0,0015 por participante**. Para 10.000 visitantes, 30% de
participación y 2% de primer pago: 3.000 participantes, 200 pagadores,
USD **4,50/mes** y **0,0225 por pagador**, incluido el consumo de abandonos.

Si mediciones posteriores validan 1.500/200 tokens promedio:

| Promedio inferencias/participante | IA mensual | USD/participante | USD/pagador | Reducción frente al supuesto base |
| ---: | ---: | ---: | ---: | ---: |
| 2 | 1,50 | 0,00050 | 0,00750 | 66,7% |
| 3 | 2,25 | 0,00075 | 0,01125 | 50,0% |
| 4 | 3,00 | 0,00100 | 0,01500 | 33,3% |

El cambio no garantiza esas medias. Sin bajar tokens ni inferencias no hay ese
ahorro. No incluye nuevos costos del ledger, caché escrita, errores, red,
impuestos, captación o soporte. Se preserva 700 como máximo estructurado; 200
es solo el supuesto de promedio. Los registros de uso permitirán sustituir estas
hipótesis. Costo unitario por pagador puede subir si baja la conversión.

## Pruebas y reproducción

Desde la raíz del repositorio:

```bash
node --test 'functions/src/ai/**/*.test.js' 'functions/src/chat/*.test.js'
./functions/node_modules/.bin/eslint functions/src/ai functions/src/chat
node functions/src/chat/testing/compareHistory.js | /ruta/venv/bin/python3 functions/src/chat/testing/compareTokens.py
```

El último comando requiere `tiktoken==0.14.0` en un entorno desechable; no se añadió
una dependencia de producción. No llama a OpenAI. La primera descarga de datos de
un encoding puede requerir acceso al catálogo público del tokenizador.

Las pruebas de Firestore usan un mock aislado con commits serializados, rollback,
lecturas antes de escrituras y replay de callbacks; los tests del proveedor
reemplazan `fetch`. Cubren última asignación global concurrente, concurrencia IA,
cuotas de cuenta/sesión, presupuesto cero/ausente/caducado, cambio de presupuesto
compartido, idempotencia concurrente y posterior, fallo de proveedor, JSON
inválido con uso, timeout/cuerpo bloqueado, crash/reserva incierta, fallo de
liquidación, lease expirado, respuesta tardía tras reset, ayuda y recorrido
completo guiado con confirmación del resumen existente. No se probaron carga real,
contención del documento global o índices con un emulador.

El harness HTTP antiguo `tests/pilot-survey.integration.test.mjs` queda pendiente
para su responsable: debe inyectar la nueva política/control sintéticos y esperar
continuación guiada en lugar de rechazos de cuota/concurrencia global; no habilitar
un proveedor real en el emulador. No se modificaron pruebas fuera de estos módulos.

Validación final de esta implementación: **159 pruebas de Functions pasaron**
(incluidas 54 de IA/chat), ESLint de ambos módulos y `git diff --check` sin errores.
Los tests HTTP antiguos no se ejecutaron. Los cambios ajenos observados en
frontend, matching, cuentas, configuración e índices se conservaron.


## Límites aprobados el 31/10/2026 para esta entrega

El usuario autorizó USD 50 por mes, 20 inferencias por encuesta y hasta diez
encuestas por cuenta. Se configura `accountInferenceLimit: 200`,
`sessionInferenceLimit: 20`, `budgetNanoUsd: 50000000000` y
`periodMode: "calendar_month_lima"`. Este modo deriva un ledger distinto por
mes calendario de Lima y renueva la asignación mensual al cambiar de mes,
sin scheduler ni cambio de facturación del proveedor. El cap monetario usa la
estimación de tarifas del código; no es un límite de Cloud Billing ni del proveedor.
Los presupuestos de ledgers ya inicializados siguen siendo autoritativos.

`surveyAttempts.js` aplica diez intentos totales por cuenta dentro de las mismas
transacciones de inicio, reinicio y creación implícita de sesión. Reabrir una
sesión o repetir el mismo reinicio idempotente no consume otro intento. Dos
reinicios simultáneos en el límite no crean dos encuestas. Las preferencias, el
resumen, matching y reservas siguen disponibles sobre la última encuesta.
Los contadores no se reinician al cambiar de mes. Una sesión heredada sin
contador se reconoce como el primer intento; no se inventa un historial de
inferencias o reinicios anteriores que no puede acreditarse.

La autorización del usuario amplía la coordinación inicial de archivos de IA/chat
únicamente para aplicar estos límites y las correcciones necesarias para publicar.
