# Matriz de aceptación y pendientes del piloto

Consolidación documental: 2026-10-15, America/Lima. Alcance: paciente, psicólogo y
administrador. Esta edición no ejecuta pruebas ni aprueba lanzamiento.

«Verificado local» conserva el resultado fechado de la revisión que lo documenta,
con datos sintéticos y emuladores; no se extiende automáticamente al árbol actual,
a Linux ni a staging. La revisión administrativa del 14 de octubre conservaba validación abierta;
la actualización final del 15 de octubre, al final del documento, registra la
aceptación local completa de esta entrega.

Funcionamiento: [referencia por rol](revision-funcional-por-rol.md) y
[encuesta/matching](encuesta-matching.md). Reproducción: [guía de validación](../operations/validation.md).
Antecedentes: [informe del 10 de octubre](../archive/functional/informe-cierre-tecnico-piloto.md),
[correcciones del 11–12](../archive/functional/cierre-correcciones-piloto-2026-10-11.md) y
[revisión administrativa del 12–14](../archive/functional/revision-administrador-piloto-2026-10-12.md).

## Paciente, psicólogo e infraestructura

| ID | Requisito | Estado | Prueba / evidencia mantenible | Dependencia externa |
| --- | --- | --- | --- | --- |
| REV-PIL-01 | No invitar a pagar fuera del plazo; revisión vinculada por soporte | Verificado localmente; cerrado técnicamente | [Corrección 2026-10-11](../archive/functional/cierre-correcciones-piloto-2026-10-11.md); pruebas nuevas de fecha, tiempo vivo, estados, soporte y cambio de cuenta | Conciliador/suplente y frecuencia de la cola manual por asignar |
| A-01 | Elegibilidad en servidor/UI, cuentas existentes y nacimiento | Verificado local | `accessPolicy.test.js`, `pilot-accounts.integration.test.mjs`: edad límite, fechas imposibles, política ausente, llamadas directas y cuenta antigua | Edad mínima/alcance aprobados; responsable por asignar |
| A-02 | Consentimiento vigente, versionado e historial | Verificado local | `pilot-accounts.integration.test.mjs`: renovación idempotente, documentos/versiones obsoletos, historial propio; transacción rechaza cambiar URLs sin versión | Documentos y versiones aprobados |
| A-03 | Exportación propia y subcolecciones | Verificado local (9 casos de cuentas) | `pilot-accounts.integration.test.mjs`: Auth seguro, mensajes, consentimientos, progreso, tarifas y ledger profesional sin otro paciente/profesional | Política sobre expedientes compartidos |
| A-04 | Recuperación y cambio de correo | Verificado en Auth emulator | `pilot-accounts.integration.test.mjs`: acciones OOB de un uso, nueva sesión verificada y sincronización desde Auth | Entrega real y Google en staging autorizado |
| A-05 | Retención/eliminación: política, diagnóstico, autorización e idempotencia | Verificado local | `privacyHandlers.test.js`, `pilot-accounts.integration.test.mjs`: política ausente, inventario desconocido, operador, mantenimiento, cursor parcial, cambio de datos, recibos compartidos sin política y tokens antiguos bloqueados | Plazos/acciones sobre registros compartidos aprobados; [procedimiento](../operations/pilot-privacy.md) |
| B-01 | Proveedor y minimización | Verificado técnicamente; aprobación pendiente | `surveyTurn.test.js`, `AIService.test.js`: payload mínimo, sin contenido en logs y sin proveedor real en emulador; [fuentes oficiales y fecha](../operations/pilot-provider-review.md) | Contrato, facturación, privacidad y alcance aprobados |
| B-02 | Turnos, corrección, recarga, fallo/reintento/reset | Verificado local | `pilot-survey.integration.test.mjs`: 5 casos de concurrencia, corrección, reset tardío, reintento y continuidad; `pilot-closure.spec.mjs`: recarga/reset/paginación | No se llamó a IA real; contrato actual conservado |
| B-04 | Fase 6 de encuesta: modalidad requerida y demás preferencias opcionales | Parcial: preferencias flexibles e indispensables implementados; completitud aún exige preferencias y modalidad no es obligatoria en matching | `profiles/profile.js`, `matching/recommendTherapists.js`; [contrato vigente](encuesta-matching.md) | Definir campos mínimos, indiferencia, híbrido, indispensables y compatibilidad; implementar y validar antes de marcar cerrado |
| B-03 | Ayuda independiente y casos de riesgo | Verificado técnicamente | `suicideRisk.test.js`, `pilot-closure.spec.mjs`: negación/terceros/pasado/ambigüedad y ayuda con cuota agotada | [Revisión clínica pendiente](../operations/pilot-help-review.md); tests no validan un detector clínico |
| C-01 | Cuotas distribuidas y concurrencia | Verificado local | `pilot-survey.integration.test.mjs`: contadores/leases transaccionales por usuario y globales, fallo cerrado sin configuración | Límites reales aprobados |
| C-02 | Idempotencia, leases y respuestas obsoletas | Verificado local | Mismo ID/payload no repite proveedor; resultado incierto no se reintenta, lease abandonado libera concurrencia; reset/corrección descartan resultado tardío | Proveedor sin garantía exactly-once |
| C-03 | App Check por entorno | Código/configuración verificados localmente | `appCheckPolicy.test.js`: bypass solo demo emulado; producción exige enforcement; integración web reCAPTCHA Enterprise | Registro, métricas y enforcement reales en staging |
| C-04 | Telemetría, alertas e incidentes | Telemetría verificada; activación pendiente | Correlación/latencia/códigos/consumo sin contenido; `pilot-alerts.example.json` y [procedimiento](../operations/pilot-release.md) | Umbrales, canales y responsables; alertas no activadas |
| D-01 | Políticas versionadas y tarifas de prueba | Verificado local | `pilot-payments.integration.test.mjs`: política ausente, snapshot inmutable, corte/cita pasada explícitos, tarifa test excluida; condiciones en cotización | Plazos/penalidades/condiciones aprobados |
| D-02 | Expiración, cancelación y carreras con pago | Verificado local | `pilot-payments.integration.test.mjs`: transacción cita/terapia/slot/pago/evento/aviso; confirmación-expiración y confirmación-cancelación concurrentes | Configuración sintética hasta aprobación |
| D-03 | Referencia única, devolución y obligaciones | Verificado local | `pilot-payments.integration.test.mjs`: recibo único por comercio/proveedor, importe calculado/pendiente/transferido separados, sobrepago y duplicados rechazados | Conciliación/liquidación operativas; [contratos](../operations/pilot-payments.md) con revisión administrativa en validación |
| E-01 | Dependencias y CI Linux aislado | Local verificado; Linux pendiente de ejecución | Auditorías del informe de cierre: 0 vulnerabilidades, unit/backend/lint/build/Knip pasan; workflow y namespace de red Linux preparados | Resultado real del workflow Ubuntu; no ejecutado en macOS |
| E-02 | Configuración, despliegue, rollback y restauración | Herramientas y ensayo sintético verificados | `verify-pilot-config.mjs` rechaza ejemplo incompleto; `pilot-operations.integration.test.mjs` restaura en otro proyecto demo y compara hash/subcolecciones/timestamps | Console/IAM/Auth/backup real requieren staging autorizado |
| F-01 | Paciente/profesional escritorio/móvil | Verificado local: 52/52; pagos repetidos 10/10 | [Evidencia nueva](../archive/functional/cierre-correcciones-piloto-2026-10-11.md). Playwright: roles, permisos, cuenta/vista con carga pendiente, seguimiento, soporte, reserva/pago/cancelación y onboarding | Safari, dispositivos reales y Google no ejecutados |
| F-02 | Avisos: conteo, lectura, misma ruta y recuperación | Verificado local | `pilot-closure.spec.mjs`: 25 avisos, leído, recarga de misma ruta y error/reintento; listeners ligados al UID | Canal externo de recordatorios por decidir |
| F-03 | Lima y REV-PAC-04B | Verificado local: 32/32 | `agenda-lima.spec.mjs`: 32 casos en 4 zonas y 2 tamaños; [cierre previo](../archive/functional/cierre-politica-horaria-mvp.md) preservado | Sin política horaria alternativa |

