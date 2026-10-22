# Matriz de aceptación y pendientes del piloto

Consolidación original: 2026-10-15. Revisión independiente del seguimiento:
2026-10-21, America/Lima. Alcance: paciente, psicólogo y administrador.
La revisión actual contrasta código y repite las pruebas locales; no aprueba lanzamiento.

«Verificado local» identifica evidencia con datos sintéticos y emuladores; no acredita
Linux, staging ni producción. Las secciones históricas conservan sus resultados
originales: los pendientes de un corte anterior no reabren lo cerrado en una entrega
posterior. El cierre administrativo del 15, la encuesta del 20 y el consentimiento
del 21 sustituyen las observaciones anteriores sobre esos recorridos, salvo las
regresiones expresamente identificadas en la verificación actual.

**Resultado actual:** 80/80 pruebas de integración, 32/32 de Lima y 98/102 de
navegador general. Dos incidencias, repetidas en escritorio/móvil, impiden cerrar
la aceptación global. Ver [verificación del 21 de octubre](#verificación-independiente--2026-10-21).

Funcionamiento: [referencia por rol](revision-funcional-por-rol.md) y
[encuesta/matching](encuesta-matching.md). Reproducción: [guía de validación](../operations/validation.md).
Antecedentes: [informe del 10 de octubre](../archive/functional/informe-cierre-tecnico-piloto.md),
[correcciones del 11–12](../archive/functional/cierre-correcciones-piloto-2026-10-11.md) y
[revisión administrativa del 12–14](../archive/functional/revision-administrador-piloto-2026-10-12.md).

## Paciente, psicólogo e infraestructura

| ID | Requisito | Estado | Prueba / evidencia mantenible | Dependencia externa |
| --- | --- | --- | --- | --- |
| REV-PIL-01 | No invitar a pagar fuera del plazo; revisión vinculada por soporte | Verificado localmente; cerrado técnicamente | [Corrección 2026-10-11](../archive/functional/cierre-correcciones-piloto-2026-10-11.md); pruebas nuevas de fecha, tiempo vivo, estados, soporte y cambio de cuenta | Conciliador/suplente y frecuencia de la cola manual por asignar |
| A-01 | Elegibilidad en servidor/UI, cuentas existentes y nacimiento | Verificado local | `accessPolicy.test.js`, `pilot-accounts.integration.test.mjs`: edad límite, fechas imposibles, política ausente, llamadas directas y cuenta antigua | Aprobación 18+ documentada el 2026-10-17; configuración desplegada no revalidada en esta revisión |
| A-02 | Consentimiento vigente, versionado e historial | Verificado local; aceptación centralizada en registro implementada | `pilot-accounts.integration.test.mjs`, `legal-documents.integration.test.mjs` y `legal-documents.spec.mjs`: versión vigente, renovación, historial inmutable y retorno a la ruta original | Primera versión publicada según registro del 2026-10-17; futuras publicaciones requieren revisión. Retención/privacidad siguen aparte |
| A-03 | Exportación propia y subcolecciones | Verificado local (9 casos de cuentas) | `pilot-accounts.integration.test.mjs`: Auth seguro, mensajes, consentimientos, progreso, tarifas y ledger profesional sin otro paciente/profesional | Política sobre expedientes compartidos |
| A-04 | Recuperación y cambio de correo | Verificado en Auth emulator | `pilot-accounts.integration.test.mjs`: acciones OOB de un uso, nueva sesión verificada y sincronización desde Auth | Entrega real y Google en staging autorizado |
| A-05 | Retención/eliminación: política, diagnóstico, autorización e idempotencia | Verificado local | `privacyHandlers.test.js`, `pilot-accounts.integration.test.mjs`: política ausente, inventario desconocido, operador, mantenimiento, cursor parcial, cambio de datos, recibos compartidos sin política y tokens antiguos bloqueados | Plazos/acciones sobre registros compartidos aprobados; [procedimiento](../operations/pilot-privacy.md) |
| B-01 | Proveedor y minimización | Controles implementados y probados; proveedor real sin validar | `surveyTurn.test.js`, `AIService.test.js`: payload mínimo, sin contenido en logs y sin proveedor real en emulador; [fuentes y revisión previa](../operations/pilot-provider-review.md) | El recorrido guiado no requiere Gemini; aprobar contrato, facturación, privacidad y alcance antes de activar texto libre con proveedor |
| B-02 | Turnos, corrección, recarga, fallo/reintento/reset | Verificado local | `pilot-survey.integration.test.mjs`: 7 casos de concurrencia, corrección, reset tardío, reintento, continuidad y modo guiado; `pilot-closure.spec.mjs`: recarga/reset/paginación | No se llamó a IA real; contrato guiado conservado |
| B-04 | Fase 6 de encuesta: modalidad requerida y demás preferencias opcionales | Cerrado técnicamente; validación local documentada el 2026-10-20 | Mínimo tema/solo conversar + modalidad; preferencias opcionales, híbrido compatible, servidor impone modalidad, disponibilidad antes del límite de cinco; [contrato vigente](encuesta-matching.md) | Validación con usuarios; activación de Gemini y revisión del proveedor separadas |
| B-03 | Ayuda independiente y casos de riesgo | Verificado técnicamente | `suicideRisk.test.js`, `pilot-closure.spec.mjs`: negación/terceros/pasado/ambigüedad y ayuda con cuota agotada | [Revisión clínica pendiente](../operations/pilot-help-review.md); tests no validan un detector clínico |
| C-01 | Cuotas distribuidas y concurrencia | Verificado local | `pilot-survey.integration.test.mjs`: contadores/leases transaccionales por usuario y globales, fallo cerrado sin configuración | Configuración inicial 30 envíos/día y 2 simultáneos globales documentada el 2026-10-20; consumo, alertas y configuración desplegada no revalidados aquí |
| C-02 | Idempotencia, leases y respuestas obsoletas | Verificado local | Mismo ID/payload no repite proveedor; resultado incierto no se reintenta, lease abandonado libera concurrencia; reset/corrección descartan resultado tardío | Proveedor sin garantía exactly-once |
| C-03 | App Check por entorno | Código/configuración verificados localmente | `appCheckPolicy.test.js`: bypass solo demo emulado; producción exige enforcement; integración web reCAPTCHA Enterprise | Registro, métricas y enforcement reales en staging |
| C-04 | Telemetría, alertas e incidentes | Telemetría verificada; activación pendiente | Correlación/latencia/códigos/consumo sin contenido; `pilot-alerts.example.json` y [procedimiento](../operations/pilot-release.md) | Umbrales, canales y responsables; alertas no activadas |
| D-01 | Políticas versionadas y tarifas de prueba | Verificado local | `pilot-payments.integration.test.mjs`: política ausente, snapshot inmutable, corte/cita pasada explícitos, tarifa test excluida; condiciones en cotización | Plazos/penalidades/condiciones aprobados |
| D-02 | Expiración, cancelación y carreras con pago | Verificado local | `pilot-payments.integration.test.mjs`: transacción cita/terapia/slot/pago/evento/aviso; confirmación-expiración y confirmación-cancelación concurrentes | Configuración sintética hasta aprobación |
| D-03 | Referencia única, devolución y obligaciones | Verificado local | `pilot-payments.integration.test.mjs`: recibo único por comercio/proveedor, importe calculado/pendiente/transferido separados, sobrepago y duplicados rechazados | Responsables y conciliación/liquidación reales; [contratos](../operations/pilot-payments.md). La interfaz administrativa ya fue aceptada localmente |
| E-01 | Dependencias y CI Linux aislado | Auditorías/checks estáticos aprobados; suite funcional falla localmente y en Ubuntu | 0 vulnerabilidades en ambos paquetes; unit/backend/lint/build/Knip pasan. [Quality para 7bb347c](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/39555504112): 80/80 integración, 32/32 Lima, 98/102 navegador; mismos cuatro fallos que en local | Corregir REV-SEG-01/02 y obtener ejecución completa aprobada |
| E-02 | Configuración, despliegue, rollback y restauración | Herramientas y ensayo sintético verificados | `verify-pilot-config.mjs` rechaza ejemplo incompleto; `pilot-operations.integration.test.mjs` restaura en otro proyecto demo y compara hash/subcolecciones/timestamps | Console/IAM/Auth/backup real requieren staging autorizado |
| F-01 | Paciente/profesional escritorio/móvil | Aceptación global abierta: 98/102 en suite general, 2026-10-21 | Incluye administración/legal; 10/10 de vencimiento de pagos aprobados. Fallan recuperación del registro y test desactualizado de modalidad, en ambos tamaños | Resolver REV-SEG-01/02; Safari, dispositivos reales y Google no ejecutados |
| F-02 | Avisos: conteo, lectura, misma ruta y recuperación | Verificado local | `pilot-closure.spec.mjs`: 25 avisos, leído, recarga de misma ruta y error/reintento; listeners ligados al UID | Canal externo de recordatorios por decidir |
| F-03 | Lima y REV-PAC-04B | Revalidado local: 32/32, 2026-10-21 | `agenda-lima.spec.mjs`: 32 casos en 4 zonas y 2 tamaños; [cierre previo](../archive/functional/cierre-politica-horaria-mvp.md) preservado | Sin política horaria alternativa |

## Aceptación administrativa

La aceptación local administrativa se cerró el 2026-10-15, después del corte
incompleto del día 14. No sigue pendiente desarrollar ni aceptar localmente esos
recorridos por el hecho de que el informe antiguo terminara durante una ejecución.
La revisión actual también incluye los servicios de documentos legales añadidos
posteriormente. La operación real y los permisos/configuración desplegados son
comprobaciones separadas.

| ID | Requisito | Estado | Evidencia |
| --- | --- | --- | --- |
| ADM-A01 | Rutas y llamadas directas prohibidas | Verificado local: integración y navegador, 2026-10-21 | ADMIN-01/02 y navegador |
| ADM-A02 | Aprobación/rechazo y acceso efectivo | Verificado local: integración y navegador, 2026-10-21 | ADMIN-03/04 y navegador solicitante |
| ADM-A03 | Decisiones concurrentes | Verificado local: integración y navegador, 2026-10-21 | ADMIN-03 |
| ADM-A04 | Auth, roles y último admin utilizable | Verificado local: integración y navegador, 2026-10-21 | ADMIN-05/17 y navegador usuario |
| ADM-A05 | Tarifas, cotizaciones, snapshots y redondeo | Verificado local: integración y navegador, 2026-10-21 | Reglas tarifas, integración pagos y navegador |
| ADM-A06 | Recibo único e idempotencia | Verificado local: integración y navegador, 2026-10-21 | Integración pagos |
| ADM-A07 | Vencimiento, slot y registros coherentes | Verificado local: integración y navegador, 2026-10-21 | Integración pagos y navegador |
| ADM-A08 | Carreras financieras | Verificado local: integración y navegador, 2026-10-21 | Integración pagos |
| ADM-A09 | Pago tardío y soporte trazable | Verificado local: integración y navegador, 2026-10-21 | ADMIN-07 y navegador |
| ADM-A10 | Transferencias y saldo | Verificado local: integración y navegador, 2026-10-21 | Integración pagos y navegador |
| ADM-A11 | Respuesta visible solo al titular/admin | Verificado local: integración y navegador, 2026-10-21 | ADMIN-07 y navegador |
| ADM-A12 | Privacidad privilegiada y seguimiento administrativo | Verificado local: integración y navegador, 2026-10-21 | ADMIN-08 e integración cuentas |
| ADM-A13 | Cambio de cuenta/vista durante carga | Verificado local: integración y navegador, 2026-10-21 | Navegador y regresión contexto |
| ADM-A14 | Escritorio/móvil, error y reintento | Verificado local: integración y navegador, 2026-10-21 | Playwright ambos proyectos y capturas |

| ADM-A15 | Borradores legales privados, publicación e historial inmutable | Verificado local: integración y navegador, 2026-10-21 | 6 casos de integración legal; 4 recorridos administrativos en navegador. Otros 6 recorridos validan publicación pública y consentimiento/retorno |

## Estado de producto, UX y mantenimiento

| ID | Pendiente rescatado | Siguiente paso / condición |
| --- | --- | --- |
| UX-01 | Pruebas con usuarios reales en móvil; estados vacíos y tabla de pacientes | Estados vacíos y búsqueda/tabla ya implementados; no hay variante propia de tarjetas móvil en Pacientes. Falta validar UX y legibilidad en dispositivos físicos. |
| UX-02 | Claridad al alternar vista paciente/psicólogo | Selector y etiqueta de vista en Configuración, menús por modo y separación asíncrona ya implementados. Falta validar comprensión con usuarios. |
| PROD-01 | Registro de atención y rechazo de horario | Cerrado técnicamente según entrega del 2026-10-15. Rechazo con motivo/aviso, fecha real separada del registro, corrección y deshacer con motivo, versión e historial. `attendancePolicy.js` y el handler siguen implementando el contrato; no se reabre como desarrollo pendiente. |
| PROD-02 | Facultades para finalizar/reactivar terapias, inasistencia y nuevas acciones profesionales | Paciente ya puede activar/pausar/cancelar con restricciones; profesional no puede cambiar estado de terapia. No hay estado específico de alta/finalización terapéutica ni inasistencia. Requiere decisión de alcance. |
| OPS-01 | Perfil profesional inactivo con citas existentes | Desactivación y bloqueo de nuevas acciones/cotizaciones ya implementados. Falta procedimiento para citas existentes; no hay reasignación ni cancelación automática. |
| PERF-01 | Chunk grande, registro global Vuetify y fuente MDI | Build del 2026-10-21: paquete principal 1.257,51 kB minificado / 391,35 kB gzip. Compila; el aviso persiste. Falta medir carga real y evaluar importación selectiva con comparación visual. |
| DEBT-01 | Estilos globales y componentes grandes de encuesta/cita | Revalidar deuda señalada en auditoría de septiembre; priorizar extracción por responsabilidad y regresión visual, sin conservar conteos antiguos como actuales. |
| QA-01 | Linux, Safari, móviles reales, Google y correo real | Ubuntu ejecutado: reproduce REV-SEG-01/02, pendiente aprobación completa (E-01). Safari, dispositivos físicos, Google, entrega real de correo y entorno desplegado no comprobados en esta revisión. |
| QA-02 | Registro/verificación de correo en navegador | Flujo normal aprobado en escritorio/móvil; recuperación ante fallo de inicialización reabierta por REV-SEG-01. Consentimiento centralizado y retorno original pasan sus pruebas. Entrega real de correo sigue en QA-01. |
| SCALE-01 | Listeners administrativos sobre conjunto del piloto | Medir volumen y decidir paginación/búsqueda remota antes de ampliar escala. |

Las vulnerabilidades y exports sin uso de informes antiguos son antecedentes. Las
auditorías repetidas el 2026-10-21 reportan 0 vulnerabilidades en raíz y Functions;
Knip normal y producción aprobados. No se arrastran avisos antiguos como incidencias
abiertas sin verificarlos.

## Decisiones externas y estado de aprobación

- Elegibilidad: acceso 18+ aprobado por el responsable el 2026-10-17; política
  `2026-10-v1` en `functions/.env.psicosaas-3c819`. Se calcula la edad declarada
  en hora de Lima y se rechaza a menores en el servidor.
- Legal: primera versión `2026-10-v1` publicada el 2026-10-17, con administración
  de borradores/publicaciones e historial de consentimiento. La revisión de
  retención y obligaciones de privacidad sigue siendo un pendiente separado.
- Privacidad: acción y retención por categoría, expedientes compartidos, obligaciones y autoridad ejecutora.
- IA: proveedor/plan/retención/uso permitido, revisión clínica del protocolo y fuentes de ayuda.
- Comercial: vencimiento, cancelación/reprogramación, devolución, ausencia y obligación profesional.
- Operación: responsables, umbrales y canales de alertas y comprobación del entorno desplegado. La aceptación administrativa local está cerrada; no sustituye operación real.

Las verificaciones externas tienen acceso, procedimiento, resultado esperado y responsable
por asignar en [operación y staging](../operations/pilot-release.md). «No ejecutado» no se contabiliza como aprobado.

## Verificación independiente — 2026-10-21

Artefacto revisado: `7bb347c1acba27b30e1811884edd37bf82366ccd`. Lectura del código,
contraste con los acuerdos y ejecución de las suites existentes con datos sintéticos,
emuladores demo y aislamiento de red. Esta revisión modifica documentación, no la app.

### Resultado reproducible

| Comprobación | Resultado actual |
| --- | --- |
| `npm test` | 44/44 aprobadas |
| `npm run test:backend` | 87/87 aprobadas |
| `npm run lint:backend` y `npm run build` | Aprobados; persiste el aviso de tamaño del paquete principal |
| `npm run audit:unused`, también modo producción | Aprobados; cuatro sugerencias de configuración de Knip, sin errores |
| `npm audit --audit-level=moderate`, también en Functions | 0 vulnerabilidades en ambos árboles |
| `npm run verify:pilot-config` sobre el ejemplo | Rechazo esperado: el ejemplo incompleto no acredita configuración productiva |
| `npm run test:pilot`: integración | 80/80 aprobadas, incluidos 17 casos administrativos y 6 legales |
| `npm run test:pilot`: navegador Lima | 32/32 aprobadas, cuatro zonas y dos tamaños |
| `npm run test:pilot`: navegador general | 98/102 aprobadas; cuatro fallos descritos abajo; comando finaliza con código 1 |
| CI Ubuntu 22.04, mismo commit | Fallido por los mismos cuatro casos; integración 80/80, Lima 32/32, general 98/102 |

La suite general aprobada incluye administración 24/24, atención 2/2, seguimiento
12/12, documentos legales/consentimiento 10/10, vencimiento de pagos 10/10 y cierre
piloto 10/10. En `patient-http.spec.mjs` pasan 30/34. Esos números son recorridos
por tamaño, no cantidades de funcionalidades independientes.

[CI y resultado final](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/39555504112),
[artefactos de CI](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/39555504112/artifacts/12326049669).
Evidencia local no versionada: `test-results/tracking-review-2026-10-21/`, con logs,
auditorías, manifiesto SHA-256, estado remoto y copias de informes/capturas/trazas.
Los 224 archivos de código/configuración/pruebas del manifiesto conservaron sus
hashes durante la revisión; `git diff --check` aprobó la actualización documental.
Se inspeccionaron además las capturas de recuperación de registro y aprobación
administrativa móvil; esto no sustituye pruebas con dispositivos físicos.

### Incidencias actuales y condición de cierre

**REV-SEG-01 — Recuperación del registro oculta tras crear Auth (prioridad alta).**
Al provocar un error de `finalizeRegistration`, la sesión ya existe y
[SingUp.vue](../../src/views/Auth/SingUp.vue) sustituye `SignUpForm` por
`AccountAccessCard`. El error y el reintento de creación quedan fuera de la vista.
La captura muestra «Verifica tu correo», no una acción para reparar el perfil.
`handleAccessStatus` solo activa recuperación con `consent_required`, mientras
[accessPolicy.js](../../functions/src/accounts/accessPolicy.js) devuelve primero
`verification_required` para esa cuenta. El flujo normal de registro sí pasa.

Reproducido en escritorio y móvil, tanto localmente como en CI:
`patient-http.spec.mjs:240`, aserción en la línea 244. No se afirma que la cuenta
sea irrecuperable por todas las rutas: el defecto comprobado es perder la explicación
y la recuperación en el punto de fallo. Resolver el estado de registro en curso y
la recuperación de Auth sin perfil, conservando intención paciente/psicólogo,
consentimiento y destino, sin crear otro usuario. Para cerrar: fallar inicialización,
retirar el fallo, recuperar desde la interfaz, comprobar el mismo UID y un solo
perfil/consentimiento, y completar verificación/onboarding en ambos tamaños. Si
cambia el texto o el botón, actualizar el test al contrato acordado sin eliminar
la comprobación de recuperación efectiva.

**REV-SEG-02 — Prueba de recomendaciones desactualizada (prioridad media).**
`patient-http.spec.mjs:358` intenta pulsar `Modalidad: … Flexible`; el contrato
vigente y [ElegirTerapeuta.vue](../../src/views/encuesta/ElegirTerapeuta.vue) mantienen
modalidad obligatoria. La captura muestra correctamente `Modalidad: remoto · Obligatorio`.
El error/reintento previo sí pasa, pero el caso no llega a verificar las aserciones
posteriores de ausencia de coincidencias y ayuda con error del recomendador.

Corregir la preparación/interacción del test para usar preferencias opcionales o
editar modalidad por la vía vigente. Mantener la modalidad obligatoria en producto;
comprobar los estados vacíos y la ayuda que quedaron sin ejecutar. Cierre: los dos
recorridos pasan y una ejecución completa de `test:pilot` y CI queda aprobada.
Este fallo no demuestra que el matching implementado en B-04 sea incorrecto.

### Qué sigue listo y qué sigue pendiente

- **Revalidado:** administración operativa, permisos, solicitudes profesionales,
  tarifas/conciliación/devoluciones/transferencias, soporte y proyección de privacidad;
  administración legal; reservas, vencimientos, seguimiento, registro/corrección de
  atención y hora de Lima. Se conservan los límites y dependencias de cada fila.
- **Implementado:** encuesta guiada y preferencias opcionales con modalidad obligatoria;
  consentimiento centralizado, renovación y retorno. REV-SEG-02 deja pendiente un
  recorrido de aceptación; REV-SEG-01 afecta la recuperación del registro nuevo.
- **Antes de aceptación técnica global:** cerrar REV-SEG-01/02 y repetir los checks
  afectados y la suite completa. Los cierres históricos de QA-02 no anulan la regresión.
- **Decisiones/operación:** resolver citas existentes de profesionales inactivos
  (OPS-01); acordar si alta terapéutica/inasistencia entran al lanzamiento (PROD-02);
  responsables de conciliación, políticas comerciales/privacidad, revisión de ayuda
  y comprobaciones reales de App Check, alertas, correo, Google, backup y restauración.
  El proveedor Gemini requiere aprobación antes de activarse, no para el modo guiado.
- **Mejoras por priorizar:** UX en móviles reales, rendimiento, deuda de componentes
  y paginación remota. Su existencia no demuestra por sí sola un bloqueo del piloto.

La aprobación 18+ y la publicación legal del 17 se conservan como hechos documentados
por entregas previas; no se revalidaron en consola. No se desplegó, no se enviaron
correos reales ni se operaron pagos/datos reales. No se declara listo el lanzamiento.

## Histórico: contraste con el código — 2026-10-15

Este corte se conserva como antecedente, no como lista actual de trabajo. B-04,
PROD-01 y QA-02 se resolvieron después; ver las actualizaciones fechadas y las
tablas vigentes al inicio. Sus conteos y observaciones describen aquel artefacto.

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

### Encuesta guiada y cierre de B-04 — 2026-10-20

Se implementó el recorrido guiado inicial para minimizar uso del proveedor: inicio
idempotente sin saludo obligatorio, tema o «solo conversar», modalidad explícita y
recomendaciones. Género, edad y enfoque son opcionales y editables. Modalidad se
impone en el servidor incluso si el cliente omite indispensables; híbrido admite
online/presencial. Se recalcula completitud para perfiles anteriores y se verifica
la disponibilidad antes de limitar las recomendaciones a cinco.

Producción selecciona `SURVEY_INPUT_MODE=guided`; el compositor libre se oculta y
el servidor rechaza entradas desconocidas antes de reservar cuota o invocar IA.
No se vincula el secreto de Gemini al envío guiado. Se conservan los controles
para una activación futura del proveedor. Límite inicial: 30 envíos por cuenta/día,
2 simultáneos globales. No se afirma costo Firebase cero ni aprobación de Gemini.

Validación final con datos sintéticos y red externa bloqueada: **87/87 backend**,
**42/42 unitarias frontend**, **77/77 integraciones** del piloto y
**10/10 pruebas de navegador** de encuesta/registro en escritorio y móvil. Incluye
inicio/reapertura, cuota sin proveedor, modalidad/híbrido, resultados después del
quinto profesional, acceso directo prohibido, recarga y preferencias opcionales.
Lint backend, build, Knip y `git diff --check` pasan. Se inspeccionaron capturas de
escritorio/móvil en `test-results/survey-guided-*.png`. Se corrigió una carrera en
la preparación de la prueba de registro: espera los documentos vigentes antes de
marcar el consentimiento, sin omitir el requisito de aceptación.

Este cierre reemplaza el pendiente B-04 descrito en el contraste del 15 de octubre.
Gemini real, revisiones clínicas/privacidad y validación con usuarios siguen aparte.

### Consentimiento centralizado en registro — 2026-10-21

La encuesta comprueba acceso sin mostrar el banner de documentos. Si falta aceptar
la versión vigente, las rutas protegidas devuelven a `/registro`, conservando el
destino, sus parámetros y fragmento. Una cuenta autenticada acepta allí sin crear
otra identidad; el registro incompleto también se recupera en esa ruta. Tras la
aceptación, y los datos de onboarding si corresponden, se recupera el destino
original. Documentos públicos siguen accesibles. Se rechazan retornos externos y
pantallas de autenticación que producirían bucles.

Validación local con emuladores aislados: **44/44 unitarias frontend** y
**18/18 navegador** en escritorio/móvil (14 de consentimiento/registro/encuesta,
4 de administración legal). Incluye renovación mientras la encuesta está abierta,
recarga, historial único, retorno con query/fragmento, recuperación de cuenta,
verificación de correo y administración de versiones. Build, Knip y comprobación
de formato pasan. No cambia el contrato de consentimiento del servidor.
