> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Revisión funcional del administrador — 2026-10-12

Continuación de la revisión: 2026-10-14, America/Lima. Estado de trabajo: implementación en validación. **No constituye cierre ni autorización de lanzamiento.**
Objetivo: completar los procesos administrativos necesarios para operar el piloto, con
permisos efectivos en servidor, trazabilidad y validación funcional de su impacto en
pacientes y psicólogos. Conserva el árbol previo; línea base de hashes en
`test-results/admin-pilot-2026-10-12/baseline.json`.

Esta revisión incorpora expresamente el rol antes excluido del
[informe de paciente y psicólogo](cierre-correcciones-piloto-2026-10-11.md).
No sustituye las aprobaciones de políticas ni certifica servicios publicados.

## Hallazgos comprobados al inicio

| ID | Prioridad | Defecto y evidencia de código inicial | Corrección en validación |
| --- | --- | --- | --- |
| ADM-01 | Alta | `userService` escribía roles/correo directamente; reglas permitían a admin editar/borrar usuarios, solicitudes y profesionales | Callables transaccionales; escrituras directas denegadas; correo/credenciales exclusivamente Auth; sin alta/borrado aislado |
| ADM-02 | Alta | Aprobar una solicitud rechazada podía crear un perfil; envíos simultáneos se preparaban fuera de transacción | Envío/revisión transaccional, decisión única, solicitud vigente, perfil único, motivo obligatorio de rechazo |
| ADM-03 | Alta | Protección de permisos propios solo visual y sin protección del último admin | Validación y serialización de membresía administrativa, versiones y auditoría mínima |
| ADM-04 | Alta | Reglas y rutas administrativas abrían `profiles`, conversaciones y registros terapéuticos | Administración operativa sin facultades clínicas; lectura por titular/profesional autorizado; conciliación recibe solo contexto financiero |
| ADM-05 | Alta | Conciliación ofrecía `expired` a un callable que no admite ese estado; no exponía vencimiento ni transferencias | Cola filtrable, vencimiento por `expirePaymentReservation`, snapshot, soporte vinculado, obligaciones y transferencias externas |
| ADM-06 | Alta | Respuestas de soporte sin versión/idempotencia, aviso sobrescrito por estado | Control optimista, reintento ligado a autor/contenido, respuesta y aviso atómicos, reapertura explícita |
| ADM-07 | Media | No había seguimiento administrativo de solicitudes de eliminación | Consulta de recibos y proyección de jobs/bloqueantes, sin entregar manifiestos ni conceder ejecución privilegiada |
| ADM-08 | Alta | Listeners/cargas y formularios administrativos no se reiniciaban al cambiar UID/vista | Generaciones de contexto, cierre de formularios, cancelación de listeners y descarte de resultados obsoletos |
| ADM-09 | Media | Menú móvil omitía conciliación y soporte; historial de tarifas usaba zona del dispositivo | Entradas móviles operativas y fechas Lima explícitas |
| ADM-10 | Media | Redondeo de catálogo/previsualización al más cercano discrepaba de la política capturada `floor_professional_remainder_platform` en céntimos impares | Cálculo nuevo coherente con esa política; sin reescribir tarifas/versiones/reservas históricas |
| ADM-11 | Media | Las reglas no reconocían `role` o el alias admin dentro de `roles`, aunque Functions sí; el operador heredado podía ejecutar pero no consultar | Reglas alineadas para las representaciones administrativas existentes; revocación elimina el campo legado |
| ADM-12 | Alta | El inventario de privacidad incluía auditoría como titular, pero omitía su atribución como operador de registros ajenos | Categorías administrativas compartidas explícitas; diagnóstico bloqueado sin política, sin borrar evidencia de terceros por defecto |
| ADM-13 | Media | La validación asíncrona de tarifa empezaba antes de bloquear un segundo clic; una respuesta posterior podía cerrar otro formulario | Bloqueo desde el inicio de validación y prueba de fallo/reintento/doble clic seguida de nueva edición |
| ADM-14 | Alta | Un documento admin huérfano o con cuenta Auth deshabilitada podía contar como reemplazo del último administrador utilizable | Comprobación de cuentas Auth existentes y habilitadas al retirar el rol, además del bloqueo transaccional de membresía |
| ADM-15 | Media | El detalle financiero no mostraba explícitamente el recibo original frente al último comprobante de devolución | Referencias separadas y visibles también en el historial de decisiones |

