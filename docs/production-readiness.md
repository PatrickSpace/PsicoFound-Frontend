# Seguimiento de preparación para producción de Lurems

Última revisión: 2026-10-24, America/Lima.

Release desplegado: `main` en `1eba0f2`. Release base de la encuesta: `481f60b`.

Proyecto Firebase: `psicosaas-3c819`. Dominio: <https://app.lurems.lat>.

## Estado ejecutivo

La encuesta conversacional híbrida está fusionada, desplegada y disponible. El
frontend, las Functions, las reglas y los índices de Firestore se publicaron desde
el release aprobado. Las pruebas unitarias, backend, navegador, lint, build y
auditorías terminaron correctamente.

El lanzamiento operativo permanece abierto hasta completar las comprobaciones que
necesitan identidades QA de psicólogo y administrador, revisión humana del texto
legal, responsables externos y dispositivos físicos. La identidad QA de paciente,
el correo real y la encuesta productiva ya fueron comprobados. Los pagos reales son
un release separado y no bloquean la aceptación funcional de la encuesta mientras
se mantenga el comportamiento publicado en `main`.

## Completado

### Encuesta y datos

- [x] Flujo híbrido con opciones guiadas y texto libre mediante OpenAI `gpt-6-luna`.
- [x] Conversación empática y redirección natural tras cinco turnos sin avance.
- [x] Orden dinámico: solo se pregunta un criterio cuando no tiene valor.
- [x] «Me es indiferente» y «me da igual» son respuestas válidas para el matching.
- [x] Motivo o solo conversar, modalidad, género, edad y enfoque registrados.
- [x] Resumen editable y confirmación antes de generar recomendaciones.
- [x] Aviso de intercambio de datos al confirmar el resumen.
- [x] Hasta 15 intercambios completos enviados al proveedor; historial completo
      conservado en Firestore sin eliminación automática a 30 días.
- [x] Datos de contacto detectables enmascarados y peticiones con `store: false`.
- [x] Fallo de IA recuperable con borrador y opciones guiadas disponibles.
- [x] Smoke autenticado productivo con texto libre: Luna respondió con empatía,
      las opciones guiadas completaron solo criterios faltantes y el resumen fue
      coherente antes de ejecutar el matching.
- [x] Modalidad y género «Me da igual» persistieron como valores válidos y no se
      interpretaron como respuestas faltantes.
- [x] El historial completo de la conversación reapareció tras recargar la encuesta.
      La exposición futura de ese contenido al psicólogo sigue pendiente de diseño
      de permisos y experiencia.

### Seguridad y acceso

- [x] `OPENAI_API_KEY` almacenada como secreto de Functions.
- [x] App Check web registrado con reCAPTCHA Enterprise y exigido por las callables.
- [x] Cuotas, concurrencia, idempotencia y descarte de respuestas tardías.
- [x] Consentimiento legal versionado y recuperación de cuentas incompletas.
- [x] Verificación de correo mediante Firebase Authentication.
- [x] Reglas de Firestore compiladas sin advertencias de helpers sin uso.
- [x] App Check productivo observado con `auth: VALID` y `app: VALID`; una llamada
      directa sin credenciales fue rechazada con HTTP 401.
- [x] Correo de verificación entregado a un buzón temporal, enlace aceptado y retorno
      al onboarding comprobados. La sesión anterior mostró el bloqueo esperado y se
      recuperó mediante «Ya verifiqué mi correo».

### Calidad, despliegue y operación pública

- [x] 44 pruebas unitarias frontend y 93 pruebas backend aprobadas.
- [x] Workflow Quality completo aprobado sobre el release fusionado.
- [x] Frontend, Functions Node.js 22, reglas e índices publicados en Firebase.
- [x] Vercel publicó el mismo `main`.
- [x] Inicio, login, registro, términos, privacidad y entrada de encuesta responden
      HTTP 200 en `app.lurems.lat`.
