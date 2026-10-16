> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Correcciones de paciente y psicólogo — revisión iniciada el 2026-10-11

Actualización de cierre: 2026-10-12, America/Lima.

Objetivo: cerrar las correcciones técnicas pendientes, validarlas funcionalmente e
identificar las decisiones/verificaciones externas para preparar el piloto. No autoriza
lanzamiento. Administrador fuera de alcance. Se conserva el trabajo previo sin commit,
con línea base de hashes en `test-results/pilot-fixes-2026-10-11/baseline.json`.

Referencia: [revisión independiente](revision-independiente-piloto-2026-10-11.md),
[plan principal](plan-cierre-lanzamiento-sin-administrador.md) y
[matriz](../../functional/matriz-cierre-piloto.md). No se reconstruyeron elegibilidad, consentimiento,
exportación, eliminación, IA, App Check, políticas comerciales ni agenda Lima.

## Implementado y verificado localmente

**REV-PIL-01 cerrado técnicamente y verificado localmente**, incluidas capturas de escritorio/móvil y ajuste del botón sin recorte.

La tarjeta de pagos presenta `expiresAt` en hora de Lima, Perú. Una operación pendiente
solo invita a pagar/informar dentro de ese plazo. Al terminar, retira ambas acciones
sin necesidad de recarga y distingue «Plazo de pago terminado» del estado financiero
`pending`. También actualiza al volver a la pestaña y comprueba el instante al pulsar
el enlace. Fechas ausentes o inválidas requieren revisión, sin invitación a pagar.

«Ya pagué: solicitar revisión» abre el soporte existente con la operación identificada.
El servidor valida propiedad y obtiene su referencia del registro; guarda una solicitud
idempotente sin modificar pago, cita, bloque ni snapshot. Los intentos de vincular una
operación ajena/inexistente se rechazan. Cambiar de cuenta limpia el contexto del pago y
el borrador de soporte; las respuestas/listeners tardíos se descartan.

Operaciones enviadas muestran la regla capturada de `submittedExpiration`; no se convierten
en vencidas por el reloj del cliente. Confirmadas, canceladas, rechazadas, vencidas y en
devolución conservan el estado recibido. No se aplica retroactivamente configuración
comercial actual. El servidor sigue rechazando avisos vencidos y ahora rechaza fechas
malformadas mediante `failed-precondition`, sin un fallo de tipo interno.

### Evidencia ejecutada sobre estos cambios

Directorio: `test-results/pilot-fixes-2026-10-11/` (ignorado por Git).
Los resultados de la revisión independiente son referencia histórica; esta tabla
corresponde a ejecuciones nuevas. Emuladores propios, proyecto demo, datos sintéticos
y bloqueo de red externa a nivel del sistema operativo. Ningún enlace de pago se abrió.

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Utilidades | 32/32 | `unit.log` |
| Servidor | 81/81 | `backend.log` |
| Integración completa | 50/50 | `pilot.log` |
| Navegador Lima | 32/32 | `pilot.log` |
| Navegador paciente/profesional | 52/52, incluye 10 casos nuevos de pagos | `pilot.log` |
| Repetición dirigida tras ajuste de texto del botón móvil | 10/10 | `payment-browser-final.log` |
| Lint / build | Pasan; conserva aviso de chunk principal | `lint.log`, `build.log` |
| Knip general / producción | Pasan; hints existentes | `knip.log`, `knip-production.log` |
| Auditorías raíz / Functions | 0 vulnerabilidades reportadas en ambos paquetes | `audit-root.json`, `audit-functions.json` |
| Configuración de ejemplo | Rechazo esperado, exit 1 | `config-example.json` |
| Coherencia de fuentes/configuración | Pasa, sin consultar consola | `config-source-check.json` |
| Archivos locales de configuración conocidos | No contienen la configuración legal/App Check/políticas requerida | `local-config-presence.json`, solo presencia de claves, sin valores |
| Disponibilidad Linux | No hay runtime Linux local; sintaxis de runners comprobada | `linux-availability.json` |

Pruebas nuevas mantenibles: `tests/unit/paymentDeadline.test.mjs`, caso REV-PIL-01 en
`tests/pilot-payments.integration.test.mjs`, y `tests/browser/payment-deadline.spec.mjs`.
Esta última cubre entrada vencida/soporte persistido, vencimiento con vista montada y
zona del dispositivo Tokio, fechas ausentes/malformadas, estados/políticas capturadas
y cambio de cuenta con borrador abierto, en escritorio y móvil. Los casos originales
que afirmaban la presencia del defecto se conservaron como reproducción histórica;
no cuentan como aceptación de la corrección.

