# Propuesta de actualización de privacidad 2026-10-v2

Estado: borrador para revisión humana. No publicado.

Motivo: la versión pública `2026-10-v1` menciona una integración prevista con
Gemini, mientras que la encuesta híbrida desplegada usa OpenAI `gpt-6-luna`.
La versión publicada es inmutable y no debe editarse silenciosamente. Después de
la aprobación legal y de producto, se debe crear y publicar una versión nueva desde
Administración → Documentos legales.

## Reemplazo propuesto para la sección 5

### 5. Inteligencia artificial y decisiones

La encuesta conversacional puede usar OpenAI `gpt-6-luna` para responder de forma
empática y ayudar a identificar preferencias para encontrar profesionales. Las
opciones guiadas se procesan localmente y no requieren una solicitud al proveedor
de inteligencia artificial.

Cuando la persona escribe texto libre, se puede enviar a OpenAI el mensaje actual,
el perfil de preferencias permitido y hasta los últimos 15 intercambios completos
de la sesión activa. La plataforma omite atributos administrativos y enmascara
correos y teléfonos detectables antes del envío. Las solicitudes se configuran con
`store: false`. El historial completo permanece en Firebase conforme a la finalidad
del servicio y a los criterios de conservación descritos en esta política; no se
envía íntegramente al proveedor en cada turno.

La finalidad de esta asistencia es sostener una conversación empática, extraer las
preferencias expresadas y detectar señales contextuales que permitan mostrar recursos
de ayuda. La inteligencia artificial no realiza diagnósticos, no selecciona por sí
sola a un profesional, no sustituye el criterio clínico ni constituye un canal de
emergencia. Las recomendaciones se determinan mediante reglas de matching separadas.

Las respuestas pueden contener errores. Si el proveedor no está disponible, la
plataforma informa la incidencia, conserva el borrador y permite continuar mediante
las opciones guiadas. No se usa otro proveedor para enviar el mismo contenido como
respuesta automática al fallo.

Antes de ampliar el proveedor, modelo, finalidad, información enviada o plazo de
conservación se debe realizar una nueva revisión y obtener los consentimientos que
correspondan.

## Controles previos a publicar

- [ ] Revisión legal del texto completo de términos y privacidad.
- [ ] Confirmación del responsable y referencia de aprobación.
- [ ] Verificación de que OpenAI, modelo, finalidad, datos y conservación coinciden
      con la configuración productiva.
- [ ] Creación de una versión distinta de `2026-10-v1`.
- [ ] Previsualización pública de términos y privacidad.
- [ ] Publicación conjunta desde la pantalla administrativa.
- [ ] Comprobación de que cuentas nuevas y existentes deben aceptar la nueva versión.
- [ ] Conservación de la versión `2026-10-v1` para consulta histórica.
