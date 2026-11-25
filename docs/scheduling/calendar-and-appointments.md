# Agenda configurable y citas

La agenda admite sesiones de 15 a 180 minutos, en incrementos de 5; descansos de 0 a 120 minutos; anticipación mínima de 0 a 168 horas; y hasta 28 franjas semanales. Los valores iniciales son 45 minutos de sesión, 15 de descanso y 2 horas de anticipación. Todas las horas pertenecen a America/Lima y se convierten a instantes al guardar.

El psicólogo define varias franjas por día, modalidad y dirección presencial. Proyecta de 1 a 84 días, dentro de los próximos 12 meses, excluyendo feriados y días libres. La vista previa muestra los bloques nuevos y los cruces omitidos. Publicar vuelve a verificar la disponibilidad dentro de una transacción. Se permiten hasta 350 bloques por publicación. Repetir la publicación no duplica horarios. Cambiar la plantilla no modifica sesiones reservadas ni elimina bloques publicados previamente: para sustituir horarios libres se cierra primero el periodo y se publica la nueva plantilla.

Cerrar días afecta únicamente horarios disponibles. Si un bloque pasa a reservado mientras se intenta cerrarlo, se conserva la reserva. Los bloques reservados se gestionan desde la cita.

## Datos y operaciones

- `citas` contiene la fecha, estado, duración, enlace, resultado y revisión oficiales.
- `bookings` mantiene la reserva y su relación con el pago; reprogramar actualiza su horario y el de `citas` en la misma transacción.
- `therapist_availability` contiene los bloques. Solo las operaciones de servidor los crean, reservan y cierran. La consulta pública devuelve únicamente campos de disponibilidad; no revela pacientes.
- `terapias.citas` es un registro antiguo de solo lectura. Las pantallas incorporan los documentos actuales de `citas`, que prevalecen por identificador. No se agregan nuevas citas a ese arreglo.
- `schedule_locks` y `patient_schedule_locks` serializan operaciones que compiten por intervalos, incluso cuando los bloques antiguos tienen identificadores distintos.
- `appointment_events` registra actor, acción, fecha y revisión. Las notificaciones e historial del cambio se guardan en la misma transacción.

Los pacientes reprograman con más de 24 horas de anticipación. El psicólogo puede hacerlo antes de que comience la sesión. Una cita pagada conserva la duración y modalidad contratadas y su pago. El nuevo horario debe cumplir la anticipación mínima que publicó el psicólogo. Cambios de duración o modalidad de una cita pagada requieren gestionar cancelación y nueva reserva.

Estados: pendiente → confirmada → realizada / no_asistio. Pendiente y confirmada se pueden cancelar antes del inicio. No se puede cerrar antes de terminar, reabrir una sesión finalizada ni confirmar una cancelada. La revisión evita guardar un formulario sobre una versión más nueva. Completar una cita pagada marca su reserva como elegible para abono; no ejecuta ningún abono bancario. Una inasistencia queda sin elegibilidad automática.

Las cancelaciones y los cambios financieros comparten la reserva transaccional. Reintentar una cancelación no la revive. Las devoluciones siguen la política existente (>24 h para paciente; cancelación del psicólogo/plataforma con devolución). Una aprobación de pago tardía que choca con una cancelación o reserva vigente pasa a revisión y no crea una cita.

## Recordatorios

`sendAppointmentReminders` se ejecuta cada 5 minutos y genera notificaciones **dentro de Lurems** a las 24 y 2 horas anteriores. Si la reserva se creó tarde se omite la etapa ya superada. El identificador incluye la versión del horario: repetir el proceso no duplica avisos; reprogramar recalcula los avisos; cancelar los desactiva. El psicólogo recibe un aviso específico si falta el enlace remoto. Correo, WhatsApp y creación automática de reuniones requieren proveedores adicionales y no están activados.

## Datos existentes y puesta en marcha

1. Desplegar primero los nuevos índices y esperar a que estén disponibles.
2. Revisar datos antiguos con `node functions/scripts/migrateAppointments.js --project=ID`. El modo por defecto no escribe. Reporta totales sin contenido clínico.
3. Resolver los conflictos de propiedad/horario reportados; no se sobrescriben automáticamente discrepancias entre cita y booking. Aplicar con `--apply` una vez revisado. El proceso conserva los arreglos antiguos, añade citas faltantes y completa duración, instantes, revisión y recordatorios. Puede repetirse.
4. Desplegar coordinadamente las funciones de agenda, los cambios compartidos de reservas, las reglas y el frontend. Las versiones anteriores del frontend ya no podrán escribir citas directamente.
5. Validar con cuentas de prueba: semana 45+15, día excluido, reserva simultánea, cambio de horario, cancelación y cierre después de la sesión.

La agenda configurable se habilita con `VITE_CALENDAR_ENABLED=true` después de publicar sus APIs. Esta activación es independiente de los cobros automáticos. Culqi y Mercado Pago requieren `VITE_AUTOMATED_PAYMENTS_ENABLED=true`, configuración explícita del proveedor, llaves y backend compatible. La integración de código conserva la conciliación existente como recorrido predeterminado.

## Verificación local

`npm run build`, `npm test`, `npm --prefix functions run lint` y `npm --prefix functions run typecheck`.

Con Java 21 disponible: `firebase emulators:exec --project demo-lurems-scheduling --only firestore 'node --test test/firestore/*.test.mjs && npm --prefix functions test'`.

Las pruebas cubren generación, buffers, exclusiones, cruces, concurrencia, sincronización, permisos, cierres, cancelación/reprogramación simultánea y aprobación tardía. Nunca utilizan un proveedor real.