Reproducción: `npm test`, `npm run test:backend`, `npm run lint:backend`, `npm run build`,
ambos modos de `npm run audit:unused`, auditorías de raíz/Functions y `npm run test:pilot`.
`npm run test:payment-deadline` repite solo los 10 casos nuevos de navegador con el
mismo aislamiento, emuladores propios y políticas sintéticas. La suite completa aprobó
84 casos de navegador antes del ajuste visual; los 10 afectados se repitieron después.
La inspección visual detectó
texto recortado en el botón móvil; se añadió ajuste de línea y una aserción de desborde.
Requiere Node 22, Java 21, Firebase CLI 15.15.0 y dependencias/Firestore/Chromium descargados
antes de aislar. El runner falla si los puertos ya están ocupados; no reutiliza emuladores.

## Clasificación de los demás pendientes

| Punto | Estado | Evidencia / límite |
| --- | --- | --- |
| Cuenta, consentimiento y privacidad | Implementado; verificado localmente | Regresión de cuentas y reglas; políticas reales todavía requieren aprobación |
| Encuesta, controles IA y ayuda | Implementado; verificado localmente | Regresión simulada, sin proveedor real ni validación clínica |
| Reserva/conciliación y política Lima | Implementado; integración verificada localmente | Política/snapshot existentes conservados; regresión de navegador aprobada |
| Frontend/Functions/reglas/índices | Coherencia verificada localmente | Región `southamerica-east1`; mismo source/rules/indexes en configuración de despliegue y emulador; índices de pagos/soporte/avisos/mensajes declarados |
| Configuración real y artefacto desplegado | Pendiente externo | Ejemplo sin aprobaciones rechazado; no hay comprobación de consola/staging |
| CI Linux | Implementado; ejecución pendiente externa | Host macOS; sin Docker, Podman, Colima, Lima ni QEMU disponibles. No se hizo push ni ejecución remota |
| Despliegue/rollback/incidentes | Procedimiento implementado; ejecución externa pendiente | Guía coordinada revisada; mantenimiento y drenado; destinos y artefactos explícitos |
| Restauración | Ensayo sintético verificado localmente | Regresión de restauración incluida; Auth/Storage/IAM/cifrado/backup real no acreditados |
| Rendimiento de carga real | Pendiente de medición | Build pasa con chunk principal ≈1,25 MB minificado / 388 kB gzip; no se atribuye mejora de rendimiento a esta corrección |

Nada se clasifica como «verificado en staging»: no se accedió a un entorno desplegado.
La inspección acotada de `.env`, variantes local/production y `functions/.env[.local]`
no encontró claves legales/App Check/políticas pobladas; no se imprimieron valores ni
se examinaron secretos de consola. Esto no determina la configuración de un despliegue
externo ni de variables inyectadas por otro pipeline. El build no autoriza habilitar flujos.
El frontend no modifica registros financieros directamente. Las reglas mantienen las
escrituras de pagos/soporte reservadas al servidor y los permisos por titular/rol.
Los índices del emulador no prueban que la versión desplegada esté READY.

## Decisiones y verificaciones externas necesarias

Responsables por asignar. El [procedimiento de staging](../../operations/pilot-release.md)
y la [guía comercial](../../operations/pilot-payments.md) incluyen acceso, pasos y resultado
esperado; la ausencia de evidencia no afirma que nadie haya configurado esos servicios.

- **Linux:** acceso a un runner Ubuntu 22.04 autorizado, Node 22/Java 21 y sudo para crear
  namespace de red. Ejecutar workflow sobre el artefacto revisado y conservar resultado.
  Debe pasar sin red externa y con sandbox Chromium; no retirar aislamiento para aprobarlo.
- **Políticas:** aprobar alcance/edad (18+ sigue siendo propuesta), documentos/versiones,
  retención compartida, proveedor/uso y revisión clínica, condiciones comerciales y cuotas.
  Configuración sintética no equivale a aprobación.
- **Consola y staging:** comprobar Auth/Google/entrega de correo, App Check, IAM/secretos,
  reglas/índices/Functions, facturación, alertas, backup y restauración real con cuentas y
  datos autorizados; registrar resultados y responsable. Safari/dispositivos físicos pendientes.
- **Destino de publicación:** el repositorio fija Hosting `luremsapp`. Preparar y revisar
  el sitio/target de staging explícito antes de publicar; `--project` no sustituye ese sitio.
  Conservar frontend, Functions, reglas, índices y snapshots compatibles durante rollback.
- **Operación manual:** asignar conciliador/suplente y frecuencia de la cola de vencimientos,
  revisión de soporte/privacidad e incidentes. No existe scheduler ni promesa de atención
  inmediata. Definir recordatorios externos si se quieren: hoy solo se acreditan avisos internos.
- **Datos antiguos:** revisar reservas sin snapshot o fecha válida bajo decisión autorizada.
  No asignar condiciones actuales ni migrar registros reales automáticamente.

## Dependencias para la futura revisión del administrador

No se construyeron ni revisaron pantallas administrativas. Los fixtures de operador solo
validan servicios y permisos. La revisión posterior recibirá la cola manual de vencimientos,
conciliación y soporte vinculado (`paymentOperationId`, referencia verificada), además de
las obligaciones/transferencias y solicitudes de privacidad ya implementadas. Esa revisión
sigue separada y no está certificada por estas pruebas de paciente y psicólogo.
