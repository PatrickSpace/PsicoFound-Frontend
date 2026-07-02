# Plan De Entrega MVP

## Objetivo

Terminar un MVP funcional de PsicoFound que demuestre un flujo de valor completo
sin pagos:

```text
Paciente
  -> encuesta conversacional
  -> recomendacion de psicologos
  -> agenda cita
  -> psicologo gestiona la sesion
  -> paciente recibe enlace externo
  -> sesion realizada
  -> seguimiento basico
```

El MVP debe permitir probar el producto con usuarios reales usando Firebase,
Firestore, Cloud Functions, Vercel y la instancia actual de IA.

## Fuera De Alcance Para MVP

- Pagos, Stripe o cualquier modulo de cobro.
- Login con Apple o Microsoft.
- Videollamada integrada propia.
- Calendario avanzado con disponibilidad granular.
- Expediente clinico completo.
- Automatizaciones avanzadas de marketing.
- Multiples proveedores IA activos en produccion.

## Criterio De MVP Terminado

El MVP se considera terminado cuando se pueda ejecutar este flujo sin tocar
Firestore manualmente:

1. Un paciente crea cuenta o inicia sesion.
2. El paciente completa la encuesta conversacional.
3. El sistema muestra psicologos recomendados.
4. El paciente agenda una cita sin pago.
5. Si el paciente no tiene terapia activa con ese psicologo, se crea una.
6. El psicologo ve la cita en su agenda.
7. El psicologo confirma, reprograma o agrega un enlace externo de sesion.
8. El paciente ve fecha, modalidad y enlace de sesion.
9. El psicologo marca la sesion como realizada.
10. El historial, progreso y sesiones reflejan el cambio.
11. Las reglas de Firestore protegen datos por rol.
12. El flujo funciona en desktop y movil.

El analisis UX por journey queda documentado en
`docs/mvp/ux-journey-analysis.md`.

## Roles MVP

### Paciente

- Puede completar encuesta conversacional.
- Puede ver recomendaciones.
- Puede agendar una cita.
- Puede ver su proxima cita.
- Puede ver enlace externo cuando el psicologo lo agregue.
- Puede ver historial, progreso y herramientas asignadas.

### Psicologo

- Puede acceder a vista de psicologo si su usuario esta vinculado.
- Puede ver pacientes asignados.
- Puede ver agenda.
- Puede confirmar cita.
- Puede editar fecha/hora/link externo.
- Puede marcar sesion como realizada.
- Puede asignar objetivos y herramientas.

### Admin

- Puede gestionar psicologos.
- Puede vincular un usuario con un perfil profesional.
- Puede activar/desactivar psicologos.
- Puede ver pacientes de forma operativa.
- Puede aprobar solicitudes para registrarse como psicologo.

## Fase 1: Cierre Del Flujo Paciente

### Objetivo

Garantizar que un paciente nuevo pueda pasar de conversacion IA a cita agendada
sin pago.

### Tareas

- [x] Revisar `CitaDialog` cuando se abre desde recomendaciones.
- [x] Mostrar al paciente solo horarios abiertos por el psicologo.
- [x] Bloquear el bloque de 1 hora cuando el paciente agenda.
- [x] Si no existe terapia activa con el terapeuta seleccionado, crear terapia.
- [x] Asociar la cita a la terapia correcta.
- [x] Evitar mas de una cita pendiente o confirmada por terapia.
- [x] Evitar que el paciente ingrese o sobrescriba el link externo de sesion.
- [x] Mostrar confirmacion clara despues de agendar.
- [x] Redirigir a `/sesiones` despues de agendar.
- [ ] Asegurar con usuario real que `/sesiones` muestre la cita creada.
- [ ] Asegurar que `/terapiadetail` muestre la cita asociada.

### Criterio De Salida

Con un paciente real, despues de elegir psicologo recomendado y agendar, deben
existir:

- documento en `terapias`;
- documento en `citas`;
- cita resumida dentro de la terapia;
- evento longitudinal de cita creada;
- UI del paciente actualizada.

