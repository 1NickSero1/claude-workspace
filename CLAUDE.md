Claude: Login# CLAUDE.md — Sistema Operativo de Desarrollo

> **Versión:** 4.0 | **Actualizado:** 2026-06-22
> Este es el archivo raíz del sistema. Todo parte de aquí.

---

## Quién soy

Soy un creador de productos digitales independiente. Construyo apps, webs, herramientas y automatizaciones funcionales y vendibles usando **Claude Code como motor principal**. Trabajo solo, en Windows 11 Pro, con suscripción Claude Pro.

**Objetivo:** cada proyecto debe poder llegar a versión 1.0 vendible en el menor tiempo posible.

---

## Expertise — Áreas en las que soy experto

> Esta sección es entrenable. Para agregar un área: "soy experto en [tema]" o "entrena CLAUDE.md en [área]".
> Para eliminar una: "elimina expertise [tema] de CLAUDE.md".

| Área | Nivel | Notas |
|---|---|---|
| Desarrollo de productos digitales | Experto | Apps, webs, herramientas vendibles |
| Claude Code / IA | Experto | Workflows con LLMs, skills, agentes |
| Finanzas personales (Colombia) | Avanzado | Inversión, CDTs, tributación |

---

## Proyectos Activos

> Para registrar un proyecto: "agrega [nombre] a proyectos activos".
> Para marcarlo como terminado: "mueve [nombre] a proyectos terminados".

| Proyecto | Skill usada | Estado | Carpeta |
|---|---|---|---|
| wallet-control | PECAS | En progreso | `APPS/wallet-control` |
| ruta-segura | PECAS | En progreso | `APPS/ruta-segura` |
| pollito | PECAS | En definición | `APPS/pollito` |

---

## Proyectos Terminados

| Proyecto | Skill usada | Fecha | Dónde se vende |
|---|---|---|---|
| — | — | — | — |

---

## Lecciones Aprendidas

> Para agregar una lección: "agrega lección: [lo que aprendiste]".
> Estas se aplican automáticamente en futuros proyectos.

| # | Lección | Aplica en |
|---|---|---|
| 1 | Verificar estado real del directorio antes de asumir qué existe | Siempre |
| 2 | Los `node_modules` de React Native tienen rutas demasiado largas para `Remove-Item` — usar `robocopy` + `rd /s /q` | PowerShell / limpieza |
| 3 | Al abrir el servidor Expo, usar siempre el primer puerto libre a partir de 8081 (detectado en el momento, no fijo a 8082) — evita conflicto si hay otro proyecto Expo corriendo | Expo / React Native |
| 4 | Los commits `Auto-sync: <fecha>` en el historial de git vienen de una extensión externa instalada en esta máquina y en la del hermano del usuario, no de Claude Code — no confundirlos con acciones propias ni intentar revertirlos o desactivarlos sin que se pida | Git / control de versiones |
| 5 | Antes de empezar a trabajar en el repo, correr `git pull` primero — hay más de una máquina (la del usuario y la de su hermano) pusheando al mismo repo, y sin este paso se puede trabajar desincronizado o generar conflictos | Git / control de versiones |

---

## Mapa del Sistema

```
CLAUDE.md  ←  Estás aquí — raíz de todo el sistema
│
├── SKILLS/KILLER.md      ← Generador y gestor de skills
├── SKILLS/FINANDO.md     ← Asesor financiero IA (conversacional)
├── SKILLS/PAKI.md        ← Crea proyectos web y landings
├── SKILLS/PECAS.md       ← Crea apps SaaS, móviles y desktop
├── SKILLS/FIXA.md        ← Debug, errores y QA
├── SKILLS/FIFAS.md       ← Analista estadístico deportivo (fútbol)
├── SKILLS/AUDITA.md      ← Auditor profesional de proyectos (con PECAS)
└── SKILLS/ESTETIK.md     ← Auditor visual y de experiencia de usuario (con PECAS)
│
└── APPS/                 ← Código de todos los proyectos
    ├── wallet-control/
    └── ruta-segura/
```

---

## Cómo usar el sistema