Mejoras opcionales fuera del cierre: dashboard de métricas, contabilidad completa,
pasarela, scheduler, multimoneda, búsqueda de texto en servidor, paginación remota
para volúmenes superiores al piloto. Las tablas operativas tienen búsqueda/filtros
y paginación visual; los listeners consultan el conjunto del piloto, no prometen
escalabilidad ilimitada. Medir volumen real antes de ampliar el alcance.

## Permisos y datos mínimos

El actor operativo usa `admin` (incluido alias heredado admitido por el modelo).
Cada transacción vuelve a leer su rol; las reglas no confían en el modo visual.
La cuenta con varios roles puede cambiar de vista: sus facultades clínicas dependen
del vínculo paciente/profesional y de la vista correspondiente, no del rol admin.
El profesional inactivo conserva registros, pero no acceso profesional ni cotizaciones
nuevas. No se eliminan sus citas ni se reasignan pacientes automáticamente; requieren
seguimiento operativo autorizado.

| Proceso | Datos necesarios | No habilita |
| --- | --- | --- |
| Usuarios | UID, nombre, correo de cuenta, teléfono, roles y estado profesional | Modificar email/credenciales, nacimiento/consentimiento, crear Auth ficticio, eliminar documentos |
| Solicitudes/directorio | Información profesional declarada, identidad vinculada, decisión y estado activo | Certificar acreditaciones externas, cambiar identidad/tarifa mediante edición genérica |
| Tarifas | Precio PEN, porcentajes fijos, enlace permitido, marca test, actividad e historial | Aprobar condiciones comerciales ni habilitar test en política real |
| Conciliación/transferencias | Referencias, UID de participantes, IDs de cita/terapia, snapshot, saldo, recibo y soporte asociado | Leer encuesta/chat/resúmenes clínicos ni mover dinero |
| Soporte | Mensaje del titular, respuesta visible, autor/fecha/estado, referencia de pago validada por servidor | Conversación terapéutica o notas internas implícitas |
| Solicitudes de cuenta | Recibo, estado, política, conteos y tipos de bloqueantes de jobs | Leer manifiestos de privacidad o ejecutar sin claim específico |

`privacyOperator` sigue siendo un claim separado, con autenticación reciente,
autorización vinculada a fingerprint/política y mantenimiento drenado. Admin ordinario
no lo concede ni ejecuta eliminación. El procedimiento especializado se conserva en
[privacidad](../../operations/pilot-privacy.md).

## Inventario por proceso

### ADM-P01. Acceso y contexto

- **Objetivo/actor:** acceder a funciones operativas mediante rol admin vigente.
- **Entrada:** Auth autenticado; ruta y modo autorizados. El servidor y las reglas
  deciden los permisos efectivos, aunque se llame sin usar botones.
- **Recorrido/resultado:** navegación de escritorio/móvil, rutas administrativas;
  cuenta/vista distintas limpian datos, listeners, selección y borradores. Revocar
  el rol impide operaciones posteriores y actualiza el contexto de la sesión.
- **Errores/reintentos:** carga fallida muestra error y Actualizar; respuestas de una
  generación anterior no publican resultados. No se degrada un permiso en servidor.
- **Auditoría:** operaciones mutantes registran actor y fecha; consultas sin contenido
  en telemetría. No se registra el cuerpo de la petición.
