# Proveedor de IA: lectura pendiente de aprobación

Consulta: 2026-10-09, America/Lima. Sin llamadas al proveedor ni inspección de
facturación, claves o contratos de la cuenta.

Fuente: [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms),
vigencia declarada 2026-03-23, actualización indicada 2026-04-28.

Los términos restringen clientes dirigidos o probablemente accesibles a menores
de 18 y prohíben práctica clínica y consejo médico. El servicio gratuito no debe
recibir información personal, confidencial o sensible; su contenido puede usarse
para mejorar productos y pasar por revisión humana. En servicio pagado, prompts
y respuestas no se usan para mejorar productos, pero se conservan temporalmente
por seguridad y pueden procesarse internacionalmente. El estado pagado de Gemini
requiere facturación activa del proyecto que utiliza su API; pagar otro servicio
Firebase no lo demuestra.

La encuesta admite texto que puede contener datos de salud. Minimizar el payload
no convierte esos datos en anónimos ni demuestra que el uso concreto esté
permitido. La aprobación de producto, privacidad y alcance clínico sigue pendiente,
con responsable por asignar. Deben revisar el flujo y contrato concretos antes de
activar proveedor real, y confirmar proyecto/plan, tratamiento, retención, región,
subencargados, consentimiento y medidas de acceso.

Procedimiento externo: en consola del proyecto de IA autorizado, verificar plan
y contrato; registrar evidencia sin claves; revisar payload sintético y alcance
administrativo; solo con autorización explícita ejecutar un caso sintético y su
fallo controlado. Resultado esperado: evidencia contractual y técnica, sin consejo
terapéutico ni promesas de vigilancia. No ejecutado.

App Check: [cliente web con reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
y [enforcement en Functions](https://firebase.google.com/docs/app-check/cloud-functions).
Registrar la app/dominios, observar métricas en staging y luego exigir tokens en
callables. Preparar código no demuestra que registro ni enforcement estén activos.
