# Catalogo de tarifas: fase 1

## Alcance

- Administrador: `/admin/cobros`, disponible en las navegaciones desktop y movil.
  Crea tarifas PEN con importe, nombre y link HTTPS de Mercado Pago Peru.
  Puede editar nombre/link, identificar pruebas y activar/desactivar opciones.
- Psicologo: Configuracion, tarjeta "Mi tarifa". Selecciona una tarifa activa
  para su propio perfil y consulta el reparto 70% profesional / 30% Lurems.
- Esta fase guarda configuracion. No cobra, reserva, confirma pagos ni cambia
  el precio de citas existentes. La conexion con citas es la siguiente fase.
- No se crean tarifas ni se asignan enlaces de ejemplo automaticamente.
  El administrador debe registrar los enlaces reales y comprobar sus importes.
  La marca "Prueba" es descriptiva: un link real realiza un cobro real.

## Persistencia y reglas

`payment_rates/{id}` contiene `name`, `amountMinor`, `currency: PEN`,
`paymentUrl`, `active`, `isTest`, `version`, porcentajes y montos del reparto,
`createdAt`, `createdBy`, `updatedAt` y `updatedBy`.

El importe es inmutable; un precio distinto requiere otra tarifa.
Cada cambio genera una copia completa en `payment_rates/{id}/versions/{version}`
con autor y fecha. La vista administrativa consulta las ultimas 20 versiones;
las anteriores permanecen almacenadas. No hay borrado desde el cliente.

El perfil `therapists/{id}` referencia `paymentRateId` y conserva
`paymentRateSelectionVersion` / `paymentRateUpdatedAt`. Cada seleccion genera
`therapists/{id}/rate_history/{version}`, sin tocar `citas` ni `terapias`.
El link vigente se resuelve desde el catalogo, no se duplica en el perfil.
La desactivacion conserva la seleccion antigua y pide elegir otra tarifa.

Las escrituras pasan por `savePaymentRate` (admin) y
`setPsychologistPaymentRate` (psicologo propietario con perfil activo).
Ambas usan transacciones, versiones esperadas y reintentos idempotentes.
El cliente no puede escribir tarifas/historiales ni los campos de seleccion
del perfil, incluso usando el editor administrativo anterior.
Solo administradores y profesionales pueden leer el catalogo; el historial
del catalogo es administrativo. El historial de seleccion tambien es legible
por el profesional propietario.

Los montos son enteros en centimos (1 a 10,000,000). La parte profesional es
70% redondeado al centimo mas cercano y Lurems recibe el resto: ambos suman
siempre el total. Mercado Pago se descuenta de la parte de Lurems segun el
modelo acordado. Esta fase no obtiene ni calcula comisiones del proveedor.

## Verificacion

```sh
npm --prefix functions run lint
npm --prefix functions test
npm run build
npm run test:payment-rules
```

Pruebas de dominio/handlers: reparto de S/110, S/120, S/1.10 y redondeo;
montos invalidos; links falsificados; autenticacion/roles; versiones;
actualizaciones concurrentes; repeticion de solicitudes; seleccion de tarifa
inactiva; propiedad del perfil; preservacion de citas e historiales.
Las pruebas de handlers usan un doble transaccional en memoria, no produccion.
`test:payment-rules` requiere Firebase CLI y Java 21. Usa exclusivamente el
proyecto ficticio `demo-lurems-rates` y un emulador local para comprobar reglas,
permisos de lectura/escritura y conflictos transaccionales reales.

## Publicacion

```sh
firebase deploy --only functions:savePaymentRate,functions:setPsychologistPaymentRate,firestore:rules
npm run build
firebase deploy --only hosting
```

No requiere credenciales de Mercado Pago ni nuevas variables de entorno.

## Siguiente fase

Al reservar, una Function debe revalidar la tarifa activa, copiar sus
condiciones en la cita y el cobro, y reservar el horario atomicamente.
Una cita previa nunca debera recalcularse consultando la tarifa actual.
Las tarifas sin seleccion o inactivas deberan impedir nuevas reservas
pagadas cuando se habilite ese flujo. El MVP actual de citas sigue intacto
hasta esa integracion; desactivar una tarifa aun no bloquea ese flujo.
