# Plan consolidado de salida a producción de Lurems

Fecha de consolidación: **25 de octubre de 2026**, America/Lima.
Actualización de alcance: **26 de octubre de 2026**.
Base local revisada: commit `d8ad39c` de `main`.

Evidencia de la publicación del 27/10:
[informe de validación integrada](operations/validacion-produccion-2026-10-27.md).

Ejecución y propuestas posteriores:
[expediente de cierre operativo](operations/cierre-operativo-2026-10-25.md).
Recepción de alertas comprobada; perfil actual configurado con tarifa de prueba.
La tarifa real de apertura y el cambio final de contraseña continúan pendientes.

Este documento es el punto de seguimiento para decidir la apertura operativa del
MVP. Consolida documentación del repositorio; su creación no incluye nuevas pruebas,
consulta de consolas ni despliegues. «Documentado como completado» conserva la
evidencia de la entrega anterior y no significa revalidado hoy.

## 1. Decisión actual

**La aplicación está publicada y el cierre técnico está documentado. La apertura
operativa a pacientes con cobros conserva acciones pendientes.** Publicación técnica
y aceptación para operar son decisiones separadas.

El siguiente paso es cerrar las acciones de la sección 3, resolver las verificaciones
documentales de la sección 4 y registrar la decisión de apertura en la sección 8.
Las exclusiones de la sección 5 se mantienen: este plan no autoriza ejecutarlas.

| Componente | Referencia |
| --- | --- |
| Sitio de usuarios | `https://app.lurems.lat` |
| Frontend Vercel | `https://psico-found-frontend.vercel.app` |
| Firebase | Proyecto `psicosaas-3c819`, región de Functions `southamerica-east1` |
| Hosting | Sitio `luremsapp` |
| Rama de entrega | `main`; Vercel publica al recibir un push según la configuración documentada |
| Versión legal vigente documentada | `2026-10-v2` |

Vercel y Hosting utilizan el mismo backend según el plan de infraestructura.
Una prueba en Vercel puede modificar datos de producción; no es un staging aislado.

## 2. Completado según la entrega vigente

| Área | Resultado documentado |
| --- | --- |
| Encuesta | Modo híbrido: opciones guiadas y texto libre con OpenAI `gpt-6-luna`; smoke autenticado con respuesta, resumen y matching coherentes. |
| Continuidad | Historial recuperable tras recarga, indiferencia válida, resumen editable y confirmado; borrador y opciones guiadas ante fallo de IA. La caída real del proveedor no se ensayó. |
| Acceso | Elegibilidad 18+, consentimiento versionado en registro con retorno al destino y recuperación de cuentas incompletas. |
| Correo | Verificación de Firebase entregada y completada en buzón de prueba; recuperación de contraseña enviada, con cambio final pendiente. |
| Seguridad | App Check exigido y observado válido; llamada directa sin credenciales rechazada. Secreto OpenAI en Functions; cuotas, concurrencia e idempotencia. |
| Privacidad de la encuesta | Enmascarado de contactos detectables, `store: false` y hasta 15 intercambios completos enviados al proveedor; historial completo conservado en Firestore. |
| Acceso profesional | Resumen y transcript sujetos a consentimiento, vínculo y aprobación del pago de la primera cita. Su cancelación retira el acceso; una cita posterior no lo reactiva por sí sola. |
| Agenda | Rechazo profesional con motivo y solicitud de otro horario; registro de fecha real de atención, correcciones e historial. |
| Administración | Gestión legal, tarifas, conciliación manual y panel de alertas protegidos por rol. |
| Legal | Versión `2026-10-v2` publicada e inmutable; renovación de aceptación comprobada. Publicar textos no acredita por sí solo todas las decisiones de retención. |
| Alertas | Canal de correo, métrica y política de Cloud Monitoring habilitados; recepción humana pendiente. |
| Calidad | Seguimiento reciente: 44 pruebas frontend, 96 backend, lint y build aprobados. La matriz registra 102 pruebas de navegador aprobadas para el release `481f60b`; no se atribuyen automáticamente al commit actual. |
| Publicación | Frontend, Functions, reglas e índices publicados según el seguimiento; rutas públicas y navegación comprobadas. El identificador exacto del despliegue debe constar en el acta final. |

La fuente principal de estos resultados es
[preparación para producción](production-readiness.md). Los informes anteriores
conservan su fecha y alcance; un pendiente antiguo no reabre una comprobación
posterior explícitamente cerrada.

