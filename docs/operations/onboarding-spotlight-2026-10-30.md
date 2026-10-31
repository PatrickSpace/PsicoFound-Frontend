# Prueba de onboarding con foco visual

Fecha: 30/10/2026, America/Lima.

## Publicación de la versión anterior

La versión del onboarding de acompañamiento anterior a este prototipo se subió a `origin/main` en el commit `0bf1235`. Se desplegaron únicamente las funciones nuevas `getPatientCareGuide` y `savePatientCareGuide` en `psicosaas-3c819`, región `southamerica-east1`. Ambas operaciones terminaron correctamente; las dos URLs respondieron HTTP 401 a solicitudes sin autenticación, como corresponde.

El push activa el flujo de Vercel configurado en el proyecto. Esta validación no acredita una prueba autenticada en Vercel ni una actualización de Firebase Hosting.

## Alcance del prototipo local

Se añadió una guía de dos pasos en «Guía de mi proceso → Emociones → Mostrarme cómo»:

1. Oscurece el fondo y deja visible el botón real «Agregar registro». La persona debe pulsarlo para avanzar.
2. Al abrirse el formulario, ilumina el aviso que explica quién puede ver el registro. Se puede terminar la guía y cancelar el formulario sin guardar datos.

Solo se implementó este flujo como muestra del nuevo estilo. El resto de las secciones conserva su guía anterior. El prototipo permanece local, posterior al commit publicado.

El componente `GuidedSpotlight.vue` dibuja cuatro zonas oscuras alrededor del elemento, añade el contorno visible y sitúa la explicación junto a él. Recalcula las coordenadas al desplazar o redimensionar; conserva el clic sobre el elemento real. Incluye salida por X, Escape y «Salir de la guía», navegación por Tab y alternativa cuando no se localiza el elemento. La captura de foco del formulario se desactiva exclusivamente mientras esta guía está abierta para evitar conflictos de teclado entre ambos paneles.

## Validación

- Compilación Vite, 44 pruebas unitarias, Knip y comprobación de espacios del diff: aprobados. Knip mantiene cuatro recomendaciones anteriores de configuración.
- Playwright CLI sobre Firebase emulado y datos ficticios: clic en el botón real, avance al aviso del formulario, terminar, salir con X/Escape, cancelar sin guardar y repetir.
- Resoluciones 1440×1000 y 390×844. Se verificó que la explicación no intersecta el elemento destacado, que el centro del botón recibe el clic y que la pantalla móvil no tiene desbordamiento horizontal.
- Se comprobó el cambio de tamaño con el segundo paso abierto y el desplazamiento automático al elemento.
- Se comprobó que Tab conserva el foco entre el elemento destacado y los controles de la guía.
- Las grabaciones corresponden al frontend real en localhost con Auth/Firestore/Functions emulados en `demo-lurems-followup`. No se usaron pacientes, información clínica ni pagos de producción. Los destinos externos del navegador estuvieron bloqueados.

Artefactos en `output/playwright/patient-spotlight-2026-10-30/`: capturas de escritorio/móvil y vídeos reales convertidos a MP4 H.264 para compartir.
