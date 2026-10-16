> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Revisión funcional independiente: paciente

Seguimiento horario 2026-10-09: [política de Lima y validación de REV-PAC-04B](cierre-politica-horaria-mvp.md).
El dictamen histórico de esta revisión se conserva a continuación.

Fecha: 2026-10-06. Producto: Lurems / PsicoFound.

Seguimiento del 2026-10-07: correcciones y pruebas mantenibles en
[cierre de la revisión del paciente](cierre-revision-pacientes.md).
Este documento conserva el dictamen y la evidencia históricos de la revisión.

## Dictamen

**La implementación avanzó, pero el frente del paciente todavía no está completo.**
Los recorridos principales de cuenta, citas, seguimiento y soporte funcionan en
las pruebas locales descritas abajo. Quedan dos problemas de integridad de datos,
un bloqueo con citas vencidas y problemas de claridad, recuperación en móvil y
separación de vistas en el registro emocional.

Esta revisión no modifica funcionalidades. Se usaron datos sintéticos y una copia
aislada del código; no se desplegó ni se operó sobre usuarios o cobros reales.

## Hallazgos que requieren corrección

P1: corregir antes de dar por validado el proceso afectado. P2: defecto funcional
que debe resolverse para cerrar su gap. Los siguientes resultados corresponden
al código revisado, no a una certificación del entorno publicado.

### REV-PAC-01 · P1 · Un paciente sin vínculo puede introducir un registro emocional en un proceso ajeno

**Reproducción:** con una cuenta X que no participa en la terapia B/A, crear un
documento en `emotional_checkins` con `pacienteUid = X`, pero `terapiaId = b-active`,
`terapeutaId = therapist-a`, `pacienteNombre = Paciente B` y `createdBy = B`.
Firestore acepta la escritura y el profesional A puede leer el documento.

La regla de creación solo exige que `pacienteUid` sea el usuario autenticado.
No comprueba la relación con la terapia, el profesional ni la autoría declarada.
La consulta profesional selecciona por `terapeutaId`, por lo que el contenido
fabricado puede incorporarse a su lista con un nombre de paciente falso.
No se demostró lectura de datos privados de B por X: el problema confirmado es
la introducción de información falsa en un contexto ajeno.

**Fuente:** `firestore.rules:302`; `src/services/emotionalCheckinService.js:14`.
**Evidencia:** prueba `security requirement: unrelated patient cannot insert
emotional records into another therapy`, fallida porque la escritura fue aceptada.

**Propuesta y cierre:** validar identidad y vínculo en servidor/reglas, derivar
autor y nombres de datos confiables, y aplicar el estado permitido de la terapia.
La misma escritura de X debe devolver `permission-denied`; B debe poder registrar
en su proceso y A leerlo, sin afectar otros pacientes ni terapias.

### REV-PAC-02 · P2 · Se puede fabricar un evento de sesión realizada en el historial

**Reproducción:** B escribe directamente en `longitudinal_history` un evento
`appointment_completed` asociado a su terapia, con un `sourceId` inexistente.
La escritura se acepta y A puede leer el evento.

La regla bloquea eventos `goal_*` y `exercise_*`, pero permite eventos de citas
a cualquier participante que cumpla el resto de condiciones. Esto permite un
historial que contradice las citas reales. **No permite marcar la cita como
realizada:** esa transición sí está protegida por el servidor.

**Fuente:** `firestore.rules:267`.
**Evidencia:** prueba `security requirement: patient cannot fabricate an
appointment-completed history event`, fallida porque la escritura fue aceptada.

**Propuesta y cierre:** emitir eventos de citas/terapias exclusivamente en la
operación autorizada del servidor; limitar explícitamente los eventos que aún
puede crear el cliente. Una escritura directa debe ser rechazada y el cierre
legítimo de una sesión debe producir un único evento coherente con su estado.

### REV-PAC-03 · P1 · Una cita vencida pendiente deja al paciente sin salida

**Reproducción:** una terapia activa conserva una cita `pendiente` del pasado.
Mis sesiones muestra “No tienes una próxima sesión agendada” y ofrece agendar,
pero no muestra una acción para resolver, cancelar o reprogramar esa cita.
Intentar reservar otra devuelve `already-exists` porque sigue existiendo una cita
abierta. El servidor también impide cambiar el estado de la terapia mientras
existan citas abiertas.

Excluir citas pasadas de “Próxima cita” es razonable; falta un recorrido separado
para resolverlas. El usuario depende de intervención externa para continuar.

