# Snapshot inicial de terapia

## Objetivo

`profiles/{uid}` representa el perfil vivo de búsqueda y recomendaciones. Puede
reiniciarse sin alterar ninguna terapia existente. Cada documento
`terapias/{terapiaId}` conserva una copia inmutable del perfil que existía al
iniciar ese proceso terapéutico.

## Modelo

La copia se guarda en `intakeSnapshot` con esta estructura:

```text
profileSessionId, motivoConsulta, temas, soloConversar, riesgoSuicida,
nivelMalestar, urgencia, modalidad, preferenciaGenero, preferenciaEdad,
enfoque, observaciones, capturedAt
```

La información propia y editable de la terapia se mantiene fuera del snapshot:

```text
motivoTerapia: string
detalleTerapia: string
objetivosIniciales: string[]
updatedAt: Timestamp
```

## Flujos de creación

- El agendamiento clásico llama a `createTherapyFromProfile`. La Cloud Function
  lee el perfil autenticado y crea la terapia de forma transaccional.
- El marketplace captura el perfil dentro de la transacción que confirma el
  pago y crea la proyección de terapia.
- Si ya existe una terapia activa, se reutiliza y su snapshot no se reemplaza.

## Autorización

- Los clientes no pueden crear terapias directamente.
- El paciente puede ejecutar las actualizaciones operativas existentes, pero no
  puede modificar `intakeSnapshot` ni los campos clínicos.
- El psicólogo asignado y el admin pueden editar los campos clínicos.
- `intakeSnapshot` es inmutable desde clientes para todos los roles.
- El Admin SDK puede completar una migración de documentos históricos si fuera
  necesario.

Las terapias históricas sin `intakeSnapshot` siguen siendo válidas y la interfaz
las identifica como documentos anteriores a esta separación.