- **Estado/prueba:** implementado, pendiente aceptación completa; ADMIN-01/02 y navegador.

### ADM-P02. Solicitar, aprobar y rechazar profesionales

- **Objetivo/actor:** admin decide sobre solicitud declarada; el solicitante mantiene
  su cuenta paciente. No hay acreditación externa automática.
- **Entrada:** solicitud pendiente vigente, usuario existente; aprobación sin perfil
  duplicado. Rechazo exige motivo visible.
- **Pasos/estados:** buscar/filtrar → revisar detalle → seleccionar aprobar/rechazar →
  confirmar. `pending → approved|rejected`; una decisión distinta posterior se rechaza.
  Rechazado puede presentar una nueva solicitud; la anterior no modifica la nueva.
- **Resultado:** transacción entre solicitud, usuario/roles, perfil y auditoría. Aprobación
  concede acceso con el mismo UID; rechazo deja motivo y permite corregir formulario.
- **Errores/concurrencia:** un envío o decisión gana; reintento idéntico conserva resultado;
  perfil existente inconsistente exige revisar, nunca duplicar. Dos operadores no pueden
  aprobar y rechazar simultáneamente con resultados contradictorios.
- **Auditoría:** `reviewedBy`, `reviewedAt`, motivo y evento administrativo.
- **Estado/prueba:** implementado; ADMIN-03/04 y recorridos de ambas decisiones en navegador.

### ADM-P03. Editar y activar perfil profesional

- **Objetivo/actor:** admin mantiene datos públicos y estado de un profesional habilitado.
- **Entrada:** perfil existente con UID profesional; versión actual. No permite crear ni
  eliminar perfiles sueltos, cambiar UID, colegiatura declarada o tarifa por este canal.
- **Pasos/resultado:** directorio → buscar → editar nombre/resumen/dirección/especialidades,
  enfoques/modalidades/actividad → confirmar → guardar. Desactivar retira acceso profesional
  y nuevas reservas; conserva historial. Reactivar recupera acceso por rol/vínculo.
- **Errores/concurrencia:** versión obsoleta rechazada, formulario conserva error; recargar
  y volver a revisar. Servidor valida campos permitidos y límites.
- **Auditoría:** `adminVersion`, `updatedBy/At`, evento con campos modificados y actividad,
  sin duplicar descripciones ni contenido sensible.
- **Estado/prueba:** implementado; ADMIN-06 y navegador.

### ADM-P04. Gestionar usuarios y roles

- **Objetivo/actor:** admin consulta cuentas y edita nombre/teléfono/acceso paciente/admin.
- **Entrada:** cuenta en Auth y perfil existente, versión actual; al menos un rol válido.
- **Pasos/resultado:** buscar → editar → confirmar → callable → actualizar. Auth conserva
  correo y credenciales. Rol profesional solo mediante solicitud; actividad en directorio.
  Altas usan registro real; eliminación usa solicitud del titular/proceso de privacidad.
- **Errores/concurrencia:** una versión antigua no sobrescribe. Cambios administrativos
  se serializan para impedir dos bajas del último administrador; documentos huérfanos
  o cuentas Auth deshabilitadas no cuentan como sustitutos; nunca se confía en la
  protección visual del propio usuario. Falta de Auth bloquea edición del documento.
- **Auditoría:** actor, fecha, campos afectados y roles antes/después; no copia teléfono,
  nacimiento ni credenciales al historial. Historial consultable por usuario en edición.
- **Estado/prueba:** implementado; ADMIN-05/17 y efecto sobre Configuración del paciente.

### ADM-P05. Catálogo de tarifas

- **Objetivo/actor:** admin mantiene precios ofrecidos; profesional elige tarifa propia.
- **Entrada:** PEN, importe entero en céntimos y límites válidos, reparto fijo 70/30,
  URL HTTPS permitida y banderas booleanas; versión de tarifa/selección vigente.
