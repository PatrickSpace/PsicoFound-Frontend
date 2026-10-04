# Auditoria de codigo sin uso y deuda tecnica

Inicio: 2026-09-30. Cierre: 2026-10-01. Base: `8b4ba25` (main). Alcance: frontend Vue,
Functions, dependencias, configuracion y pruebas. No se inspeccionan ni eliminan
datos de usuarios, colecciones ni recursos desplegados por falta de referencias.

## Metodo y evidencia inicial

- Inventario de archivos versionados, rutas, imports, consumidores de stores,
  callables y eventos globales con `rg`, lectura de codigo y Knip.
- Knip configurado como dos proyectos (raiz y `functions`). Una ejecucion sin
  configurar produjo falsos positivos sobre Functions; no se usa para borrar.
- Entradas reales: `src/main.js`, router, `functions/index.js` y suites de test.
- Sin registros dinamicos de componentes ni `import.meta.glob` en el frontend.
- Build inicial: JS unico 1,511.84 kB (423.71 kB gzip), CSS 917.43 kB.
- Pruebas iniciales: 30 backend y 5 reglas/integracion. Sin suite unitaria
  frontend ni control de codigo huerfano en CI.
- `npm audit` inicial: raiz 12 avisos (3 criticos, 6 altos, 3 moderados);
  Functions 25 (1 critico, 8 altos, 13 moderados, 3 bajos). Son avisos del
  arbol de dependencias, no evidencia de explotacion en la app.

## Hallazgos y plan ejecutable

| ID | Prioridad | Evidencia | Accion / verificacion |
| --- | --- | --- | --- |
| D01 | P2 | 11 archivos huerfanos en Knip, sin rutas/imports | Retirar encuesta por pasos, buscador demo, carrusel, formulario de terapia abandonado, iconos de plantilla, store global duplicado y servicio auth vacio. Build y Knip. |
| D02 | P2 | `main.js` registra `$axios`, sin consumidor alguno; solo Firebase realiza peticiones | Quitar plugin Axios y dependencia; conservar evento `api-error`, que si usan tablas y formularios. |
| D03 | P1 | `terapiaStore` contiene otro matching y diez profesionales ficticios. Chat y resultados solo escriben ese store, nadie lee sus valores | Eliminar store y adaptadores de criterios frontend; mantener callable y estado local de resultados. Tests de readiness, reinicio y matching servidor. |
| D04 | P2 | APIs sin consumidores y reexports de tokens que todos importan directamente | Retirar funciones realmente muertas; dejar privadas las usadas dentro de su modulo. No borrar implementaciones por un aviso de export sin uso. |
| D05 | P1 | Rango 18-25 ofrecido por chat, no interpretado por matching servidor | Anadir interpretacion y tests de limites; conservar pesos y orden actuales. |
| D06 | P2 | AIService construye fallback antes de usar principal | Resolver respaldo solo tras error recuperable; no repetir mismo proveedor/modelo. Tests de exito, error no recuperable y respaldo. |
| D07 | P2 | Todas las vistas importadas estaticamente | Imports dinamicos del router sin cambiar rutas, permisos ni guards. Build y navegacion desktop/movil. |
| D08 | P1 | Lockfiles con avisos conocidos; `firebase-functions-test` instalado pero no importado | Quitar dependencia muerta y aplicar `npm audit fix` compatible, nunca `--force`. Documentar avisos restantes por separado. |
| D09 | P2 | `.env.example` describe Culqi, webhooks, semillas y App Check inexistentes | Dejar solo configuracion leida por esta version; documentar pagos fase 1 y Gemini. No tocar `.env` reales. |
| D10 | P2 | README de plantilla; faltan tests frontend y guardas de mantenimiento | README operativo, unit tests Node sin nuevo framework de tests, Knip y CI para tests/lint/build/reglas. |
| D11 | P1 | Reinicio escribia conversacion y perfil por separado | Un batch Firestore conserva la consistencia de sesion; pruebas unitarias y de emulador. |

