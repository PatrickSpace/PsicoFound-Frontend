> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Plan de cierre previo al lanzamiento, sin revisión del administrador

Fecha: 2026-10-08, America/Lima. Estado: plan propuesto para implementación.

## Objetivo y alcance

Cerrar los pendientes técnicos de paciente, psicólogo y servicios compartidos
necesarios para preparar un piloto, dejando verificables las dependencias de
privacidad, proveedor de IA, revisión clínica y operación real. Este plan no
autoriza el lanzamiento ni sustituye la revisión del administrador, que se hará
al final por decisión del usuario.

La política de hora Lima tiene su propio encargo. Es una dependencia de aceptación:
comprobar su integración y sus regresiones, sin duplicar ni sobrescribir ese trabajo.
El código de encuesta también tiene un plan en curso; inspeccionar su estado antes
de modificar los mismos archivos.

No se requieren pasarela automática, multipaís, aplicación nativa ni un panel
administrativo nuevo. La conciliación y determinadas operaciones pueden ser
manuales, con autorización, responsable, evidencia y trazabilidad.

## Estados de cierre

- **Implementado:** existe código/documentación; todavía no demuestra funcionamiento.
- **Verificado localmente:** pruebas ejecutadas sobre emuladores y datos sintéticos.
- **Verificado en staging:** comprobación contra un entorno expresamente autorizado.
- **Pendiente externo:** requiere decisión de producto, aprobación especializada,
  credenciales, configuración operativa o comprobación que aún no ocurrió.

No declarar listo para lanzar un punto únicamente por estar implementado. Cada
pendiente externo debe indicar responsable por asignar, decisión/evidencia requerida
y recorrido afectado. No inventar nombres de responsables ni aprobaciones.

## Fases y aceptación

| Fase | Trabajo | Evidencia de cierre |
| --- | --- | --- |
| 0. Línea base | Inspeccionar instrucciones, cambios sin commit, cierre de pacientes, estado de hora Lima y encuesta; inventariar dependencias/configuración faltante | Matriz de requisitos y pruebas; no duplicar hallazgos ya resueltos |
| 1. Cuenta, consentimiento y privacidad | Elegibilidad configurable y aplicada en servidor, consentimiento versionado, exportación completa, cambio de correo, retención y eliminación por política | Casos elegibles/no elegibles, acceso directo denegado, datos propios sin terceros, ausencia de borrados fuera de política |
| 2. Encuesta, proveedor y ayuda | Contrato de alcance de IA, minimización, recuperación de fallos, pruebas de situaciones de riesgo y ayuda independiente del proveedor | Pruebas técnicas y protocolo preparado para revisión; aprobación clínica/proveedor registrada aparte |
| 3. Abuso, costos y observabilidad | Cuotas distribuidas, concurrencia e idempotencia, App Check, errores/alertas y métricas sin contenido sensible | Límites y carreras probados; configuración real pendiente explícita cuando no se pueda comprobar |
| 4. Operación comercial mínima | Políticas configurables, vencimiento de reservas, cancelaciones, devolución y registro de obligaciones al profesional; conciliación manual | Citas, bloques, importes y estados coherentes; ningún estado equivale falsamente a dinero transferido |
| 5. Preparación operativa y CI | Suite automatizada compatible con CI, auditoría de dependencias, configuración por entorno, despliegue coordinado/rollback, respaldo y restauración | Checks ejecutados y runbooks ensayados con datos sintéticos; controles de consola no verificados identificados |
| 6. Aceptación final no administrativa | Recorridos paciente/psicólogo, Google/correo, encuesta, notificaciones, reservas/pagos manuales y soporte en escritorio/móvil | Matriz con aprobado/fallido/no ejecutado, evidencias y lista de dependencias para la futura revisión del administrador |

Las fases 2 y 3 deben estar listas antes de cualquier prueba autorizada contra IA
real. La fase 4 puede avanzar con proveedores simulados mientras se resuelven las
decisiones comerciales. La fase 6 depende también del cierre de hora Lima.

## Requisitos concretos

### 1. Cuenta y privacidad

- Definir la elegibilidad del piloto. **Propuesta a aprobar: solo mayores de 18.**
  No asumir que esa definición ya fue aceptada. Implementar una política explícita,
  probarla con configuración sintética y evitar habilitar el flujo público de IA
  cuando falte una política válida.
- Aplicar las condiciones en Functions además de la UI: autenticación, requisitos
  de verificación y consentimiento aplicables, edad y estado permitido. Una llamada
  directa no debe saltar el onboarding. Revisar también cuentas existentes y cambios
  de fecha de nacimiento, sin confundir edad declarada con verificación documental.
- La aceptación debe registrar versión, fecha y documentos; definir qué cambios
  requieren aceptación nueva. No inventar documentos aprobados ni configurar
  enlaces de prueba como legales de producción.
- Inventariar Auth, perfiles, conversaciones, subcolecciones, seguimiento, pagos,
  soporte y archivos. Verificar que exportación y política de retención los cubran.
- Preparar ejecución autorizada, idempotente y trazable de eliminación/anonimización,
  con diagnóstico previo y política versionada. Ensayarla solo en datos sintéticos.
  Con política ausente, conservar el estado pendiente y explicar el límite.
  No elegir plazos arbitrarios ni borrar expedientes compartidos por conveniencia.
- Verificar recuperación y cambio de correo completo, reautenticación y coherencia
  de los datos usados por la app después de confirmar el nuevo correo.

### 2. IA y situaciones de riesgo

- Consultar las condiciones oficiales vigentes del proveedor para el caso de uso,
  registrar fecha/fuente y separar esa lectura de la aprobación del responsable.
  No inferir facturación, tratamiento de datos o permisos por usar Firebase.
