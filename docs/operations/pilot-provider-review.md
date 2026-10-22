# Proveedor de IA: activación controlada

Referencia: 2026-10-21, America/Lima. Activación aprobada por el responsable
del proyecto en la conversación de definición e implementación de la encuesta
híbrida. La clave y el acceso a `gpt-6-luna` se verificaron sin ejecutar una
inferencia.

La encuesta conversacional usa exclusivamente OpenAI `gpt-6-luna` mediante la
Responses API y salida JSON estructurada. No hay proveedor de respaldo: un fallo
produce un estado recuperable en la interfaz y las opciones locales continúan
disponibles. Las respuestas guiadas no llaman al proveedor.

## Configuración requerida

- Secret de Functions: `OPENAI_API_KEY`.
- `PRIMARY_AI_PROVIDER=openai`.
- `AI_MODEL=gpt-6-luna`.
- `FALLBACK_AI_PROVIDER` y `FALLBACK_AI_MODEL` vacíos.
- `SURVEY_INPUT_MODE=hybrid`.
- `AI_USE_APPROVAL_JSON` con estado aprobado, proveedor y modelo exactos,
  alcance `hybrid_survey_matching`, referencia de facturación y revisiones
  clínica y de privacidad.

El servidor falla de forma cerrada si falta una de esas evidencias, si el modelo
o proveedor no coinciden o si se intenta activar el proveedor real dentro de los
emuladores. Nunca se deben guardar claves en archivos `.env` versionados.

## Tratamiento de datos

El payload se limita al perfil permitido, el mensaje actual y los últimos 15
intercambios completos de la sesión activa. Se omiten identificadores y atributos
administrativos, y se enmascaran correo y teléfono detectables. La petición usa
`store: false`. El historial completo permanece en Firestore para el usuario y,
con cita confirmada y consentimiento explícito, para el psicólogo correspondiente.

La IA se limita a empatía, extracción de preferencias y señal contextual de ayuda.
No diagnostica, no recomienda un profesional directamente y no reemplaza la regla
local de seguridad. El matching sigue siendo determinístico.

## Validación previa al despliegue

1. Registrar las aprobaciones reales y la evidencia de facturación sin incluir
   credenciales.
2. Configurar el secret en el proyecto autorizado.
3. Ejecutar pruebas unitarias, lint y compilación; levantar el frontend local con
   `npm` contra las Functions publicadas, sin usar emuladores.
4. Validar sobre las Functions publicadas una respuesta libre, una caída controlada del proveedor, el
   límite de 15 intercambios y que una opción guiada no genere consumo de IA.
5. Revisar App Check, métricas, cuotas y alertas antes de habilitar producción.

Las referencias productivas quedaron registradas en `AI_USE_APPROVAL_JSON`. La
existencia del código o de una prueba sintética no sustituye futuras revisiones
cuando cambien el proveedor, modelo, alcance, tratamiento de datos o protocolo
de seguridad.
