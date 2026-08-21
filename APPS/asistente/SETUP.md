# Setup — Asistente Personal por WhatsApp

Guía de arranque de punta a punta. Sigue el orden — cada parte depende de la anterior.

## 0. Lo que ya está hecho

- El Google Sheet **"Asistente Nico"** ya existe con las 8 pestañas y tus datos de agosto
  cargados: https://docs.google.com/spreadsheets/d/1UKuBqbY6_7VO6Z2UdYvUvEdPXNUXzN_6_QRGBYv3vXc/edit
  (ver `data-schema.md` para el detalle de columnas).
- Los 4 workflows de n8n están en `n8n/` listos para importar.
- El prompt de Claude está en `system-prompt.md` (ya viene incluido dentro del workflow
  `inbound-mensaje.json`, no necesitas copiarlo a mano).

## 1. VPS + n8n corriendo 24/7

1. Crea un VPS barato (Railway, Hetzner, DigitalOcean — cualquiera con Docker). Con el plan
   más pequeño alcanza.
2. Compra o usa un subdominio tuyo (ej. `n8n.tudominio.com`) y crea un registro DNS tipo A
   apuntando a la IP del VPS. Espera a que propague (unos minutos a 1 hora).
3. En el VPS, instala Docker y Docker Compose si no los tiene.
4. Copia la carpeta `APPS/asistente/` (o al menos `docker-compose.yml`, `Caddyfile`,
   `.env.example`) al VPS.
5. `cp .env.example .env` y completa `N8N_HOST` con tu subdominio, y un usuario/clave para
   `N8N_BASIC_AUTH_*`.