## Aceptación administrativa

La revisión del 14 de octubre documenta 34/34 unitarias, 81/81 servidor,
67/67 integración y 32/32 navegador Lima. El navegador general figura en ejecución.
Son resultados del informe original, no comprobaciones repetidas en esta limpieza.
Los criterios no se cierran a partir de conteos globales: falta aceptación final
por recorrido sobre el mismo artefacto. Evidencia original en el informe enlazado arriba.

| ID | Requisito | Estado conservador | Evidencia requerida para cierre |
| --- | --- | --- | --- |
| ADM-A01 | Rutas y llamadas directas prohibidas | Verificado local: integración y navegador, 2026-10-15 | ADMIN-01/02 y navegador |
| ADM-A02 | Aprobación/rechazo y acceso efectivo | Verificado local: integración y navegador, 2026-10-15 | ADMIN-03/04 y navegador solicitante |
| ADM-A03 | Decisiones concurrentes | Verificado local: integración y navegador, 2026-10-15 | ADMIN-03 |
| ADM-A04 | Auth, roles y último admin utilizable | Verificado local: integración y navegador, 2026-10-15 | ADMIN-05/17 y navegador usuario |
| ADM-A05 | Tarifas, cotizaciones, snapshots y redondeo | Verificado local: integración y navegador, 2026-10-15 | Reglas tarifas, integración pagos y navegador |
| ADM-A06 | Recibo único e idempotencia | Verificado local: integración y navegador, 2026-10-15 | Integración pagos |
| ADM-A07 | Vencimiento, slot y registros coherentes | Verificado local: integración y navegador, 2026-10-15 | Integración pagos y navegador |
| ADM-A08 | Carreras financieras | Verificado local: integración y navegador, 2026-10-15 | Integración pagos |
| ADM-A09 | Pago tardío y soporte trazable | Verificado local: integración y navegador, 2026-10-15 | ADMIN-07 y navegador |
| ADM-A10 | Transferencias y saldo | Verificado local: integración y navegador, 2026-10-15 | Integración pagos y navegador |
| ADM-A11 | Respuesta visible solo al titular/admin | Verificado local: integración y navegador, 2026-10-15 | ADMIN-07 y navegador |
| ADM-A12 | Privacidad privilegiada y seguimiento administrativo | Verificado local: integración y navegador, 2026-10-15 | ADMIN-08 e integración cuentas |
| ADM-A13 | Cambio de cuenta/vista durante carga | Verificado local: integración y navegador, 2026-10-15 | Navegador y regresión contexto |
| ADM-A14 | Escritorio/móvil, error y reintento | Verificado local: integración y navegador, 2026-10-15 | Playwright ambos proyectos y capturas |

