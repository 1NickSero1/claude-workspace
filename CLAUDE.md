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
| 3 | Si el puerto 8081 está ocupado (otro proyecto Expo corriendo), usar `npx expo start --port 8082` | Expo / React Native |

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
└── SKILLS/FIFAS.md       ← Analista estadístico deportivo (fútbol)
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

---

## Palabras Clave de Commit y Push

> `TERMINAR` y `PAUSA` son instrucciones de comportamiento (Claude las sigue al leerlas, no hay
> hook de sistema detrás). `SUBIR` sí tiene un hook real (`UserPromptSubmit`,
> `.claude/hooks/subir-push.ps1`) que ejecuta `git push` automáticamente al detectar el mensaje
> exacto "SUBIR" — esta entrada queda como respaldo documental por si el hook no llega a cargarse.

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

---

## Palabras Clave de Cambio de Proyecto

> Hook real (`UserPromptSubmit`, `.claude/hooks/proyecto-switch.ps1`). Detecta el mensaje exacto
> (mayúsculas o minúsculas) y le inyecta contexto a Claude para que arranque enfocado en ese
> proyecto.

| Palabra clave | Acción |
|---|---|
| `WALLET CONTROL` | Invoca la skill PECAS y saluda, recomendando al usuario correr `/clear` antes de seguir (contexto limpio), para trabajar específicamente en `APPS/wallet-control` |
| `RUTA SEGURA` | Igual, pero enfocado en `APPS/ruta-segura` |

**Nota:** Claude no puede borrar su propio contexto de conversación desde un hook — eso solo lo dispara el usuario con `/clear`. El hook recomienda hacerlo, no lo fuerza.

---

## Checklist Universal de Proyecto Terminado

- [ ] Feature principal funciona end-to-end
- [ ] Sin secrets hardcodeados
- [ ] `.env*` en `.gitignore`
- [ ] Build de producción sin errores
- [ ] Deploy funcionando

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

> **Comandos para entrenar este archivo:**
> - "soy experto en [tema]" → agrega a la tabla de Expertise
> - "agrega lección: [aprendizaje]" → agrega a Lecciones Aprendidas
> - "agrega [nombre] a proyectos activos" → registra el proyecto
> - "actualiza CLAUDE.md con [instrucción]" → cualquier otro cambio
