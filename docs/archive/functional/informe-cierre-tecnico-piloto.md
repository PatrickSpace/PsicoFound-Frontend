> Documento histórico. Conserva el alcance, los resultados y los pendientes de su fecha; no describe por sí solo el estado vigente. Consultar la [documentación activa](../../../README.md#documentacion).

# Informe técnico del piloto de paciente y psicólogo

Revisión adicional del administrador (2026-10-14): [inventario, correcciones y aceptación](revision-administrador-piloto-2026-10-12.md). Las exclusiones administrativas y los resultados fechados siguientes son históricos; consultar esa revisión para el alcance nuevo.

Continuación 2026-10-11: [corrección de REV-PIL-01 y verificaciones nuevas](cierre-correcciones-piloto-2026-10-11.md).
Los resultados del 10 de octubre siguientes se conservan como evidencia histórica;
no se atribuyen automáticamente a cambios posteriores.

2026-10-10, America/Lima. Alcance: [plan de cierre sin administrador](plan-cierre-lanzamiento-sin-administrador.md).
La implementación y la aceptación local están verificadas; la ejecución real en Linux
y las comprobaciones de staging siguen pendientes.
No se autoriza el lanzamiento ni se certifica funcionalmente el rol administrador.
Estado por requisito: [matriz de ejecución](../../functional/matriz-cierre-piloto.md).

## Implementado y verificado

- **Cuenta y privacidad.** Elegibilidad explícita en servidor y UI, verificación de correo,
  consentimiento vigente con historial inmutable, tratamiento de cuentas antiguas,
  exportación propia con subcolecciones y sincronización del correo desde Auth.
  La eliminación exige política versionada, diagnóstico de inventario, autorización
  reciente de operador y mantenimiento; conserva cursor en fallos parciales y rechaza
  datos modificados. El bloqueo de acceso persiste para tokens anteriores. Solo se
  ensayó sobre datos sintéticos; no existe una política real aprobada por defecto.
- **Encuesta y ayuda.** Turnos ligados a sesión/campo/opciones, corrección, continuidad,
  recarga, reinicio explícito y carga de mensajes anteriores. Los reintentos usan el mismo
  ID y no vuelven a llamar al proveedor tras un resultado incierto. Reset/corrección
  descartan respuestas tardías. Ayuda accesible sin IA o cuota; casos técnicos de
  negación, terceros, pasado y ambigüedad documentados para revisión clínica.
- **Abuso y observabilidad.** Cuotas por usuario y concurrencia global transaccionales,
  leases recuperables, App Check por entorno y correlación sin cuerpo de solicitudes.
  El payload de IA se minimiza, el contenido no se registra y el proveedor real se
  bloquea en emuladores. Las aprobaciones de proveedor son configuración obligatoria.
- **Reservas y conciliación manual.** Política comercial y tarifa capturadas en snapshots,
  cotización visible, vencimiento/cancelación coherentes entre seis registros, protección
  frente a carreras con pago, referencia de proveedor única y reintentos idempotentes.
  Obligación calculada, saldo pendiente y transferencia registrada son conceptos separados.
  Registrar una transferencia no mueve dinero. No se añadieron pantallas administrativas.
- **Infraestructura.** Dependencias actualizadas sin `audit fix --force`, SDK Admin modular,
  CI con suites completas y aislamiento Linux preparado. Validador offline de configuración,
  ejemplos sin secretos y procedimientos de despliegue coordinado, rollback e incidentes.
  Ensayo de restauración sintética en un proyecto demo separado, conservando el origen.
- **Integración funcional.** Se corrigieron cargas tardías de onboarding, contexto de cuenta
  en listeners, apertura de notificaciones desde la misma ruta y políticas explícitas para
  reprogramar citas pasadas. Los botones de encuesta que ocultan texto en móvil conservan
  nombres accesibles. Se conserva la política Lima existente y REV-PAC-04B.

### Evidencia local

Los logs están en `test-results/pilot-closure/` (ignorados por Git). Las pruebas y
procedimientos son fuentes mantenibles del repositorio. Ninguna prueba usa producción,
proveedores reales, correo real, cobros o transferencias.

| Verificación | Resultado comprobado | Evidencia local |
| --- | --- | --- |
| `npm test` | 30/30 | `unit-final.log` |
| `npm run test:backend` | 81/81 | `backend-final.log` |
| `npm run lint:backend` | Pasa | `lint-final.log` |
| `npm run build` | Pasa; aviso de tamaño de chunk pendiente de optimización | `build-final.log` |
| Knip completo y producción | Pasan; hints de entradas redundantes documentados | `knip-5.log`, `knip-production-final.log` |
| `npm audit --json` en raíz y Functions | 0 vulnerabilidades reportadas en ambos lockfiles | `audit-root-final.json`, `audit-functions-final.json` |
| Integración completa con aislamiento | 47/47; cuentas se repitió tras la ampliación | `integration-final-1.log` |
| Cuentas, exportación profesional e inventario/retención de ledger | 9/9; 49 casos únicos de integración combinando ambas ejecuciones | `accounts-final-2.log` |
| Navegador Lima, 4 zonas × escritorio/móvil | 32/32 | `browser-final-2.log` |
| Navegador paciente/profesional, escritorio/móvil | 42/42; reinicio móvil con nombre accesible | `browser-final-3.log` |
| Validador de ejemplo sin decisiones aprobadas | Rechaza correctamente (exit 1) | `config-example.json` |

La integración de 47 casos comprende seguimiento 7, citas 6, restauración 1, reglas
pagos 6, políticas/conciliación 7, cuentas 7, encuesta 5, paciente 5 y agenda 3.
La repetición de cuentas confirma los 7 casos anteriores y añade exportación profesional
e inventario de recibos compartidos: 9 casos. Verifica que recibos y transferencias
propias se conserven según la política sintética, y que un recibo vinculado a pagos del
profesional se inventaríe como compartido y bloquee autorización sin política explícita.
Las pruebas de navegador incluyen errores reales de permisos en el emulador, persistencia,
roles, cambio de cuenta/vista con carga pendiente, seguimiento, soporte y pagos sintéticos.

Reproducir con Node 22, Java 21, dependencias instaladas en raíz y Functions, Firebase CLI
15.15.0 y Chromium/Firestore descargados antes de aislar:

```sh
npm test
npm run test:backend
npm run lint:backend
npm run build
npm run audit:unused
npm run audit:unused -- --production --include files,dependencies,unlisted,unresolved,binaries
npm audit --audit-level=moderate
npm --prefix functions audit --audit-level=moderate
npm run test:pilot
```

El runner exige siete puertos libres y crea sus propios emuladores demo. macOS usa
`sandbox-exec`; Linux crea namespace de red, conserva solo loopback y baja privilegios.
No hay alternativa sin aislamiento. Se intentó el sandbox de Chromium anidado en macOS,
pero el sistema lo rechazó antes de abrir páginas; se conserva la configuración previa
bajo `sandbox-exec`. En Linux se exige además el sandbox de Chromium. Diagnóstico:
`chromium-nested-sandbox.log`; ese intento fallido no se cuenta como aceptación.

## Pendientes técnicos

1. **Ejecutar el workflow en Ubuntu real.** Código y workflow preparados, pero macOS no
   permite comprobar namespaces, sudo/setpriv ni el sandbox de Chromium de Linux.
   No hay ejecución remota registrada ni se hizo push. Debe pasar la misma suite con
   aislamiento; cualquier fallo mantiene E-01 abierto. No desactivar controles para aprobarlo.
2. El build conserva un aviso de chunk grande. No impide compilar; optimización de carga
   pendiente, sin declarar medida de rendimiento real en dispositivos.

La aceptación de este plan no marca automáticamente todas las fases históricas de
`survey-implementation-plan.md`: se conserva el contrato actual de campos/turnos.
Cambiar qué preferencias son opcionales exige concretar su comportamiento y cobertura;
no se introduce ese cambio como una aprobación implícita.

## Decisiones y aprobaciones externas

Ninguna configuración sintética constituye aprobación. Faltan responsables y evidencia de:

- Elegibilidad y alcance del piloto: 18+ es una propuesta pendiente; sin política el flujo se bloquea.
- Textos/URLs/versiones legales, reaceptación y política de retención por categoría,
  incluidos expedientes compartidos, registros financieros y autoridad de eliminación.
- Proveedor/plan pagado, facturación del proyecto, condiciones de datos y uso permitido;
  [fuentes oficiales consultadas](../../operations/pilot-provider-review.md).
- Revisión clínica de mensajes, casos y recursos de ayuda; [matriz técnica](../../operations/pilot-help-review.md).
  No se diagnostica ni se promete vigilancia o respuesta inmediata.
- Tiempos de reserva, corte y tratamiento de citas pasadas, cancelación/reprogramación,
  devoluciones, ausencia y liquidación profesional; [contrato comercial](../../operations/pilot-payments.md).
- Cuotas, umbrales de alertas, presupuesto, canales, guardia y comunicación de incidentes.

## Verificaciones pendientes en staging

La tabla de [operación y aceptación de staging](../../operations/pilot-release.md) define
entorno/acceso, procedimiento, resultado esperado y responsable por asignar para Auth,
Google, dominios, App Check, Functions/IAM/secretos, reglas/índices, proveedor/facturación,
alertas y backup/restauración. Ninguna de esas comprobaciones de consola se ejecutó aquí.

El validador offline comprueba estructura y hashes; no acredita que una referencia de
aprobación exista ni que un recurso esté desplegado. La restauración en emulador no
valida Auth/Storage, cifrado, IAM, TTL ni recuperación productiva. Chromium con viewport
móvil no acredita Safari ni teléfonos físicos. La entrega de correo, Google y cualquier
prueba real de proveedor requieren entorno y cuentas autorizados.

## Dependencias para la futura revisión del administrador

No se revisaron pantallas administrativas existentes. Los fixtures administrativos solo
preparan pruebas de paciente/profesional y autorización negativa. La fase posterior debe
cubrir las colas y decisiones de conciliación, recibos duplicados/tardíos, vencimientos,
devoluciones, obligaciones/transferencias, solicitudes de cuenta y operaciones parciales.

Contratos entregados: [pagos](../../operations/pilot-payments.md),
[privacidad](../../operations/pilot-privacy.md) y [operación](../../operations/pilot-release.md).
No usar cambios de estado como evidencia de dinero transferido, ni una solicitud de
eliminación como evidencia de borrado completado. Las reservas antiguas sin snapshot
requieren una decisión y migración autorizada antes de operar bajo la nueva política.
