# Cuenta y privacidad del piloto

Trabajo local 2026-10-09, America/Lima. Configuración real no aprobada ni desplegada.

## Políticas

Actualización 2026-10-17: Administración → Documentos legales
(`/admin/documentos-legales`) permite crear/editar borradores de términos y
privacidad, previsualizarlos y publicar ambos bajo una versión única con vigencia
inmediata. El borrador inicial de términos está disponible como base; la política
de privacidad no se rellena ni publica automáticamente. La publicación requiere
contenido en ambos documentos, confirmación de revisión y referencia de aprobación.
No constituye una comprobación jurídica automática.

- `legal_drafts/{id}`: lectura solo de administradores; edición mediante
  `saveLegalDraft`, con revisión esperada para rechazar cambios concurrentes.
- `legal_releases/{version}`: texto público e inmutable; no incluye UID del
  administrador ni la referencia privada de aprobación.
- `legal_settings/current`: versión y enlaces vigentes públicos. La publicación
  mediante `publishLegalDraft` actualiza versión, archivo histórico, borrador sellado
  y auditoría en una transacción; exige que la versión vigente no haya cambiado.
- `/terminos` y `/privacidad`: muestran la versión vigente sin exigir sesión ni
  correo verificado. `?version=...` conserva el contenido histórico exacto; una
  versión inexistente no se sustituye silenciosamente por la actual.
- Registro, aceptación y requisitos de cuenta consultan la publicación vigente.
  Los enlaces de aceptación incluyen la versión. Publicar otra versión requiere
  nueva aceptación sin modificar los consentimientos anteriores.

Sin publicación administrada, se conserva la configuración `LEGAL_*`/`VITE_*`
previa como compatibilidad; deben seguir coincidiendo si se utiliza ese modo.
Tras la primera publicación, Firestore es la fuente vigente para frontend y backend,
sin necesidad de reconstruir el sitio por cada actualización de texto. El verificador
estático `verify:pilot-config` sigue comprobando el modo de variables de entorno;
no acredita por sí mismo una publicación administrada en Firestore.

El contenido inicial `2026-10-17-borrador-1` no tiene vigencia ni habilita el
registro. Faltan identidad/contacto del titular, canal público de atención y
reclamaciones, definición de responsabilidades, condiciones comerciales y política
de privacidad. Completar y revisar antes de publicarlo. Guardar un borrador puede
hacerse por partes; publicar exige ambos textos completos. Los cambios de texto
usan otra versión: no hay borrado ni edición de versiones publicadas.

La atribución privada de los borradores (`updatedBy`/`publishedBy`) se incorpora
al inventario de eliminación como `administrative_shared/legal_drafts`; requiere
una decisión explícita de retención en la política real. La auditoría existente
conserva autor, versión, fecha y referencia de publicación.

Validación reproducible local: `npm run test:legal`
(con Java 21 disponible). Ejecuta permisos/reglas, concurrencia, idempotencia,
registro/consentimiento y pruebas de navegador en escritorio y móvil, exclusivamente
en emuladores demo con datos sintéticos y sin salida de red externa.

`ELIGIBILITY_POLICY_JSON` no tiene valor por defecto. Requiere versión, edad mínima,
base `declared_birth_date`, zona `America/Lima`, estado `approved` y referencia de la
aprobación. El soporte de Gemini impide configurar menores de 18; eso no aprueba
el piloto 18+. Estado `synthetic` solo es válido en Functions Emulator con proyecto
`demo-*`. La fecha declarada no constituye verificación documental.

`LEGAL_DOCUMENT_VERSION`, `LEGAL_TERMS_URL`, `LEGAL_PRIVACY_URL`, si se utiliza
el modo anterior de variables, deben corresponder a documentos aprobados.
La versión administrada se publica desde la nueva pantalla. El consentimiento se conserva en el perfil y en `users/{uid}/consents`;
una cuenta antigua necesita aceptar la versión vigente antes de usar encuesta y
recomendaciones. Cada cambio de documento requiere otra versión.

## Inventario

Auth: exportación de identidad y proveedores, excluyendo credenciales y claims.
Firestore: cuenta/consentimientos, perfil, conversación/mensajes, objetivos/avances,
ejercicios, emociones, historial, terapias, citas, avisos, feedback (ambas grafías
históricas), soporte, pagos, operaciones idempotentes, solicitudes de cuenta y
solicitud/perfil profesional/historial de tarifa. La exportación del profesional
incluye sus obligaciones y transferencias registradas, sin UID del paciente ni del
operador que las registró. Los registros ajenos compartidos
como profesional se inventarían para retención, pero no se incluyen en la
exportación personal. No se encontró carga de archivos a Storage en el código;
**falta comprobar consola y sistemas externos** antes de configurar
`storage: not_used_verified` en una política real. No es una inspección del bucket.

