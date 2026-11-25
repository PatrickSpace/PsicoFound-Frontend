# Operación de pagos

## Conciliación

`reconcilePayments` se ejecuta cada 30 minutos y vuelve a consultar pagos pendientes, en proceso o con error temporal. Solo corrige transiciones compatibles; discrepancias de importe, moneda, referencia o cuenta pasan a `manual_review`.

## Revisión manual

Investiga usando `bookingId`, `paymentId`, `providerPaymentId` y `paymentEventId`. No copies payloads con datos personales en tickets. Casos prioritarios:

- Aprobación posterior a expiración con slot reasignado.
- Diferencia de comisión o moneda.
- Reembolso pendiente por falta de saldo del vendedor.
- Contracargo.

## Reembolsos y contracargos

Los reembolsos completos usan clave determinística y generan una entrada compensatoria. Mercado Pago advierte que en Split 1:1 un reembolso depende también del saldo del vendedor. Los contracargos se normalizan como estado financiero terminal y deben revisarse antes de tomar acciones sobre la sesión.

## Logs

Los logs estructurados no incluyen tarjeta, CVV, tokens, notas clínicas ni mensajes. Para depurar filtra por identificadores técnicos. Rota Access Token, Client Secret, Webhook Secret y clave de cifrado conforme a la política operativa; una rotación de la clave de cifrado requiere reautorizar o migrar los tokens cifrados.

## Desactivación temporal

1. Oculta el checkout mediante configuración de frontend.
2. Marca cuentas como `restricted` o `disconnected` desde un proceso administrativo seguro.
3. Mantén webhook y conciliación activos para pagos ya iniciados.
4. No deshabilites reglas ni confirmes citas manualmente desde el cliente.

## Recuperación y rollback

El rollback de código consiste en volver al commit anterior y redesplegar Functions/frontend. No elimines colecciones financieras. Las citas históricas siguen siendo compatibles porque los campos de pago son opcionales. Antes de retirar Functions nuevas, deja finalizar holds y concilia pagos pendientes. Para revertir reglas, conserva siempre la inmutabilidad de campos financieros y ledger.

## Dependencias

La actualización no disruptiva de dependencias de Functions eliminó los
hallazgos críticos y altos detectados por `npm audit`. Persisten hallazgos
moderados transitivos cuya corrección automática propone cambios mayores en
Firebase Admin o degradar `firebase-functions-test`; deben resolverse en una
actualización separada y validada con emuladores. Vite/esbuild también requiere
una actualización mayor para retirar su aviso de desarrollo.
