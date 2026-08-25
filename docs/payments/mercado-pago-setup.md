# Configuración de Mercado Pago

## 1. Crear la aplicación

1. En Mercado Pago Developers crea una aplicación para Split de Pagos 1:1.
2. Habilita Checkout API/Payment Brick y OAuth.
3. Crea cuentas de prueba del marketplace y de un vendedor psicólogo.
4. Copia Public Key, Access Token, Client ID y Client Secret en los destinos indicados abajo.

## 2. URLs

Registra exactamente las URLs desplegadas:

- Redirect OAuth: `https://REGION-PROJECT.cloudfunctions.net/mercadoPagoOAuthCallback`
- Webhook: `https://REGION-PROJECT.cloudfunctions.net/mercadoPagoWebhook`

La Redirect URI enviada durante OAuth debe coincidir con la registrada. Configura notificaciones de pagos y copia la clave secreta de Webhooks.

## 3. Frontend

En el entorno de build de Firebase Hosting configura:

```dotenv
VITE_PAYMENT_PROVIDER=mercado_pago
VITE_PAYMENT_ENVIRONMENT=sandbox
VITE_PAYMENT_USE_FAKE_PROVIDER=false
VITE_MERCADO_PAGO_PUBLIC_KEY=PUBLIC_KEY_SANDBOX
```

La Public Key no es un secreto. No agregues Access Token ni Client Secret con prefijo `VITE_`.

## 4. Functions y secretos

Configura los secretos sin escribir valores en el repositorio:

```bash
firebase functions:secrets:set MERCADO_PAGO_ACCESS_TOKEN
firebase functions:secrets:set MERCADO_PAGO_CLIENT_SECRET
firebase functions:secrets:set MERCADO_PAGO_WEBHOOK_SECRET
firebase functions:secrets:set PAYMENT_TOKEN_ENCRYPTION_KEY
```

Configura `MERCADO_PAGO_CLIENT_ID`, URLs, porcentajes y entorno mediante `functions/.env.<project-id>` o el mecanismo de variables del proyecto. Usa [functions/.env.example](../../functions/.env.example) como plantilla.

## 5. Probar sandbox

1. Mantén `PAYMENT_ENVIRONMENT=sandbox`.
2. Desactiva el fake solo después de configurar credenciales de prueba.
3. Conecta la cuenta de vendedor de prueba desde Configuración de cobros.
4. Define un precio y un bloque horario.
5. Paga con una tarjeta de prueba oficial.
6. Verifica webhook, `payments`, `bookings`, `ledger_entries` y la cita proyectada.

## 6. Validación de producción

Producción falla de forma explícita si detecta fake, sandbox, placeholders, secretos ausentes, porcentajes distintos de 100 o URLs localhost/no HTTPS. Antes de activar:

- Confirma habilitación comercial de Split 1:1 en Perú.
- Valida KYC de vendedores.
- Ejecuta conciliación sandbox con comisiones reales.
- Rota cualquier credencial que haya sido compartida fuera de Secret Manager.

| Variable | Ubicación | Sensible | Estado versionado | Acción |
|---|---|---:|---|---|
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | Build frontend | No | Placeholder | Reemplazar |
| `MERCADO_PAGO_ACCESS_TOKEN` | Firebase Secret | Sí | No configurado | Configurar |
| `MERCADO_PAGO_CLIENT_ID` | Functions env | No | Placeholder | Reemplazar |
| `MERCADO_PAGO_CLIENT_SECRET` | Firebase Secret | Sí | No configurado | Configurar |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Firebase Secret | Sí | No configurado | Configurar |
| `PAYMENT_TOKEN_ENCRYPTION_KEY` | Firebase Secret | Sí | No configurado | Generar y custodiar |
| `MERCADO_PAGO_OAUTH_REDIRECT_URI` | Functions env | No | Localhost | Actualizar |
| `MERCADO_PAGO_WEBHOOK_URL` | Functions/MP | No | Localhost | Registrar |