## Ejecución de retención/eliminación

El backend prepara servicios; no hay pantalla administrativa nueva. El usuario
solicita eliminación y obtiene `pending_policy`. El operador requiere el claim
específico `privacyOperator` y autenticación de los últimos cinco minutos. Ser
administrador ordinario no lo habilita.

1. Aprobar `PRIVACY_POLICY_JSON`: versión/referencia; acción Auth (`delete`,
   `disable`, `retain`); inventario de Storage verificado; acción por categoría
   (`retain`, `delete`, `redact`), fundamento y edad mínima del registro en días.
   `redact` requiere lista explícita de campos superiores que se retirarán.
   No existen plazos ni decisiones compartidas por defecto. Los campos redactados
   **no garantizan anonimización**: vínculos y texto libre retenidos pueden seguir
   identificando personas. La política especializada debe definir su tratamiento.
2. Con la solicitud del titular registrada, llamar `diagnoseAccountDeletion(uid)`.
   Revisar número de registros, bloqueantes y fingerprint. Subcolecciones
   desconocidas, categorías sin política y retención no cumplida bloquean ejecución.
   El diagnóstico conserva rutas/versiones/acciones, no copia notas o mensajes.
3. Llamar `authorizeAccountDeletion(jobId, fingerprint, authorizationReference)`
   con referencia de una autorización concreta; el sistema no la inventa.
4. En la ventana autorizada, activar `runtime_controls/maintenance` con
   `enabled: true` y `startedAt` Timestamp servidor. Esperar al menos 180 segundos
   para drenar callables en curso. Esta tarea no activa mantenimiento real.
   El wrapper rechaza callables ordinarias y las reglas rechazan accesos cliente.
   Suspender también integraciones/operadores externos con Admin SDK: las reglas
   no limitan ese SDK. No iniciar hasta confirmar ese cese de escrituras.
5. Ejecutar `executeAccountDeletion(jobId)` hasta terminar: lotes de hasta 100,
   cursor persistente, lease y comparación de versiones antes de cada lote.
   Los datos modificados no se borran silenciosamente: queda `partial` y se revisa
   un diagnóstico nuevo. Auth se inhabilita primero si la política lo indica;
   su eliminación ocurre después de los lotes de Firestore y admite reintento.
6. Verificar resultados por política, registros conservados, estado de la solicitud
   y evidencias. `completed_under_policy` no significa que desaparecieron todos
   los registros, respaldos o datos del proveedor. Resolver estos últimos mediante
   su procedimiento aprobado. Restablecer servicio solo después de verificar.

Sin credenciales/política reales, este procedimiento se ensaya exclusivamente con
`tests/helpers/pilot-policy.mjs` y datos demo. El fixture no es publicable.

## Comprobaciones externas pendientes

Responsable por asignar en todos los casos. Requieren staging expresamente
autorizado y cuentas sintéticas; no usar datos reales para probar borrado.

| Comprobación | Acceso y procedimiento | Resultado esperado |
| --- | --- | --- |
| Documentos/edad/reaceptación | Producto y privacidad aprueban referencias/versiones y prueban cuenta nueva y antigua | Política verificable; sin aprobación, encuesta bloqueada |
| Recuperación/cambio de correo | Auth staging, dominios y buzones autorizados; solicitar, confirmar, renovar sesión y sincronizar | Correo Auth/perfil coherente; enlaces expirados rechazados |
| Google | OAuth staging y cuenta autorizada; alta, reingreso, reautenticación | Roles y requisitos conservados, sin acceso por omisión |
| Storage/retención externa | Consola, proveedores y respaldos; inventariar, aprobar acciones y ensayar restauración | Ninguna categoría omitida ni falsa promesa de borrado integral |
| Borrado operativo | Operador con claim limitado, ventana y autorización registradas | Diagnóstico revisado, reintento seguro, datos compartidos tratados según política |

Actualización 2026-10-10: el registro retenido de solicitud incorpora `accessBlocked`
en la primera transacción de ejecución. Reglas y callables lo comprueban incluso tras
cerrar mantenimiento, evitando que un ID token aún vigente lea expedientes retenidos.
Ese registro no se elimina ni se permite editar por cliente. Los ledgers de obligaciones
y transferencias profesionales, así como recibos ligados a operaciones propias o compartidas como profesional,
añadidos al inventario requieren política explícita:
su presencia sin categoría configurada bloquea el diagnóstico. Una reanudación tras
cambio del manifiesto exige diagnóstico/autorización nuevos; no se omite la validación.