## Pendientes de producto, UX y mantenimiento

| ID | Pendiente rescatado | Siguiente paso / condición |
| --- | --- | --- |
| UX-01 | Pruebas con usuarios reales en móvil; estados vacíos y tabla de pacientes | Estados vacíos y búsqueda/tabla ya implementados; no hay variante propia de tarjetas móvil en Pacientes. Falta validar UX y legibilidad en dispositivos físicos. |
| UX-02 | Claridad al alternar vista paciente/psicólogo | Selector y etiqueta de vista en Configuración, menús por modo y separación asíncrona ya implementados. Falta validar comprensión con usuarios. |
| PROD-01 | Cierre de sesión y rechazo de horario | Rechazo con motivo y aviso implementado el 2026-10-15; se retiró el reset operativo a pendiente y se alinearon confirmar/completar con estados permitidos. Fecha real, registro automático, correcciones auditadas y deshacer realización implementados según acuerdo del 2026-10-15; validación de navegador y publicación en seguimiento al final del documento. |
| PROD-02 | Facultades para finalizar/reactivar terapias, inasistencia y nuevas acciones profesionales | Paciente ya puede activar/pausar/cancelar con restricciones; profesional no puede cambiar estado de terapia. No hay estado específico de alta/finalización terapéutica ni inasistencia. Requiere decisión de alcance. |
| OPS-01 | Perfil profesional inactivo con citas existentes | Desactivación y bloqueo de nuevas acciones/cotizaciones ya implementados. Falta procedimiento para citas existentes; no hay reasignación ni cancelación automática. |
| PERF-01 | Chunk grande, registro global Vuetify y fuente MDI | Medir carga actual; evaluar importación selectiva con comparación visual. |
| DEBT-01 | Estilos globales y componentes grandes de encuesta/cita | Revalidar deuda señalada en auditoría de septiembre; priorizar extracción por responsabilidad y regresión visual, sin conservar conteos antiguos como actuales. |
| QA-01 | Linux, Safari, móviles reales, Google y correo real | Evidencia específica del entorno; staging según procedimiento de release. |
| QA-02 | Registro/verificación de correo en navegador | Corregido durante la entrega de atención: la ruta de verificación ya no espera consultas de perfil. Los cuatro casos de registro/reintento pasan en escritorio y móvil, también en la pasada general de 80 casos. |
| SCALE-01 | Listeners administrativos sobre conjunto del piloto | Medir volumen y decidir paginación/búsqueda remota antes de ampliar escala. |

