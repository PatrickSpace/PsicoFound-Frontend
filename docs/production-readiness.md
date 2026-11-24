# Seguimiento de preparación para producción de Lurems

Fecha de revisión: 2026-10-24

Zona horaria: America/Lima

Release desplegado: `main` en `481f60b579b5fe64834f1038451036e384e5e625`

Proyecto Firebase: `psicosaas-3c819`

Dominio principal: <https://app.lurems.lat>

> Estado del documento: actualizado localmente. Este archivo todavía no forma parte de
> `origin/main`; debe incorporarse mediante un cambio posterior para convertirse en el
> registro oficial del lanzamiento.

## Estado ejecutivo

La encuesta conversacional híbrida está fusionada en `main`, desplegada en Firebase y
publicada en el dominio principal. El frontend, las Functions, las reglas y los índices
de Firestore se publicaron desde el mismo commit. La compilación, las pruebas unitarias,
las pruebas del backend y la validación funcional automatizada terminaron correctamente.

El lanzamiento técnico de la encuesta está avanzado, pero el lanzamiento operativo no
debe considerarse cerrado hasta completar un recorrido autenticado en producción con
cuentas QA, corregir y aprobar el texto legal sobre el proveedor de IA, validar App Check
con una sesión real y dejar activos responsables, alertas y procedimientos de respuesta.

Los pagos se mantienen con el comportamiento de `main` y quedan fuera del alcance de la
entrega de la encuesta. La activación de cobros reales conserva su propia puerta de salida
y no debe mezclarse con la aceptación funcional de la encuesta.

## Listo y verificado

### Encuesta y matching

- [x] Encuesta híbrida: opciones guiadas y texto libre procesado con IA.
- [x] OpenAI `gpt-6-luna` configurado como proveedor para texto libre.
- [x] Respuesta conversacional y empática para contenido emocionalmente complejo.
- [x] Redirección natural hacia la información pendiente después de cinco turnos sin avance.
- [x] Solo se pregunta un criterio cuando todavía no tiene ningún valor.
- [x] Las respuestas «me es indiferente» y «me da igual» son valores válidos y no se tratan
      como información faltante.
- [x] Se conserva un orden conversacional dinámico; no se repiten criterios ya definidos.
- [x] Se registran motivo o intención de solo conversar, modalidad, género, edad y enfoque.
- [x] El contexto enviado a IA está limitado a los últimos 15 intercambios completos.
- [x] El historial completo se conserva en Firestore sin eliminación automática a 30 días.
- [x] Antes del matching se muestra un resumen editable y se solicita confirmación.
- [x] La confirmación informa que el usuario acepta compartir los datos necesarios para
      generar las recomendaciones.
- [x] Si la IA no está disponible, se informa el problema, se ofrecen las opciones guiadas
      y se vuelve a mostrar la pregunta pendiente.
- [x] Las conversaciones conservan controles de riesgo y recursos de ayuda independientes.

### Integración y seguridad

- [x] `OPENAI_API_KEY` está configurada como secreto de Functions y no se versiona.
- [x] Las Functions de encuesta usan App Check, autenticación, cuotas e idempotencia.
- [x] El proveedor recibe datos minimizados, contactos enmascarados y `store: false`.
- [x] Consentimiento versionado integrado en registro y renovación de cuentas existentes.
- [x] Confirmación de correo mediante Firebase Authentication y recuperación de registros
      incompletos.
- [x] App Check web registrado con reCAPTCHA Enterprise para los dominios autorizados.
- [x] Límite documentado de 30 envíos diarios por cuenta y dos solicitudes simultáneas.

### Merge, pruebas y despliegue

- [x] PR de la encuesta fusionado mediante squash en `main`.
- [x] Commit desplegado: `481f60b`.
- [x] 44 pruebas unitarias de frontend aprobadas.
- [x] 93 pruebas de backend aprobadas.
- [x] Lint del backend y compilación de producción aprobados.
- [x] Auditorías de dependencias del frontend y Functions sin vulnerabilidades reportadas.
- [x] Workflow completo de Quality aprobado en GitHub sobre el commit fusionado.
- [x] Firestore Rules compiladas y publicadas.
- [x] Índices de Firestore publicados.
- [x] Functions Node.js 22 publicadas en `southamerica-east1`.
- [x] Firebase Hosting publicado en el sitio `luremsapp`.
- [x] Vercel publicó el mismo `main` correctamente.
- [x] Rutas públicas `/`, `/login`, `/registro`, `/terminos`, `/privacidad` y
      `/iniciarencuesta` responden HTTP 200.
- [x] `/iniciarencuesta` conserva el destino al redirigir a
      `/login?redirect=/iniciarencuesta`.
- [x] Navegación pública revisada sin errores nuevos en la consola del navegador.
- [x] Logs recientes de las Functions de encuesta revisados sin errores operativos.

## Configuración de producción

