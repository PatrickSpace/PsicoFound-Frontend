# Plan de salida a producción de Lurems

Última revisión: **1 de noviembre de 2026, America/Lima**.
Código de producto integrado: `82f57a1`; los commits posteriores de documentación conservan ese mismo código.

Este documento concentra los pendientes vigentes. La evidencia vigente está en el [registro de publicación del 01/11](operations/publicacion-main-2026-10-31.md). Los expedientes fechados conservan el alcance de sus propias entregas.

## Automatización operativa publicada

El alcance final autorizado incorpora vencimiento automático, UI de plazo terminado y `/admin/operaciones` con tareas, responsables e historial. Los cobros conservan conciliación administrativa: no se publica API ni webhook de Mercado Pago. Véanse [operación](operations/automatizacion-operativa-2026-10-31.md) y [publicación a main](operations/publicacion-main-2026-10-31.md). Las acciones comerciales y humanas pasan a tareas del administrador; el cobro controlado sigue pendiente.

## 1. Decisión actual

**La app tiene una publicación técnica integrada. La apertura con cobros conserva preparación comercial, responsables y comprobaciones operativas pendientes.**

Las dependencias se corrigieron y la regresión local del conjunto integrado está documentada. El fallo de Quality de `4896783` es un antecedente anterior. El resultado remoto aplicable se identifica por SHA en [Quality de main](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/workflows/quality.yml?query=branch%3Amain); Vercel en verde no sustituye esa validación ni la aceptación comercial.

| Componente | Estado y evidencia |
| --- | --- |
| Firebase | `psicosaas-3c819`, Firestore `(default)` y Functions en `southamerica-east1`. Ambos frontends comparten backend. |
| Sitio de usuarios | `https://app.lurems.lat`, Hosting `luremsapp`; versión, hashes del build y rutas comprobados en el registro de publicación. |
| Vercel | `https://psico-found-frontend.vercel.app`; despliegue automático de `main`. Su estado se consulta para el SHA final; no es staging aislado. |
| Candidato | Producto `82f57a1`, optimizaciones y operación integradas. El registro vincula la validación local y los artefactos desplegados; Actions identifica la ejecución Linux de cada SHA. |
| Quality verde anterior | [41059306300](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/41059306300), commit `1cc2564`; no cubre las entregas posteriores. |
| Legal publicado documentado | `2026-10-v2`; no se consultó de nuevo el documento Firestore vigente en esta revisión. |
| Exclusiones | Backup/restore real, dispositivos físicos y caída real de OpenAI siguen aplazados por el titular. |

## 2. Implementación y validación que se conservan

| Área | Resultado y alcance |
| --- | --- |
| Encuesta | Híbrida con OpenAI `gpt-6-luna`, opciones guiadas sin inferencia, resumen editable/confirmado y matching determinístico. Smoke autenticado documentado en el cierre del 25/10. |
| Acceso y seguridad | Elegibilidad 18+, verificación de correo, consentimiento versionado, App Check, cuotas, concurrencia e idempotencia. Configuración real comprobada en entregas anteriores; no inventariada de nuevo hoy. |
| Acceso profesional a encuesta | Sujeto a vínculo, consentimiento y aprobación del pago de la primera cita. Cancelarla retira el acceso; una cita posterior no lo restablece automáticamente. |
| Cuentas | Suspensión/reactivación, conservación e inactividad a los tres meses: integración y publicación verificadas el [27/10](operations/validacion-produccion-2026-10-27.md). No falta implementar nuevamente suspensión. |
| Agenda y pagos | Reserva, reprogramación, rechazo con motivo, registro/corrección de atención, snapshots y conciliación manual implementados. Scheduler de vencimientos y tareas administrativas publicados. La confirmación conserva conciliación manual; no se habilita integración de proveedor. |
| Preparación profesional | Perfil revisado, tarifa, disponibilidad y activación/pausa explícitas; backend y Hosting publicados el [30/10](operations/onboarding-2026-10-29.md). Perfiles heredados conservan compatibilidad hasta adoptar la nueva preparación. |
| Acompañamiento del paciente | Guías posteriores a cita/pago y Functions `getPatientCareGuide`/`savePatientCareGuide`: publicación de Functions documentada en la entrega del [30/10](operations/onboarding-spotlight-2026-10-30.md). |
| Guías visuales unificadas | La entrega del [30/10](operations/onboarding-unificado-2026-10-30.md) se incorpora al producto `82f57a1`, con regresión del conjunto y publicación de Hosting documentadas en el registro del 01/11. |
| Alertas | Entrega y recuperación al buzón comprobadas el 25/10 en el [expediente operativo](operations/cierre-operativo-2026-10-25.md). Guardia/respuesta humana pendientes. |