**Fuente:** `src/views/mainviews/MisSesionesView.vue:244` y `:273`;
`functions/src/appointments/appointmentHandlers.js:250` y `:690`.
**Evidencia:** caso `a past open appointment remains actionable for its patient`,
reproducido en escritorio y móvil, combinando interfaz y rechazo del servidor.

**Propuesta y cierre:** mostrar “Citas pendientes de resolver” con las acciones
autorizadas, o definir y aplicar una transición de vencimiento. Validar una cita
pendiente y otra confirmada ya pasadas: resolverlas debe permitir continuar sin
crear duplicados, liberar bloques indebidamente ni borrar antecedentes.

### REV-PAC-04 · P2 · La reserva no identifica la zona horaria antes de confirmar

**Reproducción:** perfil del paciente con `Europe/Madrid`, bloque del profesional
con `America/Lima`. La selección dice “10:00 hs” y la cotización muestra fecha,
“10:00” y modalidad, sin identificar la zona. La reserva se guarda correctamente
en Lima; el problema es que el paciente no sabe a qué hora está aceptando asistir.

**Fuente:** `src/components/Terapias/CitaDialog.vue:141` y `:170`.
**Evidencia:** caso `booking identifies the timezone of the offered slot`,
fallido en escritorio y móvil; captura `timezone-before-confirming.png`.

**Propuesta y cierre:** mostrar explícitamente la zona del bloque o convertir a
la zona del paciente y rotularla; conservar el mismo criterio en selección,
cotización, reprogramación, tarjetas y avisos. Validar dos zonas diferentes,
cambio de día y horario de verano cuando corresponda.

### REV-PAC-05 · P2 · “Nota personal” no informa que el profesional puede leerla

El formulario emocional llama al campo “Nota personal” y no explica, antes de
guardar, que será visible para el profesional asociado. Las reglas y la vista
profesional permiten leerla. No existe una opción de nota privada en este flujo.

**Fuente:** `src/views/mainviews/RegistroEmocionalView.vue:256`;
`firestore.rules:302`; consulta `getCheckinsByTherapist`.
**Evidencia:** caso `emotional note sharing is clear before the patient submits
it`, fallido en ambas resoluciones; captura `emotional-note-label.png`.

**Propuesta y cierre:** explicar quién verá el registro antes de guardarlo y
rotular la nota como compartida. Si se decide ofrecer notas privadas, diseñar
almacenamiento y permisos separados. Validar el texto con el acceso efectivo
del paciente, profesional vinculado y tercero sin vínculo.

### REV-PAC-06 · P2 · En móvil, la cabecera bloquea “Reintentar” recomendaciones

**Reproducción:** con viewport de iPhone 13, provocar un error de la consulta de
recomendaciones. El aviso aparece debajo de la barra fija: su contenido se
superpone con el logo y “Ajustar”. El botón “Reintentar” existe, pero la cabecera
intercepta el toque. Playwright no consigue pulsarlo; en escritorio el mismo
recorrido de error → reintento funciona.

**Fuente:** `src/views/encuesta/ElegirTerapeuta.vue:33`, `:106`, `:344`, `:458`.
**Evidencia:** caso de recomendaciones en móvil, traza con
`v-toolbar__content ... intercepts pointer events` y captura del error.

**Propuesta y cierre:** respetar el espacio de la barra superior en todos los
estados de la pantalla y adaptar el aviso al ancho móvil. Tras un error, un toque
normal en “Reintentar” debe ejecutar la consulta y recuperar resultados o vacío,
sin forzar clics ni modificar estilos desde la prueba.

### REV-PAC-07 · P2 · El borrador emocional permanece al cambiar de vista

Con una cuenta de doble rol, abrir una nota en modo paciente y cambiar el estado
de vista a psicólogo mantiene abierto el diálogo y conserva el borrador personal.
Tras la carga profesional, el guardado queda deshabilitado y el diálogo muestra
un aviso de falta de terapia activa, aunque se está en vista profesional.

**Fuente:** `src/views/mainviews/RegistroEmocionalView.vue:182`, `:373` y `:380`.
**Evidencia:** prueba de cambio de modo en la misma ruta, escritorio y móvil.
Se invocó la misma acción del store utilizada por Configuración sin desmontar
la ruta, para comprobar limpieza de contexto. No se afirma que cambiar de vista
navegando normalmente por Configuración reproduzca el mismo diálogo residual,
ni que el profesional haya guardado una nota en nombre de otro paciente.

**Propuesta y cierre:** cerrar y limpiar el formulario al cambiar usuario/vista,
limpiar los datos previos al iniciar la nueva carga y proteger también la
asignación de `activeTherapy` frente a respuestas tardías. Repetir el cambio de
modo con formulario abierto y carga demorada; solo debe permanecer información
y acciones correspondientes a la vista activa.

