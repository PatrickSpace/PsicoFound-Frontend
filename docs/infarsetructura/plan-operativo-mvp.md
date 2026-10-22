# Plan operativo de infraestructura del MVP

Fecha: 21 de octubre de 2026 · Zona operativa: America/Lima.

Estado: planificación; no acredita configuración remota, pruebas ejecutadas ni despliegues. Revisión del repositorio en `7bb347c` y de la documentación vigente. Los recursos y cuotas descritos en informes anteriores deben reconfirmarse en consola antes de darlos por activos.

La ejecución de cada punto se desarrolla en [Estrategia de implementación](estrategia-implementacion.md).

## 1. Decisión para el MVP

Mantener Firebase como backend, Vercel para validar el frontend y Firebase Hosting como publicación para usuarios. Mantener una sola base de datos por ahora. Reutilizar GitHub Actions, Firebase Emulator Suite, Playwright y las consolas actuales.

El control principal será una entrega pequeña y trazable: pruebas automáticas aisladas, validación acotada en Vercel y publicación manual de un commit identificado en Firebase Hosting. No incorporar Kubernetes, servidores propios, otro sistema de CI, una plataforma de observabilidad adicional ni un backend permanente de staging en esta etapa.

**Vercel no es un entorno aislado de pruebas:** ambos frontends usan los mismos servicios Firebase. Una reserva, cambio de permisos, publicación legal o borrado desde Vercel puede afectar producción. También se comparten disponibilidad, cuotas y costos. Separar dominios, variables de Vercel o ramas Git no separa los datos.

## 2. Inventario y diagnóstico actual

| Elemento | Evidencia local | Implicación operativa |
| --- | --- | --- |
| Frontend | Vue 3, Vite 7, Pinia y Vuetify en `package.json`; salida `dist` | Publicación estática; no se necesita un servidor web propio. |
| Proyecto Firebase | `.firebaserc`: `psicosaas-3c819` | Declarar proyecto explícito en cada operación privilegiada; no confiar solo en el alias `default`. |
| Firestore | `firebase.json`: base `(default)`, ubicación `southamerica-east1`; reglas e índices versionados | Una única base configurada. Cambiar reglas o índices afecta ambos frontends. |
| Functions | `functions/`, Node 22, región `southamerica-east1`, `maxInstances: 10` global en código | El backend se publica aparte del frontend. El máximo se aplica a funciones, no constituye un tope total de gasto del proyecto. |
| Producción web | Hosting `luremsapp`; dominio documentado `https://app.lurems.lat` | `firebase.json` fija el sitio; cambiar únicamente el proyecto de CLI no crea ni selecciona un staging seguro. |
| Validación web | `https://psico-found-frontend.vercel.app`; publicación desde `main` registrada en `pilot-release.md` | Confirmar integración y rama en Vercel. Su etiqueta técnica «Production» puede corresponder al entorno de pruebas del negocio. |
| Rutas y caché | `firebase.json` y `vercel.json`: fallback SPA y revalidación de caché; recuperación de módulos en router | Probar acceso directo, recarga y pestañas abiertas después de publicar y revertir. |
| CI | `.github/workflows/quality.yml`: PR y push a `main`, Node 22, Java 21, build, auditorías, unitarias, backend, lint e integración/navegador aislados | Ya existe la mayor parte de la validación. No se encontró un workflow de despliegue Firebase en el repositorio. Un workflow declarado no demuestra una ejecución remota exitosa. |
| Pruebas | Runners con Auth/Firestore/Functions locales y `demo-lurems-followup`, red saliente bloqueada | Base adecuada para pruebas destructivas y regresión; no redirigir estas suites al proyecto real. |
| App Check | Inicialización web reCAPTCHA Enterprise y enforcement de callables por defecto | Vercel necesita dominio autorizado. No usar el modo `observe` de un supuesto staging sobre este backend compartido. |
| Mantenimiento | `runtime_controls/maintenance`, wrapper de callables y reglas | Es un control compartido; requiere acceso privilegiado para activarlo y retirarlo. No equivale a una página de mantenimiento ni detiene Admin SDK o Authentication. |
| Logs | Wrapper con `operation`, `correlationId`, `elapsedMs`, `code`, mensajes `callable completed` y `callable failed` | Reutilizar Cloud Logging. Los fallos manejados se registran como warning; buscar solo severity ERROR omitiría incidentes. |
| Alertas y revisión | `config/pilot-alerts.example.json` y `config/pilot-staging.example.json` contienen pendientes | Son plantillas; no demuestran alertas, canales, presupuesto ni respaldo activos. |
| Encuesta | Configuración versionada `SURVEY_INPUT_MODE=guided`, límite 30 envíos/cuenta/día y 2 operaciones globales; envío sin secreto Gemini vinculado | Preservar modo guiado en cada release y rollback. Reactivar IA es otro cambio con sus requisitos. |
| Analítica | `@vercel/analytics`, condicionada por `VITE_VERCEL_ANALYTICS_ENABLED` | No sustituye monitoreo de Firebase ni captura integral de errores del navegador. |
| Pagos y archivos | Conciliación manual documentada, sin scheduler de vencimiento; Storage no verificado en consola | Asignar revisión manual de pendientes. Inventariar buckets y archivos antes de excluirlos del respaldo. |

