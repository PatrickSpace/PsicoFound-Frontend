# Estrategia de implementación de la operación del MVP

Fecha: 21 de octubre de 2026 · Zona operativa: America/Lima.

Documento complementario del [Plan operativo](plan-operativo-mvp.md). Define trabajo futuro, orden, evidencias y aceptación. No implementa código, workflows, despliegues ni recursos de consola. Ninguna casilla se considera completada por existir este documento.

## 1. Cómo ejecutar la estrategia

Aplicar primero controles mediante las herramientas disponibles: repositorio/GitHub Actions, Vercel, Firebase y Google Cloud. Mantener despliegue manual al inicio. Automatizar después lo que ya se haya ensayado manualmente.

Prioridades:

- **P0:** antes de la siguiente entrega de aplicación o de ampliar exposición a usuarios.
- **P1:** durante la primera semana de operación controlada.
- **P2:** cuando haya una señal concreta de necesidad.

Estimación orientativa: 4–6 jornadas parciales de una persona, más el tiempo necesario para observar copias y tráfico; no es una fecha comprometida. Un primer backup o una alerta puede necesitar espera de plataforma. Agrupar consolas y evidencias, sin convertir cada punto en otro servicio.

El propietario puede asumir la responsabilidad técnica inicial. Debe quedar identificado antes de operar; «por asignar» significa trabajo pendiente, no delegación implícita. Evidencias operativas en un registro restringido del release o incidente, con enlaces desde el PR cuando corresponda. No guardar credenciales, exportaciones de usuarios ni datos clínicos en estos documentos.

## 2. Secuencia y dependencias

| Fase | Prioridad y esfuerzo orientativo | Resultado | Dependencia |
| --- | --- | --- | --- |
| A. Confirmar estado y responsables | P0 · medio día | Mapa real de recursos, accesos y riesgos abiertos | Acceso de lectura a las consolas. |
| B. Asegurar validación y cambios | P0 · medio a un día | Quality obligatorio, dominios y datos de prueba revisados | A. |
| C. Preparar recuperación y costo | P0 · un día, más espera de copia | Release anterior recuperable, backup y presupuesto | A; antes del simulacro de datos. |
| D. Activar alertas mínimas | P0 · medio a un día | Disponibilidad, errores y canal de aviso probado | A y responsable disponible; puede avanzar junto con B/C. |
| E. Ensayar y entregar | P0 · un día | Un ciclo Vercel → Hosting y rollback documentados | B, C y D. |
| F. Ajustar la rutina | P1 · revisiones breves durante una semana | Umbrales útiles, costos observados y pendientes asignados | E. |
| G. Automatización adicional o separación | P2 · estimar al activarse el disparador | Menos errores manuales o backend aislado si hace falta | Evidencia de F y necesidad concreta. |

## 3. Acciones de la fase A: conocer lo que realmente está activo

### A1. Inventario de destinos y estado desplegado

**Responsable:** operador técnico. **Prioridad:** P0.

1. En Firebase/GCP, confirmar proyecto `psicosaas-3c819`, base `(default)`, región Firestore, región y runtime de Functions, sitio `luremsapp` y dominio `app.lurems.lat`.
2. Registrar versión live de Hosting, funciones desplegadas y su configuración efectiva, reglas publicadas y estado de índices. Comparar con Git; anotar diferencias sin cambiarlas todavía.
3. En Vercel, confirmar nombre del proyecto, cuenta/equipo, repositorio conectado, rama de producción, build de Vite, salida `dist`, Node y deployment que sirve `psico-found-frontend.vercel.app`.
4. Confirmar qué SHA sirve cada frontend y qué release de backend es compatible. Si no puede identificarse el backend anterior, tratar la preparación de esa recuperación como bloqueante para cambios de backend de riesgo.
5. Inventariar recursos adicionales: buckets/objetos, tareas programadas, extensiones, integraciones Admin SDK, cuentas de ejecución, Secret Manager, logs, facturación y Artifact Registry. No asumir que la ausencia en código significa ausencia en consola.

**Evidencia:** tabla de recursos con identificador, entorno, región, versión observada, fecha, verificador y enlace de consola. Sin valores secretos.

