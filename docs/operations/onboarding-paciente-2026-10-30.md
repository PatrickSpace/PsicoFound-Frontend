# Validación del onboarding de acompañamiento del paciente

Fecha: 30/10/2026, America/Lima. Implementación local; sin push ni despliegue de esta entrega.

## Resultado

Se añadió una bienvenida para pacientes con cita y pago confirmados, un recorrido de tres pasos y ayudas opcionales en Sesiones, Inicio, Emociones, Progreso, Herramientas e Historial. El avance se conserva en `productGuides.patientCare`, separado de las otras guías. Las ayudas se abren sobre las vistas reales con el elemento correspondiente resaltado y se pueden cerrar y repetir.

Se expuso `loadedForUid` en el store de contexto: ya existía internamente, pero las guías no podían consultarlo. Ahora el cambio de cuenta puede limpiar correctamente sus estados en memoria.

## Comprobaciones realizadas

- 44 pruebas unitarias del frontend y 117 del backend: aprobadas.
- Cinco pruebas integradas nuevas contra Firebase emulado: aprobadas. Verifican propiedad y correspondencia de cita/pago, pago pendiente, cita pendiente/cancelada, reembolso, terapia pausada, persistencia separada, conservación de ayudas después de una cancelación, validación de campos, roles y cuenta suspendida.
- Compilación Vite, lint del backend, análisis de archivos sin uso y `git diff --check`: aprobados. Knip conserva cuatro recomendaciones previas sobre su propia configuración.
- Navegación con Playwright CLI sobre la aplicación real en `127.0.0.1:5178`: bienvenida, recorrido de tres pasos, cierre, reanudación, recarga, repetición, ayudas de Emociones/Progreso/Herramientas/Historial, y menú Más en móvil.
- Pantallas de 1440×1000 y 390×844; comprobación de anchura móvil sin desbordamiento horizontal.
- Objetivos y herramientas vacíos al seleccionar la terapia activa: la guía explica la ausencia de datos sin exigir crear información clínica.
- Comparación SHA-256 de seis colecciones antes y después de recorrer la guía: `citas`, `terapias`, `therapy_goals`, `exercises`, `emotional_checkins`, `longitudinal_history`. Sin modificaciones. La guía guarda exclusivamente su avance en el usuario; las llamadas también conservan el registro normal de actividad de la cuenta.

Entorno: proyecto `demo-lurems-followup`, emuladores Auth/Firestore/Functions y frontend local. Puertos exclusivos y salida de red de los emuladores restringida a loopback/Unix. El navegador bloqueó destinos externos; la fuente de Google se sustituyó por la fuente local de respaldo. No se utilizó OpenAI, cobros ni pacientes reales.

Grabaciones reales, sin información personal de producción:

- `output/playwright/patient-care-2026-10-30/onboarding-paciente.webm`
- `output/playwright/patient-care-2026-10-30/onboarding-movil.webm`

## Publicación pendiente

Publicar el frontend y las funciones `getPatientCareGuide` y `savePatientCareGuide` juntos. Esta entrega no requiere migrar usuarios ni añadir una dependencia externa. El siguiente control tras publicar es comprobar el flujo con una cuenta QA y una cita/pago autorizados del entorno destino.

Las pruebas de acceso usan el wrapper operativo existente, pero no sustituyen una revisión de configuración App Check o de políticas legales en producción. La guía de ayuda no modifica el protocolo de apoyo ni su revisión humana pendiente.


## Publicación posterior y prototipo interactivo

La versión descrita arriba se subió a `main` en el commit `0bf1235`. Las funciones `getPatientCareGuide` y `savePatientCareGuide` se crearon correctamente en `psicosaas-3c819`, región `southamerica-east1`. El prototipo con fondo oscurecido es un cambio local posterior a ese commit; su validación y vídeo se detallan en `onboarding-spotlight-2026-10-30.md`.
