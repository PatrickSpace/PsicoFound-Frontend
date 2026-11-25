# Auditoría previa de pagos

## Arquitectura encontrada

- Frontend Vue 3.5, Vuetify 3.11, Pinia y Firebase Web SDK 12.
- Frontend en JavaScript con rutas cargadas dinámicamente.
- Backend CommonJS sobre Node 22 y Firebase Functions v2 en `southamerica-east1`.
- Firestore representa disponibilidad en `therapist_availability`, citas en `citas`, terapias en `terapias` y psicólogos en `therapists`.
- El flujo anterior reservaba un bloque desde el navegador mediante una transacción y creaba inmediatamente una cita `pendiente`.
- Los roles se resuelven desde `users.roles`, con compatibilidad para `users.rol`.

## Riesgos encontrados

| Hallazgo | Impacto | Corrección |
|---|---|---|
| El cliente podía cambiar un bloque de `available` a `booked` | Crítico: manipulación de reservas | Reserva y bloqueo trasladados a Cloud Functions |
| El precio no existía como fuente backend | Crítico: el frontend podría inventar importes | `therapists.sessionPriceAmount` se valida y escribe por callable |
| No existía cuenta de cobros del psicólogo | Crítico | OAuth/cuenta simulada y validación backend obligatoria |
| No había idempotencia financiera | Crítico | IDs y claves determinísticas para pago, eventos, ledger y reembolso |
| No había expiración de bloqueos | Alto | Hold de 10 minutos y barrido programado idempotente |
| Las reglas permitían actualización amplia de citas | Alto | Campos financieros inmutables para clientes |
| No había webhook ni consulta al proveedor | Crítico | Webhook firmado y consulta directa a Payments API |
| No había conciliación | Alto | Función programada cada 30 minutos |

## Compatibilidad

Las citas históricas siguen en `citas` y no requieren campos de pago. Una reserva pagada crea una proyección compatible en `citas` cuando el backend confirma el pago. No se ejecuta ninguna migración destructiva.

## Límites de la auditoría

- No existen credenciales sandbox; no se efectuaron cobros reales.
- El emulador Firestore requiere Java, ausente en la máquina durante esta ejecución.
- La comisión real de Mercado Pago debe validarse con la cuenta comercial antes de garantizar contractualmente un neto de 70%.
