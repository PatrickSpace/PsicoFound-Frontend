# Plan de salida a producción de Lurems

Última revisión: **31 de octubre de 2026, America/Lima**.
Base observada: `48967838c3762be13e0dbdaa92d8d2ab0fc2fd9c` (`main`), con optimizaciones posteriores en trabajo en el workspace compartido.

Este documento concentra los pendientes vigentes. La evidencia nueva está en la [revisión del 31/10](operations/revision-produccion-2026-10-31.md). Los expedientes fechados conservan el alcance de sus propias entregas.

## Automatización operativa en el workspace

El alcance final autorizado incorpora vencimiento automático, UI de plazo terminado y `/admin/operaciones` con tareas, responsables e historial. Los cobros conservan conciliación administrativa: no se publica API ni webhook de Mercado Pago. Véanse [operación](operations/automatizacion-operativa-2026-10-31.md) y [publicación a main](operations/publicacion-main-2026-10-31.md). Las acciones comerciales y humanas pasan a tareas del administrador; el cobro controlado sigue pendiente.

## 1. Decisión actual

**La app está publicada técnicamente. Falta aprobar el candidato actual y cerrar la preparación comercial y operativa antes de abrir con cobros.**

Quality de `4896783` falló por dependencias del backend; integración y navegador no llegaron a ejecutarse en ese run. Vercel publicó ese SHA, pero Firebase Hosting sirve una entrada distinta. Vercel en verde no equivale a aceptación del lanzamiento.

| Componente | Estado y evidencia |
| --- | --- |
| Firebase | `psicosaas-3c819`, Firestore `(default)` y Functions en `southamerica-east1`. Ambos frontends comparten backend. |
| Sitio de usuarios | `https://app.lurems.lat`, Hosting `luremsapp`; HTML/JS disponibles, entrada distinta del build local revisado. |
| Vercel | `https://psico-found-frontend.vercel.app`; HTML y seis assets iniciales coinciden con el build local. No es staging aislado. |
| Candidato | `4896783`; [Quality 41159307043](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/41159307043) fallido. Cambios posteriores de optimización sin aceptación consolidada. |
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
| Agenda y pagos | Reserva, reprogramación, rechazo con motivo, registro/corrección de atención, snapshots y conciliación manual implementados. Se añadieron confirmación automática, scheduler y tareas locales; activación pendiente. |
| Preparación profesional | Perfil revisado, tarifa, disponibilidad y activación/pausa explícitas; backend y Hosting publicados el [30/10](operations/onboarding-2026-10-29.md). Perfiles heredados conservan compatibilidad hasta adoptar la nueva preparación. |
| Acompañamiento del paciente | Guías posteriores a cita/pago y Functions `getPatientCareGuide`/`savePatientCareGuide`: publicación de Functions documentada en la entrega del [30/10](operations/onboarding-spotlight-2026-10-30.md). |
| Guías visuales unificadas | Frontend `4896783`; 50 unitarias frontend, 117 backend y 11 casos integrados específicos documentados el [30/10](operations/onboarding-unificado-2026-10-30.md). Falta aceptación completa en Quality y conciliación de Hosting. |
| Alertas | Entrega y recuperación al buzón comprobadas el 25/10 en el [expediente operativo](operations/cierre-operativo-2026-10-25.md). Guardia/respuesta humana pendientes. |

Una prueba en emuladores no acredita producción. Un 401 sin credenciales no acredita un recorrido autenticado. Publicar textos legales no completa por sí solo las decisiones de conservación o la revisión profesional del apoyo.

## 3. Bloqueos técnicos del próximo candidato

P0 significa cerrar antes de promover el candidato para apertura con cobros. No implica que el sitio esté caído. Integrar primero los trabajos paralelos y validar un estado estable.

| ID | Prioridad / estado | Qué falta | Criterio de cierre |
| --- | --- | --- | --- |
| TEC-01 | P0, fallo confirmado en CI | Resolver dependencias de Functions: 11 entradas moderadas en auditoría completa; cuatro permanecen sin devDependencies. | Árbol compatible revisado, auditoría al umbral actual aprobada y regresión afectada verde. No bajar el umbral ni forzar cambios mayores sin validar. |
| TEC-02 | P0, sin regresión completa del candidato | Obtener Quality verde del SHA final; el run actual omitió integración/navegador. El lint local encontró un import sin uso durante cambios ajenos; el lint del SHA remoto sí pasó. | Unitarias, lint, Knip, build, auditorías e integración/navegador del candidato final aprobados. No reutilizar conteos de otro SHA. |
| TEC-03 | P0, artefactos distintos comprobados | Conciliar Hosting, Vercel y backend y decidir qué entrega se promueve. | SHA frontend, versión Hosting, deployment Vercel y Functions/reglas/índices compatibles identificados; publicación y smoke cuando corresponda. |
| TEC-04 | P0, comprobación remota pendiente | Verificar el candidato final y su configuración: Auth/OAuth si se ofrece, App Check, legal, índices READY, IAM/secretos y mantenimiento. | Recorridos QA de paciente/profesional/admin y denegaciones esperadas, sin relajar controles ni usar expedientes reales. |
| TEC-05 | P0, control económico no acreditado | Definir presupuesto, destinatarios y respuesta; verificar cuotas y separar Firebase backend, Hosting, Vercel e IA. | Configuración y evidencia reales, consumo observado y límites acordados. La simulación financiera no es un presupuesto configurado. |

