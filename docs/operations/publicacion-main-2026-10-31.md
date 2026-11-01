# Publicación completa a main — 01/11/2026

Preparación iniciada el 31/10; publicación del 01/11, America/Lima.

El titular autorizó publicar el workspace integrado en `main` y desplegar. Incluye las optimizaciones de frontend, backend e IA, la auditoría financiera, la documentación y el nuevo centro de operaciones del administrador.

## Alcance operativo

- Vencimiento automático de reservas según su política, liberación transaccional del horario y aviso al cliente para seleccionar otro.
- Centro de operaciones del administrador con devoluciones, saldos/recuperaciones, soporte, alertas, profesionales no disponibles y revisiones periódicas. Cada tarea conserva responsable, estado e historial.
- Cancelación administrativa acotada a reservas futuras abiertas, sin acceso adicional a intervenciones terapéuticas.
- Los cobros se mantienen mediante enlaces de Mercado Pago y conciliación administrativa. **No se publican `mercadoPagoWebhook`, `processPaymentNotification` ni `createPaymentCheckout`; no se crean secretos ni conexión a la API del proveedor.** El adaptador queda como código de referencia cubierto por pruebas sintéticas.
- El job de vencimientos de producción ejecuta únicamente operaciones internas de Firestore; la configuración del proveedor permanece desactivada.
- Las reservas antiguas con `submittedExpiration=preserve_for_review` conservan la revisión; no se cambian sus acuerdos.

## Integración y comprobaciones

Se integran las optimizaciones ya publicadas en la [entrega anterior](despliegue-optimizaciones-2026-10-31.md) y las nuevas funciones administrativas. Se valida el conjunto del workspace; los resultados anteriores no se atribuyen al candidato nuevo.

Quedan fuera de Git builds, cachés y sesiones del navegador, logs y evidencia local de `output/`. La calculadora y los supuestos de la auditoría financiera se conservan en `docs/finance/simulaciones/`. Los secretos y la clave sintética del emulador no forman parte de la publicación.

Validación local: 50 unitarias frontend, 168 backend, lint, build, Knip normal/producción y auditorías al umbral moderate aprobados. La pasada general aprobó 119 casos integrados; después del ajuste de contención se aprobaron los 18 casos de automatización/administración y los 8 de pagos anteriores. Agenda aprobó 29 casos inicialmente y los 3 que agotaron la espera pasaron al repetirlos; los otros 106 casos de navegador pasaron completos, sin fallos, en escritorio y móvil.

El ajuste de tareas usa una instantánea consistente de solo lectura y una actualización transaccional separada, ordenada por la fecha de lectura. Evita bloquear documentos de identidad, pagos o citas y evita que un evento retrasado reabra un caso ya resuelto por una fuente posterior. Un caso integrado adicional comprueba ese orden.

Los 21 índices se verificaron en READY antes de publicar el backend. Se conservan las 57 Functions anteriores y se incorporan 17 nuevas; la tarea programada se publica después de los triggers para no perder cambios durante la incorporación de casos previos.

SHA de `main`, versiones de backend/Hosting y comprobación posterior se registran al cerrar la publicación. Vercel y Quality se ejecutan automáticamente con el push; sus resultados remotos se consultan para el commit final. Artefactos locales: `output/publicacion-main-2026-10-31/`.

No se ejecutan cobros, devoluciones o transferencias reales, restauraciones, borrados ni una caída real del proveedor. La validación pública no acredita dispositivos físicos ni aceptación clínica o comercial.