6. `docker compose up -d`. Caddy saca el certificado HTTPS solo (Let's Encrypt) — dale un
   par de minutos la primera vez.
7. Entra a `https://tu-subdominio/` — deberías ver el login de n8n.

## 2. WhatsApp Cloud API (Meta)

1. Ve a https://developers.facebook.com/ y crea una cuenta de desarrollador si no tienes.
2. "Mis apps" → "Crear app" → tipo **Negocio** (Business) → dale un nombre cualquiera.
3. Dentro de la app, agrega el producto **WhatsApp**.
4. Meta te da automáticamente un **número de prueba** y un **Phone Number ID** — anótalo,
   lo necesitas en los workflows (reemplaza `TU_PHONE_NUMBER_ID`).
5. En "Configuración de la API" de WhatsApp, agrega tu propio número de celular como
   **destinatario de prueba verificado** (te llega un código por WhatsApp para confirmarlo).
   Con esto ya puedes probar sin verificación de empresa completa.
6. Genera un **token de acceso permanente**: Meta for Developers → tu app → WhatsApp →
   Configuración de la API → System Users (o "Token temporal" para probar rápido, aunque
   ese expira en 24h — para dejarlo funcionando de verdad, crea un System User con permiso
   `whatsapp_business_messaging` y genera su token permanente).
7. Configura el **webhook**: URL = `https://tu-subdominio/webhook/...` (el path exacto te lo
   da n8n cuando abras el nodo "WhatsApp: mensaje entrante" del workflow `inbound-mensaje`
   después de importarlo — cada nodo trigger tiene su propia URL única). Verify token: el que
   tú quieras, cualquier string, solo tiene que coincidir con el que pongas en la credencial
   de n8n.
8. Suscribe el webhook al campo `messages`.

## 3. Plantillas de mensaje (para los recordatorios proactivos)

Los workflows `recordatorio-diario` y `recordatorio-semanal` los inicia el bot, no tú — Meta
exige que ese tipo de mensaje use una **plantilla aprobada** si ha pasado más de 24h desde tu
último mensaje. En Meta Business Manager → WhatsApp Manager → Plantillas de mensajes, crea
algo simple como:

> Categoría: Utility
> Nombre: `recordatorio_diario`
> Cuerpo: `{{1}}`  (un solo parámetro de texto libre, para meter ahí el mensaje ya armado)

Aprobación suele tardar minutos a pocas horas. Repite para `recordatorio_semanal`. Una vez
aprobadas, cambia la operación del nodo "Enviar WhatsApp" en esos dos workflows de "Send
Text" a "Send Template", seleccionando la plantilla y pasando `{{ $json.mensaje }}` como el
parámetro.

Esto **no aplica** a `inbound-mensaje` (siempre respondes tú dentro de las 24h después de que
Nico escribe primero) ni a `resumen-gastos` (es un sub-workflow, no manda mensajes directo).

## 4. Credenciales dentro de n8n

Crea estas 3 credenciales en n8n (Settings → Credentials → Add):

| Nombre exacto | Tipo | Qué poner |
|---|---|---|
| `WhatsApp Cloud API` | WhatsApp | El Phone Number ID, el Access Token permanente, y el Verify Token que elegiste |
| `Anthropic API Key` | Header Auth | Header name: `x-api-key`, Header value: tu API key de Anthropic (console.anthropic.com) |
| `Google Sheets - Asistente Nico` | Google Sheets OAuth2 | Botón "Sign in with Google", autoriza con la misma cuenta donde vive el Sheet |

Los workflows ya referencian estos 3 nombres exactos — si les pones otro nombre, tendrás que
reasignar la credencial en cada nodo manualmente.

## 5. Importar los workflows

En n8n: Workflows → Import from File → sube, en este orden:

1. `n8n/resumen-gastos.json` (primero este, porque `inbound-mensaje` lo llama)
2. `n8n/inbound-mensaje.json`
3. `n8n/recordatorio-diario.json`
4. `n8n/recordatorio-semanal.json`

Después de importar `inbound-mensaje.json`, abre el nodo **"Ejecutar resumen-gastos"** y
vuelve a seleccionar el workflow `resumen-gastos` en el dropdown (al importar por separado,
n8n no conserva automáticamente el enlace interno entre los dos archivos).

**Nodos a revisar rápido en cada workflow** (son ajustes de 30 segundos, no reescritura):
- Cualquier nodo de Google Sheets → confirma que la credencial `Google Sheets - Asistente
  Nico` esté seleccionada (el documento y la pestaña ya vienen puestos).
- El nodo `Enrutar por intencion` (Switch, en `inbound-mensaje`) → si alguna regla aparece en
  rojo, es solo que hay que re-seleccionar el operador "equals" en el dropdown.
- El nodo `Enviar WhatsApp` en cada workflow → confirma la credencial `WhatsApp Cloud API`, y
  reemplaza `TU_PHONE_NUMBER_ID` / `TU_NUMERO_WHATSAPP` por los reales.
- El nodo `Extraer mensaje` (Code, en `inbound-mensaje`) → después de la primera prueba real,
  mira qué forma tiene el payload que llegó (click en el nodo trigger, pestaña Output) y
  ajusta las rutas si no calzan exactamente.

## 6. Probar

1. Activa (toggle "Active") los 4 workflows.
2. Desde tu celular, mándale un WhatsApp al número de prueba: `"agregame pagar el internet"`.
3. Revisa en n8n → Executions que corrió sin error, y que apareció la fila nueva en la
   pestaña `Pendientes` del Sheet.
4. Debería llegarte la respuesta de confirmación por WhatsApp.
5. Prueba `"como voy este mes"` y confirma que el resumen coincide con lo que sabes de tus
   quincenas actuales.
6. Para los recordatorios, no esperes al cron — ejecuta el workflow manualmente desde n8n
   ("Execute Workflow") para probar que el mensaje llega bien formado.

## Si algo no funciona

Esto se armó a mano siguiendo la estructura estándar de workflows de n8n, sin poder probarlo
contra una instancia real en el momento de crearlo — lo más probable si algo falla es un
detalle de un nodo puntual (nombre de campo distinto en tu versión de n8n, formato del
payload de WhatsApp), no la arquitectura completa. Cuéntame qué error muestra n8n en la
ejecución fallida (Executions → click en la que salió en rojo) y lo ajustamos juntos.