## 3. Acciones para completar la operación

Responsables propuestos por función; los nombres y fechas quedan por asignar.
Ninguna casilla pendiente equivale a autorización de un cobro o una operación sensible.

| ID | Acción pendiente | Responsable | Evidencia necesaria para cerrar |
| --- | --- | --- | --- |
| OP-01 | Entrega al buzón comprobada mediante conector autorizado; definir respuesta humana operativa. | Titular del buzón | Avisos de activación y recuperación del 25/10/2026, 01:38 y 01:42 de Lima; incidente `0.oe8bafj112jg`. Ver expediente. |
| OP-02 | Completar recuperación de contraseña con una cuenta de prueba y buzón controlado. | Titular de la cuenta QA | Nueva contraseña establecida e inicio de sesión posterior correcto; no registrar contraseña ni enlace de acción. |
| OP-03 | Perfil actual configurado con tarifa de prueba S/1.10 por instrucción del titular. Sigue pendiente seleccionar tarifa real para apertura. | Responsable comercial y cada profesional | Guardado verificado en Configuración. Las tarifas de prueba no habilitan cobros con política real. |
| OP-04 | Ejecutar una transacción controlada y conciliarla cuando exista autorización financiera. | Titular y conciliador | Importe y referencia externa verificados; operación, cita y obligación consistentes; resolución documentada de los fondos de prueba. |
| OP-05 | Nombrar conciliador, suplente y frecuencia de revisión de pagos, vencimientos y solicitudes. | Responsable operativo | Acuerdo escrito con responsables, frecuencia y tiempos de respuesta. No hay scheduler de vencimientos. |
| OP-06 | Definir el tratamiento de citas existentes cuando un profesional se desactiva o no puede atender. | Operación y responsable clínico | Procedimiento para contactar, revisar cada cita y resolver horario/pago; no existe reasignación automática. |

OP-01 a OP-04 proceden del seguimiento más reciente. OP-05 y OP-06 consolidan
obligaciones abiertas en la guía de pagos y en la matriz del piloto. No son nuevas
funcionalidades asumidas como implementadas.

## 4. Verificaciones documentales antes de declarar el cierre

Hay referencias antiguas que no coinciden con el cierre reciente. Antes de abrir
el servicio se debe localizar evidencia vigente o registrar expresamente qué falta;
no basta con cambiar una casilla a completada.

| ID | Comprobación | Criterio de cierre |
| --- | --- | --- |
| VD-01 | Acción humana pendiente: el titular contactará a psicólogos reales para revisar casos y sistema de apoyo. Por decisión del 26/10 se mantiene el comportamiento actual. | Registrar la revisión real cuando se realice; sin botón de aprobación ni cierre clínico automático. |
| VD-02 | Decisión del 26/10: suspensión con reactivación por el titular, tipo voluntario/involuntario, revisión tras tres meses sin actividad y conservación de datos sin eliminación productiva. Implementación validada y publicada el 27/10; ver informe de entrega. | Validar y publicar el [contrato de suspensión](functional/suspension-cuentas.md). La política ejecutable de eliminación deja de ser requisito de esta entrega; no equivale a aprobar conservación perpetua. |
| VD-03 | Trazabilidad del candidato desplegado y comprobaciones de calidad. | Relacionar commit exacto, ejecución de Quality, despliegue Vercel, versión Hosting y componentes backend. Registrar cualquier diferencia con `d8ad39c`. |
| VD-04 | Resolver referencias contradictorias de la matriz. | Mantener el cierre de registro/consentimiento REV-SEG-01/02; actualizar las filas antiguas de alertas, correo y smoke autenticado con referencias al cierre posterior. |

La consolidación no afirma que falten implementaciones para VD-01/02: falta aclarar
su aprobación y alcance con evidencia coherente. Los procedimientos y controles
técnicos existentes no sustituyen esa decisión.

## 5. Exclusiones que se conservan

| Prueba aplazada por el titular | Estado y condición para retomarla |
| --- | --- |
| Caída real de OpenAI | No ejecutada. Requiere ventana controlada futura; comprobar borrador y continuidad guiada. |
| Dispositivos físicos | No ejecutada. La prueba en viewport móvil no acredita Safari/iOS ni equipos físicos. |
| Backup y restauración | Ensayo real no ejecutado. Requiere proyecto aislado y verificación de datos y accesos. No se presume recuperación productiva demostrada. |

