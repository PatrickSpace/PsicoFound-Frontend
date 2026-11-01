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

## Registro del despliegue

- Código de producto: `82f57a190d3e1d50afa29af435dc80f11bb5c644`. El commit documental posterior conserva los mismos 259 archivos de producto comprobados por SHA-256.
- Firebase `psicosaas-3c819`: **74 Functions ACTIVE**, incluidas las 57 anteriores y 17 nuevas, todas en `southamerica-east1`. Reglas publicadas y **21 índices READY**.
- Los nueve triggers se crearon después de la propagación del rol de servicio de Eventarc. Se verificó que el rol ya estaba asignado y se repitió únicamente su despliegue; no se retiraron funciones.
- Scheduler `firebase-schedule-maintainPaymentReservations-southamerica-east1`: **ENABLED**, cada minuto, `America/Lima`. Primera ejecución comprobada: `2026-11-01T17:07:03.812Z`; incorporación de casos previos completa, ocho tareas administrativas y cero reservas vencidas en esa pasada. No se ejecutó un pago real para producir evidencia.
- Proveedor de pagos: desactivado; cero endpoints de checkout/webhook/procesador y cero secretos de Mercado Pago vinculados.
- Hosting actual: `sites/luremsapp/versions/1fa6c4644e3bcf3c`, publicado `2026-11-01T17:06:43.106Z` (12:06, Lima). Versión previa recuperable: `sites/luremsapp/versions/57a546064e82d54a`. Recuperar HTML no revierte documentos ni operaciones de negocio.
- `https://app.lurems.lat`: HTML y assets iniciales, centro de operaciones y fuentes coinciden por SHA-256 con el build local. Rutas públicas/SPA responden 200, assets ausentes responden 404, HTML revalida y assets versionados tienen caché inmutable.
- Cuatro callables administrativos/de reserva sin sesión devolvieron **401 UNAUTHENTICATED**, según lo esperado. Esto comprueba la denegación pública, no un recorrido autenticado.
- Chromium público: inicio y login renderizan; a 390 px no hay desbordamiento horizontal ni errores de consola. `/admin/operaciones` sin sesión redirige a login conservando el destino. Captura local: `output/playwright/release-login-2026-11-01.png`.

Vercel y Quality se ejecutan automáticamente con el push de `main`. Sus resultados se identifican por el SHA final en [Quality de main](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/workflows/quality.yml?query=branch%3Amain) y en los estados del commit de GitHub. No se atribuye un resultado anterior a este commit. Artefactos locales: `output/publicacion-main-2026-10-31/`.

No se ejecutan cobros, devoluciones o transferencias reales, restauraciones, borrados ni una caída real del proveedor. La validación pública no acredita dispositivos físicos ni aceptación clínica o comercial.
