# Lurems · Instrucciones para agentes

## Proyecto y fuentes

- Estas instrucciones aplican al repositorio de la [app Lurems](https://app.lurems.lat/), con frontend Vue 3, Vuetify y Pinia y backend Firebase en `functions/`.
- Usa el [README](README.md), el código y la documentación vigente del módulo como fuentes técnicas. Consulta el [Brand System](https://patrickspace.github.io/lurems-brand-system/) para interfaz y marca.
- Consulta [Lurems en Notion](https://app.notion.com/p/40e15a5d597780d2927be6c52ba56b6a) solo si falta información relevante en el caso o en el repositorio. Busca la página o sección concreta y registra el hallazgo si afecta una decisión.

## Reglas comunes

- En cada etapa, empieza por la ficha del caso. Identifica el flujo, el módulo, el resultado esperado y el entorno. Consulta solo las referencias que necesitas para tu etapa. Si falta un dato que impide decidir o verificar, registra el bloqueo y el dato requerido.
- Mantén en la ficha el contexto y las decisiones del caso. En cada traspaso, indica quién lo recibe, qué se le entrega, qué se verificó y qué queda pendiente. Enlaza los requisitos, el diseño, el PR y las evidencias que correspondan.
- Mantén los cambios dentro del alcance. Reutiliza componentes y patrones de la app. Usa datos sintéticos o anonimizados en pruebas y evidencias. Excluye credenciales, datos clínicos y datos identificables.

## Mejoras

1. **Arquitecto.** Recibe el requerimiento y entrega requisitos funcionales, técnicos y criterios de aceptación verificables. Deriva el caso al diseñador si introduce un flujo nuevo o cambia de forma importante las pantallas, la navegación o la interacción.
2. **Diseñador, cuando aplica.** Entrega el diseño y los estados relevantes con referencia al Brand System. Pasa a desarrollo el enlace al diseño y las decisiones de interacción.
3. **Desarrollador de mejoras.** Implementa la especificación y el diseño cuando aplique. Para ajustes acotados, sigue el Brand System y reutiliza los componentes existentes. Entrega a QA el PR o SHA y la evidencia de pruebas.

## Incidentes

1. **Analista funcional de incidencias.** Registra entorno, impacto, severidad, comportamiento esperado y observado, y pasos de reproducción o evidencia. Distingue los hechos de las hipótesis y entrega el diagnóstico funcional.
2. **Desarrollador de incidencias.** Investiga la causa, aplica la corrección y entrega a QA la versión candidata (PR o SHA), la causa confirmada o el estado del diagnóstico y evidencia de la corrección y la regresión.

## QA y pase a producción

- El mismo rol de **QA y producción** valida ambos flujos. Comprueba los criterios de aceptación o la corrección del incidente y la regresión pertinente sobre el SHA candidato. Usa emuladores o proyectos aislados según la [guía de validación](docs/operations/validation.md). Devuelve los hallazgos al rol que pueda resolverlos.
- QA verifica el SHA y el entorno y ejecuta el pase según el [procedimiento de release](docs/operations/pilot-release.md). La integración en `main` y el despliegue a producción requieren autorización explícita. Integrar en `main` activa Vercel, que comparte el backend de producción con Firebase Hosting.
- Tras el pase, QA realiza las comprobaciones de producción previstas y registra la versión publicada, el resultado y los pendientes en la ficha. Cierra el caso tras verificar el cambio o la recuperación.
