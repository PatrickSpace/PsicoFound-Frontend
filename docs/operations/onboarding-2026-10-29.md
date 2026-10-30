# Entrega del onboarding guiado — 29/10/2026

Zona de referencia: America/Lima.

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

La publicación remota y su comprobación se registrarán después del despliegue; los
resultados locales anteriores no se presentan como evidencia de Vercel.

La comprobación de Vercel utilizará una identidad sintética temporal sin pacientes,
sin citas ni cobros reales. Su perfil mantendrá `acceptingBookings: false` durante
la prueba pública. La activación completa y los conflictos se verifican en emuladores
aislados, sin publicar una oferta de atención ficticia.

Comandos reproducibles: `npm test`, `npm run test:backend`, `npm run lint:backend`,
`npm run build`, `npm run audit:unused`, `npm run test:setup` y
`PILOT_VALIDATION=true npm run test:agenda` con Java 21 y emuladores disponibles.

## Pendientes humanos

Observar el uso por 2–3 psicólogos reales y ajustar textos/tiempos según sus
dificultades. Esta validación de usabilidad no sustituye la revisión humana pendiente
del protocolo de apoyo. No se añadió una aprobación clínica automática ni un botón
para certificar esa revisión.
