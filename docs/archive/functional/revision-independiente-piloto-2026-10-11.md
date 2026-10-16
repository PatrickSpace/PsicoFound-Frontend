> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Revisión independiente del cierre del piloto

Fecha: 2026-10-11. Alcance: código de paciente, psicólogo y servicios compartidos del
[plan de cierre](plan-cierre-lanzamiento-sin-administrador.md). La revisión funcional
del administrador sigue excluida. Se revisa el árbol local con cambios sin commit;
no se identifica su contenido con un despliegue existente.

## Resultado

La mayor parte de los pendientes técnicos del plan ya tiene implementación conectada
a los flujos y pruebas. No corresponde volver a pedir que se construyan desde cero.
Se detectó una inconsistencia en la pantalla de pagos al vencer el plazo. Aparte de
esa corrección, permanecen decisiones y verificaciones de operación real; no son
equivalentes a ausencia de código.

## Contraste con el plan

| Frente | Código comprobado | Lo que queda |
| --- | --- | --- |
| Elegibilidad y consentimiento | `accessPolicy.js`, registro/onboarding, `AccountAccessCard.vue` y guardas de encuesta, recomendaciones, cotización y reserva. Edad declarada, correo verificado, documentos vigentes e historial de aceptación | Aprobar alcance/edad y documentos reales, y configurar versiones coherentes. El código bloquea los recorridos afectados cuando falta política |
| Datos y cuenta | Exportación propia con mensajes, consentimientos, seguimiento y datos financieros profesionales; sincronización de correo desde Auth; diagnóstico/autorización/ejecución de eliminación con cursor y mantenimiento | Política de conservación y tratamiento de datos compartidos aprobada; ensayo operativo autorizado. La solicitud del paciente no equivale a borrado completado |
| Encuesta e IA | Turnos, corrección, recarga, reinicio, idempotencia, cuotas y concurrencia transaccionales; contexto reducido, enmascarado de contactos y logs sin cuerpos; ayuda independiente | Aprobación del proveedor y uso, facturación y revisión clínica. No se verificó calidad de respuestas del proveedor real |
| Protección y observabilidad | App Check integrado en cliente y envoltorio de callables; configuración por entorno, correlación, latencia y consumo; archivos de alertas y procedimientos | Comprobar registro/enforcement, IAM, secretos, presupuestos, alertas y responsables en un entorno desplegado |
| Reservas y pagos | Políticas versionadas y snapshot, cotización, corte, vencimiento transaccional, referencia de recibo única, obligación y transferencia separadas | Corregir REV-PIL-01; aprobar políticas y operar conciliación/vencimiento. La expiración es un comando manual, sin scheduler. No es obligatorio automatizarla bajo el alcance acordado |
| Agenda Lima | Política compartida `schedulePolicy.mjs`, filtros y reloj de agenda, conversión preservando instantes, tratamiento explícito de datos ambiguos y aviso de hora Lima | Validación del artefacto desplegado y eventual diagnóstico de registros antiguos reales; no falta implementar nuevamente la política |
| Notificaciones y recorridos | Conteo, lectura, apertura en la misma ruta, recuperación del listener y separación paciente/profesional con pruebas | El canal de recordatorios externos sigue siendo una decisión: los avisos internos no prueban entrega de correo o mensajes |
| Infraestructura | Workflow Ubuntu, aislamiento de red Linux preparado, dependencias auditadas, validador offline, guía de despliegue/rollback y restauración sintética | Ejecutar CI Linux real y aceptación de staging; backup/restore productivo, Google, entrega de correo, Safari/dispositivos físicos no acreditados por emuladores |

## REV-PIL-01 — El paciente todavía puede abrir el pago con el plazo vencido

Prioridad: P1 antes de habilitar cobros reales. Afecta al recorrido del paciente;
no requiere revisar ni rediseñar pantallas administrativas.

- `src/components/Payments/PatientPaymentsCard.vue:55` muestra el enlace externo
  cuando `status === 'pending'`. La acción «Ya realicé el pago» usa la misma condición
  en la línea 67. Ninguna consulta `expiresAt`, ni la tarjeta informa el vencimiento.
- `functions/src/payments/paymentOperationHandlers.js:168` sí rechaza informar el
  pago cuando el plazo terminó. El paso del tiempo no cambia por sí solo `status`:
  `expirePaymentReservation` requiere ejecución por un operador.