Una prueba en emuladores no acredita producción. Un 401 sin credenciales no acredita un recorrido autenticado. Publicar textos legales no completa por sí solo las decisiones de conservación o la revisión profesional del apoyo.

## 3. Controles técnicos del candidato

P0 significa cerrar antes de la apertura con cobros. Los trabajos están integrados; las comprobaciones técnicas no sustituyen la preparación comercial ni el smoke autenticado de producción.

| ID | Prioridad / estado | Qué falta | Criterio de cierre |
| --- | --- | --- | --- |
| TEC-01 | Cerrado localmente en el producto integrado | Dependencias actualizadas; auditorías frontend/backend sin vulnerabilidades y regresión afectada aprobada. | Mantener auditorías al umbral moderate y comprobación Linux por SHA. |
| TEC-02 | P0, resultado remoto por SHA | Regresión local del conjunto documentada; consultar Quality del commit final de `main`. | Unitarias, lint, Knip, build, auditorías e integración/navegador de ese candidato aprobados en Linux. |
| TEC-03 | Publicación integrada documentada | Código de producto, Functions, reglas, índices y Hosting identificados en el registro del 01/11; Vercel sigue el push de `main`. | Comprobar deployment Vercel del SHA final y conservar el registro de versiones/hashes. |
| TEC-04 | P0, comprobación remota pendiente | Verificar el candidato final y su configuración: Auth/OAuth si se ofrece, App Check, legal, índices READY, IAM/secretos y mantenimiento. | Recorridos QA de paciente/profesional/admin y denegaciones esperadas, sin relajar controles ni usar expedientes reales. |
| TEC-05 | P0, control económico no acreditado | Definir presupuesto, destinatarios y respuesta; verificar cuotas y separar Firebase backend, Hosting, Vercel e IA. | Configuración y evidencia reales, consumo observado y límites acordados. La simulación financiera no es un presupuesto configurado. |

La [auditoría financiera](finance/auditoria-costos-2026-10-30.md) contiene objetivos de ahorro. Las entregas de backend, frontend e IA están integradas y probadas; los informes de cada área y el registro del 01/11 delimitan su evidencia. El presupuesto interno de admisión de IA no acredita alertas de Billing ni costos reales observados.

## 4. Acciones comerciales y de operación

Se conservan los IDs anteriores. Nombres y cobertura quedan por registrar. No incluir credenciales, recibos ni información clínica en estos documentos.

| ID | Pendiente vigente | Responsable | Cierre verificable |
| --- | --- | --- | --- |
| OP-01 | Definir quién recibe, acusa y resuelve alertas. La entrega al buzón ya está acreditada. | Responsable técnico y suplente | Cobertura, frecuencia y respuesta acordadas; acceso utilizable a diagnóstico y recuperación. |
| OP-02 | Completar cambio de contraseña y login posterior de la cuenta QA. | Titular de la cuenta QA | Recuperación de extremo a extremo; no basta con que Firebase acepte enviar un correo. |
| OP-03 | Preparar profesionales reales de apertura. La tarifa QA S/1,10 no habilita cobros reales. | Responsable comercial y cada profesional | Perfil/datos revisados, tarifa real válida, reparto/enlace correctos, horarios futuros y recepción activada expresamente. No activar perfiles ficticios o heredados en masa. |
| OP-04 | Pago controlado y conciliación, reservados para la fase financiera final. | Titular y conciliador | Importe, cuenta/destino y autorización concretos; pago/cita/obligación coherentes y resolución de fondos de prueba. No se ejecuta desde esta revisión. |
| OP-05 | Asignar responsables y atender la bandeja administrativa publicada. | Administrador y suplente | Scheduler y tareas disponibles; falta registrar cobertura, responsables y atención real. Los avisos anteriores preservados siguen en revisión. |
| OP-06 | Resolver desde Operaciones las reservas afectadas por profesionales que dejan de atender. | Administrador | Agenda afectada revisada, coordinación y cancelación por caso; pagos confirmados enviados a devolución. La pausa de nuevas reservas no cancela citas existentes. |

La publicación automatiza el vencimiento y concentra conciliación, excepciones y revisiones en administración. La confirmación del pago permanece manual. El registro del 01/11 acredita por separado el nuevo scheduler y sus ejecuciones; la asignación y respuesta humana siguen pendientes.

## 5. Revisión humana, conservación y trazabilidad

