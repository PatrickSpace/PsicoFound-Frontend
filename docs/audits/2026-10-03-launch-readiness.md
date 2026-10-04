# Publicacion y preparacion para lanzamiento

Fecha: 2026-10-03. Producto: Lurems. Evaluacion del codigo actual, pruebas locales,
despliegue y navegacion publica; no es una certificacion legal, clinica o de seguridad.

## Conclusion

La version esta publicada para revision. No recomiendo abrir todavia el servicio
comercial a pacientes reales: faltan controles de permisos, privacidad y seguridad
del flujo de IA, ademas de completar el ciclo de reserva y pago.
Las pruebas internas con datos sinteticos pueden continuar. Un piloto con adultos
y profesionales verificados debe esperar los bloqueantes que se describen abajo.

## Publicacion verificada

- URL: https://luremsapp.web.app
- Proyecto Firebase: `psicosaas-3c819`; sitio Hosting: `luremsapp`.
- Hosting publicado: 85 archivos. HTML y assets principales JS/CSS recibidos con
  HTTP 200 y contenido identico a la compilacion local.
- Actualizadas las nueve Functions existentes, Node 22, segunda generacion,
  region `southamerica-east1`. No se eliminaron Functions ni datos.
- Functions: `sendProfileChatMessage`, `resetProfileChatConversation`,
  `getRecommendedTherapists`, `finalizeRegistration`, `completePatientOnboarding`,
  `submitPsychologistApplication`, `reviewPsychologistApplication`,
  `savePaymentRate` y `setPsychologistPaymentRate`.
- Las nueve rechazan peticiones sin sesion con HTTP 401 / `UNAUTHENTICATED`.
- No se modificaron reglas, indices, Auth, secretos ni configuracion de facturacion.
- Parche adicional de publicacion: `@fastify/busboy` 3.2.2 en el lockfile backend.
  Resuelve el aviso alto detectado al repetir la auditoria de dependencias hoy.

## Verificacion y limites

| Comprobacion | Resultado |
| --- | --- |
| Pruebas frontend | 12 aprobadas |
| Pruebas backend | 42 aprobadas; repetidas despues del parche |
| Integracion / reglas en emulador | 6 aprobadas; repetidas despues del parche |
| Lint backend / Knip / build | Correctos; persiste aviso de chunk mayor a 500 kB |
| Inicio, login y registro publicados | Renderizan sin errores de consola en el recorrido revisado |
| Acceso anonimo a encuesta y administracion de cobros | Redirige al login |
| Auditoria de dependencias | Raiz: 5 altos y 1 moderado; backend: 9 moderados; sin criticos |

Son 60 pruebas, no una cobertura completa de la plataforma. El emulador utiliza
exclusivamente `demo-lurems-rates`. No se enviaron mensajes a Gemini, se crearon
usuarios reales, se alteraron citas ni se efectuaron cobros para esta revision.
Las pruebas autenticadas entre paciente, profesional y administrador siguen
pendientes. El workflow de GitHub queda incorporado; la validacion descrita es
local y no presupone que su ejecucion remota haya finalizado.

La auditoria de paquetes no demuestra explotabilidad en Hosting: parte de los
avisos corresponde a herramientas de desarrollo. Ver las cadenas y migraciones
pendientes en [la auditoria tecnica](2026-09-30-technical-debt.md).

## P0: antes de incorporar pacientes reales

### 1. Reforzar autorizacion de citas y terapias

Evidencia: `firestore.rules`, bloques `citas` y `terapias`, y
`src/services/citaService.js`. Las reglas comprueban propiedad, pero no limitan
suficientemente los campos editables ni las transiciones de estado por rol.
La UI no es una barrera de seguridad para operaciones directas sobre Firestore.
Se inspeccionaron las reglas del repositorio, no una copia exportada de las
reglas activas en consola; debe confirmarse su correspondencia.

Accion: centralizar en Functions las operaciones sensibles de reserva/estado o
definir reglas estrictas por campos y transiciones. Preservar identidad de los
participantes y separar datos administrados por servidor. Ampliar la matriz de
permisos a disponibilidad, historial y seguimiento personal.