Las vulnerabilidades y exports sin uso de informes antiguos son antecedentes. La
revisión del 14 de octubre reporta auditorías sin vulnerabilidades y Knip aprobado;
para conocer un árbol posterior repetir comprobaciones. No se arrastran avisos antiguos
como incidencias abiertas sin verificarlos.

## Decisiones externas (no aprobadas)

- Elegibilidad: propuesta de piloto 18+ pendiente. Con política ausente, los recorridos
  afectados quedan cerrados; no habilitar menores por omisión.
- Legal: URLs/documentos/versiones y regla de reaceptación. La configuración sintética no es publicable.
- Privacidad: acción y retención por categoría, expedientes compartidos, obligaciones y autoridad ejecutora.
- IA: proveedor/plan/retención/uso permitido, revisión clínica del protocolo y fuentes de ayuda.
- Comercial: vencimiento, cancelación/reprogramación, devolución, ausencia y obligación profesional.
- Operación: responsables, umbrales y canales de alertas, staging autorizado y cierre de aceptación administrativa.

Las verificaciones externas tienen acceso, procedimiento, resultado esperado y responsable
por asignar en [operación y staging](../operations/pilot-release.md). «No ejecutado» no se contabiliza como aprobado.

## Contraste con el código — 2026-10-15

Revisión estática del árbol local, incluidos cambios sin commit. Se leyó la
implementación y la cobertura existente; no se ejecutaron suites, build ni auditorías,
ni se consultó CI/consola. «Presente en código» no cambia los resultados históricos
ni acredita despliegue, cumplimiento de políticas o aceptación completa.

### Implementaciones presentes