| Quiero... | Skill a activar | Comando de ejemplo |
|---|---|---|
| Crear/mejorar una skill | KILLER | "KILLER, genera skill para [dominio]" |
| Crear un proyecto web | PAKI | "PAKI, crea una landing para [producto]" |
| Crear una app | PECAS | "PECAS, crea una app que [hace qué]" |
| Consulta financiera | FINANDO | "FINANDO, ¿qué hago con [X] pesos?" |
| Debuggear un error | FIXA | "FIXA, este error: [error]" |
| Auditar un proyecto (bugs/mejoras/eliminaciones) | AUDITA | "AUDITA" (siempre pregunta cuál proyecto) |
| Auditar el visual/UX de un proyecto | ESTETIK | "ESTETIK" (siempre pregunta cuál proyecto) |

---

## Entorno de Trabajo

| Herramienta | Detalle |
|---|---|
| OS | Windows 11 Pro |
| Shell | PowerShell |
| IDE | Antigravity |
| CLI | Claude Code |
| Suscripción | Claude Pro |
| Control de versiones | Git |

---

## Stack por Defecto

| Tipo de proyecto | Stack |
|---|---|
| Landing page simple | HTML + Tailwind CSS (CDN) |
| Web app / SaaS | Next.js 15 + Tailwind + Supabase |
| App móvil | React Native + Expo |
| App de escritorio | Electron + React |
| Script / automatización | Python 3.12+ |
| CLI tool | Node.js + commander.js |
| Bot / agente IA | Python + Claude API (sonnet-4-6) |
| Extensión navegador | Vanilla JS + Manifest V3 |

---

## Modelos de Claude

| Modelo | ID | Cuándo usarlo |
|---|---|---|
| Sonnet 4.6 | claude-sonnet-4-6 | Default — balance perfecto |
| Opus 4.8 | claude-opus-4-8 | Tareas complejas, razonamiento profundo |
| Haiku 4.5 | claude-haiku-4-5-20251001 | Tareas simples, alta velocidad |

En apps con Claude API: **sonnet-4-6** por defecto. **Prompt caching** activado siempre que el contexto se repita.

---

## Plataformas de Venta

| Plataforma | Tipo | Modelo |
|---|---|---|
| Gumroad | Herramientas, templates | Pago único |
| Lemon Squeezy | SaaS | Suscripción $9–$29/mes |
| Product Hunt | Cualquier cosa | Visibilidad |
| App Store / Play Store | Apps móviles | Pago único + in-app |

---

## Principios de Desarrollo

- MVP primero, perfección después
- Sin features que no pedí
- Sin abstracciones que no necesito hoy
- Sin `any` en TypeScript
- Sin `console.log` en producción
- Sin comentarios obvios — solo comentar el WHY
- Código que funcione en la primera ejecución
- Manejo de errores solo en boundaries (user input, APIs externas)
- Serverless/sin backend propio cuando sea posible

---

## Formato de Respuesta

### Para proyectos nuevos:
1. Evaluación rápida (¿tiene sentido?, tiempo estimado)
2. Stack recomendado (con justificación breve)
3. Paso a paso numerado hasta versión funcional
4. Comandos exactos para PowerShell
5. Estrategia de venta

### Para tareas técnicas puntuales:
- Respuesta directa. Código listo para usar. Sin relleno.

---

## Reglas Operativas para Claude

- Si no especifico tecnología → stack por defecto de la tabla
- Comandos siempre para PowerShell en Windows 11
- No crear README.md ni documentación a menos que lo pida
- Verificar estado real del directorio antes de listar estructura
- Si el proyecto tiene partes complejas → dividir en subtareas con títulos claros
- Al terminar una tarea: 1-2 oraciones de qué cambió y qué sigue
- Aplicar las lecciones aprendidas de la sección correspondiente
- Cada vez que se cree una palabra clave nueva (con o sin hook real), agregar una fila en `APPS/palabras-clave.txt` con su significado en una palabra y si es general o específica de una skill/proyecto

---

## Palabras Clave de Commit y Push

