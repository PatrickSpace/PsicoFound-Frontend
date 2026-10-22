# Confirmación de correo · Lurems

Diseño inicial para cuentas creadas con correo y contraseña. No está conectado al envío de producción.

- Asunto: **Confirma tu correo y empieza en Lurems**.
- Preencabezado: **Un paso más para empezar: confirma tu correo y continúa con tu registro en Lurems.**
- `confirmacion-correo.html`: plantilla HTML para un futuro envío transaccional.
- `confirmacion-correo.txt`: alternativa de texto (la línea Asunto es metadata; separarla del cuerpo al integrar).
- `confirmacion-correo.preview.html`: vista previa local con logo real y enlace ficticio, sin código de verificación. El botón no confirma ninguna cuenta.

## Identidad y compatibilidad

Referencia: https://patrickspace.github.io/lurems-brand-system/

Paleta teal oficial: fondo #EEF7F6, superficie #FFFFFF, bloque suave #EFF9F7, bordes #C8EDE8, texto #1A3A38 y #426460. CTA #2A6C63 (teal 700) con texto blanco para mantener contraste en texto pequeño. Logo oficial existente en `public/brand/`.

Tipografía Poppins con alternativa Arial/Helvetica; no se depende de fuentes externas, ya que Gmail no garantiza Poppins. Tablas de presentación, estilos esenciales en línea, ancho máximo 600 px, adaptación móvil y botón VML para Outlook clásico. El contenido esencial se entiende con imágenes bloqueadas. La vista previa en navegador no equivale a una prueba real en Gmail/Outlook o en modo oscuro.

## Integración posterior

1. Generar un enlace real de verificación con Firebase Admin desde el servidor. Mantener la validación de Firebase y la comprobación del token actual.
2. Sustituir `{{VERIFICATION_URL}}` en todos los enlaces, incluido VML, escapándolo para HTML y validando su origen. En la alternativa de texto usar la URL sin escape HTML.
3. Sustituir `{{LOGO_URL}}` por una URL HTTPS pública del logo; no usar rutas locales en correos enviados.
4. Enviar HTML + texto mediante un proveedor transaccional, con remitente y dominio verificados. Conectar el envío inicial y el reenvío al mismo mecanismo para evitar duplicados.
5. Probar recepción, enlace, reenvío, móvil y modo oscuro en buzones reales antes de activar.

La plantilla nativa usada por `sendEmailVerification` sigue activa. Estos archivos no cambian por sí solos el correo enviado por Firebase.

## Bienvenidas por perfil (diseño, sin configurar envíos)

Abrir `bienvenidas.preview.html` para comparar ambas propuestas. Cada variante incluye HTML con placeholders, una vista previa y una alternativa de texto. Los enlaces de la vista previa abren la aplicación y pueden requerir sesión; no cambian el estado del registro.

- Paciente/usuario: verde oficial #2D725A / #EDFAF4 / #CBF1E0. Mensaje de cuenta lista tras `completePatientOnboarding`.
- Psicólogo/a: violeta oficial #4D44A0 / #F0EEFF / #DDD9FF. Mensaje de registro recibido, pendiente de revisión, tras `submitPsychologistApplication`. No implica aprobación profesional. La aprobación requeriría otra comunicación.
- Imagen: ilustración oficial de https://lurems.lat/brand/lurems-hero-1200.jpg, conservada sin alteraciones en `assets/lurems-bienvenida.jpg` para vistas previas. No se generaron imágenes con IA.
- Sustituir `{{LOGO_URL}}`, `{{HERO_URL}}` y `{{ACCOUNT_URL}}` por URLs HTTPS validadas al integrar. Las líneas Asunto y Preencabezado del TXT son metadata, no cuerpo.
- No se añadió proveedor, trigger ni envío. Una integración futura debe usar el estado confirmado en servidor y evitar duplicados por cuenta y tipo de bienvenida.
- Revisión visual en navegador; recepción y modo oscuro de clientes de correo pendientes.


## Registro profesional aprobado (solo diseño)

`psicologo-aprobado.html`, `psicologo-aprobado.preview.html` y `psicologo-aprobado.txt` comunican la aprobación del registro profesional, con la paleta violeta y la ilustración oficial. El botón de vista previa abre `/psicologo/sesiones` y puede requerir iniciar sesión. No se configuró ningún envío. Una futura integración debe dispararse tras confirmar la aprobación en servidor (`reviewPsychologistApplication`), una sola vez por aprobación, y no al completar los datos iniciales.