| Requisitos | Resultado de lectura | Fuentes principales |
| --- | --- | --- |
| A-01/A-02 | Elegibilidad, nacimiento, correo verificado, consentimiento vigente y renovación con historial transaccional presentes. | [Acceso](../../functions/src/accounts/accessPolicy.js), [cuentas](../../functions/src/accounts/accountHandlers.js), [UI de acceso](../../src/components/auth/AccountAccessCard.vue). |
| A-03/A-05 | Exportación propia e inventario; solicitud, diagnóstico, autorización y ejecución de eliminación por política presentes. Operador requiere claim y autenticación reciente. | [Cuentas](../../functions/src/accounts/accountHandlers.js), [privacidad](../../functions/src/accounts/privacyHandlers.js), [inventario](../../functions/src/accounts/dataInventory.js). |
| A-04 | Recuperación de contraseña y verificación/cambio de correo presentes; sincronización obtiene correo desde Auth. | [Login](../../src/components/auth/LoginForm.vue), [Configuración](../../src/views/mainviews/ConfiguracionView.vue), [cuentas](../../functions/src/accounts/accountHandlers.js). |
| B-01/B-02/B-03, C-01/C-02 | Turnos, corrección, persistencia, reset, cuotas/leases, idempotencia y descarte de respuestas antiguas presentes; proveedor real sujeto a aprobación y bloqueado en emuladores. Ayuda visible sin proveedor. | [Servicio de encuesta](../../functions/src/chat/surveyService.js), [handlers](../../functions/src/chat/profileChatHandlers.js), [política IA](../../functions/src/ai/providerPolicy.js), [UI](../../src/components/encuesta/ConversationalSurvey.vue). |
| C-03/C-04 | App Check según entorno y telemetría con correlación/duración/códigos presentes. Archivos de configuración no prueban alertas activas ni recepción de incidentes. | [Wrapper callable](../../functions/src/operations/callable.js), [App Check](../../functions/src/operations/appCheckPolicy.js), [ejemplo de alertas](../../config/pilot-alerts.example.json). |
| D-01/D-02/D-03, REV-PIL-01 | Cotización/snapshot, reserva y cambios transaccionales, recibo único, vencimiento manual, devolución, obligaciones/transferencias y soporte tardío presentes. Redondeo usa `Math.floor`. | [Pagos](../../functions/src/payments/paymentOperationHandlers.js), [citas](../../functions/src/appointments/appointmentHandlers.js), [tarifas](../../functions/src/payments/paymentRates.js), [tarjeta paciente](../../src/components/Payments/PatientPaymentsCard.vue). |
| E-01/E-02 | Workflow Ubuntu, aislamiento Linux, verificador de configuración y prueba sintética de restauración presentes. No demuestra ejecución remota ni recuperación real. | [CI](../../.github/workflows/quality.yml), [runner](../../tests/run-patient-isolated.mjs), [Linux](../../tests/linux-network-child.mjs), [verificador](../../scripts/verify-pilot-config.mjs), [prueba de operación](../../tests/pilot-operations.integration.test.mjs). |
| F-01/F-02/F-03 | Pantallas de paciente/profesional, avisos con lectura/navegación, política horaria compartida y pruebas de navegador presentes. | [Avisos](../../src/services/notificationService.js), [horarios](../../functions/src/appointments/schedulePolicy.mjs), [regresión Lima](../../tests/browser/agenda-lima.spec.mjs), [navegador general](../../tests/browser/pilot-closure.spec.mjs). |
| ADM-A01–ADM-A04 | Rutas/reglas y callables por rol; solicitudes transaccionales; versiones, auditoría y protección del último admin utilizable en Auth presentes. | [Router](../../src/router/index.js), [reglas](../../firestore.rules), [admin](../../functions/src/accounts/adminHandlers.js), [solicitudes](../../functions/src/onboarding/registrationHandlers.js). |
| ADM-A05–ADM-A11 | Catálogo, conciliación, vencimiento, transferencias y soporte tienen backend y pantallas conectadas; no falta desarrollar estos módulos desde cero. | [Operaciones](../../src/views/admin/PaymentOperationsView.vue), [tarifas](../../src/views/admin/PaymentRatesView.vue), [soporte UI](../../src/views/admin/SupportRequestsView.vue), [soporte servidor](../../functions/src/support/supportHandlers.js). |
| ADM-A12–ADM-A14 | Proyección administrativa de eliminación, limpieza al cambiar cuenta/vista, descarte de cargas viejas, error/reintento y recorridos automatizados presentes. Validación UX completa sigue pendiente. | [Admin](../../functions/src/accounts/adminHandlers.js), [contexto admin](../../src/composables/useAdminWorkspace.js), [integración admin](../../tests/admin-pilot.integration.test.mjs), [navegador admin](../../tests/browser/admin-pilot.spec.mjs). |

