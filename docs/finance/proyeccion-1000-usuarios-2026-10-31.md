# Proyección: 1.000 usuarios estables y conversión del 5%

Fecha: 31/10/2026. Modelo de planificación, sin facturas ni medición de producción.
Se toma como referencia el candidato publicado en este chat y sus optimizaciones.

## Supuestos confirmados

- Base estable de **1.000 usuarios**, sin añadir otra cohorte de 1.000 cada mes.
- **5% convierte: 50 pacientes**; los otros 950 también pueden consumir recursos.
- Cada paciente completa y paga **30 sesiones al año**; no se descuentan abandonos,
  impagos, devoluciones ni estacionalidad. Son 2,5 sesiones mensuales en promedio.
- Lurems retiene **S/30 por sesión**, separado del honorario del profesional.
  Se interpreta como ingreso de plataforma antes de otros gastos e impuestos.
- Tipo de cambio constante de planificación: **USD 1 = S/3,467**, venta SBS del
  30/10/2026. No predice el cambio futuro ni incluye el recargo del banco/tarjeta.
  [Fuente SBS](https://www.sbs.gob.pe/app/pp/SISTIP_PORTAL/Paginas/Publicacion/TipoCambioPromedio.aspx).

## Ingresos

| Concepto | Cálculo | Resultado |
| --- | --- | ---: |
| Pacientes que pagan | 1.000 × 5% | 50 |
| Sesiones anuales | 50 × 30 | 1.500 |
| Sesiones mensuales promedio | 1.500 / 12 | 125 |
| Ingreso anual por paciente | 30 × S/30 | S/900 |
| Ingreso anual de Lurems | 1.500 × S/30 | **S/45.000** |
| Ingreso mensual promedio | S/45.000 / 12 | **S/3.750** |

Es un año con los 50 pacientes activos desde el inicio y cumplimiento completo
de las 30 sesiones. Captarlos progresivamente o perder pacientes reduce el ingreso
reconocido en ese primer año.

## Uso técnico modelado

Se incluye consumo gratuito previo a la conversión. Por prudencia, los 1.000
usuarios hacen una encuesta inicial, aunque solo 50 paguen; no se aplica además
el 30% de participación de la auditoría anterior. Se suponen ocho turnos por
encuesta, cuatro de ellos con IA, 2.500 tokens de entrada y 250 de salida por
inferencia, sin descuentos de caché. Son **4.000 inferencias en el año**, no cada
mes. Las sesiones de terapia no invocan automáticamente al modelo: agenda,
matching, pagos y seguimiento se presupuestan como operaciones de aplicación.

El código mantiene topes de 20 inferencias por encuesta y diez intentos por
cuenta. Esos topes no describen el uso promedio. El presupuesto de IA de USD 50
mensuales es un control de admisión por costo estimado, no una suscripción que se
cobre completa ni un límite de factura de todo Firebase.

Se usa un catálogo de 100 profesionales y 2.000 slots como supuesto heredado de
la auditoría. 60% llega a matching y realiza 1,2 búsquedas: 720 búsquedas iniciales
a unas 214 lecturas incluyendo ocho de guards/perfil. Se preserva el ranking
completo; no se presupone el objetivo antiguo de 50 lecturas por búsqueda.

Para reservas, atención, reprogramaciones, pagos y seguimiento se provisionan
500 lecturas, 50 escrituras y 12 callables por sesión. Se añaden bolsas para
administración, disponibilidad, actividad y el job de inactividad. Por turno de
encuesta se asignan 40 lecturas y 20 escrituras, incluyendo controles, ledgers y
persistencia. Son bolsas conservadoras editables, no mediciones ni límites.

| Consumo | Mes inicial | Mes posterior |
| --- | ---: | ---: |
| Lecturas Firestore | 811.371 | 179.883 |
| Escrituras Firestore | 186.280 | 16.280 |
| Solicitudes Functions | 17.850 | 5.130 |
| vCPU-segundos estimados | 34.206 | 2.027 |
| Transferencia Hosting | 3,96 GB | 2,76 GB |
| Evaluaciones reCAPTCHA | 4.000 | 2.000 |

La distribución es uniforme en meses financieros de 30 días. En el mes inicial,
las lecturas equivalen a unas 27.046/día y las escrituras a 6.209/día. Se asumen
franquicias disponibles: Firestore 50.000 lecturas y 20.000 escrituras diarias,
Hosting 360 MB/día y Auth correo/Google sin SMS dentro del nivel gratuito.
[Precios de Firebase](https://firebase.google.com/pricing).

Functions se modela con 1 vCPU, 256 MiB, mínimo cero y concurrencia efectiva uno;
la memoria y mínimo coinciden con la configuración inspeccionada al publicar.
Se asignan seis segundos por inferencia, 0,35 por turno guiado y 0,3 por otra
llamada, con 20% de margen. El crédito gratuito de Cloud Run se valora a Tier 1:
USD 4,32 de CPU y 0,90 de RAM, y dos millones de solicitudes mensuales.
[Precios de Cloud Run](https://cloud.google.com/run/pricing).

Las evaluaciones de App Check no equivalen a mensajes de IA. Se presupuestan
renovaciones de token mediante sesiones de uso; 2.000–4.000 evaluaciones quedan
bajo las 10.000 mensuales por organización. Si otros proyectos consumen esa
franquicia, puede aparecer el escalón de USD 8 u otros cargos compartidos.
[Facturación de reCAPTCHA](https://docs.cloud.google.com/recaptcha/docs/billing-information).

## Costo de operación tecnológica

| Partida | USD/mes promedio | USD/año | S/año |
| --- | ---: | ---: | ---: |
| Firestore: lecturas/escrituras/red, dentro de franquicias | 0,00 | 0,00 | 0,00 |
| Functions: cómputo/solicitudes, dentro del crédito disponible | 0,00 | 0,00 | 0,00 |
| Hosting estático, dentro de franquicia diaria | 0,00 | 0,00 | 0,00 |
| Auth correo/Google, App Check y un Scheduler bajo franquicias | 0,00 | 0,00 | 0,00 |
| Reserva para almacenamiento y backups | 0,50 | 6,00 | 20,80 |
| Reserva para logs, secretos, builds, artefactos y red auxiliar | 5,00 | 60,00 | 208,02 |
| Provisión de renovación del dominio | 2,50 | 30,00 | 104,01 |
| IA de la encuesta inicial | 0,125 | 1,50 | 5,20 |
| **Total modelado** | **8,125** | **97,50** | **338,03** |

La IA usa gpt-6-luna Standard: USD 0,10/M tokens de entrada y 0,50/M de salida.
4.000 × (2.500 × 0,10 + 250 × 0,50) / 1.000.000 = **USD 1,50 en el año**.
La tarifa coincide con `functions/src/ai/usage.js` y
[OpenAI Docs](https://developers.openai.com/api/docs/models/gpt-6-luna).

El gasto modelado del primer mes es USD 9,50; los otros once, USD 8 cada uno.
El promedio anual es **S/28,17 al mes**, unos **S/0,23 por sesión pagada**.
Las provisiones de USD 0,50, 5 y 30/año son decisiones de presupuesto: no facturas
verificadas, tarifas del registrador ni confirmación de backups ya configurados.
Los ceros dependen de franquicias y uso uniforme; no significan costo ilimitado
cero. No se cuenta una suscripción Vercel que no se ha acreditado.

## Sensibilidad de uso de IA

| Uso de cada uno de los 1.000 usuarios | Inferencias/año | IA USD/año | Total técnico S/año |
| --- | ---: | ---: | ---: |
| Una encuesta, promedio cuatro inferencias | 4.000 | 1,50 | 338,03 |
| Una encuesta al máximo de 20 inferencias | 20.000 | 7,50 | 361,07 |
| Diez encuestas al máximo, distribuidas en el año | 200.000 | 75,00 | 592,86 |

La última fila reparte los intentos durante doce meses y conserva los mismos
tokens medios. No representa toda esa demanda en un mes. Al concentrarla,
aumenta el consumo facturable y el control mensual de USD 50 puede limitar IA y
mantener la continuación guiada. Tampoco certifica capacidad para responder picos:
los controles de concurrencia y las transacciones compartidas siguen vigentes.
Tokens más largos, reintentos, bots y pestañas abiertas cambian estos resultados.

## Presupuesto y resultado

Reservar **USD 20 mensuales** (unos **S/69,34**) permite una holgura sobre el caso
normal y el intensivo distribuido. Son **USD 240 / S/832,08 al año**. Es un
presupuesto orientativo, no un tope automático ni una garantía de factura.

| Resultado anual | S/ |
| --- | ---: |
| Ingreso de plataforma | 45.000,00 |
| Menos costo técnico modelado | −338,03 |
| Remanente después de tecnología | **44.661,97** |
| Remanente usando la reserva prudente de S/832,08 | **44.167,92** |

El segundo remanente equivale a S/3.680,66 mensuales. **No es utilidad neta.**
Faltan publicidad/CAC, trabajo humano, soporte, contabilidad, impuestos, recargos
cambiarios, devoluciones y comisiones de pasarela que asuma Lurems. Como los S/30
son la parte de la plataforma, no se vuelve a restar el honorario profesional.
La comisión de cobro, en cambio, puede calcularse sobre el precio completo pagado
por el paciente; falta ese precio y el contrato de la pasarela para cuantificarla.

No se aloja video en este modelo: el código gestiona enlaces de reuniones, sin
suponer transmisión, grabaciones ni almacenamiento multimedia propios. Licencias
de videollamada, correo comercial o SMS se añaden si Lurems las contrata. El tráfico
de pruebas en Vercel u otros proyectos también se suma si consume recursos reales.

Para los gastos todavía desconocidos, la fórmula reproducible es:

```text
Resultado = 45.000 − tecnología − pasarela − publicidad − personal − otros − impuestos
Pasarela = 1.500 × (precio completo de la sesión × tasa + cargo fijo)
Publicidad = 50 × CAC por paciente que paga
```

Si un gasto ya está descontado de los S/30 retenidos, no se resta nuevamente.
Antes de comprometer el presupuesto hay que sustituir las provisiones por la
facturación real y verificar las franquicias compartidas y el plan del dominio.

## Reproducción

[Calculadora offline](proyectar_1000_usuarios.py), sin dependencias externas:

```sh
python3 docs/finance/proyectar_1000_usuarios.py
```

Incluye comprobaciones de ingresos, sumas de componentes y límites de inferencias.
No ejecuta inferencias, pruebas de carga ni cambios de facturación o configuración.
El JSON de esta ejecución se guardó localmente en
`output/despliegue-2026-10-31/proyeccion-1000-usuarios.json`.
