# Analisis UX De Journeys MVP

## Objetivo

Separar la experiencia del MVP por rol para que paciente y psicologo tengan
acciones claras, sin mezclar lenguaje operativo ni responsabilidades.

## Journey Paciente

Flujo esperado:

```text
Inicio
  -> encuesta conversacional
  -> recomendaciones
  -> agenda cita
  -> espera confirmacion/link externo
  -> asiste a sesion
  -> revisa progreso, historial y herramientas
```

Principios UX:

- El paciente debe ver lenguaje de acompanamiento, no de administracion interna.
- El paciente agenda y reprograma, pero no gestiona el enlace externo.
- Las pantallas deben responder a "que hago ahora" y "que sigue".
- Los estados vacios deben empujar al siguiente paso de valor.

Cambios aplicados:

- En el dialogo de cita se ocultan los campos de herramienta y URL para paciente.
- En modalidad remota, el paciente ve un aviso claro de que el psicologo agregara
  el enlace externo.
- En `Mis sesiones`, "Administra tu terapia" pasa a "Ver tu proceso".
- En `Dashboard`, se corrige copy y el CTA de progreso.

## Journey Psicologo

Flujo esperado:

```text
Agenda
  -> revisa citas asignadas
  -> confirma o reprograma
  -> agrega enlace externo
  -> marca sesion como realizada
  -> da seguimiento con objetivos y herramientas
```

Principios UX:

- El psicologo necesita accion rapida, pero con claridad semantica.
- Las tablas pueden ser compactas, siempre que los iconos expliquen su accion.
- El enlace externo es una responsabilidad profesional antes de la sesion remota.
- Las acciones de cierre deben dejar rastro en historial y progreso.

Cambios aplicados:

- En la agenda del psicologo se agregan tooltips a las acciones compactas.
- El dialogo de cita mantiene la edicion de herramienta y URL solo para
  psicologo/admin.

## Pendientes UX Para MVP

- Probar ambos journeys con usuarios reales en mobile.
- Revisar estados vacios de progreso, historial y herramientas para paciente sin
  terapia activa.
- Revisar la tabla de pacientes en mobile; podria requerir tarjetas responsive.
- Validar que el cambio de vista paciente/psicologo sea evidente cuando un usuario
  tenga ambos accesos.