No se inspeccionaron en esta planificación las cuentas remotas, IAM efectivo, facturación, registros DNS, backups, despliegues activos ni ejecuciones de GitHub Actions. Esas verificaciones son la primera actividad de implementación, no hechos asumidos.

## 3. Entornos, acceso y datos de prueba

| Entorno | Uso permitido | Datos y límites |
| --- | --- | --- |
| Local y CI | Unitarias, integración, navegador, concurrencia, reglas, fallos, eliminación y recuperación sintética | Emuladores `demo-*`, fixtures sintéticos y aislamiento existente. `npm run dev` por sí solo usa la configuración local y puede conectar a Firebase real. |
| Vercel estable | Smoke manual breve, integraciones reales de Auth/App Check y revisión visual del candidato | Cuentas sintéticas dedicadas; misma base y backend de producción. Ninguna prueba de carga, borrado masivo o migración experimental. |
| Previews de ramas | Revisión visual cuando resulte útil y esté protegida | No asumir que funcionarán login, correo o App Check. Mantener el dominio estable como único destino remoto habitual de validación. |
| Firebase Hosting | Servicio de usuarios y smoke posterior al release | Datos reales y cuentas sintéticas controladas. No ejecutar la suite completa contra este dominio. |

En este documento, «smoke» significa una comprobación breve de los recorridos esenciales después de desplegar; «SHA» identifica el commit exacto de Git. «RPO» expresa cuánta información podría perderse desde la última copia utilizable y «RTO» el tiempo objetivo para restablecer el servicio.

Preparar dos pacientes sintéticos, un profesional sintético y un administrador de prueba limitado a lo que permiten los permisos existentes. Los datos deben identificarse por un inventario restringido de UIDs e IDs; no inventar un campo `isTest` ni modificar reglas para aislarlos. No crear relaciones con pacientes reales ni cambiar políticas globales para que pase una prueba. En un backend compartido, incluso una cuenta administrativa sintética conserva privilegios reales: sus pruebas globales se hacen en emuladores.

El profesional de prueba puede aparecer en el directorio real: mantenerlo inactivo fuera de la ventana y comprobar su exclusión. Si el modelo actual no permite impedir su exposición o reservar sin afectar disponibilidad real, omitir ese smoke remoto y conservarlo en emuladores; no dar por hecho un aislamiento inexistente.

Usar buzones controlados. No introducir historias clínicas, diagnósticos ni pagos reales como datos de prueba. La limpieza se hace por el flujo soportado y el inventario exacto, conservando auditorías e información que deba retenerse. No lanzar búsquedas amplias y borrar por prefijos.

