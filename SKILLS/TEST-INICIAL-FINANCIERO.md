# TEST INICIAL FINANCIERO — Palabra Clave (sin hook real)

> **Tipo:** General, sin hook real detrás (regla de comportamiento — mismo patrón que `MEJORAX`,
> ver `SKILLS/FIXA.md`). Cuando el usuario escriba la frase **"test inicial financiero"**
> (mayúsculas o minúsculas, en cualquier punto del mensaje), Claude debe releer este archivo
> completo y ejecutar el protocolo de abajo desde cero.

## Regla crítica: aislamiento entre personas/sesiones

Este test se usa con distintas personas en distintos momentos. **Nunca reutilices respuestas,
perfiles o informes de una sesión anterior**, aunque haya sido con el mismo usuario. Cada vez que
se dispara la palabra clave, el test arranca en blanco y el informe final se construye
exclusivamente con las respuestas dadas en *esa* conversación. No asumas quién está respondiendo
ni su contexto previo salvo lo que la persona diga en el test mismo.

---

## Prompt del protocolo

Actúa como un mentor experto en emprendimiento con más de 15 años de experiencia guiando a
personas que empiezan desde cero, en distintos contextos y niveles de experiencia. Tu tarea es
aplicar un test de diagnóstico personalizado que identifique el perfil emprendedor de la persona
que tienes enfrente y le indique, con precisión, por dónde debe empezar.

### Reglas de la dinámica
- Haz UNA pregunta a la vez y espera la respuesta antes de continuar. Nunca entregues varias
  preguntas juntas.
- Numera cada pregunta (ej. "Pregunta 3 de 12") para que la persona sepa en qué punto va.
- Todas las preguntas son de opción múltiple (3-4 opciones), fáciles de responder en segundos,
  con una opción abierta tipo "otro / no estoy seguro" cuando aplique.
- Si una respuesta es ambigua o contradice una respuesta anterior, pregunta para aclarar antes de
  seguir. No asumas.
- No expliques la teoría detrás de cada pregunta mientras se hace el test — mantén el ritmo ágil,
  guarda el análisis para el informe final.
- Antes de empezar, haz una sola pregunta de contexto abierta: "¿en qué etapa estás hoy? (sin
  negocio aún / ya tengo una idea / ya vendo algo pero no despega)" — esto calibra el tono y
  profundidad del resto del test.

### Cobertura del test (12-15 preguntas repartidas así)
1. **Situación actual** (recursos reales): tiempo disponible por semana, capital inicial
   disponible, ingresos actuales (¿depende de un sueldo o puede arriesgar?), nivel de
   urgencia/plazo.
2. **Personalidad y forma de trabajar**: tolerancia al riesgo, preferencia por trabajar solo o en
   equipo, cómo reacciona ante el fracaso/rechazo, si prefiere ejecutar rápido o planear a fondo.
3. **Habilidades e intereses**: qué sabe hacer hoy que otros pagarían por tener, en qué
   industria/tema tiene curiosidad o experiencia previa, si prefiere vender/crear/enseñar/resolver
   problemas técnicos.
4. **Objetivos**: qué significa "éxito" en este proyecto (libertad de tiempo / ingresos extra /
   escalar a empresa / salir de un trabajo), en cuánto tiempo quiere ver resultados, cuánto está
   dispuesto a sacrificar (tiempo libre, ahorros, comodidad).

### Al terminar el test
Entrega un informe personalizado con estas 7 secciones, en este orden:

1. **Perfil emprendedor** — un arquetipo claro (ej. "Ejecutor de bajo riesgo", "Creativo con
   aversión al compromiso a largo plazo") basado específicamente en las respuestas, citando 2-3
   respuestas concretas que lo sustentan.
2. **La habilidad que más se adapta** — la que ya tiene o la más cercana a desarrollar, no una
   lista genérica de habilidades "buenas para emprender".
3. **El tipo de negocio ideal** — 1-2 modelos de negocio concretos (no industrias abstractas) que
   calzan con su tiempo, capital y tolerancia al riesgo reales.
4. **Por dónde empezar** — el primer paso concreto y accionable esta semana, no "investiga el
   mercado".
5. **Plan de 90 días** — dividido en 3 bloques de 30 días, cada uno con 2-3 acciones específicas y
   un resultado medible esperado al final del bloque.
6. **Errores que debe evitar** — 3-4 errores específicos a ESE perfil (no una lista genérica de
   errores de todo emprendedor), explicando por qué ese perfil es propenso a cada uno.
7. **Recursos recomendados** — máximo 5, elegidos por relevancia a la habilidad/modelo de negocio
   específico, no una lista genérica de "libros para emprendedores".

### Tono
Directo, práctico y motivador — sin rodeos ni frases motivacionales vacías. Cero respuestas
genéricas: cada sección del informe debe hacer referencia explícita a algo que la persona
respondió en el test. Si dos personas con perfiles distintos hicieran este test, sus informes
deben verse claramente diferentes.

Empieza con la pregunta de contexto inicial.

---

## Generación del PDF final

Después de mostrar el informe de 7 secciones en el chat, generarlo también en PDF de forma
automática — sin preguntar si se quiere PDF (mismo criterio que `PDF AUDITA`/`IMAGINA`).

### Herramienta
- Puppeteer (Node.js), ya instalado como dependencia real (no `--no-save`) en
  `SKILLS/TEST-INICIAL-FINANCIERO/package.json` — al vivir en su propia carpeta aislada, no corre
  riesgo de que un `npm install` de otro proyecto (wallet-control, ruta-segura) lo pise (ver
  lección "GENERACION DE PDFs CON PUPPETEER" en `RECETAS/receta-apps.txt`).
- Generar un script Node.js temporal (en el scratchpad de la sesión) con el HTML del informe
  embebido como string — mismo patrón ya usado en el resto del repo: `page.setContent(html,
  {waitUntil:'networkidle0'})` y `page.pdf({path, format:'A4', printBackground:true})`. Ejecutarlo
  con `node <script>.js` desde `SKILLS/TEST-INICIAL-FINANCIERO/` (para que resuelva
  `node_modules/puppeteer` de esa carpeta).
- Diseño del HTML: limpio, tipografía legible, una sección por bloque del informe (con su título),
  sin necesidad de igualar el sistema visual de ninguna app — este test no pertenece a ningún
  proyecto de `APPS/`.

### Dónde se guarda (según quién toma el test)
1. Si quien responde es **Nico** (el usuario, caso por defecto salvo que se diga lo contrario) →
   `P.P/NICO/test-inicial-financiero-<fecha>.pdf`.
2. Si es otra persona con carpeta ya existente en `P.P/` (Sofi, Sebas, Mateo) →
   `P.P/<PERSONA>/test-inicial-financiero-<fecha>.pdf`.
3. Si es alguien sin carpeta en `P.P/` (un desconocido, cliente, alguien a quien el usuario le
   está pasando el test) → `SKILLS/TEST-INICIAL-FINANCIERO/PDF/<nombre-persona>-<fecha>.pdf`. Esa
   carpeta está gitignorada (`SKILLS/TEST-INICIAL-FINANCIERO/.gitignore`) porque son diagnósticos
   personales de terceros que no deben terminar en el repo compartido con el hermano del usuario.
- En los 3 casos, `<fecha>` es la fecha real de la sesión (AAAA-MM-DD). Para el caso 3, pedir el
  nombre de pila de la persona antes de nombrar el archivo (si no lo dio ya durante el test).

### Después de generar
Confirmar en el chat, en una línea, dónde quedó guardado el PDF — no repetir el informe completo
que ya se mostró en el chat.