**Aceptación:** se puede responder qué recurso se modifica y qué usuarios afecta cada deploy. Las diferencias entre repositorio y producción tienen una decisión registrada.

### A2. Responsabilidad, permisos y cobertura

**Responsable:** propietario del MVP. **Prioridad:** P0.

1. Designar operador de entrega/incidentes y suplente; acordar horario real de atención y canal de aviso. Si no hay suplente, registrar esa limitación y no prometer 24/7.
2. Revisar MFA y permisos de GitHub, Firebase/GCP, Vercel y registrador DNS. Usar cuentas individuales; retirar accesos innecesarios.
3. Diferenciar permisos de aplicación, despliegue, runtime y privacidad; el administrador de prueba no recibe IAM ni `privacyOperator` por conveniencia.
4. Comprobar que el acceso de recuperación permite consultar logs, recuperar Hosting y cambiar mantenimiento aun cuando la UI normal esté bloqueada. Guardar las instrucciones en un lugar restringido accesible durante una caída.

**Evidencia:** responsables, cobertura, canal, matriz de permisos y prueba de acceso sin copiar credenciales.

**Aceptación:** una alerta tiene destinatario, quien responde puede contener/recuperar y existe un procedimiento de recuperación de cuenta.

## 4. Acciones de la fase B: validar y controlar las entregas

### B1. Consolidar Quality como puerta de entrada

**Responsable:** mantenedor del repositorio. **Prioridad:** P0.

1. Verificar una ejecución real del workflow existente en Ubuntu 22.04. Conservar Node 22, Java 21, Firebase CLI fijada y descargas previas al aislamiento; no duplicar la infraestructura de pruebas.
2. Revisar que `npm run test:agenda` con `PILOT_VALIDATION=true` cubra el alcance esperado del piloto y que los artefactos estén disponibles ante fallos. No ejecutar suites que usan los mismos puertos simultáneamente.
3. Proteger `main` con el nombre real del check, PR y resolución de conversaciones. Confirmar disponibilidad de las opciones en el plan de GitHub. Para un único mantenedor, usar revisión propia registrada y checks; no exigir que apruebe su propio PR mediante un segundo usuario ficticio.
4. Mantener el CI de PR sin secretos productivos. Revisar exposición de artefactos y permisos, incluidos forks; los resultados sintéticos de la suite actual se retienen siete días según el workflow.
5. Exigir triage de auditorías fallidas, con impacto, mitigación y plazo si se acepta una excepción. No desactivar controles de aislamiento ni incorporar un upgrade forzado para recuperar el verde.

**Evidencia:** enlace del workflow en el SHA candidato, check obligatorio y resolución de fallos pendientes.

**Aceptación:** un PR de aplicación con Quality fallido no llega al flujo normal de entrega. La documentación actual se verifica por revisión/enlaces; no necesita ejecutar pruebas funcionales nuevas.

### B2. Revisar variables, dominios y superficie de Vercel

**Responsable:** operador técnico. **Prioridad:** P0.

1. Revisar nombres y presencia de variables por alcance Vercel y en el build de Hosting, sin imprimir valores sensibles. Preparar una matriz de configuración pública funcional: proyecto, región, App Check y documentos vigentes. No copiar automáticamente el `.env` local.
2. Confirmar ausencia de modo emulador, debug tokens y secretos backend en bundles remotos. Mantener modo guiado en Functions y no vincular otra vez Gemini por recuperar una versión vieja.
3. Comparar dominios en Auth, retornos de email/OAuth y reCAPTCHA/App Check. Probar el dominio estable; no autorizar todos los previews para evitar administrar una lista ilimitada.
4. Revisar Deployment Protection por plan y alcance. Una URL marcada «Production» en Vercel puede quedar pública aunque los previews estén protegidos; no considerar la protección un control que ya existe. Si proteger el dominio estable exige otro plan, decidir el costo o documentar su exposición y mantener permisos Firebase estrictos. No crear un login casero para el sitio de pruebas.
5. Confirmar Vercel desde `main` y su relación con CI: Ready no equivale a Quality aprobado. Registrar la regla de no promover Firebase si el SHA correspondiente no tiene las comprobaciones requeridas.
6. Si se usa analítica, mantenerla opcional en Vercel y apagada en Hosting mientras no exista una decisión distinta. Sus diferencias de build se documentan; no invalida por sí sola la compatibilidad funcional.

