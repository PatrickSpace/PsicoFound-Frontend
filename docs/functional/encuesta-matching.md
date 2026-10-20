# Encuesta conversacional y matching

Referencia actualizada: 2026-10-20. Basada en `functions/src/chat/`,
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

`isProfileComplete` requiere un tema (o elegir «solo conversar») y una modalidad
válida elegida explícitamente: online, presencial, híbrido o indiferente. Género,
rango de edad y enfoque son opcionales y se pueden añadir o borrar en «Ajustar
preferencias (opcional)». El servidor recalcula la completitud; no confía en una
marca `completado` antigua ni en la respuesta del modelo. La señal heredada de
ayuda mantiene su acceso independiente, sin constituir evaluación clínica.

Presupuesto, ciudad y disponibilidad no son requisitos de completitud. No debe
presentarse el ranking como evaluación clínica ni prometer compatibilidad clínica.

## Recorrido guiado y costos

Producción configura `SURVEY_INPUT_MODE=guided`: inicio idempotente, pregunta de
tema/solo conversar, elección de modalidad y acceso a recomendaciones. No se exige
un saludo inicial. La sesión, las respuestas y los mensajes se conservan al
recargar. El modo guiado oculta el compositor de texto libre; el servidor también
rechaza entradas desconocidas antes de tomar cuota o llamar a un proveedor.
Los campos del editor se guardan directamente, sin extracción por IA.

`CHAT_LIMITS_JSON` limita a 30 envíos diarios por cuenta y 2 operaciones simultáneas
globales, versión `2026-10-guided-v1`. Estos límites cubren también respuestas locales.
No se habilita Gemini ni se acredita su revisión clínica/privacidad/facturación.
El soporte futuro de texto libre conserva los controles existentes del proveedor.
La interfaz guiada evita llamadas a IA, pero utiliza Authentication, Functions y
Firestore; no se afirma costo total cero.

## Recomendaciones y criterios indispensables

`getRecommendedTherapists` obtiene el perfil propio y calcula criterios. La
modalidad concreta siempre es indispensable en el servidor aunque el cliente
omita `requiredCriteria`; no puede flexibilizarse desde el chip. Híbrido admite
online o presencial y un profesional híbrido es compatible con cualquiera de
ambas. La indiferencia explícita no exige una modalidad particular.

Temas, enfoque, género y edad se usan como preferencias flexibles salvo que el
paciente los marque como indispensables. No se usan claves desconocidas ni
criterios vacíos. Se muestran coincidencias y diferencias; la selección no llama
al modelo. El ranking conserva sus pesos: especialidad 1 por coincidencia,
enfoque 2, género/modalidad/edad 1 cada uno.

Solo se ofrecen profesionales activos con bloques futuros válidos y compatibles
con la modalidad. Se revisa la disponibilidad antes de limitar el resultado a
cinco para no perder profesionales disponibles fuera de los primeros puestos.
Los estados siguen siendo `ok`, `no_matches` y `no_availability`.

## Estado de la fase 6

Implementados el mínimo obligatorio, las preferencias opcionales, la compatibilidad
híbrida, el requisito de modalidad en servidor y la lectura de perfiles anteriores.
La publicación y su evidencia se registran en B-04 de la [matriz](matriz-cierre-piloto.md).
La activación de texto libre mediante Gemini es un pendiente separado.

## Verificación

Las pruebas de turnos/perfiles/matching están en `functions/src/`; las de concurrencia,
reset y continuidad en `tests/pilot-survey.integration.test.mjs`; los recorridos de
recarga, corrección, paginación y ayuda en `tests/browser/pilot-closure.spec.mjs`.
Comandos y aislamiento: [guía de validación](../operations/validation.md).
Las pruebas sintéticas no acreditan respuestas del proveedor real ni aprobación clínica.