Criterio de cierre: tests negativos de paciente/profesional/tercero que rechacen
mutaciones no autorizadas, ademas de los casos permitidos. Las seis pruebas
actuales de catalogo y reinicio no cubren toda esta superficie.

### 2. Privacidad, consentimiento y alcance de Gemini

Evidencia: `src/components/auth/SignUpForm.vue` muestra una aceptacion sin enlaces
a documentos. `finalizeRegistration` no conserva version/fecha del consentimiento.
`sanitizePatientProfile` valida formato de nacimiento, no mayoria de edad; el chat
comprueba autenticacion, pero no un control de edad. `deleteUserProfileByAdmin`
en `src/services/userService.js` borra el documento de usuario, no constituye un
flujo completo de eliminacion de cuenta y datos asociados.

Gemini exige clientes no dirigidos ni probablemente accesibles a menores de 18;
prohibe su uso en practica clinica o consejo medico. La cuota gratuita no debe
recibir informacion sensible/personal. En servicio pagado no usa prompts para
mejorar productos, pero puede conservarlos temporalmente por seguridad. Verificar
la facturacion del proyecto que realmente utiliza la clave de Gemini; pagar
Firebase no demuestra por si solo ese estado. Estas condiciones no certifican
que el caso de uso concreto este permitido: revisar el alcance de la encuesta
administrativa antes de lanzar. [Terminos de Gemini](https://ai.google.dev/gemini-api/terms).

Accion: politicas accesibles y aprobadas, consentimiento trazable, minimizacion
de datos, control de edad en servidor y UI, y procedimiento de acceso/eliminacion.
Definir responsables, proveedores, retencion, transferencias y respuesta a
incidentes con asesoria de privacidad en Peru. Consultar el
[reglamento y orientacion de la ANPD](https://www.gob.pe/institucion/anpd/campa%C3%B1as/128319-nuevo-reglamento-de-proteccion-de-datos-personales).

El vencimiento de la conversacion de cinco minutos NO elimina los mensajes
almacenados: `functions/src/chat/session.js` y `profileChatHandlers.js` rotan la
sesion, pero conservan historiales. Hace falta una politica de retencion real.

Criterio de cierre: verificar contratos/configuracion del proveedor, alcance del
producto, rechazo de acceso no elegible al chat y evidencia persistida de
consentimiento; ensayar retencion y solicitudes de derechos en staging.

### 3. Validar el manejo de situaciones de riesgo

Evidencia: `functions/src/safety/suicideRisk.js` usa patrones de texto junto al
prompt de Gemini. Las pruebas de perfiles no equivalen a una evaluacion clinica
del detector. Falta una bateria especifica de negaciones, referencias a terceros,
hechos pasados, ambiguedad, falsos positivos y fallos del proveedor.

Accion: revision por un profesional de salud mental del lenguaje y protocolo;
ayuda accesible aunque falle IA, sin prometer vigilancia o atencion inmediata
por parte de Lurems. Alinear prompt y pantalla de ayuda y mantener la encuesta
fuera del diagnostico/consejo terapeutico.

Criterio de cierre: protocolo y casos de prueba aprobados, recursos verificados
y responsable de su mantenimiento. No presentar el detector como garantia.

## P0 para lanzamiento de pago

### 4. Completar reserva, cobro y liquidacion

Ya existe catalogo administrativo, activacion/versiones de links y seleccion de
tarifa del profesional con reparto 70/30. Eso NO confirma ni transfiere dinero.
El alcance esta explicitado en [pagos fase 1](../payments/rate-catalog.md).

Evidencia: `createAppointment` en `src/services/citaService.js` no guarda importe,
version/link de tarifa ni referencia de pago. La reserva del slot y la cita ya
usan transaccion en ese camino, pero la creacion/actualizacion de terapia ocurre
por separado. No afirmar que toda la reserva ya sea atomica.

Acciones minimas:

1. Mostrar al paciente una cotizacion de tarifa activa validada por servidor.
2. Reservar desde una Function idempotente y guardar una copia inmutable de
   importe, moneda, link/version y reparto en la cita y el registro de cobro.
3. Registrar pago pendiente, confirmado, rechazado y reembolsado, con referencia
   unica de operacion, autor y fechas. Abrir el link o regresar a la app no
   acredita pago; tampoco basta una captura remitida por el paciente.
4. Para el MVP de menor costo, conciliar manualmente desde administracion contra
   la operacion real de Mercado Pago. Automatizar por API/webhook solo tras
   validar el producto y contrato del proveedor elegidos.
5. Definir vencimiento de reserva, cancelaciones, reembolsos y conciliacion de
   duplicados; registrar obligaciones y pagos al profesional por separado.
6. Mostrar el 70% pactado: S/77 de S/110, S/84 de S/120, S/0.77 de S/1.10.
   Registrar comisiones reales del proveedor y tratamiento contable/fiscal.
   El porcentaje mostrado no es prueba de una transferencia realizada.
7. Excluir tarifas de prueba del flujo comercial. `isTest` es una etiqueta y
   NO convierte un link real de Mercado Pago en una operacion simulada.

Criterio de cierre: cambiar/desactivar una tarifa no modifica citas anteriores;
reintentos no duplican reservas/cobros; pago rechazado/expirado no aparece pagado;
cada importe y liquidacion se puede conciliar. Probar con datos controlados.

## P1: antes del piloto publico

### 5. Limitar abuso, costos y fallos

`functions/index.js` limita instancias, pero no exige App Check. El cliente no
lo inicializa. El chat tiene limite de longitud, pero no cuota por usuario ni
identificador idempotente de turno; revisar concurrencia y reintentos.

Implementar cuotas por usuario, control de solicitudes simultaneas y App Check
gradualmente, primero cliente/metricas y luego exigencia. No sustituye roles ni
cuotas. [Documentacion de Firebase](https://firebase.google.com/docs/app-check/cloud-functions).
Verificar alertas de gasto y errores, limites del proveedor y un procedimiento
de respuesta; maxInstances no es un tope absoluto de gasto.

### 6. Cerrar operacion y pruebas reales de los flujos

- Recuperacion de contrasena y verificacion de correo para usuarios de email:
  no se encontraron implementaciones en el codigo revisado.
- Verificar credenciales profesionales y horarios reales disponibles. Existe
  aprobacion administrativa; falta comprobar la operacion, no crear otro panel.
- Confirmaciones y recordatorios confiables: hoy las notificaciones detectadas
  son internas en Firestore, no un servicio de correo de recordatorios.
- Probar recorrido completo con los tres roles en staging: registro, encuesta,
  reinicio/recarga, matching, reserva, pago, cancelacion y cambio de tarifa.
- Verificar respaldos y restauracion, alertas, IAM minimo, dominios de Auth,
  soporte y procedimientos de incidentes. No se inspecciono su estado en consola.
- Revisar dispositivos reales y alturas pequenas. En registro publicado a
  1280x720 el logo empieza por encima del viewport; requiere corregir el flujo
  vertical/scroll sin otra reescritura global de estilos.
- Revisar avisos de dependencias restantes con pruebas de migracion, no con
  `audit fix --force`. La publicacion no elimina esa deuda.

## Secuencia recomendada

1. Permisos de datos + privacidad/alcance de IA + protocolo de riesgo.
2. Reserva segura y snapshot de tarifa + cobros auditables + conciliacion manual.
3. Cuotas/operacion y pruebas completas de roles en staging.
4. Piloto acotado de adultos y profesionales verificados, con soporte y metricas.
5. Automatizar conciliacion/recordatorios segun uso; despues optimizar peso de
   Vuetify/iconos/imagenes y componentes grandes.

No hacen falta microservicios, agentes autonomos, app nativa ni una reescritura
para este lanzamiento. La prioridad es que permisos, privacidad, citas y dinero
tengan un comportamiento verificable.
