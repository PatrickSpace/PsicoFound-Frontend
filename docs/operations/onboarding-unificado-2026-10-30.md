# Validación del onboarding visual unificado

Fecha: 30/10/2026, America/Lima.

## Cambio

Se extendió el fondo oscurecido con elemento iluminado a la guía inicial del paciente, las seis ayudas de acompañamiento, el recorrido de funciones del psicólogo y las cuatro tareas de preparación profesional. Se conservan la bienvenida opcional, el progreso por rol, la reanudación y las reglas actuales de acceso y preparación.

El recorrido navega a las pantallas reales y utiliza identificadores estables. En móvil señala Más; en Emociones el clic real abre el formulario y avanza al aviso de visibilidad. En preparación, pulsar un botón real cierra la explicación y deja actuar al formulario existente. Ningún paso de la guía confirma datos profesionales, elige una tarifa, crea disponibilidad ni activa reservas.

El componente común ajusta su posición con scroll, cambio de tamaño y cambios del elemento. Si falta el elemento ofrece una salida; en pasos con alternativa utiliza el encabezado disponible. Escape y Salir responden también con una petición pendiente. Los errores de guardado se muestran sin bloquear la navegación.

## Pruebas automáticas

- 50 pruebas unitarias del frontend aprobadas, incluidas seis de geometría: botón móvil, aviso de privacidad, menú de escritorio, pantalla baja, botón inferior y elemento ausente.
- 117 pruebas del backend aprobadas.
- 11 pruebas integradas aprobadas: cinco de acompañamiento y seis de preparación profesional/guías por rol, contra Auth/Firestore/Functions emulados.
- Compilación Vite, lint del backend, Knip y `git diff --check`: aprobados. Knip mantiene cuatro recomendaciones anteriores de configuración.

Total: **178 pruebas automáticas aprobadas**.

## Comprobaciones en navegador

Con Playwright CLI, proyecto `demo-lurems-followup` y datos ficticios:

- Paciente con cita y pago confirmados: tres pasos, Anterior, cierre/repetición y reanudación después de recargar.
- Seis secciones de acompañamiento; Emociones abre el formulario real, muestra su aviso y permite cancelar sin guardar.
- Recorrido móvil y clic real en Más para ver las secciones adicionales.
- Psicólogo: cuatro pantallas del recorrido, Anterior y recuperación del paso tras recargar.
- Preparación profesional: cuatro etapas, alternativa visible cuando la activación está deshabilitada, clic real en Revisar perfil, cierre del formulario sin confirmar y repetición en móvil.
- Cambio de rol en Configuración y cierre/inicio de sesión entre pacientes y profesional: sin conservar el recorrido abierto de la identidad anterior.
- Fallo de guardado simulado y petición retenida: Escape cierra la guía inmediatamente y el error posterior se muestra sin navegar al paso siguiente.
- Paciente sin cita pagada: guía de encuesta y sesiones completa, sin enviar respuestas ni consumir IA.
- Capturas a 1440×1000 y 390×844; comprobaciones de no intersección entre ayuda y elemento, sin desbordamiento horizontal y controles de teclado.
- Comparación SHA-256 antes/después de los recorridos profesionales: ocho colecciones sin modificaciones (`therapists`, `payment_rates`, `therapist_availability`, `citas`, `terapias`, `therapy_goals`, `exercises`, `emotional_checkins`). Cero registros emocionales creados. Los documentos de usuario conservan el avance de guía y la actividad habitual de cuenta.

Los destinos externos del navegador estuvieron bloqueados. Se observó el rechazo esperado de la fuente de Google, un HTTP 500 provocado para probar errores y HTTP 403 al consultar resúmenes sintéticos sin permiso de lectura; las vistas mantuvieron sus alternativas de contenido no disponible. No se usaron usuarios, pagos ni datos clínicos reales.

Capturas y comprobación de integridad en `output/playwright/unified-onboarding-2026-10-30/` (artefactos locales, excluidos del push).

## Entrega

Esta entrega cambia el frontend y sus pruebas; no modifica las funciones desplegadas ni las reglas de Firebase. El push a main activa la integración de Vercel configurada por el propietario. No se acredita con este informe un despliegue de Firebase Hosting ni una prueba autenticada en producción.

La planificación original y el informe del prototipo se conservan como antecedentes; este informe describe la versión unificada que los sustituye.
