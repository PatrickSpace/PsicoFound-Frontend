# Lurems (PsicoFound)

Vue 3 + Vuetify + Pinia en `src/`; backend Firebase en `functions/`.
La encuesta estructura el perfil con Gemini; el matching deterministico vive
solo en Functions. Firestore conserva perfiles, sesiones y catalogo de tarifas.

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
Para Functions, ver `functions/.env.example`. En produccion Gemini usa Secret
Manager (`firebase functions:secrets:set GEMINI_API_KEY`).

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
No hay una ejecución nueva de pruebas de aplicación asociada a esta consolidación documental.

## Publicacion

Sitio principal Firebase: [app.lurems.lat](https://app.lurems.lat).
Vercel: [psico-found-frontend.vercel.app](https://psico-found-frontend.vercel.app),
con despliegue automático al hacer push a `main`. Coordinar primero el backend
compatible para que el frontend de Vercel encuentre las APIs nuevas.

Seguir el [procedimiento coordinado de release](docs/operations/pilot-release.md).
Frontend, reglas, índices y Functions deben corresponder al mismo artefacto validado;
el sitio de Hosting y proyecto de staging deben seleccionarse explícitamente.
La preparación local y el validador offline no autorizan despliegue ni lanzamiento.

## Documentacion

La documentación activa describe contratos y procedimientos. La matriz concentra
el estado de aceptación y pendientes; los informes fechados permanecen como antecedentes.
Consolidación documental: 2026-10-15, America/Lima.

| Área | Referencia |
| --- | --- |
| Funcionalidad | [Funcionamiento por rol](docs/functional/revision-funcional-por-rol.md) |
| Aceptación y pendientes | [Matriz del piloto](docs/functional/matriz-cierre-piloto.md) |
| Encuesta y recomendaciones | [Contrato de encuesta y matching](docs/functional/encuesta-matching.md) |
| Agenda | [Política horaria de Lima](docs/functional/politica-horaria-mvp.md) |
| Arquitectura | [Proveedores IA](docs/architecture/ai-provider-abstraction.md) · [Registro y onboarding](docs/architecture/registration-onboarding.md) |
| Pagos | [Catálogo, reservas y conciliación manual](docs/operations/pilot-payments.md) |
| Cuenta y privacidad | [Políticas, exportación y eliminación](docs/operations/pilot-privacy.md) |
| Revisión de IA y ayuda | [Proveedor](docs/operations/pilot-provider-review.md) · [Ayuda](docs/operations/pilot-help-review.md) |
| Operación | [Release, staging e incidentes](docs/operations/pilot-release.md) |
| Pruebas | [Guía de validación](docs/operations/validation.md) |

Hay 13 documentos activos contando este README. Los 18 documentos retirados de
sus ubicaciones originales y una copia del inventario funcional anterior están en
`docs/archive/`, organizados por su área original. Conservan contenido y resultados
fechados, con enlaces ajustados; no deben usarse como referencia vigente ni como
resultado de pruebas sobre cambios posteriores. Los artefactos de `test-results/`
son locales e ignorados por Git y pueden no existir en otro clon.

El piloto incorpora reservas y conciliación manual mediante políticas versionadas;
requiere configuración comercial aprobada. Registrar pagos, devoluciones o
transferencias no mueve dinero. No existe pasarela automática ni scheduler de vencimiento.
La aceptación local del administrador y de las fechas/correcciones de atención está
verificada en la entrega del 15 de octubre. Linux, staging y las
aprobaciones externas siguen abiertos según la matriz.
