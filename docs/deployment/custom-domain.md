# Dominio de produccion `app.lurems.lat`

La aplicacion se sirve desde el sitio Firebase Hosting `luremsapp`, usa Firebase
Authentication y recibe los callbacks financieros mediante Cloud Functions. Cada
servicio necesita una configuracion distinta; autorizar el dominio en uno no lo
registra automaticamente en los otros.

## 1. Desplegar Firebase Hosting

El target `app` del repositorio apunta al sitio `luremsapp`. Para compilar y
publicar solamente el frontend:

```bash
npm run build
firebase deploy --only hosting:app --project psicosaas-3c819
```

La URL predeterminada del sitio es `https://luremsapp.web.app`.

## 2. Asociar `app.lurems.lat` en Firebase Hosting

1. Abre Firebase Console para el proyecto `psicosaas-3c819`.
2. Ve a **Hosting** y selecciona el sitio `luremsapp`.
3. Selecciona **Add custom domain**.
4. Agrega `app.lurems.lat`.
5. Crea en el proveedor DNS los registros que Firebase indique para verificar y
   conectar el dominio.
6. Espera a que Firebase confirme el DNS y emita el certificado TLS.

Usa exactamente los registros mostrados por Firebase Console. No mantengas al
mismo tiempo un CNAME de Vercel para `app`, porque un subdominio no puede apuntar
a ambos proveedores.

## 3. Autorizarlo en Firebase Authentication

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

## 4. Configurar el frontend

Configura estas variables antes del build de produccion:

```env
VITE_APP_ENVIRONMENT=production
VITE_APP_BASE_URL=https://app.lurems.lat
VITE_FIREBASE_AUTH_DOMAIN=psicosaas-3c819.firebaseapp.com
```

Usa [.env.example](../../.env.example) como inventario del resto de las variables
y vuelve a desplegar Hosting para aplicar los cambios compilados.

## 5. Configurar Cloud Functions

Functions usa `APP_BASE_URL` para regresar al panel despues del callback OAuth:

```env
APP_ENVIRONMENT=production
APP_BASE_URL=https://app.lurems.lat
```

La referencia completa se encuentra en
[functions/.env.example](../../functions/.env.example). Despliega Functions
despues de actualizar la configuracion.

## 6. Mantener separados los endpoints de Mercado Pago

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

## 7. Verificacion

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

Si el dominio presenta problemas, conserva temporalmente `luremsapp.web.app`,
revierte `APP_BASE_URL` y `VITE_APP_BASE_URL` a la URL anterior y realiza un nuevo
deploy. No elimines el dominio anterior hasta completar toda la lista de
verificacion.
