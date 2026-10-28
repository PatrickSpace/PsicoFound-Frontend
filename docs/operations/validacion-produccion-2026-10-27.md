# Validación integrada y publicación — 27 de octubre de 2026

Zona de referencia: America/Lima. Estado: **validación integrada aprobada; publicación en preparación**.

## Alcance

Entrega de suspensión voluntaria/involuntaria, reactivación por el titular,
conservación de información, bloqueo de sesiones existentes y revisión diaria de
inactividad a los tres meses calendario. La revisión del sistema de apoyo por
psicólogos reales conserva su acción humana pendiente; no se añade aprobación UI.

Los resultados anteriores del 26/10 eran unitarios. Este expediente registra las
comprobaciones integradas posteriores y la conciliación con producción.

## Reproducibilidad

- Dependencias reinstaladas mediante `npm ci` y `npm --prefix functions ci`.
  Se corrigieron diferencias locales con los lockfiles sin modificar estos últimos.
- Las instalaciones informaron cero vulnerabilidades conocidas en ambos paquetes.
- Java 21 y runner `tests/run-patient-isolated.mjs`, proyecto
  `demo-lurems-followup`, Auth/Firestore/Functions locales y salida de red
  restringida por el sistema operativo a loopback y sockets Unix.
- Recorridos en Chromium, escritorio y viewport móvil; agenda probada desde
  distintas zonas horarias. No se presentan como pruebas con dispositivos físicos.
- Ninguna prueba aislada envía mensajes al proveedor de IA, correos reales ni
  ejecuta cobros, transferencias o suspensiones de usuarios productivos.

Comando de la suite completa, con Java 21 disponible en `JAVA_HOME`/`PATH`:

```sh
PILOT_VALIDATION=true AGENDA_VALIDATION=true node tests/run-patient-isolated.mjs
```

La prueba adicional de inactividad queda incluida en la suite de cuentas y en
Quality; ejecuta el job con Firestore emulado y metadatos Auth históricos sintéticos.

## Correcciones encontradas durante la validación

1. **Cambio de terapia:** mientras esperaban los guards de navegación, los enlaces
   del contexto anterior seguían disponibles. Se limpia el contexto al seleccionar
   otra terapia, antes de la navegación asíncrona. El caso original y una nueva
   regresión con validación demorada pasaron en escritorio y móvil.
2. **Último administrador utilizable:** una cuenta suspendida no puede sustituir
   al último administrador activo en el control de revocación de roles. Se añadió
   una comprobación integrada específica.

La primera pasada general se detuvo al encontrar el fallo de cambio de terapia.
Después de corregirlo pasaron 6/6 recorridos focalizados. La repetición final aprobó 81/81 pruebas de integración general y 106/106 recorridos
web; la agenda mantiene sus 3/3 pruebas de dominio y 32/32 de navegador, sin cambios
en su código.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Unitarias frontend | 44/44 aprobadas después de reinstalar dependencias. |
| Unitarias backend | 110/110 aprobadas después de reinstalar dependencias. |
| Lint backend y build productivo | Aprobados. |
| Integración general final | 81/81 aprobadas, incluida inactividad con Firestore emulado y protección del administrador suspendido. |
| Integración del dominio de agenda | 3/3 aprobadas en la pasada de agenda. |
| Agenda / Lima | 32/32 aprobadas. |
| Navegación general final | 106/106 aprobados en escritorio y móvil, incluida la nueva regresión de selección de terapia. |
| Knip normal y producción | Aprobados. |

La integración comprueba suspensión/reactivación, conservación de conversaciones y
citas, lectura limitada de identidad y rechazo de accesos con un token previo.
También cubre agenda, seguimiento, administración, documentos legales, pagos,
cuentas y encuesta sintéticos. Los rechazos de permisos esperados no son fallos.

## Conciliación de publicación

Antes de esta entrega, `suspendOwnAccount`, `reactivateOwnAccount` y
`suspendInactiveAccounts` respondieron 404 en la API de administración de Functions.
La última versión Hosting observada fue `803d32c0d24bba7a`, publicada el 25/10.
Por tanto, las funciones locales nuevas todavía no formaban parte de producción.

Actualizar esta sección después de publicar: commit, estado de Functions, tarea
programada, versión Hosting, comparación de assets y resultado de navegación.
El backend debe quedar listo antes de habilitar el frontend nuevo en los sitios.

## Pendientes que no se cierran con estas pruebas

- Revisión humana de casos y textos de apoyo por psicólogos que contactará el titular.
- Recuperación de contraseña con correo temporal y cambio final todavía sin acreditar.
- Selección de tarifas reales de apertura; el perfil QA usa la tarifa de prueba.
- Pago real controlado y conciliación, reservados para el final por el titular.
- Responsables/suplente y cobertura de operación, así como procedimiento de citas
  pendientes cuando un profesional deja de atender.
- Caída real de OpenAI, dispositivos físicos y ensayo real de backup/restauración:
  continúan excluidos; no se registran como ejecutados.

Contrato: [suspensión de cuentas](../functional/suspension-cuentas.md).
Seguimiento general: [salida a producción](../salida-a-produccion.md).