## Estado por proceso

“Verificado” se limita a los casos enumerados; no significa que todos sus casos
límite ni su configuración de producción estén certificados.

| Proceso | Resultado actual | Pendiente o límite |
| --- | --- | --- |
| PAC-01 · Registro y acceso | Registro por correo, aceptación legal versionada, verificación, onboarding, nuevo ingreso, recuperación de contraseña y reintento tras fallo de inicialización verificados en escritorio/móvil | Google y entrega real de correos no probados; documentos legales sintéticos |
| PAC-02 · Cuenta | Edición persistente de nombre/país, exportación propia y solicitud de eliminación verificadas; servidor restringe campos editables y acceso ajeno | Eliminar cuenta solo registra `pending_policy`; cambio de correo no recorrido de extremo a extremo |
| PAC-03 · Encuesta | Corrección de preferencias y reinicio comprobados contra persistencia; reiniciar conserva mensajes previos | Interacción real con IA, reintentos de generación y vencimiento de sesión no validados de extremo a extremo |
| PAC-04 · Recomendaciones | Servidor distingue coincidencias, falta de disponibilidad y requisitos sin coincidencias; escritorio recupera error sin perder perfil | REV-PAC-06 en móvil |
| PAC-05 · Reserva | Cotización y reserva verificadas en navegador; transacciones rechazan duplicados y carreras por bloque | REV-PAC-03/04; entorno local necesita resolver ENV-PAC-01 |
| PAC-06 · Reprogramación y cancelación | Cambio de bloque, liberación del anterior, cancelación y consistencia del pago verificados | Citas vencidas no tienen salida visible: REV-PAC-03 |
| PAC-07 · Sesiones y acceso remoto | Confirmación y enlace agregados por profesional aparecen en la sesión abierta del paciente | No se abrió proveedor de videollamada; claridad horaria: REV-PAC-04 |
| PAC-08 · Estado de terapia | Servidor protege cambio de estado cuando hay citas abiertas y conserva antecedentes | REV-PAC-03; cambio completo a otro profesional no recorrido en navegador |
| PAC-09 · Objetivos y avances | Creación, dos avances, persistencia, autoría, filtros y separación entre vistas verificados en suite de seguimiento | Sin hallazgo nuevo en el alcance ejecutado |
| PAC-10 · Ejercicios | Asignación, consulta, finalización del paciente y separación por terapia/rol verificadas | Sin hallazgo nuevo en el alcance ejecutado |
| PAC-11 · Emociones | Existe registro persistente vinculado a terapia y lectura profesional | REV-PAC-01/05/07; faltan filtros por proceso/periodo y claridad de alcance |
| PAC-12 · Historial | Consulta, resúmenes compartidos y ausencia de acciones profesionales para paciente verificadas | Integridad de eventos: REV-PAC-02 |
| PAC-13 · Notificaciones | Código incorpora suscripción y conteo de todos los avisos propios; servidor produce avisos de citas/soporte | No se completó una prueba específica de apertura/marcado en la misma ruta ni de recuperación del listener |
| PAC-14 · Soporte | Solicitud, estado, respuesta administrativa visible al paciente, idempotencia y rechazo de terceros verificados | No se certifica operación real del equipo de soporte ni tiempos de respuesta |
| PAC-15 · Solicitud profesional | Recorrido presente en código con aprobación separada | No se reejecutó todo el circuito paciente → solicitud → aprobación → doble rol |
| PAC-16 · Pagos | MVP manual: cotización, operación pendiente, declaración de pago, revisión administrativa y devolución en revisión coherentes con cita/terapia | Sin cobro ni devolución real; pendientes políticas de vencimiento/cancelación/devolución e integración con proveedor |
| PAC-17 · Ayuda ante riesgo | Pantalla y enlace de ayuda comprobados con fallo sintético de recomendaciones | No valida detección de riesgo por IA, idoneidad clínica ni vigencia/disponibilidad de recursos externos |

## Límites funcionales que siguen abiertos

- **Eliminación de cuenta:** el servidor registra una solicitud `pending_policy`.
  No elimina Auth ni datos. La interfaz lo advierte, por lo que no se presenta
  como una eliminación ya realizada. Falta aprobar retención/anonimización y
  establecer ejecución, trazabilidad y respuesta al paciente.