> `TERMINAR` y `PAUSA` son instrucciones de comportamiento (Claude las sigue al leerlas, no hay
> hook de sistema detrás). `SUBIR` sí tiene un hook real (`UserPromptSubmit`,
> `.claude/hooks/subir-push.ps1`) que ejecuta `git push` automáticamente al detectar el mensaje
> exacto "SUBIR" — esta entrada queda como respaldo documental por si el hook no llega a cargarse.
>
> **Auto-sync externo (no es Claude):** los commits con mensaje `Auto-sync: <fecha>` que aparecen
> en `git log` NO los genera Claude Code ni estos hooks — los produce una extensión de Git
> instalada tanto en esta máquina como en la del hermano del usuario, que hace commit + push
> automático en segundo plano cada cierto tiempo, fuera del control de Claude. Si aparecen sin que
> el usuario haya escrito `TERMINAR`/`PAUSA`/`SUBIR`, es esperado — no es una violación de la
> política de abajo. Claude no debe intentar desactivar esa extensión ni investigarla por su
> cuenta salvo que se le pida explícitamente.

| Palabra clave | Acción |
|---|---|
| `TERMINAR` | Commit general — agrega y confirma TODOS los cambios pendientes en el repo hasta ese momento, con un mensaje que resuma qué se hizo |
| `PAUSA` | Commit específico — Claude pregunta primero cuál actualización/archivo se quiere confirmar, y hace commit solo de eso |
| `SUBIR` | Push automático — ejecuta `git push` de inmediato, sin preguntar. Si falla (rama desactualizada, conflicto, etc.), Claude reporta el error tal cual y no intenta resolverlo solo |

**Reglas:**
- Nunca hacer commit ni push sin que se indique una de estas palabras (o se pida explícitamente)
- `TERMINAR` = todo lo pendiente. `PAUSA` = solo lo que el usuario confirme tras la pregunta. `SUBIR` = push inmediato de lo ya commiteado
- Se sigue siempre el protocolo de seguridad de git (sin `--force`, sin `--no-verify`, revisar que no haya secrets antes de agregar archivos)
- Si `git push` falla por divergencia con el remoto, Claude no hace merge/rebase automático — informa el conflicto y espera instrucción
- Esta política gobierna únicamente las acciones de Claude — la extensión de auto-sync externa opera de forma independiente y no está sujeta a estas reglas

---

## Palabras Clave de Cambio de Proyecto

> Hook real (`UserPromptSubmit`, `.claude/hooks/proyecto-switch.ps1`). Detecta el mensaje exacto
> (mayúsculas o minúsculas) y le inyecta contexto a Claude para que arranque enfocado en ese
> proyecto.

| Palabra clave | Acción |
|---|---|
| `WALLET CONTROL` | Hace `git pull --ff-only` automático (ver nota), invoca la skill PECAS y saluda, recomendando al usuario correr `/clear` antes de seguir (contexto limpio), para trabajar específicamente en `APPS/wallet-control` |
| `RUTA SEGURA` | Igual, pero enfocado en `APPS/ruta-segura` |
| `POLLITO` | Igual, pero enfocado en `APPS/pollito` (app de escritorio, regalo) |

**Nota:** Claude no puede borrar su propio contexto de conversación desde un hook — eso solo lo dispara el usuario con `/clear`. El hook recomienda hacerlo, no lo fuerza.

**Nota (git pull automático, desde 2026-07-09):** antes de saludar, el hook intenta `git pull
--ff-only` en el repo. Es una operación segura por diseño: si hay cambios sin commitear, o si el
historial local y el remoto divergieron (ambas máquinas con commits propios sin sincronizar), el
hook NO fuerza nada — solo avisa en el saludo y Claude puede ofrecer resolverlo a mano en la
conversación (igual que un `git pull` normal). Como el hook vive en el repo y se sincroniza a la
máquina del hermano, esto aplica en ambos sentidos: cualquiera de las dos máquinas que arranque
`WALLET CONTROL` o `RUTA SEGURA` revisa primero si la otra subió cambios nuevos.

---

## Palabra Clave de Auditoría en PDF

