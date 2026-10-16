# Política horaria de la agenda del MVP

Decisión de producto (2026-10-08): **En el MVP, toda la agenda de Lurems opera en
hora de Lima, Perú**. La zona operativa es `America/Lima`; no es una preferencia
del paciente, psicólogo o administrador.

El aviso común es: “Todos los horarios se muestran en hora de Lima, Perú (UTC−5)”.
La selección, cotización y reprogramación identifican el horario concreto como
“hora de Lima”. Un dispositivo en Madrid, Tokio o cualquier otra zona ve los
mismos números y bloques. Cambiar país de residencia no cambia una cita.

## Representación y cálculos

`functions/src/appointments/schedulePolicy.mjs` es el módulo compartido por
Functions (Node 22) y el frontend, reexportado por `src/utils/dateTime.js`.
Usa `Intl` y la zona IANA, no correcciones manuales de cinco horas.

- Las nuevas citas y disponibilidades conservan `startAt` (Timestamp UTC),
  `startAtIso` (ISO con zona explícita), fecha/hora de Lima y `timeZone`.
- Los bloques duran 60 minutos reales; `endDate` identifica el día de finalización
  cuando cruzan medianoche. El servidor comprueba futuro y solapamiento.
- “Hoy” es el día de Lima. “Esta semana” abarca desde hoy hasta el lunes siguiente;
  “Este mes”, desde hoy hasta el primer día del siguiente mes; “Próximo mes”,
  ese mes calendario completo. Los límites superiores son exclusivos.
- Un bloque solo se ofrece si su instante es estrictamente posterior al reloj
  actual. Agrupación y fechas usan la representación de Lima del mismo instante.
- Las vistas abiertas reevalúan el reloj cada 30 segundos. Las operaciones del
  servidor siempre vuelven a validar con su reloj real; el reloj del cliente no
  autoriza una reserva pasada.

## Datos anteriores y casos que necesitan revisión

No se ejecuta ni se requiere una migración persistente para consultar la agenda.

1. Un Timestamp/ISO explícito válido determina el instante. Si ambos están
   presentes deben coincidir. Una cadena ISO sin zona no es un instante válido.
2. Los campos originales de fecha, hora y zona, si están presentes, deben concordar
   con ese instante. No se ocultan contradicciones dando prioridad ciega a un campo.
3. Sin instante explícito se convierte la fecha/hora usando la zona original.
   Los documentos antiguos sin zona conservan el supuesto histórico de Lima.
4. Una hora repetida por cambio de horario de verano requiere un instante
   explícito que la desambigüe. Una hora inexistente, fecha inválida, zona inválida
   o contradicción produce **Horario por revisar**, nunca una hora inventada.

Las consultas transforman la presentación, no el documento fuente. Los bloques
heredados conservan sus campos originales incluso después de reservarlos: la cita
nueva guarda la representación en Lima del instante original. Solo una
reprogramación explícita cambia el instante elegido. La copia de cita en terapia
conserva ese mismo instante y se presenta en Lima.

Los bloques no resolubles se excluyen de reserva/cotización y se identifican en
la disponibilidad profesional. Las citas abiertas no resolubles permanecen en
“Citas pendientes de resolver”, con las acciones autorizadas. No se cancela,
cierra o corrige silenciosamente un documento. Su corrección requiere confirmar
la información con las personas responsables y una operación explícita; no hay
un script que modifique datos reales.

Los avisos nuevos contienen un horario estructurado de Lima. Un aviso histórico
sin instante verificable indica que se consulte la cita; no se intenta interpretar
una hora incrustada en un texto antiguo. Los eventos históricos con fecha/hora/zona
estructuradas se convierten con la misma política; los incompletos se identifican.
El texto libre del evento se conserva como “Registro original”; no se reescribe
un antecedente ni se interpreta una hora dentro de su prosa como horario vigente.

## Contrato de servidor y permisos

`manageAvailability` abre/cierra bloques mediante transacción. Exige profesional
propietario con rol y modo profesional. No añade permisos de gestión de bloques
ajenos al administrador; conserva la propiedad requerida por las reglas anteriores.
La creación valida Lima, futuro y ausencia de solapamiento; serializa operaciones
por profesional, conserva claves de reintento y solo permite cerrar disponibles.
Firestore deniega las escrituras directas de disponibilidad.

`reserveAppointment` y `rescheduleAppointment` rechazan un `timeZone` explícito
distinto de `America/Lima`. Seleccionar un bloque heredado no obliga a cambiar su
zona original: el servidor resuelve su instante y crea la cita equivalente en Lima.
La zona de perfil no se utiliza. Las escrituras de cita, copia de terapia, bloque,
pago, evento y aviso mantienen el recorrido transaccional y sus permisos.

`getBookingQuote` puede recibir `availabilitySlotId`; verifica el bloque y devuelve
su instante y representación en Lima junto a la tarifa. La reserva vuelve a validar
disponibilidad y tarifa; cotizar no bloquea ni reserva el horario.

## Perfil y límites

País sigue siendo un dato de residencia. Onboarding explica la política sin pedir
una elección horaria. Configuración no ofrece zona como preferencia de agenda y
al guardar otros datos no sobrescribe `zonaHoraria`. Las APIs conservan compatibilidad
con perfiles antiguos. No se cambian fechas de nacimiento ni políticas clínicas.

Para introducir conversión local/multipaís se necesitará una decisión de producto,
selección explícita de zona de visualización, contrato de entrada/confirmación,
reglas para horas ambiguas, comunicación en notificaciones y pruebas de todos los
roles y cambios estacionales. País, moneda, pagos y recursos clínicos requieren
sus propias políticas; no deben inferirse de una zona horaria.

No se autoriza despliegue ni acceso a datos reales. Publicar esta implementación
requiere coordinar frontend, Functions y reglas; las pruebas locales no certifican
el entorno publicado.

## Validación mantenida

`npm run test:agenda` usa el runner aislado del paciente: puertos libres, proyecto
demo, red saliente bloqueada salvo loopback/IPC, sin preload ni parches al CLI.
Ejecuta regresiones de seguimiento/paciente y la nueva integración de agenda,
después navegador anterior y la matriz `playwright.lima.config.js`.

La matriz incluye Lima, Madrid, Tokio y Honolulu en escritorio 1440×1000 y móvil
iPhone 13/Chromium. Honolulu permite cubrir “Lima ya es mañana, dispositivo todavía
ayer”, que no puede reproducirse con Madrid/Tokio, ubicadas al este de Lima.
El reloj de navegador es controlado; el servidor conserva su reloj real.

Reproducción: [guía de validación](../operations/validation.md). Resultados fechados:
[informe histórico de cierre](../archive/functional/cierre-politica-horaria-mvp.md).
La existencia de estas pruebas no equivale a que hayan pasado sobre el árbol actual.
