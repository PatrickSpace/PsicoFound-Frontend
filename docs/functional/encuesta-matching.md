# Encuesta conversacional y matching

Referencia consolidada: 2026-10-15. Basada en `functions/src/chat/`,
`functions/src/profiles/profile.js`, `functions/src/matching/` y las vistas de encuesta.
El [plan original](../archive/functional/survey-implementation-plan.md) conserva
las decisiones propuestas; sus casillas no representan el estado vigente.

## Acceso y separación de responsabilidades

El frontend llama Functions. El servidor verifica acceso de paciente, elegibilidad,
consentimiento y correo, controla turnos y persistencia y compone preguntas/opciones.
La IA extrae datos estructurados; el matching es determinístico y no llama al modelo.
El acceso real al proveedor requiere la configuración y revisión descritas en
[proveedores](../operations/pilot-provider-review.md). La ayuda está disponible sin
llamada al proveedor y sin consumir cuota; ver [revisión de ayuda](../operations/pilot-help-review.md).

## Turnos, persistencia y recuperación

- `conversation.activeTurn` identifica `id`, `sessionId`, `field`, `kind`, `status`,
  pregunta y opciones. Una opción enviada debe pertenecer al turno/campo vigente.
- El catálogo del servidor fija la pregunta y opciones. Saludos no inventan un motivo;
  «no sé» mantiene el campo pendiente e «indiferente» se aplica al campo activo.
  La confirmación de solo conversar interpreta sí/no en su propio turno.
- Sesión y perfil persisten entre visitas; el reinicio es explícito. Hay carga paginada
  de mensajes anteriores y límites separados del contexto enviado a IA.
- Perfil, mensajes y turno se confirman de forma atómica. Requests identificados,
  leases y controles de concurrencia evitan sobrescrituras y repetición del proveedor
  tras un resultado incierto. La llamada al proveedor ocurre fuera de la transacción.
- Corrección y reset invalidan respuestas tardías. El cliente conserva borrador ante
  fallo y descarta resultados del contexto anterior al cambiar sesión/cuenta.
- La señal heredada de ayuda no se edita como preferencia ni constituye diagnóstico.

## Perfil completo: contrato implementado

`isProfileComplete` considera completo un perfil con señal de ayuda; eso no significa
idoneidad clínica. En el recorrido ordinario exige temas, modalidad, preferencia de
género, enfoque y preferencia de edad. En «solo conversar» exige modalidad, género y
edad. Una respuesta explícita de indiferencia satisface los campos de preferencia;
no equivale a un campo vacío. El servidor calcula `completado`, no el modelo.

Presupuesto, ciudad, disponibilidad y otros campos existentes en el esquema no son
requisitos de completitud ni todos se usan para ordenar recomendaciones. No debe
presentarse el ranking como evaluación clínica.

## Recomendaciones y criterios indispensables

`getRecommendedTherapists` obtiene el perfil propio completado. Normaliza temas,
enfoque, género, modalidad y rango de edad; indiferencia elimina el criterio. El
paciente puede marcar `requiredCriteria` entre `especialidades`, `enfoque`, `genero`,
`modalidad` y `edad`; el servidor ignora claves desconocidas y criterios vacíos.
La vista inicia con la lista de indispensables vacía: modalidad no se impone globalmente.

El ranking suma un punto por especialidad coincidente, dos por enfoque y uno por
género, modalidad y edad. Si hay criterios, requiere puntuación positiva; los
indispensables descartan coincidencias incompatibles. Ordena y toma hasta cinco
profesionales, y después filtra los que tienen disponibilidad futura válida.
Ese orden puede reducir el resultado aunque existan otros profesionales fuera de
los primeros cinco; no se documenta como búsqueda exhaustiva de toda la disponibilidad.

Solo se ofrecen profesionales activos. Cuando modalidad es indispensable también
filtra los bloques por esa modalidad. Se devuelven coincidencias/diferencias,
cantidad de bloques y `outcome`: `ok`, `no_matches` o `no_availability`.
En el código actual híbrido se normaliza como valor propio; no existe aquí una
expansión automática a remoto/presencial.

## Pendiente de producto: fase 6 del plan anterior

El plan propuso modalidad obligatoria, restantes preferencias opcionales e híbrido
como online/presencial. El código actual descrito arriba conserva otro contrato.
No se marca esa fase como terminada al consolidar documentación. Antes de cambiarla,
definir campos mínimos, indiferencia, indispensables, equivalencia híbrida y
compatibilidad con perfiles anteriores; implementar y cubrir los escenarios de
aceptación. Seguimiento: B-04 en la [matriz](matriz-cierre-piloto.md).

## Verificación

Las pruebas de turnos/perfiles/matching están en `functions/src/`; las de concurrencia,
reset y continuidad en `tests/pilot-survey.integration.test.mjs`; los recorridos de
recarga, corrección, paginación y ayuda en `tests/browser/pilot-closure.spec.mjs`.
Comandos y aislamiento: [guía de validación](../operations/validation.md).
Las pruebas sintéticas no acreditan respuestas del proveedor real ni aprobación clínica.
