# Dominio de produccion `app.lurems.lat`

La aplicacion se sirve desde Vercel, usa Firebase Authentication y recibe los
callbacks financieros mediante Cloud Functions. Cada servicio necesita una
configuracion distinta; autorizar el dominio en uno no lo registra en los otros.

## 1. Asociar el dominio en Vercel

1. Abre el proyecto de Lurems en Vercel.
2. Ve a **Settings > Domains**.
3. Agrega `app.lurems.lat`.
4. En el proveedor DNS de `lurems.lat`, crea el registro CNAME exacto que Vercel
   muestre para el subdominio `app`.
5. Espera a que Vercel muestre la configuracion como valida y emita el certificado
   TLS.
6. Marca `app.lurems.lat` como dominio principal del entorno Production si deseas
   que Vercel redirija hacia este dominio.

No copies a ciegas un destino CNAME generico: usa el valor que Vercel presenta en
el proyecto, porque puede variar segun su configuracion.

## 2. Autorizarlo en Firebase Authentication

1. Abre Firebase Console para el proyecto `psicosaas-3c819`.
2. Ve a **Authentication > Settings > Authorized domains**.
3. Selecciona **Add domain**.
4. Agrega solamente `app.lurems.lat`, sin protocolo ni ruta.

La aplicacion usa `signInWithPopup`. Mientras se aloje en Vercel, conserva:

```env
VITE_FIREBASE_AUTH_DOMAIN=psicosaas-3c819.firebaseapp.com
```

No establezcas `app.lurems.lat` como `authDomain` sin implementar primero un proxy
para `/__/auth/*` o alojar el dominio mediante Firebase Hosting. Autorizar el
dominio de la aplicacion en Firebase es suficiente para el flujo popup actual.

## 3. Configurar el frontend en Vercel

Agrega o actualiza estas variables para el entorno **Production**:

```env
VITE_APP_ENVIRONMENT=production
VITE_APP_BASE_URL=https://app.lurems.lat
VITE_FIREBASE_AUTH_DOMAIN=psicosaas-3c819.firebaseapp.com
```

Usa [.env.example](../../.env.example) como inventario del resto de las variables
y realiza un nuevo deploy para aplicar los cambios.

## 4. Configurar Cloud Functions

Functions usa `APP_BASE_URL` para regresar al panel despues del callback OAuth:

```env
APP_ENVIRONMENT=production
APP_BASE_URL=https://app.lurems.lat
```

La referencia completa se encuentra en
[functions/.env.example](../../functions/.env.example). Despliega Functions
despues de actualizar la configuracion.

## 5. Mantener separados los endpoints de Mercado Pago

El dominio de la aplicacion no reemplaza automaticamente los endpoints HTTPS del
backend. En Mercado Pago registra exactamente:

```text
OAuth redirect:
https://southamerica-east1-psicosaas-3c819.cloudfunctions.net/mercadoPagoOAuthCallback

Webhook:
https://southamerica-east1-psicosaas-3c819.cloudfunctions.net/mercadoPagoWebhook
```

La URL OAuth debe coincidir exactamente con la registrada en Mercado Pago. El
callback de Functions redirigira finalmente a
`https://app.lurems.lat/configuracion` mediante `APP_BASE_URL`.

## 6. Verificacion

```bash
dig app.lurems.lat
curl -I https://app.lurems.lat
```

Comprueba tambien:

- La URL abre con HTTPS valido.
- Recargar una ruta interna, por ejemplo `/configuracion`, no devuelve 404.
- Registro e inicio de sesion con correo funcionan.
- El popup de Google se completa desde `app.lurems.lat`.
- El callback OAuth de Mercado Pago vuelve a `/configuracion` en el dominio nuevo.
- Los webhooks siguen llegando a Cloud Functions.

## Rollback

Si el dominio presenta problemas, conserva temporalmente el dominio generado por
Vercel, revierte `APP_BASE_URL` y `VITE_APP_BASE_URL` a la URL anterior y realiza
un nuevo deploy. No elimines el dominio anterior hasta completar toda la lista de
verificacion.