Orden: D01-D04, D05-D07/D11, D08-D09, D10 y validacion completa.

## Informes por bloque

### Bloque 1: limpieza, aplicado y validado

- Eliminados los 11 huerfanos del analizador, `src/plugins/axios.js`,
  `src/store/terapiaStore.js` y `src/assets/logo.svg` (14 archivos).
- Modificados `main.js`, `App.vue`, `matchingService.js`, chat y resultados para
  retirar escrituras al store sin lectores. `api-error` sigue funcionando.
- Retiradas APIs sin consumidor de `userService`, `psicologoService`, onboarding,
  Firestore, tokens y el composable de tema. Helpers internos quedan privados.
- Conservado el matching de servidor; readiness se prueba de forma aislada en
  `utils/recommendationProfile.js`. No se alteraron pantallas activas ni datos.
- Evidencia: Knip sin incidencias y compilacion de las 24 vistas actuales.

### Bloque 2: consistencia funcional, aplicado y validado en unidad

- `therapistMatching.js` / `criteria.js`: rango 18-25 con limites inclusivos.
- `AIService.js`: fallback diferido, sin repetir proveedor/modelo efectivo.
- `profileChatHandlers.js`: reinicio de conversacion/perfil en un solo batch.
- Tests nuevos en backend (matching, IA, reset) y frontend (readiness, dinero,
  roles, timeout). 42 backend y 12 frontend pasan; lint backend correcto.
- Prueba persistente del reinicio aprobada en el emulador junto a permisos,
  concurrencia y conservacion de las citas previas.

### Bloque 3: dependencias/configuracion, cerrado con deuda residual

- Eliminados Axios y `firebase-functions-test`, lockfiles actualizados.
- Aplicadas actualizaciones dentro de los rangos declarados, sin `--force`.
- Versiones instaladas: Firebase cliente 12.19.0, plugin Vue 5.2.4, Vite 5.4.21;
  Firebase Admin 13.10.0 y Functions 7.2.5. Node usado: 22.20.0.
- `npm ci` en raiz y Functions reproduce ambos lockfiles correctamente.
- Auditoria final: raiz 6 avisos (5 altos, 1 moderado), Functions 9 moderados.
  Cero criticos en ambos; esto no equivale a ausencia de vulnerabilidades.
- `.env.example` y `functions/.env.example` ahora describen solo esta version.
- `npm run dev` escucha solo en loopback, ampliable explicitamente para LAN.

### Bloque 4: prevencion/validacion, cerrado

- Router con cargas por demanda conservando paths, nombres y guards.
- Knip como dependencia de desarrollo fijada; scripts de tests y CI agregados.
- README reemplaza instrucciones de plantilla por instalacion y comprobaciones.
- Emulador: 6/6 pruebas, incluyendo reinicio que elimina datos anteriores del
  perfil activo y conserva el mismo nuevo ID en perfil/conversacion.
- Compilacion: 24 vistas con carga por demanda; mediciones finales abajo.
- Navegacion verificada en la compilacion de produccion local: inicio, login y
  registro a 1440x900 y 390x844. Sin errores de consola ni overflow horizontal.
- Rutas `/iniciarencuesta`, `/encuesta`, `/elegirterapeuta` y `/admin/cobros`
  redirigen al login al entrar sin sesion. No se prueban cuentas reales.
- Workflow YAML validado localmente. Su ejecucion alojada en GitHub queda para
  el proximo push/PR; no se afirma que Actions ya haya corrido.

## Decisiones de conservacion

- OpenAI/Claude estan registrados en `AIProviderFactory` y documentados como
  configurables. No son archivos huerfanos; esta limpieza no cambia el proveedor
  Gemini ni hace peticiones a otro proveedor.
- `types.js` tiene normalizadores usados en runtime; `types.d.ts` documenta
  el contrato. No se retiran como si fueran restos de compilacion.
- `api-error` tiene multiples emisores Firebase/UI, aunque su comentario
  mencionaba Axios. Se conserva el snackbar global.
