# Botón de soporte por WhatsApp

**Fecha:** 16/11/2026 · **Tipo:** mejora · **Rama:** `codex/whatsapp-soporte`

**Flujo y entorno.** Una persona con sesión en la app web puede abrir un chat de soporte de Lurems desde la barra superior, en escritorio o móvil. El cambio se prepara localmente sobre `origin/main` y se valida con datos sintéticos.

**Alcance.** Acción en la barra existente con icono de WhatsApp y el nombre «Soporte por WhatsApp». Ajuste acotado: reutiliza los botones de navegación del [Brand System](https://patrickspace.github.io/lurems-brand-system/) y no requiere un diseño separado.

**Criterios de aceptación**

1. Con un número de soporte configurado, el botón se muestra en la barra superior y tiene un nombre accesible.
2. Al activarlo, abre WhatsApp con el borrador editable «Hola, vengo de la web de Lurems. Mi correo es: [correo]». Usa el correo de la sesión actual; si no está disponible, omite esa frase.
3. Si la cuenta tiene el rol de psicólogo, el borrador agrega «y soy psicólogo» al saludo, incluso desde la vista de paciente. No se envía ningún mensaje automáticamente.
4. Sin número o con un formato inválido, la barra no expone un enlace defectuoso. Feedback conserva su entrada y comportamiento actuales.

**Destino.** El botón usa por defecto el número público de soporte que confirmó el titular. El número existente en la encuesta dirige a un recurso de crisis y no se usa para soporte.

**Configuración.** Para reemplazar el número predeterminado, asignar `VITE_SUPPORT_WHATSAPP_NUMBER` con código de país y sin espacios en `.env.local` para desarrollo o en el entorno del build. Si la variable existe y está vacía, el botón se oculta. Su valor es público y forma parte del enlace.

**Verificación del candidato (16/11/2026).** `npm test`: 56 pruebas aprobadas. `npm run build`: correcto con número sintético. En Chrome con Playwright se montó la barra real con Firebase configurado para un proyecto demo y se interceptó el enlace externo. Se verificó la apertura por teclado a 1440 px y por toque a 320 px, el destino y el mensaje, la ausencia de referente, la pestaña original abierta y el diálogo de feedback. También se verificó que el botón no aparece cuando el valor está vacío o es inválido. No se abrió un chat real ni se probó en un teléfono físico.

Tras configurar el número confirmado, se repitieron las 56 pruebas, el build sin variables adicionales y la apertura en Chrome a 1440 y 320 px con el destino externo interceptado. También se comprobó que una variable alternativa reemplaza el destino y que un valor vacío lo oculta.

Con el borrador personalizado, se repitieron las 56 pruebas y el build. La comprobación en Chrome cubrió un paciente, un psicólogo desde la vista de paciente, el cambio de cuenta con perfil anterior aún cargado y una cuenta sin correo. Se usaron correos sintéticos, se interceptó el destino y no se enviaron mensajes.

**Traspaso a QA.** Usa el candidato en `codex/whatsapp-soporte`. Comprueba que la cuenta de destino sea la de soporte y que el texto aparezca como borrador en WhatsApp Web y móvil. Registra el resultado en esta ficha. El cambio no se ha publicado.