El acta de apertura debe reconocer estas limitaciones. No se registran como
aprobadas ni se ejecutan por la sola existencia de este plan.

## 6. Trabajo posterior y decisiones de alcance

Estos puntos no deben confundirse con fallos confirmados del release:

- Definir alta/finalización terapéutica, inasistencia y facultades del profesional
  para cambiar el estado de una terapia. Requieren acuerdo funcional antes de código.
- Validar con usuarios la alternancia paciente/psicólogo, estados vacíos y tabla
  de pacientes. La validación en dispositivos físicos sigue excluida por ahora.
- Medir rendimiento real y decidir si compensa optimizar fuente MDI e importaciones.
- Reducir complejidad de componentes de encuesta/cita con regresión visual.
- Medir volumen administrativo antes de introducir paginación y búsqueda remotas.
- Definir canal externo de recordatorios si forma parte de la oferta del servicio.

Priorizar según uso observado, sin ampliar automáticamente el alcance de la apertura.

## 7. Comprobación final de publicación

Si se modifica código o configuración antes de abrir, validar el nuevo candidato;
no reutilizar resultados de otro commit como aprobación de la nueva entrega.

- [ ] Registrar commit y estado de Quality de ese candidato.
- [ ] Confirmar configuración pública de frontend antes del build y mantener los
      secretos fuera de Git y del navegador. El incidente previo de página en blanco
      por ausencia de `VITE_FIREBASE_*` exige comprobación visual posterior.
- [ ] Publicar únicamente los componentes cambiados y registrar sus versiones.
      Si afecta índices/reglas/Functions/frontend, usar el orden y compatibilidad
      definidos en el procedimiento de despliegue.
- [ ] Comprobar inicio, login, registro, términos, privacidad y entrada de encuesta.
- [ ] Verificar con cuentas QA autorizadas consentimiento, encuesta, resumen,
      recomendaciones y acceso profesional; no introducir información clínica real.
- [ ] Revisar consola, logs, App Check y alertas sin exponer mensajes, tokens ni datos personales.
- [ ] Identificar versión recuperable y operador responsable; no ejecutar el ensayo
      de restauración excluido. Registrar un plan de reversión compatible con los datos.

Estas casillas son la lista de la próxima decisión de apertura, no una declaración
de que las comprobaciones documentadas anteriormente hayan fallado.

## 8. Acta de decisión de apertura

Completar cuando existan las evidencias; este documento no declara una nueva
autorización de lanzamiento.

| Campo | Valor |
| --- | --- |
| Fecha y hora, America/Lima | Pendiente |
| Titular que decide la apertura | Pendiente |
| Responsable operativo y suplente | Pendiente |
| Commit / Quality / versiones desplegadas | Pendiente de vincular |
| OP-01 a OP-06 | Pendiente de cierre o decisión explícita documentada |
| VD-01 a VD-04 | Pendiente de evidencia / resolución |
| Exclusiones reconocidas | Pendiente de registrar en la decisión |
| Resultado de comprobación final | Pendiente |
| Decisión: abrir / posponer | Pendiente |
| Alcance, usuarios admitidos y condiciones | Pendiente |

## 9. Fuentes y mantenimiento

- [Seguimiento de producción, 25 de octubre](production-readiness.md): evidencia del cierre técnico y acciones humanas.
- [Matriz del piloto](functional/matriz-cierre-piloto.md): cobertura funcional e histórico; conserva filas anteriores al cierre reciente.
- [Encuesta y matching](functional/encuesta-matching.md): contrato funcional vigente.
- [Pagos y conciliación](operations/pilot-payments.md): tarifas, reservas, cola manual y límites financieros.
- [Revisión de ayuda](operations/pilot-help-review.md): alcance y revisión clínica pendiente de conciliar.
- [Cuenta y privacidad](operations/pilot-privacy.md): conservación, eliminación y operación privilegiada.
- [Privacidad publicada 2026-10-v2](legal/privacy-2026-10-v2-proposal.md): publicación y renovación de consentimiento.
- [Plan de infraestructura](infarsetructura/plan-operativo-mvp.md) y [estrategia](infarsetructura/estrategia-implementacion.md): procedimientos propuestos; no acreditan por sí mismos acciones ejecutadas.

Actualizar esta lista al cerrar un ID: fecha, responsable, referencia de evidencia
y limitaciones. Mantener los históricos sin reescribir sus resultados; ante una
contradicción nueva, marcarla y resolverla antes de dar el requisito por cerrado.