- Durante ese intervalo, la pantalla invita a pagar y después el servidor impide
  completar el recorrido normal de aviso. No se probó ni se afirma que un proveedor
  externo haya cobrado: la reproducción utiliza un enlace ficticio que no se abre.

Corrección propuesta: mostrar el plazo real en hora Lima; reevaluarlo mientras la
vista permanezca abierta; retirar/deshabilitar la invitación a pagar al vencer y
ofrecer revisión por soporte si el paciente ya pagó. No marcar una operación como
`expired` únicamente desde el navegador ni alterar los registros financieros desde
el cliente. Mantener el cierre transaccional del servidor y la política capturada.
Cubrir tanto entrada a una reserva ya vencida como vencimiento con la vista abierta,
en escritorio y móvil, y operaciones enviadas/confirmadas según su política.

Reproducido en navegador en escritorio y móvil: reservar mediante los callables
reales del emulador, situar `expiresAt` un minuto en el pasado sin cambiar `pending`,
comprobar el rechazo del servidor y abrir `/sesiones`. En ambos tamaños permanecen
visibles el enlace de pago y el botón habilitado para informarlo. Se conservan
capturas y trazas en `expiry-results/` y reporte en `expiry-report/`. Los dos casos
complementarios pasan porque afirman y documentan la presencia del defecto;
no significan que el recorrido esté corregido.

## Verificación de esta revisión

Resultados ejecutados nuevamente sobre el código local, sin reutilizar los resultados
del informe de implementación:

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| Utilidades | 30/30 | `unit.log` |
| Servidor | 81/81 | `backend.log` |
| Integración completa | 49/49 | `pilot.log` |
| Navegador: política Lima | 32/32, cuatro zonas y escritorio/móvil | `pilot.log`, `lima-report/` |
| Navegador: paciente y profesional | 42/42, escritorio/móvil | `pilot.log`, `followup-report/` |
| Compilación y estilo de servidor | Pasan; aviso de tamaño de chunk | `build.log`, `lint.log` |
| Código/dependencias sin uso | Pasan; cuatro sugerencias de limpieza en configuración general | `knip.log`, `knip-production.log` |
| Auditoría de dependencias | 0 vulnerabilidades reportadas en raíz y Functions | `audit-root.json`, `audit-functions.json` |
| Configuración de ejemplo sin aprobaciones | Rechazo esperado, salida 1 | `config-example.log` |
| Reproducción adicional REV-PIL-01 | Defecto confirmado en escritorio y móvil | `expiry.log`, `expiry-report/`, `expiry-results/` |

La suite existente pasa; eso no cubre automáticamente todos los casos de uso.
La reproducción complementaria de REV-PIL-01 se registra por separado.

Evidencias: `test-results/independent-pilot-review-2026-10-11/` (ignoradas por Git).
El directorio conserva logs, auditorías, un manifiesto de hashes del código y el
caso complementario. Las pruebas usan emuladores propios de un proyecto `demo-`,
datos ficticios y red externa bloqueada. No se contacta a proveedores ni se envía
correo real. Los hashes de los archivos de código revisados no cambiaron durante
la ejecución. No se modificó la aplicación para efectuar esta revisión.

## Pendientes que no deben confundirse con desarrollo ausente

1. Aprobar y cargar políticas de elegibilidad, documentos legales, retención,
   proveedor/uso de IA, revisión clínica, condiciones comerciales y límites.
   Los ejemplos y fixtures no son aprobaciones.
2. Ejecutar el workflow Linux y comprobar staging con el procedimiento de
   [operación](../../operations/pilot-release.md): Auth/Google/correo, App Check,
   IAM/secretos, índices/reglas, alertas, facturación y restauración real.
3. Asignar responsables para vencimientos, conciliación, solicitudes de privacidad
   e incidentes. Definir si el piloto ofrecerá recordatorios externos; si se eligen,
   ese canal requiere implementación y prueba propias.
4. Revisar reservas antiguas sin snapshot antes de aplicarles las nuevas políticas.
   No se migraron datos reales en esta revisión.
5. Medir carga en dispositivos: el build pasa, pero conserva un chunk principal
   aproximado de 1,25 MB minificado / 388 kB gzip. Es una mejora de rendimiento
   pendiente, no una prueba de que la app no funcione.

La ausencia de evidencia aquí no demuestra que nadie haya configurado un servicio
externo: no se consultaron consolas ni se ejecutó una prueba en staging. Tampoco se
certifica el rol administrador. El resultado local no equivale a autorización de
lanzamiento.