## Seguimiento administrativo y ejecución reproducible

Actualización 2026-10-12. Soporte → Solicitudes de eliminación muestra el recibo del
usuario y una proyección de estado, política, cursor/conteo y tipos de bloqueante de
los jobs. No incluye manifiestos ni rutas de datos clínicos. Durante mantenimiento
las pantallas ordinarias permanecen cerradas; el operador conserva los resultados
privilegiados y el administrador puede actualizar el seguimiento al restablecerse
el servicio. No se añade un botón de borrado para el admin ordinario.

Las categorías `admin_audit` y `payment_audit` (también la variante profesional
compartida que exista), además de `administrative_shared/admin_audit`,
`administrative_shared/payment_audit` y `administrative_shared/professional_transfers`
para actividad realizada como operador sobre registros ajenos, requieren decisiones
explícitas de retención en la política
real. Los fixtures solo ensayan retención sintética. Una cuenta con rol administrativo
bloquea el diagnóstico/ejecución: primero transferir responsabilidades y retirar el
rol desde Usuarios, donde se protege al último administrador, y volver a diagnosticar.

El comando `scripts/privacy-operator.mjs` invoca exclusivamente las tres Functions
existentes, con su validación de claim/autenticación reciente, política, fingerprint,
lease y mantenimiento. No ejecuta borrados locales ni escribe documentos a mano.
La sesión debe provenir del inicio de sesión/reautenticación del operador autorizado
mediante el cliente configurado para ese entorno; usar ID token y App Check vigentes.
No concede claims, no renueva privilegios ni desactiva App Check.

1. Preparar `plan.local.json`, revisar el proyecto/entorno exacto y la autorización:

   ```json
   {
     "projectId": "demo-lurems-followup",
     "region": "southamerica-east1",
     "emulator": true,
     "operation": "diagnoseAccountDeletion",
     "data": {"uid": "patient-b"}
   }
   ```

   El ejemplo solo es local. Para remoto, usar el proyecto explícitamente autorizado,
   `emulator: false` y `environmentAuthorization` con referencia revisable; no basta
   cambiar un alias. Una referencia escrita en el archivo no acredita su aprobación.
2. Guardar los tokens vigentes en `sesion.local.json` con claves `idToken` y
   `appCheckToken` (esta última obligatoria en remoto), permisos de archivo 0600 y
   fuera de control de versiones. Nunca pegar tokens en logs ni argumentos del shell.
3. Ejecutar `node scripts/privacy-operator.mjs plan.local.json sesion.local.json`.
   Conservar el diagnóstico en el expediente restringido del operador, no en soporte
   público: puede incluir rutas/fingerprint. Revisar bloqueantes y manifiesto antes
   de autorizar; no copiar contenido clínico a la evidencia administrativa.
4. Cambiar la operación a `authorizeAccountDeletion` y datos a
   `{jobId, fingerprint, authorizationReference}`, todos tomados del expediente
   revisado. Ejecutar el mismo comando y conservar resultado.
5. Abrir la ventana de mantenimiento conforme al procedimiento controlado anterior:
   documento único `runtime_controls/maintenance`, `enabled: true`, `startedAt`
   Timestamp servidor; registrar entorno, responsable, autorización y release en el
   acta. Esta es una operación de despliegue privilegiada prescrita, no una edición de
   estados de usuarios/pagos. Detener escritores Admin SDK externos y esperar 180 s.
6. Con sesión reciente, usar operación `executeAccountDeletion` con `{jobId}`. Repetir
   por lotes solo sobre ese job y hasta `completed`; ante `partial`, revisar cambios y
   diagnosticar/autorizar de nuevo según el resultado. El comando no crea reintentos
   automáticos ni supone que un timeout signifique que no hubo ejecución.
7. Verificar conservación/borrado por política y restaurar servicio solo tras decisión
   operativa. Actualizar Soporte y contrastar `completed_under_policy`; tratar proveedores
   y respaldos por sus procedimientos propios. Eliminar el archivo de tokens al terminar.

Prueba local del comando y de sus límites: `tests/admin-pilot.integration.test.mjs`
y `tests/unit/privacyOperator.test.mjs`. La ejecución real sigue pendiente externa.