> Hook real (`UserPromptSubmit`, `.claude/hooks/pdf-audita.ps1`). Detecta el mensaje exacto
> "PDF AUDITA" (mayúsculas o minúsculas) y le inyecta contexto a Claude para correr la skill
> AUDITA en modo directo.

| Palabra clave | Acción |
|---|---|
| `PDF AUDITA` | Activa AUDITA. Única pregunta: cuál proyecto de `APPS/` auditar. Después de responder, Claude corre la auditoría completa y genera el informe en PDF automáticamente — sin preguntar si se quiere PDF ni dónde guardarlo — en `APPS/<proyecto>/AUDITORIAS/auditoria-<fecha>.pdf` |

**Nota:** a diferencia de "AUDITA" a secas (que al final pregunta si el informe va también en PDF y dónde guardarlo), "PDF AUDITA" da por hecho ambas cosas para ir directo al resultado con una sola pregunta.

---

## Palabra Clave de Auditoría Visual Rápida

> Hook real (`UserPromptSubmit`, `.claude/hooks/imagina-estetik.ps1`). Detecta el mensaje exacto
> "IMAGINA" (mayúsculas o minúsculas) y le inyecta contexto a Claude para correr la skill ESTETIK
> en modo mini-reporte.

| Palabra clave | Acción |
|---|---|
| `IMAGINA` | Activa ESTETIK. Única pregunta: cuál proyecto de `APPS/` revisar. Después de responder, Claude ve la app real renderizada (no solo el código) y genera un **mini PDF** enfocado solo en los cambios/mejoras visuales y de UX que recomienda (qué cambiar, por qué importa, prioridad) — sin el detalle completo de "lo que ya funciona bien" de una auditoría ESTETIK normal. Se guarda automáticamente, sin preguntar, en `APPS/<proyecto>/PDF/<proyecto>-imagina-<fecha>.pdf` |

**Nota:** `IMAGINA` usa la carpeta `PDF/` del proyecto (donde ya viven otros documentos como el de avance), a diferencia de `PDF AUDITA` que guarda en `AUDITORIAS/`.

---

## Checklist Universal de Proyecto Terminado

- [ ] Feature principal funciona end-to-end
- [ ] Sin secrets hardcodeados
- [ ] `.env*` en `.gitignore`
- [ ] Build de producción sin errores
- [ ] Deploy funcionando
- [ ] Si la app maneja cuentas/datos personales: política de tratamiento de datos redactada y publicada (obligatoria para Play Store "Data safety form"; en Colombia aplica Ley 1581 de 2012 — Habeas Data)

---

## Historial