**Evidencia:** matriz sin secretos, dominios exactos, alcance real de protección, SHA/deployment y resultado del login/App Check con cuenta sintética.

**Aceptación:** ambos frontends apuntan al backend esperado; no hay un bypass de seguridad por llamarlo staging y está claro qué URLs pueden usar los probadores.

### B3. Preparar el inventario de pruebas remotas

**Responsable:** operador técnico con responsable funcional. **Prioridad:** P0.

1. Crear o identificar los pacientes y el profesional sintéticos y los buzones controlados. Guardar UIDs/IDs y relaciones en un registro restringido, sin contraseñas.
2. Confirmar que el profesional no se ofrece a pacientes reales y que no se tocan slots reales. Si el producto no permite garantizarlo, no ejecutar reserva remota: documentar cobertura en emuladores y el límite del smoke.
3. Definir una escritura reversible propia para el smoke y su verificación/limpieza por las operaciones existentes. No limpiar auditorías ni ledgers borrando documentos manualmente.
4. Revisar el alcance del administrador de prueba. Publicación legal, cambios de políticas, eliminación, protección del último administrador y transferencias se prueban en emuladores; el smoke remoto no cambia configuración global.
5. Preparar una lista corta para Vercel y Hosting: carga JS/rutas, login y rol, lectura propia, operación sintética permitida, recarga y logout. Agregar Google/email reales solo si cambió esa integración o se está validando inicialmente.

**Evidencia:** inventario restringido y resultados esperados por paso; cualquier operación omitida tiene motivo y cobertura alternativa.

**Aceptación:** se conoce exactamente qué puede escribir el smoke y quién revisa los residuos. No hay relaciones con personas reales.

### B4. Resolver el formato de evidencia de configuración

**Responsable:** operador técnico. **Prioridad:** P0 para revisión manual; adaptación automática P2.

Usar como guía la lista de `config/pilot-staging.example.json`, pero revisar manualmente solo comprobaciones aplicables al backend productivo compartido y modo guiado. `scripts/verify-pilot-config.mjs` exige actualmente staging y aprobación del proveedor: no utilizarlo como certificación del entorno actual, no sustituir datos reales por fixtures y no declarar verificado lo que no consulta.

La publicación legal administrada en Firestore se comprueba además de cualquier variable antigua. Las Functions aplicables deben conservar políticas de acceso y comerciales vigentes; las rutas no habilitadas permanecen cerradas.

**Evidencia:** comprobación, estado «verificado/pendiente/no aplicable», motivo, proyecto, referencia, fecha y verificador. La adaptación futura del verificador sería otra tarea de código, fuera de este trabajo.

**Aceptación:** ninguna evidencia se obtiene poniendo `APP_ENV=staging` sobre producción ni afirmando que un manifiesto offline consultó las consolas.

## 5. Acciones de la fase C: preparar recuperación y control de gasto

### C1. Hacer recuperable la aplicación

**Responsable:** operador de releases. **Prioridad:** P0.

1. Identificar el último release estable y su compatibilidad con datos/políticas actuales. Registrar versión Hosting, fuentes backend, configuración no secreta e identificadores de secretos seguros.
2. Configurar retención suficiente del historial Hosting: propuesta de al menos tres releases, siempre conservando la última estable. Mantener fuentes de al menos dos releases backend compatibles mediante Git.
3. Para cada candidato, conservar el `dist` que se va a publicar, hash y variables públicas de build; usar lockfiles y Node consistente. No reconstruir desde una copia de trabajo sucia para hacer rollback.
4. Registrar el acceso de consola que permite volver a la versión Hosting; comprobar límites del mecanismo Vercel disponible en el plan. Como alternativa Vercel, prever revert del commit y reconstrucción, con su mayor tiempo de recuperación.
5. Revisar el redeploy backend como recuperación de fuentes, no como efecto del rollback Hosting. Confirmar que restaurarlo no cambia modo guiado, controles legales, cuotas, App Check ni secretos seguros vigentes.
6. Especificar el documento de mantenimiento: proyecto correcto, `runtime_controls/maintenance`, `enabled: true` y `startedAt` Timestamp servidor al activarlo; retiro con `enabled: false` tras la decisión de reapertura. Usar acceso privilegiado existente, registrar antes/después y no abrir reglas para editarlo desde un cliente ordinario.

