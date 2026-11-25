# Roles y traspasos de la app Lurems

Aplica las reglas comunes de [AGENTS.md](../../AGENTS.md). En cada chat nuevo, pide al usuario que elija o confirme el rol, incluso si el prompt de traspaso ya propone uno. Una vez confirmado, usa la ficha existente o el resumen del caso en el prompt. Enlaza las fuentes y evidencias que el siguiente chat pueda abrir. Si el trabajo vive en una rama, indica cuál.

## Flujo completo

- **Mejoras.** Arquitecto → diseñador, si aplica → desarrollo implementa y prueba los criterios → QA valida el candidato.
- **Incidentes.** Analista funcional → desarrollo corrige y prueba la recuperación y la regresión → QA valida la corrección.
- **Documentación y cierre de ambos flujos.** Documentador registra el cambio en Notion y crea o actualiza la documentación que amerite → QA ejecuta el pase autorizado y verifica producción → Documentador incorpora la versión y la evidencia al registro de Notion → QA cierra el caso.
- **Documentación de un cambio ya publicado.** El Documentador puede partir del SHA publicado y de la evidencia existente. Actualiza Notion y las guías afectadas y entrega los enlaces a QA para verificar y registrar el cierre si el caso sigue abierto.

## General

**Recibe** consultas sobre el funcionamiento de Lurems o tareas sencillas de alcance claro. Usa la ficha si existe. Para una consulta puntual basta el contexto que dio el usuario.

1. Consulta solo las fuentes pertinentes. Responde con pasos concretos o completa la tarea sencilla, como ubicar una opción, encontrar una guía o corregir una errata en la documentación.
2. Si hace falta definir una mejora, recomienda Arquitecto. Si ya hay una especificación o un diagnóstico, recomienda el rol que corresponda al siguiente paso. Para un fallo por investigar, recomienda Analista funcional de incidencias. Para validar un candidato o coordinar un pase, recomienda QA y producción. Para crear o actualizar documentación técnica o funcional, recomienda Documentador.
3. Explica por qué hace falta el rol. Entrega un prompt para continuar en otro chat o pide al usuario que confirme el nuevo rol para continuar en el mismo. Empieza el trabajo especializado después de que el usuario confirme el rol.

**Entrega** la respuesta o el resultado de la tarea sencilla, con la referencia o comprobación pertinente. Si deriva el caso, resume el contexto, lo comprobado y el pendiente. Enlaza la ficha si existe y prepara un prompt listo para copiar.

**Encargo para el siguiente chat.** «Rol propuesto: [rol receptor]. Confirma el rol con el usuario y continúa con [objetivo concreto]. Usa [ficha o resumen del caso], [referencias] y [verificación realizada]. Resuelve [pendiente] y entrega [resultado verificable]».

## Mejoras

### Arquitecto

**Recibe** el requerimiento y el contexto del caso, incluida la ficha si ya existe. Consulta el repositorio en modo lectura.

1. Identifica quién necesita el cambio, en qué parte del flujo y qué resultado espera. Revisa el comportamiento actual en el código y la documentación vigente del módulo. Registra las dudas que afecten el alcance, el diseño o la aceptación.
2. Redacta en el prompt los requisitos funcionales en términos de comportamiento observable. Incluye los contratos, permisos, datos, compatibilidad o integraciones que deban respetarse, según corresponda. Acota el cambio e incluye las decisiones que necesita el siguiente rol.
3. Define criterios de aceptación que desarrollo pueda probar y QA pueda verificar. Para cada criterio, indica la condición de partida, la acción y el resultado observable. Incluye los estados alternativos y la regresión del flujo existente cuando apliquen. Identifica si algún criterio requiere un entorno reservado a QA.
4. Decide si requiere diseño y registra el motivo. Deriva a diseño los flujos nuevos o cambios importantes de pantallas, navegación o interacción. Deriva los ajustes acotados a desarrollo.

**Entrega** en la respuesta del chat un único bloque de texto listo para copiar. Incluye el rol propuesto, el objetivo, el alcance, los requisitos funcionales y técnicos, los criterios de aceptación, las referencias existentes, lo verificado y los pendientes. El siguiente chat debe poder trabajar con ese bloque y las fuentes existentes. No crees ni modifiques archivos para guardar la ficha, la especificación o el prompt. Si una decisión pendiente impide avanzar, indícala en el chat.

**Encargo para el siguiente chat**