| Fecha | Cambio |
|---|---|
| 2026-06-04 | Versión 2.0 — Unificación completa |
| 2026-06-06 | Versión 3.0 — Convertido en raíz del sistema con mapa de skills |
| 2026-06-06 | Versión 4.0 — Sistema entrenable: expertise, proyectos activos, lecciones aprendidas |
| 2026-06-06 | Eliminado mi-finanzas; finance-ai renombrado a wallet-control; rutas corregidas a APPS/ |
| 2026-06-20 | Lección 3 — conflicto de puertos Expo (8081 ocupado → usar 8082) |
| 2026-07-02 | Agregadas palabras clave de commit: `TERMINAR` (commit general) y `PAUSA` (commit específico, pregunta antes) |
| 2026-07-02 | Agregada palabra clave `SUBIR` (push automático) + 4 hooks reales en `.claude/hooks/`: protección de `metricas.txt`, bloqueo de `.env*`, recordatorio de pendientes al iniciar sesión, aviso de push pendiente tras commit |
| 2026-07-02 | Agregadas palabras clave `WALLET CONTROL` y `RUTA SEGURA` (hook real) — invocan PECAS y recomiendan `/clear` para arrancar enfocados en ese proyecto específico |
| 2026-07-03 | Creado `.claude/settings.json` (no existía) registrando los 6 hooks de `.claude/hooks/`, que hasta ahora estaban en disco pero nunca conectados; documentada la extensión de auto-sync externa (commits `Auto-sync: <fecha>`) compartida con la computadora del hermano del usuario |
| 2026-07-04 | Aclarado que "el archivo de recetas" = `RECETAS/receta-apps.txt`, no este `CLAUDE.md` — la lección de responsive design se movió ahí |
| 2026-07-08 | Creada skill `AUDITA` (generada vía KILLER) — auditoría profesional de proyectos en `APPS/`, apoyada en los criterios de PECAS; siempre pregunta primero cuál proyecto auditar y entrega el informe en lenguaje simple, separando bugs / eliminaciones / mejoras / lo que ya funciona |
| 2026-07-08 | Agregada palabra clave `PDF AUDITA` (hook real `.claude/hooks/pdf-audita.ps1`) — corre AUDITA con una sola pregunta (proyecto) y genera el informe completo en PDF automáticamente en `APPS/<proyecto>/AUDITORIAS/` |
| 2026-07-08 | Agregada Lección 5 — correr `git pull` antes de empezar a trabajar en el repo, ya que hay más de una máquina (usuario y hermano) pusheando al mismo repo |
| 2026-07-09 | `proyecto-switch.ps1` ahora hace `git pull --ff-only` automático antes de saludar en `WALLET CONTROL`/`RUTA SEGURA` — seguro por diseño (no fuerza merge si hay divergencia o cambios sin commitear, solo avisa); al vivir en el repo, aplica en ambas máquinas |
| 2026-07-09 | Creada skill `ESTETIK` (generada vía KILLER) — auditoría visual y de experiencia de usuario en `APPS/`, apoyada en los patrones de PECAS; revisa consistencia de diseño, responsive, accesibilidad y microinteracciones, viendo la app realmente renderizada (no solo el código); nunca corrige código, solo diagnostica |
| 2026-07-09 | Agregada palabra clave `IMAGINA` (hook real `.claude/hooks/imagina-estetik.ps1`) — corre ESTETIK con una sola pregunta (proyecto) y genera un mini PDF solo con los cambios/mejoras visuales recomendados en `APPS/<proyecto>/PDF/` |
| 2026-07-09 | Creado `APPS/palabras-clave.txt` — índice de todas las palabras clave del sistema con significado en una palabra y si son generales o específicas de una skill/proyecto; se actualiza cada vez que se agrega una palabra clave nueva |
| 2026-07-11 | Instalado Android Platform Tools (adb, vía winget) y registrado el MCP `mobile-mcp` (`.mcp.json`, scope proyecto) — le da a ESTETIK/IMAGINA control real sobre un celular Android físico conectado por USB (screenshot/tap/swipe reales) en vez de solo leer código; requiere depuración USB activada y el celular autorizado (`adb devices`) en cada máquina que lo use |
| 2026-07-17 | Lección 3 actualizada — "abre el servidor/qr" de wallet-control/ruta-segura ya no fuerza el puerto 8082: ahora detecta y usa el primer puerto libre a partir de 8081 en el momento de ejecutar |
| 2026-07-21 | Agregado proyecto `pollito` (app de escritorio, regalo) a Proyectos Activos; agregada palabra clave `POLLITO` en `proyecto-switch.ps1` (mismo patrón que WALLET CONTROL/RUTA SEGURA — git pull + PECAS + recomendación de `/clear`) |
| 2026-07-22 | Corregido: ESTETIK y AUDITA existían solo como documentación en `SKILLS/` pero nunca se habían registrado como comando real en `.claude/commands/` (a diferencia de KILLER, FINANDO, PAKI, PECAS, FIXA y FIFAS, que sí tenían esa copia) — por eso no se podían invocar como skill. Copiados `SKILLS/ESTETIK.md` y `SKILLS/AUDITA.md` a `.claude/commands/estetik.md` y `.claude/commands/audita.md`; ambas palabras clave ya funcionan como comando de verdad |

> **Comandos para entrenar este archivo:**
> - "soy experto en [tema]" → agrega a la tabla de Expertise
> - "agrega lección: [aprendizaje]" → agrega a Lecciones Aprendidas
> - "agrega [nombre] a proyectos activos" → registra el proyecto
> - "actualiza CLAUDE.md con [instrucción]" → cualquier otro cambio