- **Pasos/estados:** crear → editar nombre/enlace/marca → confirmar activación/desactivación → historial.
  Importe existente es inmutable: crear otra tarifa. Seleccionar desde Configuración
  profesional; nuevas cotizaciones reflejan la selección y versión.
- **Resultado:** reservas anteriores conservan snapshot de tarifa/política. Una cotización
  obsoleta o tarifa desactivada no autoriza reservar. Test no permite cobro bajo política real.
- **Errores/concurrencia:** compare-and-set de versión, reintento idéntico no duplica versión.
- **Auditoría:** catálogo `versions`, profesional `rate_history`, autor/fecha Lima explícita.
- **Estado/prueba:** implementación existente preservada y contexto/fechas corregidos;
  pruebas de reglas/tarifas/pagos y navegador pendientes de ejecución final.

### ADM-P06. Conciliar, vencer y registrar devolución

- **Objetivo/actor:** conciliador admin revisa operación y evidencia externa.
- **Entrada:** snapshot válido; proveedor/referencia verificable para confirmación/devolución.
- **Pasos:** filtrar estado/plazo/referencia/participantes → detalle y política capturada →
  revisar soporte vinculado → elegir transición válida → anotar evidencia → confirmar.
- **Estados:** pendiente admite rechazo; enviada admite confirmación/rechazo; vencimiento
  usa callable propio y plazo real, respetando `submittedExpiration`; revisión de devolución
  admite devolución verificada o conservar confirmación original si la reserva sigue abierta.
  Canceladas no resucitan; realizadas no ofrecen rechazo ni vencimiento; confirmadas no vencen. Fechas inválidas requieren revisión.
- **Resultado:** cita, resumen de terapia, slot, pago, historial y notificación coherentes.
  El slot solo se libera si sigue perteneciendo a esa cita. La interfaz nunca cambia
  estados financieros directamente ni aplica condiciones comerciales actuales a una reserva.
- **Errores/concurrencia:** referencia única por proveedor/comercio/tipo; estado transaccional
  decide ante cancelación/confirmación/vencimiento. Reintento no duplica recibos/obligaciones.
- **Auditoría:** conciliador/fecha en pago, eventos, recibo y `payment_audit` de cada decisión.
- **Estado/prueba:** implementado; integración de pagos y recorrido admin/paciente en navegador.
- **Externo:** conciliador/suplente, frecuencia, cuenta/comprobantes y política aprobados.
  No hay scheduler. Registrar devolución no envía dinero.

### ADM-P07. Obligaciones y transferencias

- **Objetivo/actor:** admin controla saldo y registra transferencia ya verificada externamente.
- **Entrada:** obligación reconciliada, pago confirmado, saldo positivo, moneda/importe y
  referencia externa. Revisión de devolución bloquea nuevas transferencias.
- **Pasos:** detalle de pago → calculado/pendiente/transferido → referencia e importe →
  confirmar verificación externa → registrar → saldo y ledger visibles.
- **Resultado:** referencia única, saldo disminuye/transferido aumenta. Devolución anula
  pendiente; transferido se conserva y queda `recovery_review` si corresponde.
- **Errores/concurrencia:** transacción serializa transferencia/devolución y rechaza moneda
  distinta, saldo excedido o misma referencia con datos distintos; repetición idéntica segura.
- **Auditoría:** ledger conserva operador, fecha, importe/moneda y referencia. Sin banco automático.
- **Estado/prueba:** implementado; integración de pagos y navegador conciliación-transferencia-devolución.

### ADM-P08. Soporte y pagos tardíos

- **Objetivo/actor:** admin responde al titular y documenta solución autorizada.
- **Entrada:** solicitud existente; versión vigente e ID de reintento. Enlace a pago validado
  por propiedad en servidor; referencia obtenida del registro, no del texto del navegador.