| ID | Estado actual | Qué queda |
| --- | --- | --- |
| VD-01 | Revisión profesional independiente de apoyo pendiente; el titular decidió el 26/10 mantener el sistema y contactar psicólogos reales. | Registrar profesional, versión, casos y dictamen cuando se realice; delimitar el alcance de apertura mientras siga pendiente. Sin botón de aprobación ni certificación clínica de tests técnicos. |
| VD-02 | Suspensión y conservación implementadas y publicadas el 27/10. Habilitar eliminación productiva deja de ser requisito de esta fase. | Aclarar finalidad/conservación por categoría y tratamiento de respaldos. Suspender no aprueba conservar indefinidamente. |
| VD-03 | Código de producto y artefactos relacionados en el registro del 01/11. | Conservar el enlace de Quality y Vercel del SHA final al decidir la apertura. |
| VD-04 | Referencias activas reconciliadas en esta revisión; los históricos conservan sus fechas. | Mantener matriz al cambiar candidato. REV-SEG-01/02 del 21/10 siguen cerrados; alertas y verificación de correo tienen evidencia posterior. |

## 6. Recuperación y pruebas aplazadas

| Comprobación | Estado y tratamiento |
| --- | --- |
| Backup/restauración real | Aplazada por el titular; una copia entre proyectos demo no demuestra recuperación productiva. Existencia/antigüedad de copia administrada no consultadas hoy. Registrar la brecha en el acta; no ejecutar un restore por la existencia del plan. |
| Rollback de aplicación | Identificar versión recuperable, operador y compatibilidad. Revertir HTML no restaura Firestore, Auth o pagos. El ensayo remoto actual no se acredita en esta revisión. |
| Caída real de OpenAI | Aplazada. Conservar pruebas sintéticas, continuidad guiada y ayuda; no presentarlas como ensayo real del proveedor. |
| Dispositivos físicos y Safari/iOS | Aplazados. Viewports de Chromium no certifican otros navegadores/equipos. |

Las decisiones previas persisten. Registrar impacto, mitigación y responsable de las brechas al decidir el alcance. Esta actualización no levanta exclusiones.

## 7. Orden práctico para cerrar

1. Conservar el candidato integrado y sus hashes/versiones registrados. TEC-01 tiene auditorías locales aprobadas.
2. Verificar Quality completo y Vercel del SHA final, con backend compatible.
3. Confirmar presupuesto/cuotas y preparar profesionales, cobertura, soporte y gestión de citas pendientes. Completar recuperación de contraseña.
4. Registrar decisiones humanas, alcance de pruebas aplazadas y recuperación/versiones compatibles.
5. Publicar solo componentes necesarios conforme al [procedimiento de release](operations/pilot-release.md), si corresponde; registrar versión y smoke autorizado. Vercel comparte producción.
6. Ejecutar el pago controlado cuando se retome la fase financiera autorizada y cerrar conciliación. Registrar la decisión de apertura.

Revalidar si cambian SHA, políticas o artefacto. `verify:pilot-config` es una herramienta offline histórica para staging: exige eliminación/variables legales que no describen completamente el modelo actual. No cambiar `APP_ENV` ni habilitar borrados para hacerlo pasar; revisar las comprobaciones aplicables y las consolas.

## 8. Acta de apertura

| Campo | Valor pendiente |
| --- | --- |
| Fecha/hora y titular | Por registrar |
| Candidato / Quality / Hosting / Vercel / backend | Relacionar evidencias finales |
| TEC-01 a TEC-05 | Cierre verificable del candidato |
| OP-01 a OP-06 | Cierre o resolución concreta que delimite la operación admitida |
| VD-01 a VD-04 | Estado y responsables de decisiones pendientes |
| Recuperación y exclusiones | Alcance, impacto, mitigación y responsable |
| Operador, suplente y cobertura | Por asignar/documentar |
| Presupuesto y capacidad admitida | Por definir con datos reales |
| Decisión y alcance | Abrir o posponer; usuarios admitidos y condiciones |

Esta revisión no declara una nueva decisión de apertura ni autorización de cobro.

## 9. Referencias

- [Publicación del 01/11](operations/publicacion-main-2026-10-31.md): integración, validación y versiones desplegadas.
- [Revisión del 31/10](operations/revision-produccion-2026-10-31.md): antecedente de CI y divergencia pública antes de integrar.
- [Seguimiento técnico](production-readiness.md) y [matriz](functional/matriz-cierre-piloto.md).
- [Cierre del 25–26/10](operations/cierre-operativo-2026-10-25.md): alertas, contraseña, tarifa QA y decisiones humanas.
- [Publicación del 27/10](operations/validacion-produccion-2026-10-27.md): suspensión/inactividad y acceso.
- [Preparación profesional](operations/onboarding-2026-10-29.md) y [guías unificadas](operations/onboarding-unificado-2026-10-30.md).
- [Pagos](operations/pilot-payments.md), [privacidad](operations/pilot-privacy.md) y [revisión de ayuda](operations/pilot-help-review.md).
- [Infraestructura](infarsetructura/plan-operativo-mvp.md), [estrategia](infarsetructura/estrategia-implementacion.md) y [costos](finance/auditoria-costos-2026-10-30.md).
