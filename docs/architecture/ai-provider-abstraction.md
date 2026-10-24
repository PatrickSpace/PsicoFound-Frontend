# AI Provider Abstraction

## Objetivo

PsicoSaaS no debe acoplar su logica de negocio a un SDK concreto de IA. La
capa de abstraccion permite cambiar el proveedor por configuracion, sin tocar
los servicios de negocio ni mover informacion sensible al frontend.

Flujo esperado:

```text
Frontend
  -> Cloud Functions
    -> Servicios de negocio
      -> AIService
        -> AIProviderFactory
          -> AIProvider
            -> GeminiProvider | OpenAIProvider | ClaudeProvider
```

## Ubicacion

La implementacion vive en `functions/src/ai`:

- `AIService.js`: punto unico usado por el backend para tareas de IA.
- `AIProviderFactory.js`: selecciona proveedor principal y fallback.
- `types.js`: contrato comun documentado con JSDoc.
- `types.d.ts`: contrato TypeScript para proveedores y entradas/salidas.
- `errors.js`: errores estandarizados de proveedores.
- `providers/OpenAIProvider.js`: proveedor activo para la encuesta híbrida.
- `providers/GeminiProvider.js`: adaptador heredado, no habilitado en la encuesta.
- `providers/ClaudeProvider.js`: proveedor preparado para uso futuro.
- `responseSchemas.js`: esquemas neutrales para salidas estructuradas.

Los servicios de negocio no deben importar SDKs ni proveedores concretos.

## Habilitación del proveedor

Disponer de un adaptador o una API key no habilita el uso real. Las políticas de
`functions/src/ai/providerPolicy.js` requieren revisiones/configuración explícitas;
los emuladores bloquean llamadas reales. Consultar [revisión del proveedor](../operations/pilot-provider-review.md),
[encuesta/matching](../functional/encuesta-matching.md) y [matriz de aceptación](../functional/matriz-cierre-piloto.md).
Los modelos siguientes describen la configuración del repositorio, no una
recomendación ni verificación de disponibilidad del servicio externo.

## Proveedores Soportados

Proveedor principal actual:

- `openai` con `gpt-6-luna` mediante Responses API.

La encuesta no configura proveedor secundario para evitar enviar el mismo texto
sensible a otro servicio después de un fallo. Gemini y Claude/Anthropic siguen
disponibles como adaptadores de la abstracción, pero no están habilitados en este
flujo.

Si OpenAI o Claude se seleccionan sin API key, el provider lanza
`AIProviderConfigurationError` con un mensaje claro.

## Variables De Entorno

Configuracion generica:

```bash
PRIMARY_AI_PROVIDER=openai
FALLBACK_AI_PROVIDER=
AI_MODEL=gpt-6-luna
FALLBACK_AI_MODEL=
```

Credenciales y modelos por proveedor:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=
OPENAI_MODEL=gpt-6-luna

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

En Firebase, las API keys deben configurarse como secrets o variables seguras
del entorno de Functions. Nunca deben exponerse en el cliente.

## Estrategia De Fallback

`AIService` soporta fallback para otros usos, pero la encuesta llama con
`allowFallback: false`. Si OpenAI no está disponible, la interfaz conserva el
texto, mantiene las opciones locales y permite reintentar más tarde.

Cuando otro flujo configure un secundario, este se instancia solamente tras un
error recuperable. Si tiene el mismo nombre y modelo efectivo que el principal,
no se repite la llamada.

Errores retryable:

- `AIProviderUnavailableError`
- `AIProviderRateLimitError`

Errores no retryable:

- `AIProviderConfigurationError`
- `AIProviderInvalidResponseError`

La respuesta normalizada incluye:

- `provider`
- `model`
- `usage` si el proveedor lo entrega
- `fallbackUsed`

## Logs Y Privacidad

Los logs de IA incluyen:

- proveedor usado;
- modelo usado;
- duracion;
- si hubo fallback;
- tipo de error;
- tokens usados cuando estan disponibles.

No se registran prompts, mensajes completos, motivos de consulta ni datos
clinicos. Esto es especialmente importante porque PsicoSaaS procesa informacion
relacionada con salud mental.

## Como Agregar Un Nuevo Proveedor

1. Crear `functions/src/ai/providers/NuevoProvider.js`.
2. Implementar el contrato comun:
   - `generateText(input)`
   - `generateStructuredOutput(input)`
   - `generateEmbedding(input)` si aplica.
3. Normalizar la respuesta a:
   - `text` o `data`
   - `provider`
   - `model`
   - `usage`
4. Traducir errores del SDK/API a los errores estandarizados.
5. Registrar el proveedor en `AIProviderFactory.js`.
6. Agregar variables de entorno y documentarlas.
7. Agregar pruebas de seleccion y fallback.

## Consideraciones

- El frontend sigue llamando solo a Cloud Functions.
- La logica sensible permanece en Firebase Functions.
- Los servicios de negocio consumen `AIService`, no proveedores concretos.
- Los providers concretos son los unicos archivos que conocen SDKs o APIs de
  terceros.
- La migracion completa del backend a TypeScript debe planificarse como un
  cambio separado, porque el runtime actual de Functions esta en CommonJS.