## Fase 2: Cierre Del Flujo Psicologo

### Objetivo

Permitir que el psicologo gestione la sesion de punta a punta.

### Tareas

- [x] Implementar lectura de citas desde terapias asignadas al psicologo.
- [x] Permitir que el psicologo abra bloques disponibles de 1 hora.
- [x] Permitir editar modalidad, fecha, hora, ubicacion y link externo.
- [x] Confirmar cita desde agenda.
- [x] Reprogramar cita si esta pendiente o confirmada.
- [x] Hacer visible la accion de agregar o editar link externo.
- [x] Agregar link de Zoom, Google Meet u otra herramienta.
- [x] Mantener el link externo como responsabilidad de psicologo/admin.
- [x] Marcar sesion como realizada.
- [x] Registrar resumen compartido de la sesion.
- [x] Registrar eventos en historial longitudinal.
- [x] Permitir abrir detalle de terapia desde Pacientes en modo psicologo/admin.
- [ ] Probar con psicologo real que la agenda liste citas de terapias asignadas.
- [ ] Probar con psicologo real confirmacion, reprogramacion, link externo y sesion realizada.
- [ ] Verificar desde paciente que el link externo aparezca despues de que el psicologo lo agregue.

### Criterio De Salida

Un psicologo vinculado a su UID puede gestionar una cita sin usar consola ni
Firestore manualmente.

## Fase 3: Solicitud Y Aprobacion De Psicologos

### Objetivo

Cerrar el flujo para que un usuario pueda pedir acceso como psicologo y un admin
pueda aprobarlo.

### Tareas

- [x] Crear coleccion `psychologist_requests`.
- [x] Desde Configuracion, guardar solicitud de registro como psicologo.
- [x] Crear vista admin para solicitudes pendientes.
- [x] Permitir aprobar solicitud.
- [x] Al aprobar, crear o vincular perfil en `therapists`.
- [x] Actualizar `users/{uid}` con rol o permiso profesional.
- [x] Permitir alternar entre vista paciente y psicologo.
- [x] Permitir rechazar solicitud con motivo opcional.
- [ ] Probar con usuario paciente real el envio de solicitud.
- [ ] Probar con usuario admin real la aprobacion y rechazo.
- [ ] Verificar que despues de aprobar aparezca la vista de psicologo sin reloguear.

### Criterio De Salida

Un usuario paciente puede solicitar acceso profesional y, tras aprobacion admin,
entra a la vista de psicologo sin intervencion manual en Firestore.

## Fase 4: Seguridad Y Reglas Firestore

### Objetivo

Evitar errores de permisos y asegurar aislamiento de datos.

### Tareas

- [ ] Probar reglas con usuario paciente.
- [ ] Probar reglas con usuario psicologo.
- [ ] Probar reglas con usuario admin.
- [x] Revisar reglas para `psychologist_requests`.
- [ ] Revisar reglas para `therapists`.
- [ ] Revisar reglas para `terapias`.
- [ ] Revisar reglas para `citas`.
- [ ] Revisar reglas para `longitudinal_history`.
- [x] Revisar reglas para `notifications`.
- [ ] Revisar reglas para `therapy_goals`.
- [ ] Revisar reglas para `exercises`.
- [ ] Revisar reglas para `emotional_checkins`.

### Criterio De Salida

No aparece `Missing or insufficient permissions` en el flujo MVP y ningun rol
puede leer datos fuera de su alcance.

## Fase 5: IA Y Matching

### Objetivo

Garantizar que la IA recolecte datos suficientes sin asumir informacion clinica
no dicha por el usuario.

### Tareas

- [ ] Probar saludo simple: "hola", "hey".
- [ ] Probar respuestas ambiguas: "me da igual".
- [ ] Probar preferencias en cualquier orden.
- [ ] Probar caso "solo quiero conversar".
- [ ] Probar caso de urgencia o crisis.
- [x] Confirmar por test unitario que `perfil listo` solo aparece con criterios suficientes.
- [x] Confirmar por test unitario que las recomendaciones usan criterios normalizados del perfil.
- [ ] Revisar logs para asegurar que no exponen datos sensibles.

