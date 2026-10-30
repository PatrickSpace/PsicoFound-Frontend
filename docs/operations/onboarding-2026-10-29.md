# Entrega del onboarding guiado — 29/10/2026

Zona de referencia: America/Lima.
Publicación final y prueba autenticada: **30/10/2026**.

## Alcance

- Preparación profesional de cuatro pasos en agenda y Configuración.
- Revisión del perfil, selección de tarifa existente, horarios y activación explícita.
- Pausa de nuevas reservas independiente de la habilitación y suspensión de cuenta.
- Guía opcional de funciones, con continuidad por usuario y rol; bienvenida de pacientes.
- Consulta administrativa de preparación desde el directorio profesional.

Los perfiles anteriores conservan su operación hasta adoptar explícitamente la nueva
activación; una pausa propia sí se aplica inmediatamente. Las nuevas aprobaciones
crean perfiles preparados para configurarse, con recepción de reservas deshabilitada.
No se ejecuta una migración masiva de documentos de usuarios.

## Controles

La revisión de datos esenciales se vincula a una huella del perfil. Activar exige
tarifa comercial, disponibilidad futura compatible y una cuenta/perfil habilitados.
La revisión final incluye una huella de tarifa y horarios: si cambian, hay que
revisarla otra vez. Versiones y transacciones impiden sobrescribir otra ventana.

Recomendaciones, cotización y reserva comprueban la recepción del profesional. Las
citas existentes, su seguimiento y la reprogramación conservan sus reglas. Una
tarifa de prueba no completa la preparación para cobros reales.

Los campos y eventos de preparación se escriben mediante funciones autorizadas.
La consulta administrativa no concede capacidad para activar reservas de otro
profesional ni acceso adicional a información terapéutica.

## Validación y publicación

Validación local completada:

| Comprobación | Resultado |
| --- | --- |
| Unitarias frontend | 44 aprobadas |
| Unitarias servidor | 117 aprobadas, incluidas 7 nuevas de preparación |
| Batería integrada general | 89 aprobadas, incluidas las primeras 5 específicas del onboarding |
| Comprobación específica final | 6 aprobadas; amplía las anteriores con consulta administrativa, permisos por rol y reprogramación durante la pausa |
| Agenda en cuatro zonas y dos tamaños de pantalla | 32 aprobadas |
| Navegador, escritorio y móvil | 106 aprobadas |
| Compilación, lint y dependencias sin uso | Aprobados, incluido análisis de producción |

La batería completa anterior corresponde a `2006c8e`. La primera ejecución de
GitHub detectó una vulnerabilidad en la dependencia transitiva `re2js`, utilizada
por el cliente de Firestore. Se actualizó únicamente esa dependencia, de 2.8.6 a
2.9.1, en `d3d0d52`, junto con una corrección del texto singular de disponibilidad.

Tras la actualización se repitieron las 44 unitarias frontend, compilación,
análisis de dependencias y 8 escenarios de navegador (escritorio/móvil): aprobación
profesional, registro/verificación, reserva/pago/reprogramación y registro de atención.
Todos aprobaron. Las auditorías de frontend y Functions registraron **0
vulnerabilidades**. Las dos auditorías también aprobaron en la nueva ejecución de
[Quality en GitHub](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/41058122469);
su batería completa de regresión seguía en curso al cerrar este informe. No se da
por aprobado un trabajo de GitHub que todavía está ejecutándose.

### Publicación comprobada

- GitHub: `main`, implementación `2006c8e1dd24e7bde6fd34f7c01ff56b5ad880bb` y
  corrección `d3d0d52473d20fd92de4f98f02c284221735fc95`.
- Vercel: despliegue de `d3d0d52` comunicado como exitoso por su estado en GitHub;
  sitio comprobado: [frontend publicado](https://psico-found-frontend.vercel.app).
- Firebase: tres funciones nuevas y cuatro actualizadas. Consulta posterior: **55
  funciones activas**, ninguna faltante. La tarea existente de suspensión sigue habilitada.
- Hosting: versión `a31d81ca650eae10`, publicada el 30/10 a las **07:48:44 de Lima**;
  dominio comprobado: [app.lurems.lat](https://app.lurems.lat).
- Cinco módulos JavaScript críticos, incluido el cliente Firebase actualizado,
  coincidieron por SHA-256 con la compilación local en ambos sitios; MIME correcto.

### Recorrido autenticado en Vercel

Se utilizó una identidad sintética temporal, sin pacientes, citas ni cobros reales.
Su perfil mantuvo `acceptingBookings: false` durante toda la prueba pública.

| Acción | Evidencia observada |
| --- | --- |
| Inicio de sesión profesional | Acceso a agenda y tarjeta con 0 de 4 tareas. |
| Revisión del perfil | Confirmación guardada; avance a 1 de 4. |
| Selección de tarifa | Tarifa existente de S/100 guardada en el perfil temporal; avance a 2 de 4. No se abrió un pago. |
| Horario futuro | Bloque temporal compatible, de una hora en Lima; avance a 3 de 4. |
| Revisión de activación | Precio, reparto y horario correctos. Se canceló la confirmación, conservando la recepción deshabilitada. |
| Posponer y retomar | «Más tarde» redujo la tarjeta; «Preparar mi consulta» permaneció después de recargar. |
| Guía profesional | Recuperó el paso 2 tras recargar; permitió recorrer los cuatro pasos y terminar sin activar reservas. |
| Vista móvil | Chromium a 390×844; botones y diálogos utilizables y sin desbordamiento horizontal. |
| Cuenta con dos vistas | Cambiar a paciente retiró la preparación profesional y mostró la bienvenida de paciente con su guía de tres pasos. |
| Progreso por rol | Verificación posterior en servidor: guía profesional completada en paso 4 y guía de paciente pospuesta en paso 2, conservadas por separado. |

La activación completa, pausa, protección frente a cotizaciones antiguas, permisos
administrativos y conflictos se verificaron en emuladores aislados. No se publicó
una oferta de atención ficticia. Durante el recorrido interactivo no se observaron
nuevos errores de aplicación; se distinguieron de errores de conexión antiguos de
una sesión de navegador que había permanecido abierta.

Al finalizar se cerró el navegador de QA y se retiraron **solo** la identidad,
perfil, bloque y eventos temporales creados para esta prueba. Se eliminó el archivo
local de credenciales de QA. No se modificaron cuentas ni datos de usuarios reales.

Capturas locales de evidencia: `output/playwright/onboarding-2026-10-30/`, incluyendo
`preparacion-escritorio.png` y `guia-movil.png`. Son artefactos locales, no archivos
publicados en GitHub.

Comandos reproducibles: `npm test`, `npm run test:backend`, `npm run lint:backend`,
`npm run build`, `npm run audit:unused`, `npm run test:setup` y
`PILOT_VALIDATION=true npm run test:agenda` con Java 21 y emuladores disponibles.

## Pendientes humanos

Observar el uso por 2–3 psicólogos reales y ajustar textos/tiempos según sus
dificultades. Esta validación de usabilidad no sustituye la revisión humana pendiente
del protocolo de apoyo. No se añadió una aprobación clínica automática ni un botón
para certificar esa revisión.