Auth, retornos de correo, OAuth y reCAPTCHA tienen configuraciones de dominios distintas: verificar las tres. Los dominios documentados son `app.lurems.lat`, `psico-found-frontend.vercel.app` y `luremsapp.web.app`; no ampliar a `*.vercel.app` para habilitar previews arbitrarias. App Check no sustituye autorización por usuario y rol. La protección de Vercel depende del plan y del alcance: comprobar qué URL queda protegida antes de considerarla privada. [App Check web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) · [Protección Vercel](https://vercel.com/docs/deployment-protection).

## 4. Flujo de desarrollo y DevOps

1. Crear una rama corta por cambio y un PR pequeño hacia `main`. Evitar una rama `develop` permanente para este MVP.
2. Clasificar impacto: documentación, frontend, backend compatible, reglas/permisos, datos o configuración sensible. Identificar el componente a recuperar antes de publicar.
3. Ejecutar el workflow Quality y revisar el diff. Proteger `main` con sus comprobaciones obligatorias; si trabaja una sola persona, no exigir un aprobador adicional inexistente. No usar secretos productivos en PR ni en pruebas de forks.
4. Merge solo cuando el SHA candidato tenga validación suficiente y las dependencias de backend estén resueltas. Vercel publica desde `main` según la integración documentada; su deploy puede avanzar independientemente del job Quality del push. No considerar su estado Ready una aprobación de producción. [Integración Git de Vercel](https://vercel.com/docs/git).
5. Validar el deployment de Vercel asociado al SHA elegido y realizar el smoke permitido. Congelar ese candidato: un push posterior cambia el dominio estable y obliga a revisar qué se está validando.
6. Publicar manualmente Firebase Hosting desde un checkout limpio del SHA aprobado y con configuración pública revisada. Verificar Quality del SHA de `main` antes de promover. La implementación inicial puede seguir usando CLI; después, un workflow manual con entorno protegido simplifica la trazabilidad.
7. Realizar smoke de producción y observar 30–60 minutos. Registrar resultado y versión recuperable. Evitar releases cuando el responsable no pueda observar y responder.

Mantener una sola entrega o rollback en curso para el backend y sitio compartidos. No cancelar a ciegas una publicación que ya modificó recursos. Un despliegue parcialmente exitoso requiere inventario del estado efectivo.

### Orden según el tipo de cambio

| Tipo | Orden y condición |
| --- | --- |
| Solo documentación | Revisar contenido y enlaces; sin deploy. |
| Solo frontend, compatible con backend actual | Quality → `main`/Vercel → smoke → Hosting → smoke. Mantenimiento no necesario por defecto. |
| Backend compatible nuevo | Primer PR solo con preparación de backend/índices/reglas compatibles; tras Quality, publicar componentes Firebase y esperar índices READY. El frontend actual debe seguir funcionando. Segundo PR habilita la interfaz nueva, pasa por Vercel y luego Hosting. |
| Cambio coordinado incompatible | Primero intentar dividirlo en cambios compatibles. Si no es viable, ventana de mantenimiento global, pruebas exhaustivas en emuladores y publicación coordinada; no presentarlo como validado en un backend de staging. |
| Migración destructiva, prueba de recuperación o carga | Fuera del flujo ordinario. Ensayo aislado, copia verificable y procedimiento específico antes de considerar ejecución real. |

El primer PR de backend no debe incluir una interfaz que invoque funciones aún no desplegadas: Vercel arrancaría automáticamente al merge. Un deploy compatible del backend es igualmente un cambio en producción y debe observarse antes de continuar.

### Trazabilidad mínima del release

Registrar identificador y fecha, operador, SHA exacto y tag si se usa, enlaces de Quality y Vercel, proyecto/base/sitio/región, componentes modificados, hashes de reglas/índices/lockfiles, configuración pública efectiva, versiones de políticas/secretos por identificador, ID de versión Hosting, backend anterior compatible, smoke y decisión de cierre.

Vercel y Hosting construyen por separado. Un SHA igual no garantiza bytes iguales si cambian variables, versión de Node o dependencias. Fijar Node 22 y lockfiles; comparar configuración funcional Firebase, App Check y documentos. Registrar diferencias deliberadas, como analítica solo en Vercel. Guardar el `dist` aprobado para Hosting y su huella; una compilación de CI sin variables reales no acredita el artefacto productivo.

## 5. Plan de pruebas de despliegue

| Capa | Qué conservar o comprobar | Frecuencia y puerta de salida |
| --- | --- | --- |
| Calidad local/CI | Unitarias, backend, lint, Knip normal y producción, build y auditoría de ambos paquetes, ya presentes en Quality | Cada PR de aplicación; sin fallos bloqueantes ni excepción tácita. Una vulnerabilidad exige triage documentado, sin actualizaciones forzadas automáticas. |
| Integración/navegador | Suite aislada actual, incluidos cuentas, reglas, pagos, legal, agenda Lima y administración | Antes de cada release de aplicación. Confirmar qué ejecuta realmente Quality; `test:agenda` con `PILOT_VALIDATION=true` añade cobertura del piloto. |
| Compatibilidad | Frontend anterior con backend nuevo y nuevo frontend con datos existentes; campos opcionales y llamadas repetidas | Cada cambio de contrato. Las suites actuales no certifican por sí solas la convivencia entre releases; revisar y ensayar esa combinación. |
| Vercel | HTML y JS cargan; login/logout; rol correcto; correo/retorno con buzón sintético; App Check válido; navegación, recarga y una escritura propia reversible | Cada candidato; 10–15 minutos. Reserva/pago solo si se garantiza separación de cuentas y disponibilidad sintéticas. |
| Firebase Hosting | Dominio/TLS; rutas directas; assets; login; lectura autorizada; una operación sintética crítica y regreso tras recarga | Inmediatamente después de publicar; revisar también Vercel si cambió backend. |
| Cliente abierto | Sesión anterior al deploy, navegación a un módulo nuevo, revalidación y recuperación de chunks sin bucles | Cambios frontend y simulacro de rollback. |
| Integraciones reales | Entrega de correo, Google, App Check, cuotas y permisos publicados | Al configurar y cuando cambie esa integración; evitar correos repetitivos en cada smoke. |
| Recuperación | Rollback Hosting; redeploy backend compatible; copia real restaurable protegida | Antes de ampliar el piloto y tras cambios relevantes de recuperación; ensayo mensual ligero. |

El smoke falla si hay acceso indebido, escritura sobre registros reales ajenos a la prueba, login bloqueado para cuentas válidas, ruta crítica inutilizable, índices no preparados o inconsistencia financiera. Si una función comercial permanece deshabilitada por política, registrar «no habilitada» y comprobar el bloqueo esperado; no abrirla para conseguir una marca de aprobación.

No modificar los runners de CI para apuntarlos a Vercel. Las pruebas negativas remotas no deben agotar cuotas ni relajar App Check. Un HTTP 200 del fallback SPA no demuestra que Vue arrancó, que una ruta existe o que Firebase funciona.

## 6. Configuración, accesos y seguridad operativa

- Mantener configuración pública del cliente separada de secretos: todo `VITE_*` termina en el navegador. API key Firebase y site key reCAPTCHA son identificadores públicos; claves de proveedor, tokens y credenciales Admin SDK no lo son.
- Revisar la matriz Development/Preview/Production de Vercel y la usada para construir Hosting. En ambos frontends, mismo proyecto, región y contrato legal vigente; sin variables de emulador ni debug tokens. Cambiar `VITE_*` requiere reconstruir y desplegar.
- Mantener secretos backend en Secret Manager y registrar su versión sin copiar valores. Rotar ante exposición o cambio de responsables. Un rollback de código no revierte automáticamente valores, permisos ni políticas; no reactivar una clave comprometida.
- Mantener reglas e índices en Git; no abrir permisos para compatibilizar una versión vieja. Desplegar solo componentes necesarios y revisar operaciones de borrado antes de aceptarlas.
- Usar cuentas personales con MFA y privilegios mínimos en GitHub, Firebase/GCP y Vercel. Diferenciar operador de despliegue, cuenta de ejecución, administrador de aplicación y `privacyOperator`; no compartir una cuenta Owner para uso diario.
- Para automatizar el deploy posteriormente, preferir identidad federada GitHub–GCP con permisos acotados al repositorio/entorno; no introducir claves JSON duraderas en PR. Mantener acceso manual de recuperación documentado y probarlo.
- Mantener fuente y configuración como referencia: `maxInstances` y otras opciones en código pueden sobrescribir cambios de consola al desplegar. Registrar cualquier intervención urgente y reconciliarla después. [Administración de Functions](https://firebase.google.com/docs/functions/manage-functions).
- Revisar DNS, renovación del dominio y TLS administrado; dejar instrucciones de recuperación de cuentas del registrador. Evitar cambios DNS como mecanismo habitual de rollback.

`verify:pilot-config` es un verificador offline diseñado para un manifiesto de staging y exige, entre otras cosas, aprobaciones del proveedor. No valida consolas, no certifica el modo guiado ni una publicación legal administrada, y no es hoy una puerta automática adecuada para este backend productivo compartido. No cambiar `APP_ENV` a `staging` para hacerlo pasar. Usar una revisión explícita de las comprobaciones aplicables y planificar su adaptación solo cuando se implemente.

## 7. Monitoreo mínimo

Usar un panel en Cloud Monitoring, consultas guardadas en Cloud Logging, notificaciones nativas de GitHub/Vercel y presupuesto en Cloud Billing. Empezar sin otro proveedor. La analítica de Vercel es opcional y no cubre la salud del backend.

Los valores siguientes son propuestas iniciales; requieren verificar señales disponibles y ajustar tras una semana de tráfico. La ausencia de tráfico no acredita salud.

| Señal | Propuesta inicial | Acción y límite |
| --- | --- | --- |
| Disponibilidad de producción | HTTPS a `/`, cada 5 min; alerta tras 2 rondas fallidas desde al menos 2 ubicaciones; vigilar TLS | Prioridad alta al operador. Mide entrega HTTP, no ejecución JS ni disponibilidad de datos. |
| Fallo de despliegue | Notificación de Quality/Vercel y resultado de publicación Firebase por entrega | Bloquear promoción y revisar si hubo cambios parciales. |
| Errores backend inesperados | 5 códigos inesperados en 5 min, o tasa ≥5% con al menos 20 llamadas en esa ventana | Investigar por operación/código. Construir denominador con completadas + fallidas; separar `internal`, `unavailable`, timeouts de validaciones esperadas. |
| Latencia | p95 >5 s durante 10 min, con al menos 20 muestras; separar operación y arranque en frío | Investigar región, consultas y dependencia; no contratar instancias mínimas sin medir. |
| Rechazos App Check/Auth | Salto sostenido respecto de la línea base o fallo de una sesión sintética válida | Revisar métricas nativas y logs de plataforma: un rechazo anterior al handler puede no aparecer en `callable failed`. |
| Cuotas | Aviso al 80% de la cuota diaria efectiva y ante rechazos globales sostenidos | Separar límite esperado por cuenta de agotamiento del servicio. Revisar consumo antes de ampliar cuota. |
| Datos y respaldos | Copia diaria ausente/fallida y antigüedad >30 h como aviso inicial | Verificar timestamps reales y variación del horario administrado; no fijar una hora de backup inexistente. |
| Operación de negocio | Revisar pagos/leases/solicitudes de privacidad pendientes al inicio y cierre de la jornada | Manual en MVP usando consultas/pantallas existentes; no suponer un scheduler ni alertas automáticas para esas colas. |

Usar solo etiquetas de baja cardinalidad: operación, código y componente. Correlación en búsquedas, sin convertir `correlationId` o UID en etiquetas de métricas. No registrar notas, mensajes, prompts, email, tokens, cuerpos de solicitudes ni URL completa con información personal. Revisar el payload real del runtime antes de copiar el filtro de la plantilla de alertas.

Los uptime checks se configuran en Monitoring y necesitan su política de notificación. Probar recepción y acuse con el canal real; no provocar una caída productiva. Los monitores sintéticos que ejecutan navegador son otra capacidad y pueden implicar ejecución/costos adicionales: posponerlos hasta necesitarlos. [Monitoreo de disponibilidad](https://docs.cloud.google.com/monitoring/uptime-checks/introduction).

Objetivo operativo inicial: revisar salud cada día hábil, observar cada entrega 30–60 minutos y atender incidentes críticos en 15 minutos dentro de la cobertura acordada. Como referencia interna, medir disponibilidad HTTP mensual hacia 99,5%; no prometer SLA contractual ni guardia 24/7 sin personal y cobertura definidos. Registrar interrupciones del backend aunque el frontend continúe respondiendo 200.

La captura automática de excepciones del navegador es una brecha conocida. Por ahora, smoke de JS, prueba de pestaña anterior y reporte de soporte con versión/navegador. Si aparecen fallos que no se pueden diagnosticar, evaluar instrumentación mínima con revisión de datos antes de agregar otro servicio.

## 8. Costos y capacidad

Definir un presupuesto mensual del propietario para todo `psicosaas-3c819`, incluyendo Functions/Cloud Run, Firestore, Authentication, App Check/reCAPTCHA, Hosting, compilaciones, Artifact Registry, logs y backups; revisar por separado el plan y consumo de Vercel, incluida su compatibilidad con el uso comercial del MVP.

Configurar avisos al 50%, 80% y 100% del presupuesto y una alerta de previsión. Son avisos, no un corte garantizado del gasto. No suspender automáticamente la facturación como respuesta: puede dejar sin servicio el MVP. [Presupuestos de Cloud Billing](https://docs.cloud.google.com/billing/docs/how-to/budgets).

La guía histórica registra reCAPTCHA en 250 evaluaciones/día, TTL de una hora y tres dominios autorizados. Confirmar valores reales antes de planificar capacidad; son evaluaciones, no un máximo equivalente de usuarios ni un costo cero garantizado. Mantener por ahora los límites del modo guiado y observar rechazos; las dos operaciones simultáneas globales pueden ser un cuello de botella antes que `maxInstances`.

Revisar semanalmente lecturas/escrituras, invocaciones, almacenamiento, egreso, duración, logs y artefactos de compilación. Definir retención/limpieza de artefactos después de garantizar releases recuperables. Evitar consultas completas o pruebas de carga en la base compartida. Evaluar aumentos con uso real y una prueba aislada.

## 9. Backups y recuperación de datos

Separar recuperación de aplicación y recuperación de información. Volver al frontend anterior no recupera documentos borrados; restaurar una copia antigua puede perder reservas, consentimientos, revocaciones y pagos posteriores.

| Componente | Protección propuesta para el MVP | Verificación |
| --- | --- | --- |
| Firestore | Backup administrado diario y retención inicial de 7 días, sujeta a la política de privacidad | Ver copia completada, acceso restringido y ensayo de restauración. Requiere Blaze y tiene costo. |
| Authentication | Diseñar y ensayar respaldo diario de identidades y configuración; revisar también antes de cambios de cuentas/proveedores | Proteger exportaciones como secretos: pueden contener hashes de contraseña. No guardarlas en Git ni en artefactos públicos de CI. Verificar recuperación de UID/proveedor/claims según alcance real. |
| Storage | Inventariar buckets, objetos y uso real; definir recuperación solo si existen datos que deban conservarse | La variable del bucket o la ausencia de uploads en código no demuestra que esté vacío. |
| Código/configuración | Git, lockfiles, reglas/índices y artefacto Hosting aprobado; inventario de IAM, dominios, políticas y referencias de secretos | Guardar valores sensibles fuera de Git. Conservar al menos tres releases Hosting y fuentes recuperables de dos releases backend compatibles. |

Un backup Firestore contiene datos e índices y se restaura en una **base nueva**; no es un botón para sobrescribir `(default)`. No incluye Auth, Storage ni políticas TTL. Aplicar controles IAM y revisar reglas de la base recuperada. El cliente y backend actuales usan la base predeterminada: no existe un cambio de destino listo para cortar tráfico hacia una base con nombre. Definir y ensayar recuperación selectiva o un corte específico antes de prometer recuperación total. [Backups Firestore](https://firebase.google.com/docs/firestore/backups).

Las exportaciones Auth requieren su propio proceso y no constituyen una copia completa de Firebase ni de su configuración. Su importación debe respetar credenciales y proveedores soportados. [Exportación/importación de Authentication](https://firebase.google.com/docs/cli/auth).

Objetivos iniciales: rollback frontend en 15 min; recuperación backend compatible en 60 min; pérdida de datos objetivo de hasta 24 h y recuperación de datos en 8 h. Son metas por validar, no garantías. El intervalo diario puede variar: medir la antigüedad efectiva de copias y ajustar si no cumple el objetivo. Auth sin respaldo diario verificado no cumple ese objetivo. Si perder hasta un día es inaceptable para reservas/pagos, revisar PITR o mayor protección antes de ampliar el uso.

Ante corrupción: detener escrituras, preservar el estado actual, elegir copia anterior al incidente, recuperar en un recurso protegido, comparar registros/subcolecciones/referencias y reconciliar cambios posteriores antes de reabrir. No resucitar cuentas eliminadas, permisos revocados o consentimientos obsoletos. Nunca importar toda una base sobre operaciones financieras recientes como rollback ordinario.

El backup en la misma ubicación no resuelve por sí solo pérdida de acceso al proyecto o una contingencia regional. Aceptar explícitamente esa limitación inicial y reevaluar una copia externa protegida cuando el impacto lo justifique. Los plazos de respaldo deben concordar con la política de retención/eliminación; siete días es una propuesta operativa, no una determinación legal.

## 10. Rollback e incidentes

### Decisión de recuperación por componente

| Fallo | Recuperación preferida | Precaución |
| --- | --- | --- |
| UI/JS/rutas después de publicar | Revertir versión live de `luremsapp` desde historial de Hosting; comprobar sesión y rutas | Recupera contenido/configuración Hosting, no Functions, reglas ni datos. [Rollback Hosting](https://firebase.google.com/docs/hosting/manage-hosting-resources). |
| Candidato Vercel defectuoso | Detener pruebas; recuperar deployment conocido según capacidades del plan o revertir Git y reconstruir | Verificar SHA, variables y URL. No revierte servicios Firebase. Un push posterior puede reemplazar de nuevo el dominio estable. |
| Backend defectuoso | Mantenimiento si hay riesgo; redeploy de fuentes de un release compatible con configuración segura vigente | No asumir un historial de rollback equivalente al de Hosting. Verificar todas las funciones del grupo; no borrar funciones nuevas durante la urgencia. |
| Reglas/configuración | Recuperar versión conocida solo si conserva la protección y es compatible con datos actuales | Si exige abrir permisos o reactivar IA/secretos no aprobados, mantener cierre y corregir hacia adelante. |
| Datos inconsistentes o eliminados | Contención y recuperación selectiva desde copia protegida | Procedimiento de datos separado; no downgrade de toda la base. |
| Caída de Firebase o cuota agotada | Revisar estado del proveedor, consumo y alcance; mantener información de ayuda y evitar reintentos masivos | Cambiar Vercel por Hosting no recupera el backend compartido. |

Mantener compatibilidad con el release anterior durante al menos dos entregas y siete días, usando el plazo mayor antes de retirar contratos. Preservar campos/índices nuevos durante una reversión. Una política legal vigente y su historial no se despublican como efecto secundario de restaurar frontend.

### Secuencia de incidente

1. Registrar hora Lima, impacto, dominios, release, componente y evidencia técnica mínima; designar un operador.
2. Detener promociones y pruebas Vercel. Si hay exposición, corrupción o efectos repetidos, activar mantenimiento compartido por el acceso privilegiado documentado; suspender escritores Admin SDK e integraciones.
3. Esperar al menos los 180 s prescritos en la operación existente y confirmar que no quedan escrituras, trabajos o reintentos relevantes; esperar más si el runtime real lo exige. El flag no bloquea Auth, operaciones privilegiadas ni todos los recursos públicos.
4. Determinar último estado compatible y elegir rollback o corrección. Si no puede garantizarse consistencia, mantener cerrado el recorrido afectado.
5. Aplicar recuperación acotada y verificar backend, reglas, índices y ambos frontends. Bajo mantenimiento no se puede validar el recorrido normal protegido: completar comprobaciones técnicas, retirar el flag de forma controlada y hacer smoke sintético inmediato; reactivarlo si falla. No inventar un bypass de prueba.
6. Confirmar recuperación con operaciones correctas y observación 30–60 min; registrar datos pendientes de reconciliación y responsable.
7. Registrar causa, tiempo de recuperación y una acción preventiva. Comunicar indisponibilidad y recuperación por el canal definido; una posible brecha sigue su procedimiento de privacidad.

Prioridad crítica: acceso indebido, pérdida/corrupción, pagos inconsistentes o servicio inaccesible. Prioridad alta: recorrido principal o un rol bloqueado. Menor: defecto visual sin impacto funcional. Las primeras requieren contención inmediata durante la cobertura acordada; las demás se planifican según impacto.

El control de mantenimiento no tiene un botón administrativo ordinario: registrar previamente proyecto, ruta del documento, acceso IAM que puede cambiarlo, valores, quién lo activa y cómo lo retira. Mantener ayuda y documentos públicos disponibles cuando el alcance técnico lo permita; no asumir que Firebase Authentication deja de crear identidades durante ese cierre.

## 11. Responsables, rutina y salida del MVP

Para un equipo pequeño, una persona puede ser responsable de producto, despliegue e incidente. Identificarla y asignar un suplente con acceso propio o documentar el riesgo de no tenerlo. La revisión clínica, comercial o de privacidad conserva sus responsables y no se sustituye con una aprobación técnica.

| Momento | Actividad |
| --- | --- |
| Cada entrega | Quality, revisión de compatibilidad, smoke Vercel/Hosting, release anterior disponible y observación. |
| Inicio/cierre de día hábil | Salud, alertas, backup reciente y colas manuales de pagos/privacidad; revisar vencimientos según operación existente. |
| Semanal | Costos, cuotas, errores, dependencias, acceso de pruebas y próximos cambios. |
| Mensual y tras cambios relevantes | Ensayo de recuperación, accesos/MFA, dominio, retención de logs/artefactos y necesidad de separar backend. |

Antes de considerar operable la siguiente entrega: responsable y cobertura definidos, CI remoto comprobado, destinos confirmados, smoke seguro, release anterior identificado, alertas con recepción probada y respaldo/restauración adecuados al impacto. Registrar cualquier brecha aceptada con responsable, fecha y mitigación; no convertir pendientes en hechos cumplidos.

Separar un proyecto Firebase de pruebas cuando se necesiten pruebas destructivas remotas, migraciones incompatibles frecuentes, carga, integraciones de pago reales, acceso de más probadores o cuando ya no sea posible excluir a usuarios reales de los ensayos. Reexaminar también si el RPO de un día resulta inaceptable. Hasta entonces, el límite de la base compartida es una decisión explícita del MVP.

## 12. Referencias del proyecto

- [Release y operación existentes](../operations/pilot-release.md).
- [Guía de validación y comandos actuales](../operations/validation.md).
- [Cuenta, mantenimiento y privacidad](../operations/pilot-privacy.md).
- [Pagos y conciliación manual](../operations/pilot-payments.md).
- [Encuesta guiada y matching](../functional/encuesta-matching.md).
- [Matriz de aceptación y pendientes](../functional/matriz-cierre-piloto.md).

Este plan adapta las referencias históricas que proponían un backend de staging separado a la decisión actual de compartir Firebase. Ningún procedimiento antiguo de staging autoriza cambiar el entorno productivo a `APP_ENV=staging`, desactivar enforcement o probar borrados sobre la base compartida.