### Parciales y trabajo restante identificado

1. **B-04: la fase 6 no está completa.** `isProfileComplete` sigue exigiendo modalidad,
   género y edad en «solo conversar» y además temas/enfoque en el recorrido ordinario.
   La indiferencia satisface un campo, pero no permite omitirlo. El ranking sí permite
   preferencias flexibles y `requiredCriteria`; la vista inicia esos indispensables
   vacíos. Modalidad no es obligatoria globalmente y híbrido se compara como categoría
   propia, sin expandirse a online/presencial. Fuentes: [perfil](../../functions/src/profiles/profile.js),
   [matching](../../functions/src/matching/therapistMatching.js),
   [recomendaciones](../../functions/src/matching/recommendTherapists.js),
   [elección de terapeuta](../../src/views/encuesta/ElegirTerapeuta.vue).
2. **PROD-01: cierre implementado con discrepancia de reversión.** El dominio exige
   `confirmada → realizada` y permite `realizada → confirmada`. La agenda ofrece
   «Regresar cita a pendiente» también para realizadas y `resetAppointmentToPending`
   envía `pendiente`; esa transición se rechaza en el servidor. Asimismo, el botón
   de completar no excluye pendientes/canceladas, aunque el dominio rechaza esos
   cierres. El handler guarda resumen/fecha/evento, pero no verifica que haya llegado
   la fecha de atención y no limpia resumen/fecha al revertir. Falta alinear acciones
   disponibles con el dominio y acordar política de corrección. Fuentes:
   [agenda profesional](../../src/views/psicologo/PsicologoSesionesView.vue),
   [servicio de cita](../../src/services/citaService.js),
   [transiciones](../../functions/src/appointments/appointmentDomain.js),
   [handler](../../functions/src/appointments/appointmentHandlers.js).
3. **PROD-02/OPS-01: parte de la gestión ya existe.** `changeTherapyStatus` admite
   activo/pausado/cancelado para paciente, bloquea cambios con citas abiertas y evita
   dos terapias activas. Profesional y administración operativa no están autorizados
   para cambiar ese estado. No hay estados específicos de alta terapéutica o
   inasistencia. Desactivar profesional corta nuevas operaciones, pero no resuelve
   sus citas anteriores. Fuentes: [handler](../../functions/src/appointments/appointmentHandlers.js)
   y [directorio administrativo](../../functions/src/accounts/adminHandlers.js).
4. **UX-01/UX-02: interfaz básica ya construida.** Existen estados vacíos, búsqueda,
   tabla de pacientes, selector/etiqueta de vista y menús por modo, además de aislamiento
   de cargas. Pacientes sigue usando `v-data-table`; no se encontró una variante
   propia de tarjetas móvil. Eso no prueba un defecto responsive: falta observación
   con usuarios/dispositivos. Fuentes: [Pacientes](../../src/views/PacientesView.vue),
   [Configuración](../../src/views/mainviews/ConfiguracionView.vue),
   [contexto terapéutico](../../src/composables/useTherapyWorkspace.js).
5. **PERF-01/DEBT-01: optimización pendiente.** Registro global de componentes/directivas
   Vuetify y fuente MDI completa siguen presentes en [tema](../../src/plugins/theme/index.js).
   En este corte, encuesta tiene 1502 líneas y diálogo de cita 1326; los cinco CSS de
   `src/assets/` suman 1749 líneas y 254 apariciones de `!important`. Son señales de
   mantenimiento, no métricas de rendimiento. No se repitió build para medir chunks.
