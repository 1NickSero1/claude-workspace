# Esquema de datos — Google Sheet "Asistente Nico"

Fuente de verdad única que lee y escribe n8n. Un archivo de Google Sheets, una pestaña por tabla.
Los IDs son texto simple (ej. `p1`, `p2`) — n8n los genera al crear una fila.

**El Sheet ya existe y está creado:**
https://docs.google.com/spreadsheets/d/1UKuBqbY6_7VO6Z2UdYvUvEdPXNUXzN_6_QRGBYv3vXc/edit
(`documentId` = `1UKuBqbY6_7VO6Z2UdYvUvEdPXNUXzN_6_QRGBYv3vXc` — ya referenciado en los workflows de `n8n/`)

## `Pendientes`

| columna | tipo | ejemplo |
|---|---|---|
| id | texto | p1 |
| descripcion | texto | Pagar internet |
| categoria | texto | casa / trabajo / personal |
| fecha_creacion | fecha | 2026-08-19 |
| fecha_vencimiento | fecha (opcional) | 2026-08-25 |
| estado | pendiente / hecho | pendiente |

## `Habitos`

| columna | tipo | ejemplo |
|---|---|---|
| id | texto | h1 |
| nombre | texto | Gym |
| frecuencia | diario / semanal / N veces por semana | diario |
| fecha | fecha del registro | 2026-08-19 |
| hecho | sí / no | sí |
| racha | número (días consecutivos) | 4 |

Cada marca de hábito es una fila nueva (log diario), no se sobreescribe — así se puede calcular racha y % de cumplimiento.

## `Agenda`

| columna | tipo | ejemplo |
|---|---|---|
| id | texto | a1 |
| fecha | fecha | 2026-08-20 |
| hora | hora (opcional) | 15:00 |
| descripcion | texto | Cita médico |
| recordar_antes_min | número (opcional) | 60 |

## `Ingresos`

| columna | tipo | ejemplo |
|---|---|---|
| quincena | texto (debe matchear `GastosQuincenales.quincena`) | Q1-2026-08 |
| monto | número (COP) | 705000 |
| fecha_pago | fecha | 2026-08-01 |

Falta en el modelo original del Artifact (que tenía el ingreso hardcodeado en el JS) — se
agrega como pestaña propia porque el cálculo de "cuánto te queda" necesita saber el ingreso
de cada quincena, no solo sus gastos.

## `GastosQuincenales`

Mismo modelo que el Artifact "Cuadre Quincenal".

| columna | tipo | ejemplo |
|---|---|---|
| quincena | Q1 / Q2 + mes | Q1-2026-08 |
| descripcion | texto | Arriendo |
| monto | número (COP) | 475000 |
| estado | pagado / pendiente | pendiente |

## `Deudas`

| columna | tipo | ejemplo |
|---|---|---|
| nombre | texto | Rappi |
| total_base | número (COP) | 1300000 |
| abonado | número (COP, acumulado) | 0 |
| tope_mensual | número (COP, opcional) | 300000 |

`Sofi` se registra con `total_base` vacío (monto por confirmar) — mismo comportamiento que el Artifact.

## `ComprasTarjeta`

| columna | tipo | ejemplo |
|---|---|---|
| deuda | texto (debe matchear `Deudas.nombre`) | Rappi |
| fecha | fecha | 2026-08-19 |
| descripcion | texto | Gym |
| monto | número (COP) | 110000 |

El total de una deuda con tarjeta = `total_base` + suma de `ComprasTarjeta` filtradas por `deuda` − `abonado`. Misma fórmula que usa el Artifact.

## `Ahorro`

| columna | tipo | ejemplo |
|---|---|---|
| meta | texto | iPhone |
| guardado | número (COP) | 100000 |
| fecha_actualizacion | fecha | 2026-08-19 |

## Datos iniciales (carga desde el Artifact "Cuadre Quincenal", agosto 2026)

**Ingresos**

| quincena | monto | fecha_pago |
|---|---|---|
| Q1-2026-08 | 705000 | 2026-08-01 |
| Q2-2026-08 | 699000 | 2026-08-18 |

**GastosQuincenales**

| quincena | descripcion | monto | estado |
|---|---|---|---|
| Q1-2026-08 | Arriendo | 475000 | pendiente |
| Q1-2026-08 | Parqueadero | 30000 | pendiente |
| Q1-2026-08 | Spotify | 30000 | pendiente |
| Q1-2026-08 | Tony (comida y arena) | 35000 | pendiente |
| Q2-2026-08 | Internet | 50000 | pendiente |
| Q2-2026-08 | Servicios | 50000 | pendiente |
| Q2-2026-08 | Comida | 100000 | pendiente |
| Q2-2026-08 | Tony (comida y arena) | 35000 | pendiente |
| Q2-2026-08 | Peluqueada | 20000 | pendiente |

**Deudas**

| nombre | total_base | abonado | tope_mensual |
|---|---|---|---|
| Sofi | (vacío) | 0 | |
| Mamá | 400000 | 0 | |
| Rappi | 1300000 | 0 | 300000 |

**Ahorro**

| meta | guardado | fecha_actualizacion |
|---|---|---|
| iPhone | 100000 | 2026-08-19 |

> Nota: el estado real de pagado/pendiente y de abonos que hayas marcado en el Artifact vive solo en tu navegador (localStorage) — no se puede leer desde aquí. Esta carga inicial parte de cero (todo "pendiente", $0 abonado); ajústalo a mano en el Sheet o dime los montos actuales y lo actualizo.