- **Pagos:** el recorrido es administrativo y manual. “Ya realicé el pago” no
  confirma un cobro; la conciliación exige un administrador. Marcar una devolución
  no demuestra movimiento de dinero. No dar este MVP por equivalente a una
  pasarela integrada ni a una política comercial ya operativa.
- **Emociones:** la lista e indicadores aún agregan registros sin selector de
  terapia/periodo comparable al seguimiento de objetivos y ejercicios. El
  formulario exige terapia activa y no permite distinguir una nota privada.

## Pruebas y condiciones de la revisión

Se tomó una copia de 187 archivos del árbol de trabajo, incluyendo modificaciones
sin commit. Base Git: `9fef7d2`; **ese commit por sí solo no representa el código
revisado**. El manifiesto SHA-256 está en la evidencia. Al comparar con el workspace
al cierre, solo habían cambiado README y documentación del psicólogo; ningún
archivo funcional del corte había cambiado.

Entorno: Node 22.20.0, Firebase CLI 15.15.0, Firebase Admin 13.10.0, Chromium,
escritorio 1440×1000 e iPhone 13 emulado. Proyecto sintético
`demo-lurems-followup`; Firestore 8191, Auth 9191, Functions 5101 y Vite 5278.
Los puertos habituales estaban ocupados y se conservaron intactos. El navegador
bloqueó destinos distintos de localhost/127.0.0.1. No se llamó a IA ni se abrieron
enlaces de pago o videollamada.

| Verificación | Resultado |
| --- | --- |
| `npm test` | 17/17 aprobadas |
| `npm run test:backend` | 53/53 aprobadas |
| `npm run lint:backend` | Aprobado |
| `npm run build` | Aprobado; advertencia de tamaño de bundle |
| Suite existente de integración | 7/7 seguimiento y 6/6 citas aprobadas |
| Suite existente de navegador | 12/12 aprobadas, escritorio y móvil |
| Integración adicional del paciente | 4/6 aprobadas; los dos fallos prueban REV-PAC-01/02 |
| Navegador adicional, suite principal | 9/16 aprobadas; siete fallos corresponden a REV-PAC-03/04/05 en ambas resoluciones y REV-PAC-06 en móvil |
| Cambio de modo con borrador emocional | Fallo en ambas resoluciones: REV-PAC-07 |
| Emoción persistente/lectura profesional y ayuda con error de recomendaciones | 4/4 aprobadas en escritorio/móvil, tras corregir la espera de cierre de sesión del harness |

Los primeros intentos de las pruebas nuevas incluyeron selectores ambiguos y una
carrera de la prueba al navegar antes de terminar el cierre de sesión. Se
separaron de los defectos de producto. La evidencia conserva esos intentos y las
ejecuciones corregidas; no deben contarse todos los fallos iniciales como bugs.

### ENV-PAC-01 · Incompatibilidad del emulador con `admin.firestore.FieldValue`

En el entorno original, editar perfil devuelve `INTERNAL` y reservar no se
completa. El runtime del emulador usa `value.bind(target)` al representar
`admin.firestore`; esa función enlazada pierde la propiedad estática `FieldValue`.
Se reprodujo localmente: existe en Firebase Admin original, desaparece en la
función enlazada y se conserva al copiar sus propiedades. La traza de edición
falla en `accountHandlers.js:56` al acceder a `serverTimestamp`.

Para continuar la revisión se aplicó **solo en los procesos de prueba** un preload
que conserva esas propiedades en el proxy del CLI. No se cambió el código de la
app ni el CLI instalado. Los recorridos de navegador nuevos aprobados dependen
de esa adaptación; no se presenta el entorno original como completamente verde
ni se extrapola este error a producción.

Antes de incorporar estos E2E al proyecto, resolver y documentar la compatibilidad
del emulador/SDK o adoptar las importaciones modulares apropiadas; ejecutar luego
la suite sin el preload. Las pruebas que llaman handlers directamente no cubren
este problema, aunque validen correctamente su lógica y persistencia.

## Evidencia y orden de cierre

Evidencia local en `test-results/patient-review-2026-10-06/`: logs, reportes HTML,
capturas, trazas, pruebas adicionales, configuración de puertos, manifiesto y
copia comprimida del código revisado. Esa carpeta está ignorada por Git; el
informe permanece en documentación del proyecto.

Orden propuesto: cerrar primero REV-PAC-01/02 y REV-PAC-03; después REV-PAC-04/05/06/07.
Resolver ENV-PAC-01 para que las comprobaciones por HTTP sean reproducibles sin
adaptación. Repetir las pruebas de regresión de cada hallazgo y completar los
recorridos marcados como no verificados antes de declarar cerrado todo el frente.