- Activos publicos pueden tener enlaces externos. Se conserva el material
  de marca y favicon publico; solo se retira el SVG de plantilla en `src`.
- CSS Vuetify depende de clases generadas en runtime: no se aplica purgado
  automatico ni se cambia el aspecto visual durante esta auditoria.
- No se eliminan Functions desplegadas ni se migran datos clinicos.

## Deuda residual que necesita trabajo especifico

1. Estilos globales: 1,749 lineas y 254 `!important`, con selectores internos
   Vuetify. Requiere matriz visual de campos/modal/estados antes de reducirlos.
2. `ConversationalSurvey.vue` (1,192 lineas) y `CitaDialog.vue` (1,208) mezclan
   presentacion, persistencia y validacion. Extraer por responsabilidad en una
   siguiente iteracion con pruebas de componentes; no reescribirlos en bloque.
3. Importacion global de componentes/directivas Vuetify y fuente MDI completa:
   carga residual importante incluso tras separar rutas. Evaluar autoimports y
   subconjunto de iconos con comparacion visual de todas las vistas.
4. Pagos: catalogo/seleccion listos, pero reservas y confirmacion/conciliacion
   siguen pendientes por diseno de fase 1. Nunca considerar un link abierto como
   pago aprobado; congelar importe/link/reparto en la futura transaccion.
5. La automatizacion local no sustituye una prueba autenticada de todos los
   roles en staging. No se crean usuarios ni pagos reales para esta auditoria.
6. Dependencias: los avisos restantes requieren trabajo especifico. No aplicar
   actualizaciones mayores ni overrides ciegos como parte de una limpieza.

### Dependencias pendientes y prioridad

| Prioridad | Cadena | Riesgo reportado y siguiente accion |
| --- | --- | --- |
| P1 | Firebase cliente / Firestore / `@grpc/grpc-js` 1.9.16 | Avisos de certificados/contexto de autenticacion y filtracion de errores del servidor. Verificar la cadena Node utilizada por el SDK; no asumir que el aviso implica exposicion en el bundle web. Actualizar cuando Firebase publique una dependencia corregida o evaluar un override con pruebas. `npm audit` propone degradar a Firebase 9.14.0: no se aplica. |
| P1 | Vite 5.4.21 / esbuild | Avisos del servidor de desarrollo (traversal y variantes Windows) y esbuild. Planificar migracion del bundler y plugin Vue juntos con pruebas de build, HMR y despliegue. Escuchar en loopback reduce exposicion de red, pero no elimina todas las variantes ni reemplaza el parche. Hosting sirve archivos estaticos, no Vite dev. |
| P2 | Firebase Admin / Google Cloud / `uuid` 9.0.1 | Validacion de limites de buffer en UUID. La solucion sugerida exige Firebase Admin 14.5.0; revisar cambios mayores y repetir pruebas de Functions/emulador antes de migrar. |
| P2 | Functions / Express 4.22.1 / `qs` 6.14.2 | Avisos de denegacion de servicio. Express limita esa dependencia a `~6.14.0`; body-parser ya usa `qs` 6.16.0. Actualizar la cadena Express/Functions o validar un override de forma separada. |

Los conteos incluyen paquetes afectados indirectamente: no son quince fallos
independientes ni evidencia de explotacion en Lurems. No se audito aqui la
configuracion de IAM/red de produccion. ESLint 8 y dependencias de herramientas
tambien emiten avisos de fin de soporte, a migrar con su configuracion.