- **Pasos/estados:** buscar/filtrar → detalle/historial → respuesta visible → confirmar →
  `open → in_progress|resolved`; `in_progress → in_progress|resolved`; `resolved → in_progress`.
  Cada cambio exige respuesta. No hay notas internas en este módulo.
- **Resultado:** respuesta/autor/fecha/estado y aviso visibles solo para titular/admin;
  otro paciente no lee la solicitud. Resolver soporte no confirma ni devuelve dinero.
- **Errores/concurrencia:** versión desfasada rechazada; mismo autor/ID/payload no duplica;
  aviso por versión, sin sobrescribir un aviso previo de igual estado.
- **Auditoría:** respuestas append-only con actor/fecha/transición y `updatedBy/At`.
- **Estado/prueba:** implementado; ADMIN-07 y navegador de admin, titular y tercero.

### ADM-P09. Solicitudes de cuenta y privacidad

- **Objetivo/actores:** admin recibe y sigue; operador `privacyOperator` ejecuta política.
- **Entrada:** solicitud explícita del titular; configuración/aprobación y autorización
  específica, autenticación reciente y mantenimiento para operaciones privilegiadas.
- **Pasos:** titular confirma solicitud → admin consulta recibo → operador diagnostica y
  revisa bloqueantes → autoriza fingerprint → ejecuta por lotes → seguimiento de estado.
- **Resultado:** proyección administrativa muestra conteo/cursor/estado/tipos de bloqueante;
  no entrega manifiestos ni rutas clínicas. `completed_under_policy` conserva datos que
  la política exige; nunca se presenta como borrado de todos los sistemas/respaldos.
- **Errores/concurrencia:** política ausente, inventario desconocido, retención, cambio del
  manifiesto, lease y ejecución parcial siguen protegidos por el servicio existente.
- **Auditoría:** solicitud, job/manifiesto, autor/fecha de autorización y ejecución;
  categorías nuevas de auditoría requieren decisión de retención explícita.
- **Estado/prueba:** integración de consulta implementada; aceptación ADMIN-08 y suite
  de privacidad existente a repetir. Ejecución real y decisiones de retención pendientes externas.

## Matriz de aceptación

En construcción. No se trasladan automáticamente los 32/81/50/84 resultados anteriores.

| Requisito obligatorio | Evidencia prevista | Estado actual |
| --- | --- | --- |
| 1. Rutas/llamadas directas prohibidas | ADMIN-01/02 + navegador | En validación |
| 2. Aprobación/rechazo y acceso efectivo | ADMIN-03/04 + navegador solicitante | En validación |
| 3. Decisiones concurrentes | ADMIN-03 | En validación |
| 4. Auth, roles, último admin | ADMIN-05 + navegador usuario | En validación |
| 5. Tarifas/cotizaciones/snapshots | Reglas tarifas, integración pagos, navegador | Pendiente ejecución final |
| 6. Recibo único/idempotencia | Integración pagos | Pendiente ejecución final |
| 7. Vencimiento/slot y registros | Integración pagos + navegador | En validación |
| 8. Carreras financieras | Integración pagos | Pendiente ejecución final |
| 9. Pago tardío/soporte trazable | ADMIN-07 + navegador | En validación |
| 10. Transferencias/saldo | Integración pagos + navegador | En validación |
| 11. Respuesta visible solo titular | ADMIN-07 + navegador | En validación |
| 12. Privacidad privilegiada | ADMIN-08 + integración cuentas | En validación |
| 13. Cambio cuenta/vista/carga | Navegador + regresión contexto | En validación |
| 14. Escritorio/móvil/error/reintento | Playwright ambos proyectos + capturas | En validación |

Reproducción dirigida: `npm run test:admin`, `npm run test:admin-browser`.
Regresión requerida: `npm run test:pilot`, `npm test`, `npm run test:backend`,
`npm run lint:backend`, `npm run build`, Knip normal/producción. Usar Node 22,
Java 21 y dependencias/emuladores/Chromium descargados antes de aislar.
Los runners fallan si un puerto está ocupado y no reutilizan servicios ajenos.

