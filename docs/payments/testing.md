# Pruebas de pagos

## Proveedor simulado

Configura las plantillas `.env.local.example` y `functions/.env.example`, manteniendo `PAYMENT_USE_FAKE_PROVIDER=true`. El panel del psicólogo mostrará “Cuenta simulada para desarrollo”. En desarrollo, el checkout permite elegir `approved`, `pending`, `rejected`, `provider_error` o webhook duplicado.

El escenario `delayed_webhook` deja el pago pendiente y habilita una acción de
desarrollo que entrega posteriormente un evento `approved` por el mismo
procesador de eventos usado por el webhook real.

```bash
npm run lint
npm run typecheck
npm run test:payments
npm --prefix functions test
npm test
npm run build
```

## Emulator Suite

Firestore Emulator requiere Java 11 o posterior:

```bash
npm run test:payments:emulator
npm run test:rules
npm run emulators
```

Las pruebas de integración cubren aprobación, ledger idempotente, reintento, rechazo, expiración y liberación de slot. Las reglas comprueban que un paciente no puede leer `payments`/`ledger_entries` ni marcar un slot como `held`.

## Escenarios manuales

- Cierra el navegador después del pago y consulta el estado con `getBookingPaymentStatus`.
- Envía dos veces el mismo evento; solo debe existir un conjunto de ledger y notificaciones.
- Deja expirar el hold; el slot vuelve a `available`.
- Fuerza `provider_error`; el mensaje no debe exponer la respuesta del proveedor.
- Desconecta al psicólogo; una nueva reserva debe fallar en backend.
- Cambia precio o porcentaje en la solicitud del navegador; el backend debe ignorarlos.

## Sandbox real pendiente

No se ejecutó porque no hay credenciales. Debe validarse tokenización, `application_fee`, firma webhook, reembolso y comisión real antes de producción.

## Resultado de esta ejecución

- Lint: aprobado.
- Chequeo sintáctico: aprobado.
- Pruebas Node: 36 aprobadas; 2 de integración omitidas sin emulador.
- Pruebas frontend: 3 aprobadas.
- Build de producción: aprobado.
- Pruebas de Firestore Rules y transacciones: no ejecutadas; Java no está
  instalado en la máquina.
- Pago sandbox real: no ejecutado; no existen credenciales.
