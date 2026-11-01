# Revisión de preparación para producción — 31/10/2026

Zona de referencia: America/Lima. Commit base observado:
`48967838c3762be13e0dbdaa92d8d2ab0fc2fd9c` (`main`).
El [plan de salida](../salida-a-produccion.md) concentra los pendientes y criterios
de cierre. Este expediente conserva qué se comprobó en esta revisión.

## Conclusión

La aplicación ya tiene una publicación técnica. **La última entrega no tiene
Quality aprobado y los dos frontends públicos sirven entradas diferentes**.
La apertura con cobros todavía necesita cierre comercial y operativo. Los
resultados anteriores no autorizan a declarar listo el candidato actual.

Se modificó documentación. No se cambiaron dependencias, lógica, secretos,
facturación, permisos ni recursos remotos; no se ejecutaron inferencias, cobros,
correos, restauraciones o pruebas sobre cuentas reales.

## 1. GitHub y candidato

Consulta mediante el conector GitHub, incluyendo pasos y log del job:

| Evidencia | Resultado observado |
| --- | --- |
| HEAD local | `4896783`, onboarding visual unificado del 30/10. |
| Quality de HEAD | [41159307043](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/41159307043), terminado con `failure`. |
| Paso fallido | `npm --prefix functions audit --audit-level=moderate`; código 1 y 11 entradas moderadas afectadas. |
| Integración/navegador de ese run | Paso omitido después del fallo de auditoría. No está aprobado para este candidato. |
| Lint de ese run | Aprobado. No atribuirle el error local posterior de un archivo en edición. |
| Vercel de HEAD | Estado `success`; [deployment](https://vercel.com/patrickspaces-projects/psico-found-frontend/FzsCRzmk5C3fogWp9d2UN3zvLLwG). No sustituye Quality. |
| Quality verde anterior consultado | [41059306300](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/41059306300), SHA `1cc2564`; también terminó bien [41058122469](https://github.com/PatrickSpace/PsicoFound-Frontend/actions/runs/41058122469), SHA `d3d0d52`. |

Los logs del fallo identifican `glob` y `minimatch`, con avisos
[GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) y
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
Son entradas directas y transitivas del árbol, no once vulnerabilidades
independientes ni una demostración de explotación de la app.

La auditoría local completa reprodujo las 11 entradas moderadas. Con `--omit=dev`
persisten **cuatro entradas moderadas**: `glob`, `minimatch`, `rimraf` y
`google-gax`. Hay alcance en el árbol de producción; no es correcto atribuir todo
el informe exclusivamente a ESLint. Pendiente corregir con cambios compatibles,
evaluar exposición y repetir Quality, sin bajar el umbral ni usar
`audit fix --force` como sustituto de la revisión.

## 2. Comprobaciones locales y límite por trabajo concurrente

| Comando | Resultado de la pasada |
| --- | --- |
| `npm test` | 50/50 aprobadas. |
| `npm run test:backend` | 117/117 aprobadas. |
| `npm run build -- --outDir output/revision-produccion-2026-10-31/dist` | Aprobado; build separado, sin reemplazar `dist` de otros trabajos. |
| `npm run audit:unused` | Aprobado; cuatro recomendaciones de configuración anteriores. |
| Knip en modo producción | Aprobado. |
| `npm audit --json --audit-level=moderate` | 0 vulnerabilidades en frontend. |
| Auditoría completa de Functions | Código 1; 11 entradas moderadas, sin altas ni críticas. |
| Auditoría de Functions sin devDependencies | Código 1; cuatro entradas moderadas, sin altas ni críticas. |
| `npm run lint:backend` | Durante cambios paralelos: `modalityMatches` sin uso en `recommendTherapists.js:15`; ver nota. |

Durante la revisión comenzaron cambios ajenos en matching, ciclo de cuentas y
registro profesional. El lint local se ejecutó sobre ese árbol en trabajo y **no
prueba un fallo del SHA `4896783`**, cuyo lint remoto pasó. Los conteos locales
tampoco certifican los cambios posteriores de otros chats. Antes de integrar,
congelar el candidato y repetir las comprobaciones afectadas.

No se repitió la suite completa de emuladores/navegador en esta revisión documental.
Se mantiene como evidencia anterior la validación integrada del 27/10, la del
onboarding del 29–30/10 y los 11 casos específicos de guías del 30/10. No se suman
como si fueran una ejecución completa sobre el candidato actual.

## 3. Comprobación pública sin autenticar

Se descargaron solo HTML y seis recursos iniciales de cada dominio. No se crearon
identidades ni se invocaron callables.

| Sitio | HTTP | Entrada principal JS | Comparación con el build local de esta pasada |
| --- | --- | --- | --- |
| `app.lurems.lat` | HTML y seis assets 200, MIME correctos | `index-D3Blbi5f.js` | HTML y JS de entrada distintos; cinco vendors/CSS coinciden. |
| `psico-found-frontend.vercel.app` | HTML y seis assets 200, MIME correctos | `index-BsqGWsYp.js` | HTML y seis assets iniciales coinciden por bytes/SHA-256. |

Ambos sitios seguían sirviendo `no-cache, max-age=0, must-revalidate` en los recursos
inspeccionados. La divergencia es evidencia de artefactos distintos, **no prueba
automática de incompatibilidad ni de una caída**. No se obtuvo una nueva versión
administrativa de Hosting ni se inventó el SHA desplegado a partir del nombre JS.

El registro del 30/10 acredita Hosting `a31d81ca650eae10` para `d3d0d52` y el
despliegue posterior de `getPatientCareGuide`/`savePatientCareGuide`. El onboarding
visual `4896783` no tiene acreditado aquí un despliegue de Hosting ni un smoke
autenticado público. Conciliar versiones frontend/backend y probar el candidato
compatible es un pendiente de release, no una orden de publicar automáticamente.

## 4. Pendientes de apertura que permanecen

- Elegir tarifa real, revisar perfil y disponibilidad y activar explícitamente
  cada profesional de apertura; no usar la tarifa QA de S/1,10 como oferta real.
- Completar recuperación de contraseña con nueva sesión de una identidad QA.
- Acordar responsables, suplente, cobertura y frecuencia de conciliación,
  vencimientos, devoluciones, transferencias y soporte. No existe scheduler de
  vencimientos de pago; el scheduler de inactividad sí tiene evidencia de publicación.
- Realizar el pago controlado y su conciliación solo en la fase financiera
  autorizada; sigue reservado para el final en el expediente previo.
- Resolver por procedimiento las citas/pagos de profesionales que dejan de atender.
- Completar la revisión profesional de casos de apoyo y las decisiones pendientes
  de conservación. La decisión del 26/10 mantiene el sistema y sustituye eliminación
  productiva por suspensión; no se reabre la obligación de habilitar borrados.
- Fijar presupuesto y verificar avisos/consumo real de Firebase, Hosting, Vercel e
  IA. La [auditoría financiera](../finance/auditoria-costos-2026-10-30.md) contiene
  simulaciones, no límites de gasto configurados ni mejoras ya certificadas.
- Registrar la situación de respaldo, recuperación y rollback y las limitaciones
  aceptadas. El ensayo real de restauración, dispositivos físicos y caída real
  de OpenAI siguen aplazados por el titular; esta revisión no los ejecuta.

La entrega de alertas al buzón ya se comprobó el 25/10. Lo pendiente es cobertura y
respuesta operativa, no volver a desarrollar o activar desde cero toda la alertación.
Las plantillas `pilot-*.example.json` y su verificador son herramientas de revisión
históricas, no evidencia de recursos desplegados ni puertas completas para el
backend compartido y los textos legales administrados actuales.

## 5. Evidencia y mantenimiento

Artefactos locales en `output/revision-produccion-2026-10-31/`: logs de las ocho
comprobaciones, `verificacion.json`, `audit-backend-runtime.json`,
`github-evidencia.json`, `sitios-publicos.json` y `hashes-codigo-corte.json`.
El manifiesto se tomó después de iniciarse los cambios paralelos: es una referencia
del corte, no una garantía de identidad del árbol al inicio de cada comando.
Los artefactos locales pueden no existir en otro clon; los enlaces de GitHub y
este expediente conservan el resultado relevante sin secretos ni datos personales.

No se marca una condición de apertura cumplida por tener un documento o una prueba
histórica. Actualizar el plan cuando exista nueva evidencia del candidato estable.