| Componente | Estado | Evidencia o siguiente control |
|---|---|---|
| Firebase web `VITE_FIREBASE_*` | Listo | El build corregido carga autenticación y páginas públicas en `app.lurems.lat`. |
| `OPENAI_API_KEY` | Listo | Secret Manager y Functions desplegadas; falta el recorrido autenticado final. |
| OpenAI Luna | Listo técnicamente | Proveedor, modelo, minimización y límite de contexto cubiertos por pruebas. |
| App Check web | Configurado | Falta confirmar en métricas una sesión autenticada real posterior al release. |
| Consentimiento y documentos | Publicados | Versión `2026-10-v1`; requiere corrección y nueva aprobación por la referencia a Gemini. |
| Correo de verificación | Implementado | Falta comprobar entrega y retorno con un buzón real autorizado. |
| Alertas y presupuesto | Pendiente | Definir destinatarios, umbrales, guardia y prueba de recepción. |
| Backup y restauración | Pendiente | Aprobar política y realizar ensayo autorizado en un proyecto aislado. |
| Pagos reales | Alcance separado | Mantener estado de `main`; no activar producción sin completar su validación sandbox/legal. |

### Regla para construir Firebase Hosting

El archivo `.env` del frontend es local y no se encuentra en el worktree aislado. Antes
de compilar para Firebase Hosting se debe cargar explícitamente la configuración aprobada
del entorno, sin imprimir ni copiar sus valores al repositorio. Un build sin esas variables
produce una página en blanco con `auth/invalid-api-key`.

Después de compilar, verificar la página principal y la consola antes de cerrar el release.
El incidente fue detectado y corregido durante el despliegue del 2026-10-24.

## Puerta de lanzamiento actualizada

| Prioridad | Comprobación | Estado | Criterio de cierre |
|---|---|---|---|
| P0 | Recorrido autenticado de la encuesta en producción | Pendiente | Cuenta QA completa opciones guiadas y texto libre, recibe respuesta de Luna, confirma el resumen y obtiene recomendaciones. |
| P0 | Fallo controlado de IA | Pendiente | El usuario ve el aviso, conserva su borrador y puede responder con una opción guiada. |
| P0 | Texto legal de IA | Pendiente | Nueva versión aprobada y publicada reemplaza la mención a Gemini por OpenAI Luna y describe finalidad, datos y conservación. |
| P0 | App Check posterior al release | Pendiente | Sesión real aceptada, solicitudes sin token rechazadas y métricas sin rechazos inesperados. |
| P0 | Smoke test por rol | Pendiente | Paciente, psicólogo y administrador completan sus recorridos principales con cuentas QA separadas. |
| P0 | Monitoreo y responsables | Pendiente | Alertas de errores, latencia, cuota y presupuesto tienen destinatarios y una prueba de recepción. |
| P1 | Correo real | Pendiente | Alta, recepción, enlace válido/expirado, recuperación y retorno al onboarding comprobados. |
| P1 | Navegadores y dispositivos | Pendiente | Safari/Chrome iOS y navegadores desktop completan el recorrido autenticado. |
| P1 | Backup/restore | Pendiente | Restauración autorizada en entorno aislado con conteos y permisos verificados. |
| Separado | Cobros reales | Pendiente externo | Sandbox, proveedor, habilitación comercial y revisión legal/contable aprobados antes de producción. |

## Secuencia recomendada para cerrar el lanzamiento

1. Crear o designar cuentas QA de paciente, psicólogo y administrador sin usar datos reales.
2. Ejecutar el recorrido autenticado de encuesta en `app.lurems.lat`, incluida una respuesta
   libre, una opción guiada, «me da igual», edición del resumen y confirmación.
3. Confirmar en logs y métricas que OpenAI Luna y App Check funcionaron sin registrar
   mensajes, correos, tokens ni contenido sensible.
4. Corregir el documento legal, obtener aprobación y publicar una nueva versión; no editar
   silenciosamente la versión ya publicada.
5. Probar registro, verificación de correo, renovación de consentimiento y recuperación de
   una cuenta incompleta con buzones autorizados.
6. Completar el smoke test por roles y dispositivos y registrar la evidencia.
7. Configurar alertas, responsables, presupuesto y procedimiento de incidente/rollback.
8. Aprobar el lanzamiento controlado de la encuesta.
9. Tratar la activación de pagos reales como un release independiente.

## Pendientes técnicos no bloqueantes

- El analizador de Firestore Rules muestra advertencias por funciones sin uso y nombres
  reservados, aunque las reglas compilan y fueron publicadas correctamente.
- Vite advierte que algunos bundles superan 500 kB; conviene dividirlos para mejorar la
  carga, pero no impide el funcionamiento actual.
- GitHub Actions advierte sobre acciones que deben migrar de Node.js 20 a Node.js 24 y
  `setup-java` v4 a v5.
- Este documento debe incorporarse a `main` para que el seguimiento actualizado no quede
  únicamente en la rama local de preparación.

## Evidencia del release

- PR fusionado: <https://github.com/PatrickSpace/PsicoFound-Frontend/pull/1>
- Quality aprobado: <https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/40048277432>
- Aplicación: <https://app.lurems.lat>
- Firebase Hosting alternativo: <https://luremsapp.web.app>

## Criterio de cierre

La encuesta puede considerarse lista para un lanzamiento controlado cuando todos los
elementos P0 estén cerrados con evidencia reproducible. Los pendientes P1 deben tener
responsable y fecha aceptada. Los cobros reales no se consideran listos hasta completar
su puerta independiente, aunque la encuesta haya sido aprobada.