**Evidencia:** release recuperable, matriz de compatibilidad, artefacto/hash, acceso probado y pasos de activación/retiro de mantenimiento.

**Aceptación:** es posible identificar y ejecutar la recuperación por componente sin buscar «qué había antes» durante la caída. Si el anterior ya no es seguro o compatible, la recuperación prevista es un parche hacia adelante.

### C2. Preparar respaldos y un ensayo real de datos

**Responsable:** operador Firebase con responsable de privacidad. **Prioridad:** P0.

1. Confirmar Blaze, volumen/costo aproximado, permisos acotados y política de retención. Proponer backup diario Firestore con siete días de retención y revisar su coherencia con eliminación/retención antes de activarlo.
2. Configurar la programación administrada con las herramientas nativas. Esperar y verificar una copia completada; registrar antigüedad, ubicación y costo. No prometer una hora fija del día ni acreditar recuperación con una programación que aún no produjo copias.
3. Seleccionar una copia y ensayar restauración en una base nueva protegida, siguiendo el destino que soporte el mecanismo elegido. Puede ser una base temporal en el proyecto con IAM/reglas restrictivos; no es otro backend permanente de pruebas ni debe recibir tráfico de la aplicación. Usar datos productivos solo bajo acceso y finalidad aprobados.
4. Verificar documentos, subcolecciones, referencias, timestamps e índices, y controles de acceso de la base recuperada. Revisar TTL si existe. Eliminar el recurso temporal según la retención aprobada después de registrar evidencia sin contenido sensible.
5. Diseñar la recuperación hacia `(default)`: priorizar recuperación selectiva de registros afectados y reconciliación, con control de versiones y operaciones recientes. La app actual no selecciona una base alternativa. Si se requiere recuperar toda la base, preparar un procedimiento específico de corte/importación y ensayarlo; mientras falte, registrar recuperación total como pendiente y no borrar `(default)` para liberar su nombre.
6. Inventariar Auth aparte: definir respaldo diario y destino cifrado restringido, frecuencia de revisión y recuperación de UIDs/proveedores/configuración. Ensayar importación sin reenviar correos ni reactivar cuentas cerradas. Las exportaciones con hashes se tratan como credenciales; nunca adjuntarlas al PR. Si automatizarlo exige código posterior, registrar esa tarea y usar un procedimiento manual diario mientras se valida, con el riesgo de omisión explícito.
7. Revisar Storage: si contiene datos, acordar protección/recuperación y demostrarla; si no se usa, documentar evidencia de consola. Registrar también secretos/IAM/dominios que no cubren las copias de datos.
8. Medir RPO/RTO reales. Conciliar pagos, reservas, bajas y consentimientos posteriores a la copia; un ensayo sintético entre proyectos demo no acredita esta recuperación administrada.

**Evidencia:** programación, backup completado, destino temporal, resultado y duración del restore, controles de acceso, alcance por servicio y plan de recuperación hacia la base usada por la aplicación.

**Aceptación:** existe copia utilizable, la restauración protegida está demostrada y el camino de recuperación tiene un alcance explícito. Si no se ha ensayado el corte total, no afirmar RTO de recuperación total. La decisión de operar con esa brecha necesita impacto y mitigación registrados.