- [x] La entrada de encuesta conserva `/iniciarencuesta` al redirigir al login.
- [x] Navegación pública sin errores nuevos de consola.
- [x] Bundle dividido entre aplicación, Vue, Vuetify y Firebase; build sin aviso de
      chunks superiores al límite definido.
- [x] GitHub Actions actualizadas a runtimes compatibles con Node.js 24.
- [x] Encuesta autenticada revalidada en viewport móvil sin desbordamiento horizontal
      ni errores de consola.

## Puerta de lanzamiento pendiente

| Prioridad | Comprobación | Dependencia humana o externa | Criterio de cierre |
|---|---|---|---|
| P0 | Recuperación ante fallo real de IA | Sesión QA y ventana controlada | Se muestra el aviso, se conserva el borrador y se puede continuar con opciones. |
| P0 | Política de privacidad `v2` | Revisión legal y aprobación de producto | Nueva versión sustituye Gemini por OpenAI Luna y se solicita reaceptación. |
| P0 | Smoke por roles restantes | Cuentas de psicólogo y administrador | El paciente está comprobado; faltan los recorridos principales de psicólogo y administrador con identidades separadas. |
| P0 | Alertas y responsables | Destinatarios y decisiones operativas | Alertas de error, latencia, cuota y presupuesto probadas con acuse. |
| P1 | Correo real restante | Buzón temporal disponible; cambio de contraseña requiere intervención humana | Entrega, enlace válido y retorno al onboarding están comprobados; faltan enlace expirado y recuperación completa. |
| P1 | Historial conversacional para psicólogo | Decisión de producto, privacidad y permisos | El transcript se conserva en `conversations/{uid}/messages`, pero hoy solo puede leerlo su propietario y no aparece en el historial terapéutico del psicólogo. |
| P1 | Dispositivos físicos | Acceso a Safari/Chrome iOS y navegadores desktop | Recorrido autenticado sin defectos bloqueantes. |
| P1 | Backup y restauración | Proyecto aislado, permisos y aprobación | Restauración ensayada con conteos y accesos verificados. |
| Separado | Cobros reales | Proveedor, sandbox y revisión legal/contable | Puerta comercial aprobada antes de usar credenciales productivas. |

## Trabajo preparado, pendiente de aprobación

La propuesta de reemplazo de la sección de IA se encuentra en
[privacy-2026-10-v2-proposal.md](legal/privacy-2026-10-v2-proposal.md). La versión
`2026-10-v1` publicada es inmutable. El borrador no se debe publicar hasta que
producto y asesoría legal revisen el documento completo y aporten una referencia
de aprobación.

## Procedimiento de build y publicación

1. Cargar la configuración local aprobada del frontend antes de ejecutar el build.
   No imprimir ni copiar secretos al repositorio.
2. Ejecutar pruebas, lint, auditorías y build sobre el mismo commit.
3. Desplegar índices y reglas, después Functions y finalmente Hosting.
4. Abrir el dominio principal, comprobar rutas públicas, consola y logs.
5. Ejecutar el smoke autenticado con cuentas QA y revisar App Check.

Un build de Hosting sin las variables públicas `VITE_FIREBASE_*` genera una página
en blanco con `auth/invalid-api-key`. Este incidente se detectó y corrigió durante
el despliegue del 2026-10-24; la comprobación visual posterior es obligatoria.

## Evidencia

- PR de encuesta: <https://github.com/PatrickSpace/PsicoFound-Frontend/pull/1>
- Quality del release: <https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/40048277432>
- PR de cierre técnico: <https://github.com/PatrickSpace/PsicoFound-Frontend/pull/2>
- Quality del cierre técnico: <https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/40122503712>
- Aplicación: <https://app.lurems.lat>
- Hosting alternativo: <https://luremsapp.web.app>

## Criterio de cierre

La encuesta puede aprobarse para lanzamiento controlado cuando todos los elementos
P0 estén cerrados con evidencia reproducible. Los P1 deben tener responsable y fecha
aceptada. Los cobros reales conservan su puerta independiente.
