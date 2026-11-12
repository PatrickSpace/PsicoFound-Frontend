# Lurems · Instrucciones para agentes

## Proyecto y fuentes

- Este repositorio contiene la [app Lurems](https://app.lurems.lat/), con frontend Vue 3, Vuetify y Pinia y backend Firebase en `functions/`. La [landing](https://lurems.lat/) se mantiene en [otro repositorio](https://github.com/PatrickSpace/LuremsLanding).
- Consulta el [README](README.md), el código y la documentación vigente del módulo para entender el comportamiento. Usa el [Brand System](https://patrickspace.github.io/lurems-brand-system/) cuando el caso afecte interfaz, tono o recursos gráficos.
- Consulta [Lurems en Notion](https://app.notion.com/p/40e15a5d597780d2927be6c52ba56b6a) solo si falta información relevante en el caso o en el repositorio. Busca la página o sección concreta y registra el hallazgo si afecta una decisión.

## Cómo trabajar cada caso

- Empieza por la ficha del caso. Identifica el flujo, el módulo, el resultado esperado y el entorno. Consulta solo las referencias que necesitas para tu etapa. Si falta un dato que impide decidir o verificar, registra el bloqueo y el dato requerido.
- Mantén el contexto del caso en su ficha y enlaza los requisitos, diseño, PR y evidencias que correspondan. Al pasar el caso, registra lo entregado, cómo se verificó, pendientes y siguiente responsable. Resume las decisiones útiles para ese rol y enlaza el detalle.
- Mantén los cambios dentro del alcance. Reutiliza componentes y patrones de la app. Usa datos sintéticos o anonimizados en pruebas y evidencias. Excluye credenciales, datos clínicos y datos identificables.

## Mejoras

1. **Arquitecto.** Recibe el requerimiento y entrega requisitos funcionales, técnicos y criterios de aceptación verificables. Indica si requiere diseño. Deriva al diseñador los flujos nuevos o cambios importantes de pantalla, navegación o interacción.
2. **Diseñador, cuando aplica.** Entrega el diseño y los estados relevantes con referencia al Brand System. Pasa a desarrollo el enlace al diseño y las decisiones de interacción.
3. **Desarrollador de mejoras.** Implementa la especificación y el diseño cuando aplique. Para ajustes acotados, sigue el Brand System y los patrones de la app. Entrega a QA el PR o SHA y las pruebas realizadas.

## Incidentes

1. **Analista funcional de incidencias.** Registra entorno, impacto, severidad, comportamiento esperado y observado, y pasos de reproducción o evidencia. Distingue los hechos de las hipótesis y entrega el diagnóstico funcional.
2. **Desarrollador de incidencias.** Investiga la causa, aplica la corrección y entrega a QA el PR o SHA, la causa confirmada o el estado del diagnóstico, y evidencia de la corrección y la regresión.

## QA y pase a producción

- El mismo rol de **QA y producción** atiende ambos flujos. Verifica los criterios de aceptación o la corrección del incidente y la regresión pertinente sobre la versión candidata. Devuelve los hallazgos al rol que pueda resolverlos.
- QA coordina y ejecuta el pase autorizado según el [procedimiento de release](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/pilot-release.md). Verifica el SHA y el entorno. Integrar en `main` activa Vercel, que comparte el backend de producción. Usa entornos aislados o emuladores según la [guía de validación](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/validation.md).
- Después del pase, realiza las comprobaciones de producción previstas y registra versión, resultado y pendientes. Cierra el caso tras verificar el cambio o la recuperación.
