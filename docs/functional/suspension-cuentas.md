# Suspensión de cuentas y conservación de información

Decisión del titular: 26 de octubre de 2026. Implementación publicada y comprobada el
27 de octubre de 2026. Sustituye el objetivo anterior de eliminación automática para esta
fase del producto. No modifica documentos legales publicados e inmutables.

## Comportamiento

- Configuración ofrece **Suspender cuenta**, con confirmación escrita
  `SUSPENDER MI CUENTA`. No crea una solicitud de eliminación.
- `suspendOwnAccount` toma exclusivamente el UID de la sesión autenticada.
- Conserva Authentication, perfil, conversación, consentimientos, terapias,
  seguimiento, citas, pagos y auditorías. No ejecuta borrados ni anonimización.
- Bloquea el uso ordinario de la cuenta en callables y reglas Firestore, incluso
  si un cliente conserva un ID token emitido antes de la suspensión.
- El titular puede seguir consultando su documento de identidad para mostrar la
  pantalla de suspensión y el callable de exportación de sus propios datos.
  Las versiones públicas de términos y privacidad continúan accesibles.
- El router muestra `/cuenta-suspendida`, con **Reactivar mi cuenta**, contacto de
  soporte y cierre de sesión. El titular puede reactivar suspensiones voluntarias
  e involuntarias. No se permite reactivar por esta vía otros estados restrictivos.
- Un perfil profesional asociado queda `activo: false` para impedir nuevas
  reservas. Las citas y pagos existentes no se cancelan; deben coordinarse.
- Una cuenta administradora debe transferir responsabilidades y perder ese rol
  antes de suspenderse. Esto evita dejar la plataforma sin administración.
- La suspensión y reactivación son transaccionales e idempotentes y conservan evidencia en `admin_audit`.
- Al reactivar, se restaura la disponibilidad profesional anterior únicamente si
  no cambió su versión administrativa después de suspenderse. Un profesional que
  ya estaba inactivo no se activa por reabrir la cuenta.

## Campo en Firebase

Documento: `users/{uid}`.

| Campo | Valor / uso |
| --- | --- |
| `accountStatus` | `active` o `suspended`. Las cuentas antiguas sin campo se consideran activas; las nuevas altas inicializan `active`. |
| `suspensionType` | `voluntary` o `involuntary` mientras está suspendida; se retira al reactivar y queda en auditoría. |
| `suspendedAt` | Timestamp de servidor de la suspensión vigente. |
| `lastActivityAt` | Última actividad autenticada o movimiento financiero registrado en servidor. |
| `inactivityReviewRequired` | Marca cuentas sin una fecha fiable para revisión, sin suspenderlas automáticamente. |
| `accountStatusUpdatedAt` | Timestamp de servidor del cambio a suspensión. |
| `accountStatusUpdatedBy` | UID autenticado o `system:inactivity` para suspensión automática. |

No se modifica ningún registro productivo en lote para añadir el campo. El cliente
no puede escribir estados directamente; la operación se valida en el servidor.
Administración → Usuarios muestra el estado sin permitir editarlo desde el formulario
de roles. No se cambia `Auth.disabled`: el ingreso sirve para mostrar el aviso,
pero no habilita operaciones ordinarias.

El campo es una cadena para permitir evolución posterior. Los estados de campañas
todavía no se implementan: cuando se definan, distinguir segmentación comercial de
restricción de acceso, preferiblemente en un campo separado, para que una campaña
no reactive accidentalmente una cuenta suspendida.

## Suspensión involuntaria por inactividad

- Revisión programada diaria a las **04:00, America/Lima**. Se implementa como
  Function programada publicada; no se ejecutó manualmente contra cuentas reales.
- Se exigen **tres meses calendario completos sin actividad**. Se conserva la
  hora de Lima y se ajusta el último día del mes si el mes de destino es más corto.
  La ejecución diaria puede marcarla después del instante exacto del umbral.
- Un ingreso, actividad autenticada, pago o movimiento registrado reinicia el
  plazo. No se exige pagar para conservar una cuenta que sigue utilizando la app.
- El servidor registra actividad al recibir llamadas autenticadas de una cuenta
  activa. La revisión contrasta también creación, último ingreso en
  Authentication, citas, historial y operaciones financieras del titular.
  La apertura autenticada y volver a una pestaña visible registran actividad; la
  renovación automática de tokens por sí sola no cuenta como ingreso humano. Los
  timestamps se calculan en servidor; el cliente no envía la fecha de actividad.
- Una aprobación/devolución de pago actualiza actividad del paciente y una
  transferencia registrada la del profesional. Las consultas de movimientos se
  revalidan dentro de la transacción de suspensión para evitar carreras.
- Una cuenta sin fechas fiables se marca para revisión. Un fallo de lectura no
  autoriza suspenderla. Las cuentas administradoras y estados futuros o restrictivos
  distintos de activo se omiten.
- La suspensión automática establece `accountStatus: "suspended"` y
  `suspensionType: "involuntary"`; conserva registros y no cancela citas/pagos.
- Al volver a entrar se muestra el motivo y **Reactivar mi cuenta**. Iniciar sesión
  no reactiva en silencio; la acción del titular pone la cuenta en `active` y
  reinicia `lastActivityAt`. Las restricciones previas de privacidad siguen vigentes.

La revisión recorre usuarios por páginas y consulta movimientos de candidatos
inactivos. No se incorpora otra plataforma; su consumo debe observarse al publicar
antes de ampliar el volumen del piloto.

## Eliminación anterior

Las callables heredadas `requestAccountDeletion`, `diagnoseAccountDeletion`,
`authorizeAccountDeletion` y `executeAccountDeletion` rechazan ejecución productiva.
Se conservan únicamente como código histórico y para suites aisladas `demo-*`.
Añadir una política de retención no las activa en producción.

La decisión de conservar los datos no define por sí sola plazos o fundamentos
jurídicos. Las solicitudes de privacidad que lleguen por soporte requieren revisión
humana; no se promete eliminación integral ni conservación perpetua aprobada.

## Revisión humana del sistema de apoyo

El sistema de apoyo se mantiene sin cambios funcionales. El titular contactará a
psicólogos reales para revisar casos, textos, señales y recorrido de ayuda.
Queda registrada como **acción humana pendiente**, sin botón de aprobación ni
certificación automática. Las referencias de activación ya existentes no se
presentan como prueba de que esa revisión profesional se haya realizado.

## Publicación y validación

La entrega se publicó en Functions (incluida la tarea diaria), callables existentes,
reglas y Hosting. El backend quedó listo antes de publicar el frontend. Las
comprobaciones no suspendieron cuentas reales. La tarea diaria quedó habilitada
para las siguientes ejecuciones programadas.

Validación integrada del 27/10: 44/44 unitarias frontend, 110/110 backend,
81/81 integración general (incluye el job de inactividad con Firestore emulado),
3/3 integración de agenda, 32/32 navegador de agenda y 106/106 recorridos web.
Lint, build y Knip normal/producción aprobados; dependencias sincronizadas con los
lockfiles mediante `npm ci`. No se suspendieron cuentas reales en las pruebas.
Evidencia y publicación en el [informe de entrega](../operations/validacion-produccion-2026-10-27.md).