- Mantener la encuesta dentro de su alcance declarado; no introducir diagnóstico,
  consejo terapéutico ni promesas de monitoreo o respuesta humana inmediata.
- Minimizar contexto enviado, separar datos administrativos y evitar texto sensible
  en logs. Reiniciar una conversación no debe presentarse como eliminación de datos.
- Probar ambigüedad, negaciones, terceros, hechos pasados, errores del proveedor y
  prioridad de la ayuda. Las expectativas clínicas deben revisarse por un profesional;
  pasar pruebas técnicas no certifica un detector clínico.
- Mantener ayuda accesible incluso si se agota cuota, falla el proveedor o se bloquea
  el envío. Verificar fuentes oficiales de los recursos sin contactar a terceros.

### 3. Controles de abuso y operación

- Cuotas por usuario y límites de concurrencia en servidor; configuración explícita,
  contadores atómicos y respuestas comprensibles. No limitar solo desde el navegador.
- Evitar llamadas duplicadas al proveedor con el mismo identificador de operación;
  controlar bloqueos abandonados, reintentos y respuestas tardías tras reiniciar.
- Integrar App Check de forma compatible con entornos, con activación real por etapas.
  Nunca usar tokens de depuración ni bypass de emulador como controles de producción.
- Incorporar métricas de fallos, latencia, consumo y operaciones incompletas con
  identificadores de correlación. No registrar notas terapéuticas, tokens o prompts.
- Preparar alertas y respuesta ante incidentes; su existencia en consola debe
  comprobarse, no inferirse de archivos de configuración o de maxInstances.

### 4. Pagos y reservas

- Registrar decisiones pendientes sobre duración de reservas sin pago, cancelación,
  reprogramación, devolución, ausencia y liquidación. No inventar plazos o penalidades.
- Motor y presentación de políticas versionadas, con configuración sintética para
  pruebas. Si falta política comercial, no presentar el flujo de cobro como listo.
- Evitar que dos citas acrediten la misma operación del proveedor. Probar conciliación
  duplicada, reintentos y actualización simultánea con cancelación o vencimiento.
- Vencimiento explícito e idempotente, liberación segura del bloque y coherencia de
  cita, terapia, operación, historial y avisos. Respetar pagos ya confirmados y carreras
  de confirmación; no devolver a disponible un bloque usado por otra reserva.
- Separar el pago del paciente, la obligación con el profesional y la transferencia
  efectivamente realizada. Un cálculo porcentual o cambio de estado no mueve dinero.
- Excluir tarifas de prueba del flujo comercial. Probar con datos simulados o sandbox
  autorizado; no abrir links potencialmente reales ni ejecutar cobros/devoluciones.
- Preparar contratos de datos, servicios y procedimientos necesarios para el backend;
  la interfaz y auditoría del administrador quedan pendientes de su propia fase.

### 5–6. Infraestructura, integración y aceptación

- Revisar el workflow real: actualmente no ejecuta la suite completa del paciente
  y su runner aislado es específico de macOS. Preparar una alternativa segura para
  CI Linux sin eliminar el bloqueo de red ni reutilizar datos ajenos.
- Actualizar el análisis de dependencias y corregir problemas pertinentes con pruebas;
  no reutilizar cifras antiguas ni ejecutar audit fix --force.
- Preparar verificación de configuración, índices, reglas, Functions, dominios Auth,
  secretos, permisos mínimos, rollback, respaldos y restauración. No imprimir secretos.
- Probar notificaciones: conteos, marcar leído, abrir desde la misma ruta, actualización
  y recuperación del listener. Acordar el canal de recordatorios; no prometer correo
  o mensajes automáticos que aún no existan.
- Validar recorridos de paciente/psicólogo y completar Google, cambio de correo y
  proveedor real solamente en un entorno y con cuentas explícitamente autorizados.
  El resto queda con evidencia local y una instrucción concreta de aceptación pendiente.
- Probar escritorio, móvil y navegadores disponibles; emular iPhone en Chromium no
  equivale a haber probado Safari o un teléfono físico.

## Exclusiones y límites de ejecución

- No revisar ni rediseñar las pantallas o procesos del administrador. Los fixtures
  pueden usar un administrador sintético para preparar estados, sin certificar ese rol.
- No despliegues, migraciones sobre datos reales, cobros, devoluciones, envío de
  correos/mensajes reales, cambios de facturación ni borrados en producción.
- No reescribir hora Lima o encuesta si otro trabajo ya los implementa. Conservar
  cambios ajenos y señalar dependencias de integración.
- No sustituir aprobación legal, clínica, comercial o del proveedor por la opinión
  del agente. Sí preparar propuestas y configuraciones revisables.

## Entregables

Continuación 2026-10-11: [correcciones tras la revisión independiente](cierre-correcciones-piloto-2026-10-11.md).
REV-PIL-01 y las verificaciones actuales se registran allí sin reabrir funciones ya implementadas.

Seguimiento de ejecución al 2026-10-10: [matriz por requisito](../../functional/matriz-cierre-piloto.md)
y [informe técnico y evidencias](informe-cierre-tecnico-piloto.md). La implementación
local y las verificaciones externas tienen estados separados; los requisitos originales
de este plan siguen siendo la especificación de aceptación. No hay autorización de salida.

1. Código y pruebas de cada requisito técnico implementado.
2. Matriz de aceptación con identificador, estado, evidencia y dependencia.
3. Configuración de ejemplo y procedimientos operativos que no contengan secretos.
4. Informe de cierre técnico y lista separada de bloqueantes externos de lanzamiento.
5. Contratos y pendientes que recibirá la revisión final del administrador.

El piloto no queda autorizado por completar este plan. La decisión de salida
requiere las verificaciones externas pendientes y la revisión posterior del
administrador acordada con el usuario.