6. **SCALE-01: paginación remota pendiente.** `watchAdminCollection` se suscribe a
   colecciones completas. Las pantallas filtran y paginan en memoria con
   `items-per-page=10`; no se encontró cursor `startAfter` o límite en ese servicio.
   Fuente: [servicio admin](../../src/services/adminService.js).

**Orden sugerido:** corregir la coherencia del cierre de sesiones; acordar e implementar
el contrato B-04; ejecutar aceptación administrativa y pruebas del entorno; resolver
operación de perfiles inactivos y aprobaciones; priorizar UX/rendimiento/escala según
mediciones. Las decisiones externas de la sección anterior siguen requiriendo evidencia
fuera del código y no se cierran por esta lectura.

### Actualización posterior: rechazo de cita por percance — 2026-10-15

Se implementó el rechazo profesional de citas pendientes/confirmadas, con motivo
obligatorio, versión vigente e idempotencia. Cancela la cita, cierra su bloque propio,
conserva el tratamiento financiero y avisa al paciente que elija un nuevo horario.
El motivo aparece en Mis sesiones, historial de citas y notificación. La agenda ya
no ofrece reset operativo a pendiente; confirmar/completar se limitan a estados
válidos. La discrepancia de botones descrita en la revisión estática anterior queda
resuelta por sustitución del flujo, sin añadir una reapertura de sesiones realizadas.

Validación local sobre este cambio, con emuladores demo y red externa bloqueada:

- Integración completa del piloto: **70/70 aprobadas**. Incluye motivo obligatorio,
  propiedad profesional, versión obsoleta, reintento idéntico/payload distinto,
  pago pendiente/confirmado, aviso único, nueva reserva y rechazo tardío sin cancelar
  sesiones realizadas.
- Navegador general: **74/78 aprobadas**. El nuevo recorrido de rechazo pasó en
  escritorio y móvil, con motivo visible también en notificación y elección de otro
  bloque. Cuatro fallos de registro/verificación quedan en QA-02; no se presenta la
  suite general como aprobada.
- Unitarias: **34/34**. Backend: **81/81**. Lint backend, Knip normal/producción,
  compilación y `git diff --check`: aprobados. Build conserva aviso de chunk grande.
- Capturas de paciente inspeccionadas en escritorio/móvil; artefactos locales en
  `test-results/professional-rejection-2026-10-15/` y el informe Playwright en
  `test-results/followup-report/`. Son datos ficticios y no se versionan.
No implica despliegue, aprobación comercial ni cierre de los demás pendientes.

### Fechas de atención, correcciones y publicación — 2026-10-15

Acuerdo del usuario implementado: atención real separada de la fecha de registro;
completar después del inicio programado; corregir fecha/resumen con motivo sin plazo
máximo; deshacer solo cuando la sesión no ocurrió, con confirmación explícita y motivo.
Historial compartido de valores antes/después, autor y fecha; avisos al paciente;
control de versión e idempotencia. Corregir/deshacer no cambia pagos ni transferencias.
El contrato detallado está en la [referencia por rol](revision-funcional-por-rol.md).

Validación final local sobre el artefacto de entrega: **72/72 integraciones**,
**85/85 backend**, **34/34 unitarias**, **80/80 navegador general** y
**32/32 matriz Lima**. Lint backend, Knip normal/producción, build y comprobación de
formato pasan; auditorías frontend/backend: 0 vulnerabilidades. Se corrigió QA-02:
la pantalla de verificación de correo usa Auth sin esperar consultas de perfil.
Se inspeccionó el historial de atención en escritorio/móvil. El registro original
coincide entre cita, resumen de terapia y auditoría; la corrección no lo refecha.
La aceptación administrativa local queda verificada, sin certificar Linux, staging,
configuración externa ni operación productiva.
El usuario autorizó publicar todo el estado local validado. La configuración real de
App Check, documentos legales y políticas de producción no está en los archivos locales;
se advirtió la limitación y el usuario reiteró el despliegue mediante CLI con la configuración existente. No se habilitan políticas ausentes.