La [auditoría financiera](finance/auditoria-costos-2026-10-30.md) contiene objetivos de ahorro. Los tres prompts de backend, frontend e IA no acreditan implementación ni aceptación. Registrar sus resultados y repetir regresión al integrarlos, especialmente si cambian matching, contexto, cuotas o caché.

## 4. Acciones comerciales y de operación

Se conservan los IDs anteriores. Nombres y cobertura quedan por registrar. No incluir credenciales, recibos ni información clínica en estos documentos.

| ID | Pendiente vigente | Responsable | Cierre verificable |
| --- | --- | --- | --- |
| OP-01 | Definir quién recibe, acusa y resuelve alertas. La entrega al buzón ya está acreditada. | Responsable técnico y suplente | Cobertura, frecuencia y respuesta acordadas; acceso utilizable a diagnóstico y recuperación. |
| OP-02 | Completar cambio de contraseña y login posterior de la cuenta QA. | Titular de la cuenta QA | Recuperación de extremo a extremo; no basta con que Firebase acepte enviar un correo. |
| OP-03 | Preparar profesionales reales de apertura. La tarifa QA S/1,10 no habilita cobros reales. | Responsable comercial y cada profesional | Perfil/datos revisados, tarifa real válida, reparto/enlace correctos, horarios futuros y recepción activada expresamente. No activar perfiles ficticios o heredados en masa. |
| OP-04 | Pago controlado y conciliación, reservados para la fase financiera final. | Titular y conciliador | Importe, cuenta/destino y autorización concretos; pago/cita/obligación coherentes y resolución de fondos de prueba. No se ejecuta desde esta revisión. |
| OP-05 | Activar la automatización y asignar responsables de la bandeja administrativa. | Administrador y suplente | Functions e índices publicados, scheduler activo, conciliación administrativa y tareas atendidas. No se requiere conexión al proveedor. Los avisos anteriores preservados siguen en revisión. |
| OP-06 | Resolver desde Operaciones las reservas afectadas por profesionales que dejan de atender. | Administrador | Agenda afectada revisada, coordinación y cancelación por caso; pagos confirmados enviados a devolución. La pausa de nuevas reservas no cancela citas existentes. |

La nueva implementación automatiza confirmación y vencimiento y concentra excepciones y revisiones en administración. Falta activar y verificarla en el entorno final. El scheduler de inactividad conserva su evidencia anterior; no acredita publicación del nuevo scheduler de pagos.

## 5. Revisión humana, conservación y trazabilidad

| ID | Estado actual | Qué queda |
| --- | --- | --- |
| VD-01 | Revisión profesional independiente de apoyo pendiente; el titular decidió el 26/10 mantener el sistema y contactar psicólogos reales. | Registrar profesional, versión, casos y dictamen cuando se realice; delimitar el alcance de apertura mientras siga pendiente. Sin botón de aprobación ni certificación clínica de tests técnicos. |
| VD-02 | Suspensión y conservación implementadas y publicadas el 27/10. Habilitar eliminación productiva deja de ser requisito de esta fase. | Aclarar finalidad/conservación por categoría y tratamiento de respaldos. Suspender no aprueba conservar indefinidamente. |
| VD-03 | Trazabilidad parcial; divergencia pública observada el 31/10. | Cerrar TEC-02/03 y relacionar artefacto final con calidad y publicación. |
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

1. Integrar los trabajos en curso, corregir TEC-01 y congelar candidato.
2. Aprobar Quality completo de ese SHA y conciliar contratos/backend.
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

- [Revisión del 31/10](operations/revision-produccion-2026-10-31.md): CI, verificaciones locales y divergencia pública.
- [Seguimiento técnico](production-readiness.md) y [matriz](functional/matriz-cierre-piloto.md).
- [Cierre del 25–26/10](operations/cierre-operativo-2026-10-25.md): alertas, contraseña, tarifa QA y decisiones humanas.
- [Publicación del 27/10](operations/validacion-produccion-2026-10-27.md): suspensión/inactividad y acceso.
- [Preparación profesional](operations/onboarding-2026-10-29.md) y [guías unificadas](operations/onboarding-unificado-2026-10-30.md).
- [Pagos](operations/pilot-payments.md), [privacidad](operations/pilot-privacy.md) y [revisión de ayuda](operations/pilot-help-review.md).
- [Infraestructura](infarsetructura/plan-operativo-mvp.md), [estrategia](infarsetructura/estrategia-implementacion.md) y [costos](finance/auditoria-costos-2026-10-30.md).
