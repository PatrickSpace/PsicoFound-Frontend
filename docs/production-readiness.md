# Seguimiento de preparación para producción de Lurems

Última revisión: 2026-10-24, America/Lima.

Release base desplegado: `main` en `481f60b579b5fe64834f1038451036e384e5e625`.

Proyecto Firebase: `psicosaas-3c819`. Dominio: <https://app.lurems.lat>.

## Estado ejecutivo

La encuesta conversacional híbrida está fusionada, desplegada y disponible. El
frontend, las Functions, las reglas y los índices de Firestore se publicaron desde
el release aprobado. Las pruebas unitarias, backend, navegador, lint, build y
auditorías terminaron correctamente.

El lanzamiento operativo permanece abierto hasta completar las comprobaciones que
necesitan una identidad QA autenticada, recepción real de correo, revisión humana
del texto legal y responsables externos. Los pagos reales son un release separado
y no bloquean la aceptación funcional de la encuesta mientras se mantenga el
comportamiento publicado en `main`.

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

### Seguridad y acceso

- [x] `OPENAI_API_KEY` almacenada como secreto de Functions.
- [x] App Check web registrado con reCAPTCHA Enterprise y exigido por las callables.
- [x] Cuotas, concurrencia, idempotencia y descarte de respuestas tardías.
- [x] Consentimiento legal versionado y recuperación de cuentas incompletas.
- [x] Verificación de correo mediante Firebase Authentication.
- [x] Reglas de Firestore compiladas sin advertencias de helpers sin uso.

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

## Puerta de lanzamiento pendiente

| Prioridad | Comprobación | Dependencia humana o externa | Criterio de cierre |
|---|---|---|---|
| P0 | Encuesta autenticada en producción | Cuenta QA y creación de identidad | Texto libre recibe respuesta de Luna; opciones guiadas, resumen y recomendaciones funcionan. |
| P0 | Recuperación ante fallo real de IA | Sesión QA y ventana controlada | Se muestra el aviso, se conserva el borrador y se puede continuar con opciones. |
| P0 | Política de privacidad `v2` | Revisión legal y aprobación de producto | Nueva versión sustituye Gemini por OpenAI Luna y se solicita reaceptación. |
| P0 | App Check posterior al release | Sesión QA y acceso a métricas | Sesión válida aceptada, solicitud sin token rechazada y sin rechazos inesperados. |
| P0 | Smoke por roles | Cuentas de paciente, psicólogo y administrador | Recorridos principales completados con identidades separadas. |
| P0 | Alertas y responsables | Destinatarios y decisiones operativas | Alertas de error, latencia, cuota y presupuesto probadas con acuse. |
| P1 | Correo real | Buzón de prueba y creación de cuenta | Entrega, enlace válido/expirado, recuperación y retorno al onboarding comprobados. |
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
- Aplicación: <https://app.lurems.lat>
- Hosting alternativo: <https://luremsapp.web.app>

## Criterio de cierre

La encuesta puede aprobarse para lanzamiento controlado cuando todos los elementos
P0 estén cerrados con evidencia reproducible. Los P1 deben tener responsable y fecha
aceptada. Los cobros reales conservan su puerta independiente.
