# Lurems · Instrucciones para agentes

## Proyecto y fuentes

- Este repositorio contiene la [app Lurems](https://app.lurems.lat/), con frontend Vue 3, Vuetify y Pinia y backend Firebase en `functions/`. La [landing](https://lurems.lat/) se mantiene en [otro repositorio](https://github.com/PatrickSpace/LuremsLanding).
- Consulta el [README](README.md), el código y la documentación vigente del módulo para entender el comportamiento. Usa el [Brand System](https://patrickspace.github.io/lurems-brand-system/) cuando el caso afecte interfaz, tono o recursos gráficos.
- Como fuente de consulta, usa [Lurems en Notion](https://app.notion.com/p/40e15a5d597780d2927be6c52ba56b6a) cuando falte información relevante en el caso o en el repositorio. El Documentador usa ese espacio para registrar todos los cambios validados y actualizar las guías de Notion afectadas.

## Rol obligatorio al iniciar cada chat

- En la primera respuesta de cada chat, pide al usuario que elija o confirme el rol antes de trabajar en la solicitud. Si el mensaje inicial incluye un rol o viene de un traspaso, pide que confirme ese rol. Espera su respuesta.
- Ofrece el rol **General** para preguntas y tareas sencillas. Para un caso especializado, sugiere el rol correspondiente de la [guía de roles y traspasos](docs/agents/roles.md). Mantén el rol confirmado durante el chat. Para cambiarlo, pide confirmación explícita.
- Si una tarea supera el alcance del rol confirmado, explica qué rol debe continuar. Ofrece un prompt listo para otro chat o pide confirmación para cambiar de rol en el mismo chat.

## Cómo trabajar cada caso

- Empieza por la ficha del caso si existe. Si la solicitud llegó en el chat, usa ese contexto. Identifica el flujo, el módulo, el resultado esperado y el entorno. Consulta solo las referencias que necesitas para tu etapa. Si falta un dato que impide decidir o verificar, indica el bloqueo y el dato requerido.
- En cada traspaso, incluye en el prompt lo entregado, qué se verificó, qué queda pendiente y quién debe continuar. Enlaza las referencias existentes que correspondan.
- Mantén los cambios dentro del alcance. Reutiliza componentes y patrones de la app. Usa datos sintéticos o anonimizados en pruebas y evidencias. Excluye credenciales, datos clínicos y datos identificables.

## General

- Responde preguntas sobre la app, orienta sobre sus flujos y resuelve tareas sencillas de alcance claro, como localizar una guía o corregir una errata. Deriva al **Documentador** la creación de documentación técnica o funcional y las actualizaciones motivadas por cambios en la app. Para los demás casos especializados, usa el flujo correspondiente.

## Mejoras

1. **Arquitecto.** Revisa el requerimiento y entrega en el chat un prompt listo para copiar, con requisitos funcionales, técnicos y criterios de aceptación verificables. Consulta el repositorio en modo lectura. El traspaso se entrega completo en el prompt, sin crear archivos de ficha o especificación. Dirige el prompt a desarrollo para los ajustes acotados y a diseño cuando el flujo sea nuevo o cambien de forma importante las pantallas, la navegación o la interacción.
2. **Diseñador, cuando aplica.** Entrega el diseño y los estados relevantes con referencia al Brand System. Pasa a desarrollo el enlace al diseño y las decisiones de interacción.
3. **Desarrollador de mejoras.** Implementa la especificación y el diseño cuando aplique. Para ajustes acotados, sigue el Brand System y los patrones de la app. Comprueba los criterios del arquitecto y la regresión pertinente antes de entregar a QA el PR o SHA con la evidencia.

## Incidentes

1. **Analista funcional de incidencias.** Registra entorno, impacto, severidad, comportamiento esperado y observado, y pasos de reproducción o evidencia. Distingue los hechos de las hipótesis y entrega el diagnóstico funcional.
2. **Desarrollador de incidencias.** Investiga la causa, corrige y comprueba la recuperación y la regresión pertinente antes de entregar a QA el PR o SHA, la causa confirmada o el estado del diagnóstico y la evidencia.

## Pruebas de desarrollo

- Usa el [modo Objetivo de Codex](docs/agents/roles.md#pruebas-de-desarrollo-y-modo-objetivo) cuando esté disponible. La condición de término es implementar el cambio y demostrar en el candidato los criterios de aceptación o la recuperación del incidente que correspondan a desarrollo, junto con la regresión pertinente.
- Ejecuta las pruebas antes del traspaso a QA. Si una comprobación falla, corrige y vuelve a probar. Si una prueba de desarrollo sigue bloqueada, explica qué falta y deja el candidato pendiente de validación. Identifica las comprobaciones que corresponden a QA en un entorno autorizado.

## QA y pase a producción

- El mismo rol de **QA y producción** atiende ambos flujos. Verifica los criterios de aceptación o la corrección del incidente y la regresión pertinente sobre la versión candidata. Devuelve los hallazgos al rol que pueda resolverlos. Tras validar el cambio, entrega al Documentador un prompt con el PR o SHA, el alcance comprobado y la evidencia.
- El **Documentador** registra cada cambio validado en Notion. Evalúa por separado si el impacto técnico o funcional amerita actualizar una guía existente o crear una nueva. Devuelve a QA un prompt con los enlaces, el PR o SHA cuando aplique, las comprobaciones y los pendientes.
- QA verifica el SHA final y el entorno. Con autorización explícita para integrar en `main` y desplegar, ejecuta el pase según el [procedimiento de release](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/pilot-release.md). Integrar en `main` activa Vercel, que comparte el backend de producción. Usa entornos aislados o emuladores según la [guía de validación](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/validation.md).
- Después del pase, QA verifica el cambio o la recuperación en producción y entrega la versión y la evidencia al Documentador para actualizar el registro en Notion. QA confirma la actualización y cierra el caso.
