# Lurems (PsicoFound)

Vue 3 + Vuetify + Pinia en `src/`; backend Firebase en `functions/`.
La encuesta híbrida estructura preferencias con opciones guiadas y OpenAI
`gpt-6-luna`; el matching determinístico vive solo en Functions. Firestore conserva
perfiles, sesiones y catálogo de tarifas. Gemini es un adaptador heredado, no el
proveedor habilitado para este recorrido.

## Estado de salida a producción

Revisión **31/10/2026, America/Lima**: la app tiene una publicación técnica; la
apertura con cobros conserva pendientes. Quality de `4896783` falló por dependencias
de Functions y no ejecutó la regresión integrada. Hosting y Vercel sirven entradas
distintas. Ver [plan de salida](docs/salida-a-produccion.md) y
[evidencia de la revisión](docs/operations/revision-produccion-2026-10-31.md).
Los trabajos paralelos de optimización necesitan aceptación del candidato final.

## Desarrollo

Requisitos: Node.js 22.20 o posterior compatible con Node 22 y npm.
Firebase CLI 15.15.0; Java 21 para las pruebas con emulador.

```sh
npm ci
npm --prefix functions ci
npm install --global firebase-tools@15.15.0
```

Configura `.env` segun `.env.example` con el proyecto Firebase de desarrollo.
Las claves `VITE_` son publicas: no incluir secretos de proveedores.
Para Functions, ver `functions/.env.example`. El proveedor activo utiliza
`OPENAI_API_KEY` en Secret Manager y las políticas de uso descritas en
[revisión del proveedor](docs/operations/pilot-provider-review.md). No copiar claves
de proveedor a variables `VITE_*` ni activar inferencias desde los emuladores.

```sh
npm run dev
```

Servidor limitado a `http://127.0.0.1:5173` por defecto. Para probar desde otro
dispositivo de confianza: `npm run dev -- --host 0.0.0.0`. No exponerlo a Internet.
El frontend de desarrollo conecta al proyecto indicado en `.env`; no crea un
entorno aislado automaticamente. Las pruebas unitarias no acceden a produccion.

## Validacion

Comprobaciones habituales:

```sh
npm test
npm run test:backend
npm run lint:backend
npm run audit:unused
npm run audit:unused -- --production --include files,dependencies,unlisted,unresolved,binaries
npm run build
```

`npm run test:pilot` ejecuta integración y navegador del piloto, incluidos
administrador y regresión Lima, con emuladores propios y red externa bloqueada.
Todos los runners actuales de integración usan `demo-lurems-followup`, incluido
`test:payment-rules`. Descargar dependencias, emuladores y Chromium antes de aislar.
Requisitos, comandos dirigidos, escenarios y artefactos: [guía de validación](docs/operations/validation.md).
La revisión del 31/10 registra una nueva pasada local parcial, las auditorías y el
estado remoto de Quality; no acredita una suite integrada completa del candidato.

## Publicacion

Sitio principal Firebase: [app.lurems.lat](https://app.lurems.lat).
Vercel: [psico-found-frontend.vercel.app](https://psico-found-frontend.vercel.app),
con despliegue automático al hacer push a `main`. Coordinar primero el backend
compatible para que el frontend de Vercel encuentre las APIs nuevas.

Seguir el [procedimiento coordinado de release](docs/operations/pilot-release.md).
Frontend, reglas, índices y Functions deben tener versiones identificadas y
compatibles. El backend se publica antes de un frontend que requiera APIs nuevas.
Vercel y Hosting comparten Firebase: Vercel no es un staging aislado. Seleccionar
proyecto y sitio explícitamente; no modificar el entorno de producción para hacerlo
pasar por staging.
La preparación local y el validador offline no autorizan despliegue ni lanzamiento.

## Documentacion

La documentación activa describe contratos y procedimientos. La matriz concentra
el estado de aceptación y pendientes; los informes fechados permanecen como antecedentes.
Estado consolidado actualizado: **2026-10-31**, America/Lima.

| Área | Referencia |
| --- | --- |
| Apertura con cobros | [Plan y pendientes vigentes](docs/salida-a-produccion.md) |
| Evidencia más reciente | [Revisión de producción del 31/10](docs/operations/revision-produccion-2026-10-31.md) |
| Funcionalidad | [Funcionamiento por rol](docs/functional/revision-funcional-por-rol.md) |
| Aceptación y pendientes | [Matriz del piloto](docs/functional/matriz-cierre-piloto.md) |
| Encuesta y recomendaciones | [Contrato de encuesta y matching](docs/functional/encuesta-matching.md) |
| Agenda | [Política horaria de Lima](docs/functional/politica-horaria-mvp.md) |
| Preparación y guía de uso | [Onboarding guiado](docs/functional/onboarding-guiado.md) |
| Arquitectura | [Proveedores IA](docs/architecture/ai-provider-abstraction.md) · [Registro y onboarding](docs/architecture/registration-onboarding.md) |
| Pagos y operación | [Automatización y centro del administrador](docs/operations/automatizacion-operativa-2026-10-31.md) · [Catálogo y compatibilidad anterior](docs/operations/pilot-payments.md) |
| Cuenta y privacidad | [Políticas, exportación y eliminación](docs/operations/pilot-privacy.md) |
| Revisión de IA y ayuda | [Proveedor](docs/operations/pilot-provider-review.md) · [Ayuda](docs/operations/pilot-help-review.md) |
| Operación | [Release compartido e incidentes](docs/operations/pilot-release.md) |
| Pruebas | [Guía de validación](docs/operations/validation.md) |
| Costos | [Auditoría y simulaciones](docs/finance/auditoria-costos-2026-10-30.md) |

Los documentos retirados y una copia del inventario funcional anterior están en
`docs/archive/`, organizados por su área original. Conservan contenido y resultados
fechados, con enlaces ajustados; no deben usarse como referencia vigente ni como
resultado de pruebas sobre cambios posteriores. Los artefactos de `test-results/`
son locales e ignorados por Git y pueden no existir en otro clon.

La publicación incorpora vencimiento automático y un centro de tareas para el
administrador, con cobros mediante enlaces y conciliación administrativa.
No se publica una conexión a la API ni webhook de Mercado Pago. La
[guía de operación](docs/operations/automatizacion-operativa-2026-10-31.md) distingue
el alcance publicado del prototipo de proveedor. Registrar devoluciones,
transferencias o recuperaciones externas no mueve dinero.
La aceptación del administrador, atención, suspensión y preparación profesional
conserva las evidencias de sus entregas. Existen ejecuciones Linux aprobadas de
candidatos anteriores; la última está fallida. No se reabren errores históricos
corregidos ni se atribuye su aceptación a cambios posteriores. Los pendientes
comerciales, humanos y de operación se concentran en el plan de salida.
