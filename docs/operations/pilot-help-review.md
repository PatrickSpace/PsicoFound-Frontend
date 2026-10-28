# Recursos de ayuda y revisión clínica pendiente

**Decisión del titular, 26/10/2026:** mantener el sistema actual. Queda pendiente
una acción y revisión humana: el titular contactará a psicólogos reales para
revisar los casos y el sistema de apoyo. No se añade botón de aprobación, ni se
declara concluida la revisión. Ver [decisión consolidada](../functional/suspension-cuentas.md).

Seguimiento actualizado: [expediente de cierre operativo](cierre-operativo-2026-10-25.md).
La configuración productiva contiene referencias de aprobación del titular para
el flujo empático y de seguridad. Esta guía conserva la revisión profesional
pendiente; la referencia de configuración no acredita por sí misma un dictamen
clínico independiente. El uso real de IA está publicado según el cierre posterior;
las afirmaciones históricas de acceso cerrado deben leerse con ese alcance.

Revisión técnica: 2026-10-10. Las reglas de frases no son un instrumento diagnóstico,
no determinan nivel de riesgo y no prometen vigilancia, contacto humano ni respuesta
inmediata. `riesgoSuicida` es un nombre de campo heredado que activa recursos; su
persistencia no demuestra una conclusión clínica. No debe interpretarse como tal.

La ayuda sigue accesible desde la encuesta sin consumir cuota ni llamar al proveedor.
Las pruebas incluyen acceso con cuota agotada. La generación de lenguaje solo extrae
preferencias administrativas; sus preguntas/respuestas libres no se muestran como consejo.

Fuente oficial consultada 2026-10-09: [MINSA, Línea 113 y apoyo psicológico gratuito
las 24 horas](https://www.gob.pe/institucion/minsa/noticias/1332478-minsa-recuerda-que-la-linea-113-brinda-orientacion-y-apoyo-psicologico-gratuito-las-24-horas).
La orientación en salud mental se ofrece en la opción 5. Es un recurso peruano;
la interfaz lo identifica y no promete cobertura fuera de Perú. No se llamó al número.

| Caso sintético | Conducta técnica propuesta | Estado clínico |
| --- | --- | --- |
| Frase explícita propia y actual | Mostrar recursos; conservar señal de activación automática | Pendiente de revisión |
| Negación «no quiero…» | No afirmar intención a partir de esa frase | Pendiente |
| Cita textual / referencia a tercero | No atribuir al titular la frase ajena | Pendiente |
| Relato pasado | No asumir intención actual | Pendiente |
| Ambigüedad, condicional, incertidumbre | No completar una conclusión por inferencia | Pendiente |
| Medicación sin intención de daño explícita | No equiparar tomar medicación con intención de daño | Pendiente |
| Señal previa + corrección de preferencia | No borrar la señal por cambiar una preferencia administrativa | Pendiente |
| IA caída, cuota agotada, cuenta pendiente | Ayuda visible e independiente | Verificación técnica separada |

Los casos de `functions/src/safety/suicideRisk.test.js` fijan comportamiento literal
acotado. Pueden existir falsos positivos y negativos; no miden sensibilidad ni
seguridad clínica. Antes del piloto, un responsable clínico (por asignar) debe revisar
expectativas, textos, recursos, persistencia de señales y situaciones ambiguas en
staging con datos sintéticos. Registrar versión y aprobación o cambios requeridos;
no usar estos tests como certificación. El acceso al proveedor real permanece cerrado
si faltan las referencias de revisión clínica/privacidad y facturación requeridas.