## Resultados de validación — ejecución del 2026-10-14

Las pruebas usan cuentas separadas `review-admin`, `admin-second`,
`privacy-operator`, `professional-a`, `patient-b` y `patient-c`, todos ficticios.
El operador de privacidad tiene claim propio; el administrador ordinario no.
El navegador usa incluso Asia/Tokyo para comprobar que la presentación sigue en Lima.
Emuladores propios del proyecto `demo-lurems-followup`, puertos comprobados libres,
tráfico externo bloqueado por el sistema operativo y aislamiento adicional del navegador.

| Comprobación actual | Resultado | Evidencia local |
| --- | --- | --- |
| Utilidades y comando de privacidad | 34/34 aprobadas | `test-results/admin-pilot-2026-10-12/unit-final.log` |
| Servidor | 81/81 aprobadas | `backend-final.log` en el mismo directorio |
| Integración de reglas, servidor y persistencia | 67/67 aprobadas | `pilot-final-3.log` |
| Navegador Lima y regresión general | Lima 32/32; general en ejecución | `pilot-final-3.log` |
| Lint Functions y compilación | Aprobados | `lint-final.log`, `build-final.log` |
| Knip normal y producción | Aprobados | `knip-final.log`, `knip-production-final.log` |
| Auditoría de dependencias frontend y Functions | 0 vulnerabilidades reportadas | `audit-frontend.log`, `audit-backend.log` |
| Manifiesto de configuración de ejemplo | Rechazado como corresponde (salida 1); aprobaciones incompletas | `config-review.json` |
| Linux y staging | No ejecutados | `environment-review.json`; host macOS sin runtime Linux disponible |

Desglose de integración: seguimiento 7, citas 6, administrador 17, restauración
sintética 1, reglas/tarifas 6, pagos 8, cuentas/privacidad 9, encuesta 5, paciente 5,
agenda 3. Los resultados anteriores son antecedentes, no se suman como pruebas nuevas.
Los logs de ejecuciones incompletas o fallidas se conservan y no acreditan aceptación.
Una ejecución intermedia de integración corrigió un uso de `exists()` en la prueba: Admin SDK
expone esa propiedad como booleano; la política compartida y su bloqueo ya respondían
correctamente. Otra ejecución se interrumpió tras detectar ADM-13 en navegador;
no se considera una regresión completa aprobada. La prueba de Lima ahora verifica el contexto operativo de conciliación,
porque abrir el detalle clínico como admin ordinario es precisamente un permiso retirado.

Coherencia local: región `southamerica-east1`, exports bajo el wrapper común de
App Check/mantenimiento, reglas e índices referenciados por ambas configuraciones
Firebase. Las consultas nuevas usan documentos, raíces o igualdad de un solo campo;
no requieren un índice compuesto nuevo. Esto no acredita índices READY, IAM ni
artefactos publicados. `hosting.site: luremsapp` sigue siendo un destino existente:
configurar explícitamente el sitio de staging antes de cualquier publicación autorizada.

## Pendientes externos y criterio de operación

Sin ejecución en staging ni Linux acreditada por esta revisión. Aprobaciones legales,
clínicas/comerciales/retención, responsables y frecuencia de conciliación/soporte,
privacidad, pruebas de consola/IAM/App Check/Auth/correo/Google, backup/restore y
sitio explícito de staging siguen según [operación y release](../../operations/pilot-release.md).
Añadir a la política de privacidad `admin_audit`, `payment_audit` y sus categorías
compartidas `professional_shared/*` y `administrative_shared/*` cuando correspondan; no asignar plazos reales a partir de fixtures.

Persisten bloqueantes técnicos mientras esta matriz no esté aprobada localmente.
El cierre técnico futuro tampoco autorizará operar con políticas sintéticas ni publicará el piloto.


