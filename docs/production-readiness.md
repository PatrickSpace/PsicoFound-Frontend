# Seguimiento de preparación para producción de Lurems

Última revisión: 2026-10-25, America/Lima.

Release desplegado: candidato de cierre de esta entrega; se fusionará a `main` al
terminar las comprobaciones automáticas. Release base de la encuesta: `481f60b`.

Proyecto Firebase: `psicosaas-3c819`. Dominio: <https://app.lurems.lat>.

## Estado ejecutivo

La encuesta conversacional híbrida, el acceso condicionado al transcript, las
alertas operativas y el flujo de cobro manual están desplegados en producción. El
frontend, Functions y las reglas de Firestore se publicaron desde el mismo candidato.
Las pruebas unitarias, backend, lint y build terminaron correctamente, sin emuladores.

Los recorridos de administrador y psicólogo se comprobaron con datos sintéticos en
`app.lurems.lat`. La versión legal `2026-10-v2` está publicada y exige una nueva
aceptación. Permanecen fuera del alcance de esta entrega, por decisión del titular,
la caída real de OpenAI, dispositivos físicos y el ensayo de backup/restauración.

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
- [x] El resumen y el transcript solo aparecen al psicólogo vinculado después de que
      el pago de la primera cita esté aprobado y exista consentimiento.
- [x] Una cancelación de esa primera cita retira el acceso aunque el pago permanezca
      aprobado; una cita posterior no puede reactivarlo automáticamente.

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

- [x] 44 pruebas unitarias frontend y 96 pruebas backend aprobadas.
- [x] Lint backend, build productivo y comprobación de diferencias aprobados.
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
- [x] Panel administrativo de alertas visible y protegido por rol; contiene una
      alerta sintética sin datos personales.
- [x] Canal de correo de Cloud Monitoring, métrica de logs y política de alertas
      habilitados para `jplosta01@gmail.com`.
- [x] Tres tarifas activas visibles en administración: una de prueba y dos reales.
      No se abrió un enlace de Mercado Pago ni se ejecutó una transacción.
- [x] `2026-10-v2` publicada, consultable e inmutable; una cuenta existente fue
      obligada a reaceptarla antes de continuar.
- [x] Smoke de psicólogo con resumen/transcript pagado y posterior ocultamiento por
      cancelación sintética; smoke de administrador sobre legal, alertas y tarifas.

## Pendientes y exclusiones explícitas

| Estado | Comprobación | Motivo | Criterio de cierre |
|---|---|---|---|
| Excluida | Recuperación ante caída real de OpenAI | El titular indicó no ejecutar esta prueba ahora | Ventana controlada futura; conservar borrador y opciones guiadas. |
| Excluida | Dispositivos físicos | El titular indicó no usar dispositivos físicos | Recorrido posterior en Safari/Chrome iOS y navegadores desktop. |
| Excluida | Backup y restauración | El titular indicó no ensayarlo todavía | Proyecto aislado, conteos y accesos verificados. |
| Externa | Recepción humana del correo de alertas | Requiere revisar el buzón de destino | Confirmar recepción y conservar evidencia sin reenviar contenido sensible. |
| Externa | Recuperación completa de contraseña | El enlace se envió a un buzón temporal; el cambio final requiere intervención humana | Abrir el enlace y completar personalmente la nueva contraseña. |
| Humana | Tarifa del psicólogo | Existen tarifas reales de S/100 y S/120; elegir una es una decisión comercial | Seleccionar una tarifa para cada profesional que aceptará reservas. |
| Humana | Operación de pagos | No se realizaron cobros reales durante QA | Ejecutar una transacción controlada y conciliarla cuando exista autorización financiera. |

## Publicación legal

La versión publicada se documenta en
[privacy-2026-10-v2-proposal.md](legal/privacy-2026-10-v2-proposal.md). Las versiones
`2026-10-v1` y `2026-10-v2` permanecen inmutables y consultables. Cualquier cambio
posterior debe usar un identificador nuevo y renovar la aceptación cuando corresponda.

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

La entrega puede fusionarse a `main` porque sus comprobaciones técnicas y smokes
productivos están cerrados. Las exclusiones y acciones humanas de la tabla anterior
no deben registrarse como ejecutadas; conservan su propia autorización y evidencia.
