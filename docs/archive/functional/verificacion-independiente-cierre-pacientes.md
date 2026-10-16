> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Verificación independiente del cierre del paciente

Seguimiento de implementación 2026-10-09: [política única de Lima y validación de REV-PAC-04B](cierre-politica-horaria-mvp.md).
Se conserva íntegro el resultado independiente original como antecedente;
el enlace informa el estado de la corrección posterior, no una nueva auditoría independiente.

Fecha de comparación final: 2026-10-08, America/Lima.

## Resultado

**Queda un defecto funcional confirmado en el selector de horarios.** Las
correcciones de REV-PAC-01/02/03/05/06/07 y ENV-PAC-01 pasan la validación local.
REV-PAC-04 muestra ahora correctamente las zonas, pero su filtro de fechas aún
puede ocultar bloques futuros cuando paciente y profesional están en días distintos.

El reporte anterior de implementación aprobó los escenarios que incorporó.
Esta revisión los volvió a ejecutar y añadió un caso que no estaba cubierto.
Por ese caso adicional, no corresponde declarar cerrado todo el alcance horario.

La nueva comparación del workspace encontró **194 archivos sin cambios** respecto
al corte ejecutado, sin archivos adicionales. Por ello, los resultados siguen
aplicando al código actual; no se repitieron las suites solamente por reiterarse
la solicitud de revisión. No se modificó código funcional ni se desplegó.

## Pendiente: REV-PAC-04B · P2 · El calendario oculta horarios futuros al cambiar el día entre zonas

**Ubicación:** `src/components/Terapias/CitaDialog.vue`, líneas 512–522.

`filteredAvailabilitySlots` obtiene el inicio del día en la zona del navegador.
Después interpreta `slot.date` como una fecha local sin considerar la zona del
bloque y descarta fechas anteriores. La comprobación previa del servicio sí usa
el instante y reconoce esos bloques como futuros. El segundo filtro los elimina.

### Reproducción confirmada

Prueba sintética con perfil y navegador en `Europe/Madrid`:

1. Reloj del navegador: `2099-01-16T00:30:00Z`, equivalente a las 01:30 del 16 de
   enero en Madrid. El reloj del sistema y del servidor no se modifica.
2. El profesional tiene dos bloques disponibles del 15 de enero en `America/Lima`,
   a las 23:00 y 23:30.
3. El bloque de las 23:30 comienza en `2099-01-16T04:30:00Z`: **faltan cuatro horas**.
4. `getAvailableSlotsByTherapist` devuelve ambos bloques; la prueba lo verifica
   antes de abrir el diálogo, sin simular respuestas de disponibilidad.
5. Al abrir Agendar, con “Este mes” seleccionado, aparece “No hay horarios
   disponibles”. El paciente no puede seleccionar los bloques ni continuar.

La prueba falla por ausencia del botón `23:30 · America/Lima` tanto en escritorio
como en móvil. La captura y el árbol accesible confirman el estado vacío, sin
error de carga. La conversión a UTC es correcta: el fallo está en el filtro visual.

**Impacto:** se presenta falta de disponibilidad cuando hay horarios válidos,
impidiendo la reserva de esos bloques. El selector también se reutiliza para
reprogramación; el caso de navegador ejecutado reproduce la reserva.

### Corrección y criterio de cierre

- Filtrar los periodos usando instantes y una zona explícita y coherente con lo
  mostrado. No comparar directamente la fecha del bloque con el día local del
  navegador como si pertenecieran a la misma zona.
- Conservar la exclusión de horarios realmente pasados y las etiquetas IANA
  ya implementadas.
- Incorporar el caso de regresión a las pruebas mantenidas del proyecto.
- Verificar reserva y reprogramación con zonas diferentes, cruce de medianoche
  y cambio de mes, además de los casos de horario de verano ya existentes.
- En el caso descrito deben aparecer los bloques, permitir cotizar/confirmar y
  conservar el instante correcto al guardar. Un bloque realmente pasado debe
  continuar excluido.