### Criterio De Salida

El paciente puede completar el perfil conversacional de forma natural y recibir
recomendaciones sin que el modelo invente emociones, motivos o preferencias.

## Fase 6: Notificaciones MVP

### Objetivo

Agregar avisos minimos para que el flujo no dependa de revisar manualmente cada
vista.

### Tareas

- [x] Definir que el MVP usa notificaciones in-app persistentes.
- [x] Crear coleccion `notifications`.
- [x] Mostrar campana de notificaciones en la barra superior.
- [x] Avisar al psicologo cuando llega una nueva cita.
- [x] Avisar al paciente cuando la cita se confirma.
- [x] Avisar al paciente cuando se agrega link externo.
- [x] Avisar cuando una cita se marca como realizada.
- [x] Avisar cuando una cita se reprograma.
- [ ] Probar notificaciones con paciente real.
- [ ] Probar notificaciones con psicologo real.

### Criterio De Salida

Los usuarios reciben aviso dentro de la app para los cambios criticos del flujo.

## Fase 7: QA, Deploy Y Datos De Prueba

### Objetivo

Dejar el MVP listo para pruebas reales.

### Tareas

- [ ] Crear usuario paciente de prueba.
- [ ] Crear usuario psicologo de prueba.
- [ ] Crear usuario admin de prueba.
- [ ] Crear al menos 5 psicologos con perfiles completos.
- [ ] Probar flujo completo en desktop.
- [ ] Probar flujo completo en mobile.
- [x] Documentar journeys UX separados para paciente y psicologo.
- [ ] Probar modo oscuro.
- [ ] Probar modo claro.
- [ ] Ejecutar `npm run build`.
- [x] Ejecutar tests de Functions.
- [ ] Deploy de Functions si hubo cambios.
- [ ] Deploy de reglas Firestore si hubo cambios.
- [ ] Deploy de indices Firestore si hubo cambios.
- [ ] Push a `main` para publicar en Vercel.

### Criterio De Salida

El MVP puede probarse desde Vercel con datos reales de prueba y sin pasos
manuales no documentados.

## Orden Recomendado De Implementacion

1. Flujo paciente: recomendacion -> terapia -> cita.
2. Flujo psicologo: agenda -> link externo -> sesion realizada.
3. Solicitud y aprobacion de psicologos.
4. Reglas Firestore y permisos por rol.
5. IA y matching con pruebas conversacionales.
6. Notificaciones MVP.
7. QA final, datos de prueba y deploy.

## Checklist De Lanzamiento MVP

- [ ] Paciente puede completar encuesta.
- [ ] Paciente recibe recomendaciones.
- [ ] Paciente agenda cita sin pago.
- [ ] Terapia se crea automaticamente si corresponde.
- [ ] Psicologo ve la cita.
- [ ] Psicologo agrega link externo.
- [ ] Paciente ve link externo.
- [ ] Psicologo marca sesion como realizada.
- [ ] Historial refleja eventos principales.
- [ ] Progreso y herramientas funcionan sin errores de permisos.
- [ ] Admin puede habilitar psicologos.
- [ ] Reglas Firestore publicadas.
- [ ] Indices Firestore publicados.
- [ ] Functions publicadas si cambiaron.
- [ ] Build de frontend exitoso.
- [ ] Vercel publica `main`.

## Riesgos

- Las reglas de Firestore pueden bloquear flujos validos si no se prueban con
  roles reales.
- La agenda actual no modela disponibilidad completa; para MVP se acepta
  agendamiento simple.
- Las notificaciones pueden retrasar el MVP si se intenta resolver FCM completo
  antes de validar in-app.
- El matching depende de perfiles de psicologos bien cargados.
- La aprobacion de psicologos necesita una ruta admin simple para evitar
  intervencion manual.