| Pendiente externo | Decisión, acceso o evidencia necesaria | Qué bloquea | Responsable |
| --- | --- | --- | --- |
| Condiciones comerciales y operación de pagos | Política aprobada, comercio/referencias válidas, conciliador/suplente y frecuencia; comprobar recibos, transferencias y devoluciones fuera del sistema | Cobrar y operar conciliación real; el MVP no vence automáticamente | Producto/operación, personas por asignar |
| Retención y privacidad | Acciones/plazos/fundamento por categoría, incluidos expedientes y auditorías compartidas; operador habilitado y ventana controlada | Autorizar y ejecutar eliminación real | Privacidad/legal y operación, por asignar |
| Habilitación de profesionales | Criterio y evidencia externa de revisión de lo declarado; responsable de aprobación | Afirmar acreditación profesional o habilitar profesionales reales | Responsable clínico/operativo, por asignar |
| Alcance clínico, edad, consentimiento y ayuda | Aprobaciones y documentos/versiones reales; revisión clínica de ayuda y límites de IA | Admisión real, encuesta y asistencia clínica del piloto | Producto, clínica y legal, por asignar |
| Proveedor de IA y cuotas | Contrato/privacidad, facturación del proyecto exacto, límites aprobados y prueba autorizada | Uso de proveedor real | Responsable técnico y privacidad, por asignar |
| Staging y publicación coordinada | Proyecto/sitio autorizado, IAM, secretos, App Check, Auth/OAuth/correo, índices READY y smoke de los tres roles | Acreditar el comportamiento desplegado | Responsable técnico, por asignar |
| CI Linux | Resultado real de Ubuntu con namespace de red y sandbox de Chromium, artefacto identificado | Dar por validada compatibilidad Linux | CI/responsable técnico, por asignar |
| Guardia, alertas y recuperación | Destinatarios, umbrales/presupuesto, recepción probada y restauración administrada en entorno separado | Operación con respuesta ante incidentes y recuperación acreditadas | Operación/infraestructura, por asignar |

No se crearon cuentas reales ni se modificaron permisos productivos. No hubo envíos
externos de soporte/correo, movimientos de dinero, borrados productivos ni despliegues.
Las respuestas de soporte son pruebas locales autorizadas con datos sintéticos.


### Propuesta operativa para revisión (no aprobada)

- Designar un titular y suplente de conciliación, con cuentas individuales. Durante
  el horario de operación que se publique, proponer revisión de la cola cada 15 minutos,
  siempre con frecuencia inferior al plazo de reserva aprobado. Si no hay cobertura,
  no abrir nuevos cobros del piloto. Producto/operación deben aprobar o ajustar esta
  propuesta; no se incorpora como SLA ni como temporizador automático en la aplicación.
- Separar soporte de la verificación financiera: el operador puede responder y vincular
  evidencia, pero solo registrar confirmación/transferencia/devolución tras contrastarla
  externamente. Registrar referencia, operación, actor, fecha y resultado, sin copiar
  información clínica. Ante carrera o versión obsoleta, actualizar y revisar antes de decidir.
- Asignar privacidad a una cuenta con claim específico, autenticación reciente y ventana
  acordada. Mantener bloqueadas las categorías sin decisión de retención; revisar con
  privacidad/legal los registros compartidos antes de elegir conservar, redactar o borrar.
  No se propone un plazo legal a partir de las pruebas sintéticas.
- Para aprobación profesional, usar la información declarada y el procedimiento externo
  que apruebe el responsable clínico. Hasta contar con criterio y evidencia revisados,
  no presentar la aprobación de la aplicación como certificación de credenciales.
- Registrar cada decisión con responsable, fecha, referencia de aprobación, entorno y
  evidencia; completar el manifiesto de staging, ejecutar el smoke de los tres roles y
  decidir apertura en un acta separada. Esta revisión no firma esa acta.