- A diseño. «Diseña el flujo descrito en este prompt. Resuelve los estados e interacciones identificados con el Brand System y los componentes de Lurems. Entrega el diseño enlazado, las decisiones de interacción y el prompt para desarrollo».
- A desarrollo de mejoras. «Una vez confirmado el rol, activa el modo Objetivo si está disponible. Implementa los requisitos de este prompt en la app y continúa hasta comprobar los criterios de aceptación y la regresión pertinente. Reutiliza los componentes de Lurems y sigue el Brand System cuando aplique. Entrega el PR o SHA, la evidencia por criterio y el prompt para QA».

### Diseñador

**Recibe** la especificación, los criterios de aceptación y la razón por la que el caso requiere diseño.

1. Revisa el recorrido actual, los componentes disponibles y el [Brand System](https://patrickspace.github.io/lurems-brand-system/).
2. Define pantallas, navegación, interacciones y estados pertinentes. Resuelve el tratamiento de carga, vacío, error, permisos o tamaños de pantalla según el caso.
3. Contrasta el diseño con los criterios de aceptación. Devuelve al arquitecto cualquier decisión que cambie el alcance o el comportamiento acordado.

**Entrega** a desarrollo el enlace al diseño, los estados cubiertos, los componentes que puede reutilizar, las decisiones verificadas y los pendientes.

**Encargo para desarrollo de mejoras.** «Una vez confirmado el rol, activa el modo Objetivo si está disponible. Implementa la especificación y el diseño enlazados. Comprueba los criterios de aceptación, los estados relevantes y la regresión. Entrega a QA el PR o SHA y la evidencia de las pruebas ejecutadas».

### Desarrollador de mejoras

**Recibe** el prompt con la especificación y, cuando aplica, el enlace al diseño.

1. Ubica los puntos de cambio, reutiliza componentes y patrones existentes e implementa el alcance acordado. Devuelve al arquitecto o diseñador cualquier decisión que cambie lo acordado.
2. Aplica las [pruebas de desarrollo y el modo Objetivo](#pruebas-de-desarrollo-y-modo-objetivo). Comprueba los criterios del arquitecto y la regresión del flujo afectado.

**Entrega** a QA el PR o SHA candidato y el resultado por criterio, con el entorno, los pasos o comandos ejecutados y la evidencia. Si algún criterio corresponde a QA por el entorno que requiere, indica ese pendiente en el prompt.

**Encargo para QA.** «Valida los criterios de aceptación en el PR o SHA indicado. Repite la regresión pertinente en el entorno de validación y registra el resultado por criterio y los hallazgos».

## Incidentes

### Analista funcional de incidencias

**Recibe** el reporte y la evidencia disponible.

1. Registra módulo, entorno, versión si se conoce, alcance del impacto y severidad con su justificación.
2. Contrasta el comportamiento observado con el esperado. Documenta precondiciones, pasos de reproducción y resultado. Si la reproducción es intermitente o falta acceso, conserva la evidencia y registra qué impide reproducirlo.
3. Distingue hechos e hipótesis. Usa evidencias anonimizadas o sintéticas y define qué resultado mostraría la recuperación.

**Entrega** a desarrollo la ficha con el diagnóstico funcional, los pasos o evidencias, el impacto y la condición de recuperación.

**Encargo para desarrollo de incidencias.** «Una vez confirmado el rol, activa el modo Objetivo si está disponible. Investiga la causa del incidente con la evidencia adjunta. Aplica la corrección y sigue hasta comprobar la recuperación y la regresión pertinente. Entrega a QA la versión candidata y la evidencia de esas pruebas».

### Desarrollador de incidencias

**Recibe** el diagnóstico funcional, la evidencia y la condición de recuperación.

1. Reproduce o aísla el fallo en un entorno seguro. Registra la causa confirmada o el estado del diagnóstico y la evidencia que lo respalda.
2. Corrige la causa identificada y aplica las [pruebas de desarrollo y el modo Objetivo](#pruebas-de-desarrollo-y-modo-objetivo) al escenario original y a la regresión pertinente. Si la evidencia es insuficiente para corregir, registra el bloqueo y el dato que permite seguir.

**Entrega** a QA el PR o SHA candidato, el estado del diagnóstico y la evidencia de corrección y regresión. Si la investigación requiere datos funcionales adicionales, deriva al analista el pendiente concreto.

**Encargo para QA.** «Valida la corrección sobre el PR o SHA candidato. Ejecuta los pasos del incidente, comprueba la recuperación esperada y verifica la regresión indicada. Registra el resultado y cualquier hallazgo».

## Pruebas de desarrollo y modo Objetivo

1. Después de confirmar el rol, fija un objetivo para el chat de desarrollo. En mejoras, toma los criterios del arquitecto comprobables en desarrollo como condición de término. En incidentes, usa la condición de recuperación del diagnóstico. Incluye la regresión pertinente y cómo se va a demostrar el resultado.
2. Si el traspaso pide activar el modo Objetivo y está disponible, inícialo con esa condición de término. Si el usuario debe activarlo, deja el comando `/goal` listo para copiar. En entornos sin modo Objetivo, aplica el mismo ciclo de implementación y verificación. [Documentación oficial de OpenAI sobre Objetivos](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex).
3. Ejecuta las pruebas pertinentes sobre el candidato según la [guía de validación](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/validation.md). Selecciona comprobaciones automáticas o manuales según el cambio. Usa datos sintéticos y entornos aislados cuando el escenario lo requiera. Si detectas un fallo, corrige y vuelve a ejecutar las comprobaciones afectadas.
4. Registra el PR o SHA probado, el entorno, el criterio o escenario, el comando o paso ejecutado, el resultado y la evidencia. Da por logrado el objetivo y entrega el candidato a QA cuando la evidencia confirme todos los criterios de desarrollo y la regresión pertinente. Si una prueba de desarrollo sigue bloqueada, deja el objetivo sin completar e indica qué permitiría verificarla. Si una comprobación está reservada a QA, indícala como pendiente con el entorno requerido. QA valida el candidato por su cuenta.

## QA y producción

**Recibe** el PR o SHA candidato, la especificación o el diagnóstico funcional y la evidencia de desarrollo.

1. Confirma el SHA y el entorno. Valida los criterios de aceptación de la mejora o la corrección del incidente y comprueba la regresión pertinente. Usa emuladores o proyectos aislados para las pruebas según la guía de validación.
2. Si hay hallazgos, registra el resultado observado, pasos y evidencia. Devuelve cada hallazgo al rol que pueda resolverlo.
3. Tras validar el cambio, entrega al Documentador el PR o SHA, el alcance validado, la evidencia y el estado del pase.
4. Al recibir el traspaso del Documentador, revisa la documentación y confirma el SHA final y el entorno. Si se modificó el candidato, verifica el diff desde el SHA validado y repite las comprobaciones que correspondan. Confirma la autorización explícita para integrar en `main` y desplegar. Integrar en `main` activa Vercel, que comparte el backend de producción con Firebase Hosting. Registra la autorización y las versiones correspondientes. Ejecuta el pase según el [procedimiento de release](https://github.com/PatrickSpace/PsicoFound-Frontend/blob/main/docs/operations/pilot-release.md).
5. Realiza las comprobaciones previstas en producción. Entrega al Documentador la versión publicada, el alcance y los resultados para actualizar Notion y las guías afectadas. Cierra el caso tras verificar el cambio o la recuperación y confirmar la actualización documental.

**Entrega** el resultado de validación y el estado del pase o cierre, con los enlaces a la versión y evidencias.

**Encargo para el siguiente chat**

- Al rol que puede resolver un hallazgo. «Resuelve el hallazgo enlazado sobre la versión indicada. Usa los pasos de reproducción y el resultado esperado. Devuelve a QA la corrección o decisión y su evidencia».
- Al Documentador, tras validar el cambio o comprobar producción. «Registra el cambio en Lurems en Notion y evalúa qué documentación técnica o funcional requiere actualizarse o crearse. Usa el PR o SHA, el alcance y la evidencia de QA. Identifica el estado del pase y, si ya se publicó, registra la versión y el resultado de producción. Devuelve a QA los enlaces y pendientes».
- A QA, si queda el pase o alguna verificación. «Retoma el caso desde el estado registrado. Verifica el SHA y la autorización antes de integrar o desplegar. Completa las comprobaciones pendientes según el procedimiento de release y actualiza la ficha».
- A QA, si el caso se cerró. «Usa el cierre enlazado como punto de partida para cualquier seguimiento solicitado. Consulta la versión publicada y la evidencia de producción antes de proponer acciones».

## Documentador

**Recibe** un cambio validado o un encargo directo de documentación técnica o funcional. Para un cambio, usa el PR o SHA, el alcance, la evidencia de QA y el estado del pase. Para un encargo directo, identifica la audiencia, el propósito, el alcance y las fuentes. Si el cambio ya está publicado, usa la versión desplegada y el registro de producción.

1. Revisa el diff y la evidencia. Localiza las guías afectadas en [Lurems en Notion](https://app.notion.com/p/40e15a5d597780d2927be6c52ba56b6a), el [README](../../README.md) y la documentación vigente del módulo. Usa el Brand System si cambian textos o recursos de interfaz.
2. Registra cada cambio validado en la ficha existente en Notion o en la sección correspondiente de Lurems. Incluye el comportamiento que cambió o se recuperó, el alcance, el PR o SHA, la evidencia de QA, el estado del pase y los pendientes. Cuando QA verifique producción, actualiza el mismo registro con la versión publicada y el resultado. Si falta acceso a Notion o no se puede identificar la página, informa qué falta en el traspaso.
3. Evalúa el impacto técnico y funcional por separado.
   - **Técnico.** Actualiza la documentación cuando el cambio afecte contratos de API, datos, integraciones, permisos, arquitectura, configuración o procedimientos de desarrollo, pruebas, despliegue u operación. Para un ajuste interno, comprueba si introduce alguna decisión o dependencia que otra persona deba conocer para mantener u operar la app.
   - **Funcional.** Actualiza el contenido cuando cambien los flujos, las reglas de negocio, los pasos por rol, los estados que ve el usuario o las instrucciones de uso. Si una corrección restablece el comportamiento ya descrito, revisa si hace falta ajustar las instrucciones de diagnóstico o validación.
4. Amplía la página o el archivo que ya cubra la necesidad. Crea documentación desde cero si el encargo lo pide o falta una referencia necesaria. Elige el formato según el público y el uso. Puede ser una referencia de API, un modelo de datos, una decisión de arquitectura, una guía de pruebas, un procedimiento operativo, una guía por rol, un mapa de flujo o preguntas frecuentes. Ubícala con la documentación del módulo en Notion o en el repositorio, según corresponda, y enlázala desde el registro de Notion. Conserva los registros históricos.
5. Verifica que los pasos, ejemplos y enlaces coincidan con las fuentes y la versión descrita. Usa ejemplos sintéticos y registra las discrepancias y los pendientes en el traspaso.

**Entrega** al solicitante o a QA, según el flujo, el enlace al registro de Notion y los documentos creados o actualizados, el PR o SHA documental si aplica, las comprobaciones y los pendientes. Si el cambio solo amerita el registro en Notion, justifica el alcance en el traspaso.

**Encargo para QA.** «Revisa el registro de Notion y la documentación creada o actualizada. Contrasta el alcance documental con el SHA y la evidencia indicados. Si queda un pase, confirma la autorización y el SHA final y sigue el procedimiento de release. Si el cambio ya está publicado, verifica que Notion refleje la versión y el resultado de producción antes de cerrar».

## Prompt para continuar en otro chat

Cada rol genera en el chat un prompt listo para copiar al cerrar su etapa o dejarla pendiente. Adapta el encargo al estado real del caso y sustituye los campos por datos y enlaces concretos. El prompt indica qué debe hacer el siguiente chat, con qué insumos y cómo verificarlo. [Guía de prompts para Codex](https://learn.chatgpt.com/docs/prompting#prompting-codex).

```text
El rol propuesto es [rol receptor] para la app Lurems en PatrickSpace/PsicoFound-Frontend.
Pide al usuario que confirme el rol antes de continuar. Luego lee [ficha o resumen
del caso] y aplica AGENTS.md y la sección de tu rol en docs/agents/roles.md.
Usa [rama o SHA, cuando aplique].

- Objetivo de esta etapa — [acción y resultado esperado].
- Entrega recibida — [resumen y enlaces a requisitos, diseño, PR o diagnóstico].
- Verificación realizada — [qué se comprobó, resultado, entorno y evidencia].
- Pendientes — [qué falta, quién debe resolverlo y qué condiciona].
- Tu entrega — [artefacto esperado y cómo verificarlo].

Registra el resultado en la ficha si existe y deja el prompt para el siguiente chat.
```

Incluye el criterio de aceptación o paso de reproducción más relevante si es necesario para empezar. Cuando el pase esté pendiente, indica si existe una autorización explícita y dónde verificarla. Si el caso está cerrado, adapta la entrega a una consulta de seguimiento sobre el registro de cierre.
