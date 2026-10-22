# Encuesta conversacional y matching

Referencia actualizada: 2026-10-21. Basada en `functions/src/chat/`,
`functions/src/profiles/profile.js`, `functions/src/matching/` y las vistas de encuesta.

## Contrato de la encuesta

La encuesta es híbrida. Las opciones guiadas permanecen visibles y se procesan
localmente; el texto libre se envía a OpenAI con `gpt-6-luna` para responder con
empatía y extraer datos estructurados. La IA no decide qué preguntar ni ejecuta
el matching: el servidor conserva esas decisiones de forma determinística.

Se registran el motivo o la decisión de solo conversar, modalidad, preferencia de
género, preferencia de edad y enfoque. El orden es dinámico: solo se pregunta el
primer dato que aún falta. «Me da igual», «indiferente» o una opción equivalente
es una respuesta válida y nunca se interpreta como campo pendiente. Si se elige
solo conversar no se exige tema ni enfoque.

Cuando una respuesta libre contiene varios datos claros se extraen juntos. Si
contradice un valor ya guardado, se solicita confirmación antes de sobrescribirlo.
Tras cinco respuestas consecutivas sin nueva información estructurada se hace una
pregunta directa, natural y acompañada de sus opciones.

## Persistencia, resumen y seguridad

- Perfil, conversación y mensajes se conservan sin eliminación automática a los
  30 días. Reiniciar abre una sesión nueva, pero mantiene el historial anterior.
- El contexto activo enviado al modelo contiene como máximo los últimos 15
  intercambios completos de la sesión actual. El historial visible no se limita a
  esos intercambios y se pagina por separado.
- Antes de mostrar recomendaciones se presenta un resumen editable. Solo la
  confirmación explícita crea el resumen aprobado y habilita el matching.
- Una corrección posterior invalida la confirmación y exige revisar otro resumen.
- El frontend conserva el texto escrito si la IA falla, informa que puede
  reintentarse en unos minutos y mantiene disponibles la pregunta y sus opciones.
- Las señales de ayuda se detectan con una regla local y con una señal contextual
  de Luna. Interrumpen la encuesta para mostrar recursos, no modifican el perfil,
  no constituyen diagnóstico y permiten reanudar el turno pendiente.
- Los eventos de seguridad se registran separados de las preferencias. Un aviso
  discreto de recursos de ayuda permanece visible durante la conversación.

Las operaciones usan identificadores, leases y transacciones para evitar dobles
envíos, resultados tardíos y sobrescrituras. El proveedor se llama fuera de la
transacción. El payload omite atributos administrativos y enmascara datos de
contacto detectables.

## Recomendaciones

Todas las respuestas se usan para ordenar perfiles, no como filtros obligatorios.
Se muestran hasta cinco profesionales activos con disponibilidad futura, primero
los más afines. Cuando no existe una coincidencia exacta, se presenta la opción
más cercana y se indican de forma discreta las diferencias. La selección no llama
a la IA y no se presenta como evaluación clínica.

El ranking conserva sus pesos: especialidad 1 por coincidencia, enfoque 2 y
género, modalidad y edad 1 cada uno. Una respuesta indiferente no añade ni resta
afinidad para ese criterio.

## Compartir con el psicólogo

Al reservar como paciente se muestra este consentimiento:

> Al confirmar la cita, autorizas a compartir con este psicólogo el resumen que
> aprobaste y el historial completo de esta conversación. Su acceso se retirará
> si cancelas la cita.

La reserva exige el resumen confirmado y la aceptación incluida en la acción de
confirmar. El psicólogo recibe primero una copia inmutable del resumen aprobado y
puede abrir el historial completo de forma opcional. El acceso solo existe con una
cita confirmada, se retira al cancelarla y una cita con otro profesional requiere
un consentimiento nuevo.

## Verificación

Las pruebas unitarias cubren perfil, turnos, proveedor, historial y matching. Las
pruebas integrales validan concurrencia, reset, consentimiento, reserva y acceso;
los recorridos de navegador cubren recarga, corrección, resumen, paginación y
ayuda. Consulta `docs/operations/validation.md` para los comandos y el aislamiento.
