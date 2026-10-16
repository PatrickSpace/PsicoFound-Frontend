> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Encuesta conversacional: plan y continuidad

Fecha: 2026-10-04. Estado: implementacion local en curso. No publicar ni hacer
commit/push sin una nueva indicacion del usuario.

Seguimiento 2026-10-10: el [cierre técnico del piloto](informe-cierre-tecnico-piloto.md)
añade cobertura de turnos, corrección, concurrencia, sesión, reset e historial paginado.
La [matriz B/C](../../functional/matriz-cierre-piloto.md) registra sus pruebas y límites. Los checks
históricos siguientes no se dan por cerrados en bloque: la fase 6 y sus criterios de
preferencias opcionales conservan su alcance propio; no se cambió silenciosamente
el contrato de recomendación para completar este cierre.

## Objetivo

Sincronizar pregunta, opciones y perfil; conservar avance; permitir correcciones
y reintentos seguros. Mantener Gemini y matching deterministico desacoplados.
No cambiar pagos, seguimiento terapeutico ni datos de produccion.

## Estado por fase

- [x] 1. Revision de codigo y cambios locales; definir escenarios de regresion.
- [ ] 2. Contrato de turno controlado por servidor y prompt/schema coherentes.
- [ ] 3. Respuestas contextuales, confirmaciones y validacion de perfil.
- [ ] 4. Sesion persistente, idempotencia, concurrencia e historial limitado.
- [ ] 5. UI: opciones activas, resumen editable, reintento, cierre y accesibilidad.
- [ ] 6. Modalidad como requisito; restantes criterios como preferencias.
- [ ] 7. Tests, emulador, build/lint y comprobacion visual desktop/mobile.

## Decisiones

- conversation.activeTurn contiene id, sessionId, field, kind, status y opciones.
- El backend compone la pregunta final desde un catalogo; Gemini devuelve datos,
  una breve introduccion sin pregunta y, cuando sea necesario, una confirmacion.
  No se confia en texto libre para habilitar recomendaciones.
- Respuestas de chips incluyen turno/campo. Opciones anteriores no se reutilizan.
- "No se" mantiene el campo pendiente y ofrece explicacion; "me da igual" se
  aplica unicamente al campo activo. Respuestas compuestas pasan por extraccion.
- Confirmacion de solo conversar admite si/no segun el turno anterior.
- Sesiones duran hasta reinicio explicito; contexto IA y paginas del historial
  tienen limites independientes. No se elimina historial antiguo.
- Idempotencia por requestId, bloqueo temporal en conversacion y verificacion
  de sesion/turno antes del commit; IA fuera de transacciones Firestore.
- Perfil, par de mensajes y turno se confirman atomicamente. Reinicio invalida
  solicitudes pendientes y no permite que respuestas antiguas restauren datos.
- El resumen permite corregir un campo sin borrar los otros; riesgo no es un
  campo editable por chips. Se preserva el flujo de ayuda existente.
- Modalidad explicita es requisito; hibrido ofrece online/presencial. Ciudad,
  presupuesto, pagos y revision clinica integral quedan fuera de esta entrega.

## Archivos previstos

Backend: functions/src/chat/{profileChatHandlers,session,history,surveyTurn}.js,
functions/src/profiles/profile.js, functions/src/ai/{profilePrompt,responseSchemas}.js,
functions/src/config.js, functions/src/matching/therapistMatching.js y pruebas.
Frontend: src/services/conversationService.js,
src/components/encuesta/ConversationalSurvey.vue, helpers de estado de encuesta.
Configuracion: firestore.indexes.json; no ampliar permisos de Firestore.
Tests: unitarios y nueva suite de encuesta en emulador con datos sinteticos.

## Casos obligatorios

1. Saludo no inventa motivo; primer mensaje con motivo no repite pregunta.
2. Pregunta y opciones siempre del mismo campo; rechazar chips obsoletos.
3. Si/no contextual para solo conversar; no se distinto de indiferente.
4. Mensaje compuesto extrae varios campos; correccion conserva los demas.
5. Pausa superior a cinco minutos conserva sesion y perfil.
6. Reintento no duplica; dos envios concurrentes no pisan el perfil.
7. Reinicio durante IA descarta resultado tardio.
8. Perfil listo muestra CTA y resumen, tambien en mobile.
9. Recarga rehidrata turno; error conserva borrador y permite reintentar.
10. Modalidad requerida no se relaja aunque coincidan otros criterios.
11. Perfil antiguo se recupera sin perder datos; cliente antiguo compatible.
12. Ayuda por riesgo mantiene prioridad sobre preferencias/correcciones.

## Trabajo ajeno presente al inicio

Hay modificaciones previas en rules, functions/index.js, package.json/lock,
README, knip, navegacion, citas y seguimiento, con nuevas carpetas therapy,
appointments y tests de followup. No revertir ni atribuirlos a esta tarea.
El estado inicial se inspecciono con git status. No se tocaran salvo integracion
puntual que resulte imprescindible y documentada.

## Registro de ejecucion

- Fase 1: confirmados primer-campo-vacio, caducidad 5 min, historial global,
  opciones antiguas clicables y matching por puntos sin requisito de modalidad.
- Pendiente al retomar: implementar dominio de turnos y pruebas, luego handler
  transaccional y UI. Guardar aqui resultados concretos al completar cada fase.