## Estado de las correcciones solicitadas

| Hallazgo | Verificación independiente |
| --- | --- |
| REV-PAC-01 · Registros emocionales ajenos | Corregido: servidor valida vínculo/identidad; rechaza suplantación y escrituras directas |
| REV-PAC-02 · Eventos de historial fabricados | Corregido: escrituras de cliente denegadas y transición real idempotente por HTTP |
| REV-PAC-03 · Citas vencidas sin salida | Corregido en casos probados: pendientes/confirmadas visibles, cancelación/reprogramación y continuidad de reserva |
| REV-PAC-04 · Zona horaria | Etiquetas, conversión y persistencia verificadas; pendiente REV-PAC-04B en el filtro visual |
| REV-PAC-05 · Nota compartida | Corregido: aviso previo y lectura efectiva del profesional vinculados al mismo proceso |
| REV-PAC-06 · Reintentar en móvil | Corregido: clic normal accesible, recuperación de consulta y preferencias conservadas |
| REV-PAC-07 · Cambio de vista/cuenta | Corregido en pruebas de borrador abierto, cargas tardías y cambio de usuario real |
| ENV-PAC-01 · Compatibilidad del emulador | Corregido: suite HTTP completa sin NODE_OPTIONS, preload ni modificación del CLI |

También pasaron las regresiones del psicólogo, incluidos objetivos, ejercicios,
historial, filtros, fechas de terapia y separación de vistas.

## Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| Unitarias | 27/27 aprobadas |
| Backend | 53/53 aprobadas |
| Lint backend | Aprobado |
| Build | Aprobado; permanece advertencia de bundle mayor de 500 kB |
| `git diff --check` | Aprobado |
| Integración de seguimiento/citas/paciente | 18/18 aprobadas |
| Navegador existente | 34/34 aprobadas, 17 por resolución |
| Regresión independiente de cambio de día | 2/2 fallidas por REV-PAC-04B, una por resolución |

Se ejecutó sobre una copia aislada del árbol actual, incluyendo cambios sin
commit. La única adaptación de infraestructura en Vite permitió leer las
dependencias enlazadas desde el workspace. No se cambió la lógica funcional.
Proyecto `demo-lurems-followup`, emuladores propios y red externa bloqueada por
el runner. Los servicios de la revisión quedaron cerrados al terminar.

Escritorio 1440×1000 y perfil móvil iPhone 13 en Chromium. El caso adicional fija
`Europe/Madrid` y el reloj del navegador. No prueba Safari, dispositivos físicos
ni configuración del entorno publicado.

## Límites que no forman parte de esta corrección

Siguen pendientes del producto, pero se excluyeron expresamente del prompt:

- Cobro y devolución reales: el MVP conserva conciliación administrativa manual.
- Eliminación efectiva de cuenta: solo se registra `pending_policy`; falta la
  política y su proceso operativo.
- Auditoría administrativa completa, validación clínica/recursos externos y
  revisión o migración de datos históricos reales.

Tampoco se amplía esta validación a todos los recorridos del inventario original:
Google, cambio de correo completo, IA real, apertura/marcado de notificaciones y
solicitud profesional completa conservan los límites de cobertura documentados
en la revisión inicial. No constituyen por sí solos nuevos bugs confirmados.

## Evidencia

`test-results/patient-closure-review-2026-10-08/` contiene logs, reportes HTML,
capturas, trazas, hashes, copia del código y la prueba adicional con sus runners.
La carpeta está ignorada por Git; las instrucciones están en su `README.md`.
`current-source-comparison.json` confirma la identidad del código actual.

La prueba adicional está en
`audit-harness/tests/browser/audit-timezone.spec.mjs`; todavía no se incorporó
a la suite normal, porque esta tarea es una revisión. El adjunto
`future-slots-returned-by-service` del reporte HTML contiene los dos bloques
devueltos y la hora simulada. Las capturas del selector vacío están en
`audit-timezone/`.