Fuentes de los avisos devueltos por `npm audit`:
- [gRPC: contexto de autenticacion](https://github.com/advisories/GHSA-m9gg-hp2v-232j)
- [gRPC: mensajes de error](https://github.com/advisories/GHSA-f596-whhp-79r4)
- [Vite: optimized deps](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
- [Vite: rutas Windows](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)
- [launch-editor: UNC](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)
- [esbuild: servidor de desarrollo](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- [UUID: limites de buffer](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- [qs: stringify](https://github.com/advisories/GHSA-q8mj-m7cp-5q26)
- [qs: limite de arrays](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx)
- [qs: isBuffer](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g)

## Resultados

### Verificacion final

| Comprobacion | Resultado |
| --- | --- |
| `npm ci` / `npm --prefix functions ci` | Correctos; instalaciones reproducibles |
| `npm test` | 12/12 pruebas frontend |
| `npm run test:backend` | 42/42 pruebas backend |
| `npm run lint:backend` | Correcto |
| `npm run audit:unused` | Sin incidencias de codigo; dos avisos de entradas explicitas redundantes, conservadas para produccion |
| Knip `--production --include files,dependencies,unlisted,unresolved,binaries` | Sin incidencias de archivos/dependencias/imports de runtime |
| `npm run build` | Correcto; persiste advertencia de chunk mayor a 500 kB |
| `npm run test:payment-rules` con CLI aislado / Java 21 | 6/6 pruebas, salida 0 y emulador detenido |
| Workflow `.github/workflows/quality.yml` | YAML valido; comandos equivalentes ejecutados localmente, sin ejecucion remota aun |
| Revision browser de build local | Pantallas publicas desktop/movil y redirecciones de acceso correctas |
| `git diff --check` | Correcto |

Total: 60 pruebas aprobadas, frente a 35 iniciales. Las pruebas de IA usan
dobles, no consumen Gemini. El emulador usa datos sinteticos y fuerza host local
y proyecto `demo-lurems-rates`; no hay escrituras en produccion ni pagos reales.

Una primera ejecucion del emulador aprobo sus 6 tests, pero Firebase CLI 15.15.0
termino con codigo 2 por timeout al enviar telemetria tras detenerse. Repetir con
`XDG_CONFIG_HOME="$(mktemp -d)"` dio codigo 0, sin alterar preferencias o login
del usuario. No se silenciaron errores ni se modificaron las pruebas para pasar.

Knip completo en modo `--production` tambien enumera cuatro exports consumidos
solo por tests (`AIService`, `normalizePaymentUrl`, `splitPaymentAmount`,
`isProfileComplete`). Se conservan por cobertura; no son implementaciones
muertas. Los exports se comprueban en el analisis completo con los tests.

### Carga inicial

| Metrica | Antes | Despues |
| --- | --- | --- |
| JS del chunk principal | 1,511.84 kB | 1,380.89 kB |
| JS principal gzip | 423.71 kB | 390.72 kB |
| CSS principal | 917.43 kB | 868.17 kB |

El JS principal baja 8.7% (7.8% gzip), tras incluir la actualizacion del SDK
Firebase. No confundirlo con el total de JS: ahora son 1,690.49 kB distribuidos
en varios chunks, cargados segun las rutas y dependencias. No se afirma una
reduccion del total ni un tiempo de carga medido. Vuetify/MDI global y la imagen
de inicio siguen siendo las siguientes oportunidades de rendimiento.

### Alcance de la entrega

D01-D11 implementados y validados dentro del alcance conservador descrito.
La deuda residual queda priorizada arriba; no se hicieron refactors masivos de
CSS/componentes, cambios mayores de dependencias ni una integracion de pagos
fuera de la fase 1 existente.

Al cierre del 2026-10-01: cambios locales, sin commit, push ni despliegue. `.env` reales,
secretos, datos clinicos y recursos Firebase desplegados no fueron modificados.
Se revisaron las adiciones buscando patrones comunes de secretos sin hallazgos;
esto no sustituye un escaneo de seguridad completo del historial Git.

Actualizacion del 2026-10-03: auditoria publicada en Hosting y las nueve Functions
existentes, con un parche adicional de `@fastify/busboy` a 3.2.2. Los resultados
de publicacion y pendientes de lanzamiento estan en
[el informe de preparacion](2026-10-03-launch-readiness.md).

Referencia del analizador: https://knip.dev/reference/configuration