**Dependencia externa:** características de backup y restore documentadas por [Firebase Firestore](https://firebase.google.com/docs/firestore/backups); alcance Auth en [Firebase Authentication CLI](https://firebase.google.com/docs/cli/auth). No requieren implementar un sistema propio de backups para Firestore.

### C3. Presupuesto y límites

**Responsable:** propietario y operador técnico. **Prioridad:** P0.

1. Acordar monto mensual, moneda, destinatarios y reacción ante excesos. No inventar una cifra basándose en que el MVP tiene pocos usuarios.
2. Revisar consumos reales y crear presupuesto/avisos al 50%, 80%, 100% y previsión en Cloud Billing; validar recepción. Revisar Vercel por separado y sus límites de plan. Un presupuesto de avisos no garantiza detener cargos. [Cloud Billing](https://docs.cloud.google.com/billing/docs/how-to/budgets).
3. Confirmar cuota reCAPTCHA efectiva, TTL, límites de encuesta y opciones de instancia. Registrar los 250 assessments/día históricos como dato por verificar, no como capacidad garantizada.
4. Ante alarma: identificar componente/operación, detener pruebas costosas o recorrido defectuoso, revisar abuso y cuotas y decidir un ajuste. No desconectar billing ni quitar App Check como respuesta automática.
5. Revisar limpieza de imágenes/artefactos Functions y retención de logs, preservando capacidad de recuperación y auditoría. No conservar indefinidamente capturas o exportaciones sensibles.

**Evidencia:** presupuesto, canales, límites efectivos y fecha de primera revisión semanal.

**Aceptación:** el propietario conoce su exposición, recibe avisos y tiene una acción concreta que no depende de tumbar todo Firebase.

## 6. Acciones de la fase D: monitoreo y respuesta

### D1. Crear el panel y las alertas mínimas

**Responsable:** operador técnico. **Prioridad:** P0.

1. Preparar un panel Cloud Monitoring con disponibilidad web, errores/latencia backend, volumen, rechazos/cuotas, Firestore y antigüedad del respaldo. Donde no haya métrica accesible sin trabajo adicional, usar consulta/revisión manual explícita hasta implementarla.
2. Crear uptime check HTTPS de producción y política de aviso con frecuencia/ventana del plan; no monitorizar una URL protegida de Vercel como si fuera pública. Un 401 de protección no demuestra una caída Firebase.
3. Inspeccionar un log real de Functions y adaptar la plantilla `pilot-alerts.example.json`: ruta del mensaje, recurso, región y nombres reales. Crear métricas para códigos inesperados y duración; los rechazos de negocio se separan. Evitar UID/correlación como etiquetas.
4. Comprobar métricas nativas de App Check/Auth y del runtime para fallos anteriores al wrapper. Confirmar si el cociente de errores tiene denominador y suficiente tráfico; en bajo volumen conservar también umbral absoluto.
5. Guardar consultas por operación, código, intervalo y correlationId. Documentar que las fallas del navegador requieren smoke/soporte mientras no exista captura automática.
6. Configurar notificaciones de fallos de Quality, Vercel y alertas GCP al responsable. Usar canales nativos existentes; no agregar Slack, una plataforma de guardia o un proveedor nuevo solo para este MVP.

**Evidencia:** panel, consultas, métricas/filtros, política, destinatario y valores iniciales.

**Aceptación:** cada alerta indica qué revisar y cómo contener; no hay una política activa sin operador. Donde una señal solo se revisa manualmente, queda marcada como tal.

### D2. Probar notificación y procedimiento de incidente

**Responsable:** operador y suplente. **Prioridad:** P0.

1. Usar la prueba de canal o una política temporal de prueba sin generar una caída del servicio ni datos clínicos. Confirmar recepción y acuse; borrar o desactivar la política temporal al terminar.
2. Ensayar de mesa un fallo de HTML, uno de Functions, agotamiento de App Check y una escritura incorrecta. Identificar en cada uno contención, versión recuperable y quién puede actuar.
3. Revisar el mantenimiento global: callables comunes y acceso cliente protegido quedan bloqueados, pero Admin SDK, Authentication y operaciones de privacidad requieren tratamiento propio. Identificar todos los escritores a detener.
4. Comprobar cómo se accede al registro de incidente y a ayuda/documentos públicos si la app normal no está disponible.

**Evidencia:** fecha, alerta probada, hora de recepción/acuse, participante y acción de prueba. Sin mensajes a usuarios reales.

**Aceptación:** el aviso llega y la persona puede ejecutar el procedimiento; el ensayo no depende de una función o botón que no existe.

## 7. Acciones de la fase E: ensayo y primera entrega controlada

### E1. Release de frontend compatible

**Responsable:** operador de release. **Prioridad:** P0.

1. Elegir cambio pequeño, clasificarlo y registrar release anterior. Completar PR/Quality sin mezclar modificación de contratos ni datos.
2. Merge a `main`, esperar Quality del SHA elegido y deployment Vercel Ready para ese SHA. Congelar promociones/pushes que cambien el candidato durante el smoke; si cambió el dominio estable, repetir identificación y validación.
3. Ejecutar lista de Vercel de B3. Revisar logs del intervalo y registrar resultados, omisiones y artefacto de origen.
4. Preparar checkout limpio y build Hosting con variables revisadas; conservar `dist` y huella. Confirmar explícitamente `psicosaas-3c819`, sitio `luremsapp` y alcance solo Hosting antes de publicar. No usar un deploy global para subir un cambio de interfaz.
5. Publicar manualmente, registrar versión live y ejecutar smoke en `app.lurems.lat`, incluida pestaña abierta anterior, módulos y rutas directas.
6. Observar 30–60 minutos y cerrar release con decisión. Si el smoke crítico falla, ir a E3 sin continuar publicando otros cambios.

**Aceptación:** UI publicada desde el SHA aprobado, ambos dominios identificados, sin incidente funcional ni escritura indebida, y versión anterior disponible.

### E2. Variante para backend/reglas/índices

**Responsable:** operador de release. **Prioridad:** P0 cuando el cambio lo incluya.

1. Dividir primero en preparación compatible y activación de UI. El primer PR mantiene interfaz anterior; el segundo necesita backend ya verificado. No mergear una UI que requiera una Function inexistente esperando que se despliegue antes de que termine Vercel.
2. Probar en emuladores y revisar convivencia frontend anterior/backend nuevo. Registrar reglas y datos que lee/escribe cada versión. No retirar contrato viejo durante al menos dos entregas y siete días, usando el plazo mayor.
3. Publicar índices necesarios y esperar READY; luego reglas/Functions en el orden compatible definido para ese cambio. Si no hay orden seguro con clientes activos, pasar a ventana de mantenimiento. Desplegar grupos coherentes y pequeños; comprobar resultado de cada grupo y estado parcial ante fallo.
4. Observar el backend compartido con el frontend actual antes de activar la nueva interfaz. El smoke Vercel usa este mismo backend: no es una validación previa a su entrada a producción.
5. Continuar con E1 para el segundo PR de UI. Registrar versiones independientes de backend y frontend, sin fingir que deben compartir siempre el mismo SHA.
6. Si el cambio es inevitablemente incompatible: congelar entregas, activar mantenimiento, detener escritores y drenar al menos 180 s, confirmando fin de operaciones. Publicar todos los componentes coordinados, verificar técnicamente, retirar mantenimiento y hacer smoke inmediato en ambos dominios. No se puede probar el recorrido protegido normal mientras esté activo el flag; volver a cerrar si falla.

**Aceptación:** backend y clientes soportan el estado actual; no hubo ventana con una UI invocando contratos ausentes ni aperturas temporales de permisos. Un cambio incompatible conserva incidente/ventana y recuperación propia.

### E3. Simulacro de rollback de aplicación

**Responsable:** operador con suplente observador. **Prioridad:** P0.

1. Empezar con dos versiones compatibles y de bajo impacto; acordar ventana, alcance y criterio de interrupción. No provocar pagos inconsistentes ni cambios clínicos para ensayar.
2. Recuperar la versión Hosting previa desde el historial live de `luremsapp`, revisar rutas, sesión y carga JS y medir tiempo desde decisión hasta smoke satisfactorio. Objetivo inicial: 15 min, sujeto a evidencia.
3. Confirmar que backend/datos permanecen coherentes y Vercel puede seguir mostrando otro candidato. Sincronizar la decisión con Git para que la próxima entrega no reintroduzca el defecto; no depender solo del estado de consola.
4. Ensayar recuperación Vercel según plan o mediante revert/rebuild; registrar URL, SHA y duración. Los dominios y variables tienen que seguir siendo los esperados. [Opciones de recuperación Vercel](https://vercel.com/docs/deployments/rollback-production-deployment).
5. Para backend, comenzar con ensayo de mesa y pruebas de compatibilidad locales. Un redeploy remoto del release anterior debe hacerse solo cuando se verifique seguridad/compatibilidad, en ventana controlada; si todavía no se realiza, marcar «backend no ensayado remotamente», no «rollback completo validado». Objetivo de 60 min por verificar.
6. Confirmar cierre/reapertura de mantenimiento cuando se haya usado y observar recuperación. No eliminar índices, funciones nuevas, campos ni ledgers durante el ensayo urgente.

**Evidencia:** versiones antes/después, decisiones, tiempos, validaciones y límites. [Historial y rollback de Firebase Hosting](https://firebase.google.com/docs/hosting/manage-hosting-resources).

**Aceptación:** recuperación frontend demostrada, situación del backend explícita y ninguna promesa de restauración de datos por haber recuperado HTML.

### E4. Criterio de salida de P0

- [ ] Recursos y versiones activas confirmados; responsable, suplencia/cobertura y acceso de recuperación definidos.
- [ ] Quality remoto exitoso y protección de cambios aplicable verificada.
- [ ] Configuración/dominios/seguridad revisados; exposición real de Vercel registrada.
- [ ] Smoke con datos sintéticos acotados y sin exposición de profesional o slots de prueba a usuarios reales.
- [ ] Release previo y artefacto Hosting recuperables; variante backend preparada cuando corresponda.
- [ ] Copia Firestore completada y restore protegido probado; Auth/Storage y recuperación hacia `(default)` con alcance y brechas registrados.
- [ ] Alertas y presupuesto con canal/recepción comprobados.
- [ ] Primer ciclo de entrega y rollback de frontend documentado; ensayos backend/datos diferenciados.
- [ ] Riesgos residuales de base compartida, RPO/RTO y falta de cobertura continua asumidos por el responsable.

Una brecha crítica de permisos, corrupción o recuperación sin copia utilizable bloquea cambios de riesgo. Las excepciones tienen impacto concreto, mitigación y fecha; el checkbox no reemplaza evidencia.

## 8. Acciones de la fase F: operar y ajustar

**Responsable:** operador técnico y responsable de operación del piloto. **Prioridad:** P1.

Durante la primera semana, revisar al inicio/cierre del día hábil errores, consumo, edad de copias y colas manuales. Medir ruido de alertas, uso real y tiempos de atención; ajustar umbrales una vez exista línea base, sin eliminar la detección de errores inesperados.

Mantener la conciliación y revisión de vencimientos según [operación de pagos](../operations/pilot-payments.md). No asumir que un despliegue o un monitor crea el scheduler que no existe. Revisar operaciones con resultado incierto antes de reintentar; nunca dar por no ejecutada una escritura solo porque hubo timeout.

Al final de la semana, confirmar presupuesto elegido, límites de encuesta/reCAPTCHA, disponibilidad medida, RPO/RTO observado, incidentes y capacidad del responsable. Mantener una lista breve con prioridad, propietario y próxima revisión. No agregar herramientas si la consola y la rutina actual resuelven el problema.

**Aceptación:** rutina sostenida, avisos accionables, copias observadas y pendientes con dueño; capacidad y metas actualizadas con evidencia.

## 9. Acciones de la fase G: mejoras solo si se necesitan

| Mejora | Disparador | Implementación mínima futura | Criterio de aceptación |
| --- | --- | --- | --- |
| Deploy manual desde GitHub Actions | Errores de checkout, variables o trazabilidad en entregas repetidas | Workflow manual, SHA elegido, artefacto de build con configuración productiva, entorno protegido, identidad federada GCP y exclusión mutua por destino; conservar Vercel actual | No hay secretos duraderos en PR ni deploy de un SHA sin Quality; rollback usa release identificado. |
| Adaptar verificador offline | Revisión manual repetitiva o configuración divergente | Distinguir producción compartida, modo guiado y publicación legal administrada; mantener verificaciones de consola independientes | No exige habilitar IA ni cambiar `APP_ENV` para certificar el flujo actual. |
| Errores automáticos de navegador | Fallos de JS repetidos que smoke/soporte no explican | Instrumentación mínima, revisión de datos enviados y contexto limitado de release/ruta sin información clínica | Diagnóstico útil sin mensajes, notas, tokens ni identificadores personales en telemetría. |
| Smoke automatizado remoto | Frecuencia de releases que hace poco fiable la revisión manual | Flujo acotado con cuentas dedicadas, escritura reversible, credenciales protegidas y sin pruebas de carga/borrado | No toca pacientes, slots ni políticas reales; falla con evidencia y no repite efectos financieros. |
| PITR u otra protección de datos | RPO diario insuficiente o impacto creciente de reservas/pagos | Evaluar costo/alcance en Firestore y ensayar recuperación/reconciliación | RPO menor demostrado y camino a `(default)` conocido. |
| Firebase separado para pruebas | Carga, borrados, migraciones incompatibles, pagos integrados o más probadores | Proyecto adicional con emuladores como base, datos sintéticos, secretos/políticas/dominios propios; Vercel apunta a ese proyecto | Pruebas remotas no comparten Auth, Firestore, Functions, cuotas ni privilegios productivos. |
| Copia de contingencia externa | Riesgo de pérdida de proyecto/región supera tolerancia | Export protegido y recuperación ensayada según datos, permisos y retención | Restauración verificable sin depender exclusivamente del proyecto afectado. |

Estas mejoras se implementan solo cuando se active el disparador correspondiente. La operación inicial utiliza las plataformas existentes.

## 10. Registro operativo mínimo reutilizable

Completar estos campos en cada release, sin crear otro sistema de gestión:

| Campo | Contenido |
| --- | --- |
| Identificación | Release, fecha/hora Lima, operador, PR y SHA frontend/backend. |
| Impacto | Componentes, cambios de contrato/datos/configuración y tipo de entrega. |
| Validación | Quality del SHA, smoke Vercel/Hosting, compatibilidad y pruebas omitidas con motivo. |
| Destino | Proyecto `psicosaas-3c819`, base `(default)`, sitio `luremsapp`, región y URLs verificadas. |
| Artefactos | Deployment Vercel, versión Hosting, hash de `dist`, reglas, índices, lockfiles y referencias de configuración. |
| Recuperación | Release anterior compatible, pasos por componente, copia relevante, estado y acceso de mantenimiento. |
| Observación | Intervalo, errores/cuotas, efectos de datos, decisión de cierre o rollback. |
| Pendientes | Riesgo residual, responsable, mitigación y próxima fecha de revisión. |

Para incidentes, agregar detección/acuse, impacto, contención, escrituras detenidas, recuperación/reconciliación, tiempos reales y acción preventiva. Guardar evidencia sensible en un registro restringido; en Git solo referencias seguras.

## 11. Correspondencia con el plan

| Punto del plan operativo | Acciones que lo implementan |
| --- | --- |
| Inventario y arquitectura actual | A1, B2. |
| Entornos y base compartida | B2, B3, E2, G si se activa separación. |
| DevOps y trazabilidad | B1, B4, C1, E1, E2 y registro operativo. |
| Pruebas de despliegue | B1, B3, E1–E4. |
| Configuración, accesos y seguridad | A2, B2, B4, C1. |
| Monitoreo y respuesta | D1, D2, F. |
| Costos y capacidad | C3, F. |
| Backups y recuperación | C2, E4 y mejoras condicionadas de G. |
| Rollback por componente | C1, E2, E3. |
| Rutina, responsables y evolución | A2, F, G. |

Mantener las guías existentes de [validación](../operations/validation.md), [release](../operations/pilot-release.md) y [privacidad](../operations/pilot-privacy.md) como detalle técnico. Al implementar cambios, actualizar sus apartados que todavía presuponen staging separado; conservar los registros históricos fechados sin presentarlos como verificaciones nuevas.
