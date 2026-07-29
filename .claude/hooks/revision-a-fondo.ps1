$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt -and ($prompt.Trim() -ieq 'REVISION A FONDO')) {
    $msg = "El usuario quiere una revision a fondo completa (codigo + visual/UX) de un proyecto, " +
           "en un solo PDF, con el minimo de preguntas. Unica pregunta obligatoria: cual proyecto de " +
           "APPS/ revisar (lista las subcarpetas reales que existan en ese momento, no una lista " +
           "memorizada). Con la respuesta, corre EN CONJUNTO, sobre ese mismo proyecto:`n" +
           "1) El proceso completo de AUDITA (SKILLS/AUDITA.md) - auditoria de codigo: explorar el " +
           "proyecto real, correr los chequeos automaticos segun el tipo de proyecto, clasificar " +
           "hallazgos en Bugs / Para eliminar / Mejoras recomendadas / Lo que ya funciona bien. " +
           "Ademas, como parte de esta seccion: revisar si el proyecto elegido tiene una suite de " +
           "pruebas automatizadas configurada (ej. Jest - ver package.json -> scripts.test, o carpetas " +
           "__tests__/tests/). Si la tiene, correrla de verdad (ej. npx jest --no-color) y usar el " +
           "resultado REAL como evidencia: cualquier prueba que falle se reporta como hallazgo de Bug " +
           "con el mensaje/stack trace real (nunca inventado ni resumido), aplicando el mismo criterio " +
           "de diagnostico de FIXA (capa / causa) para explicar el por que importa y la accion " +
           "sugerida. Si el proyecto NO tiene pruebas automatizadas configuradas, no es un bug - " +
           "mencionarlo como una Mejora recomendada (agregar tests).`n" +
           "2) El proceso completo de ESTETIK (SKILLS/ESTETIK.md) - auditoria visual/UX: levantar la " +
           "app real y verla renderizada (dev server, o celular fisico via mobile-mcp si es Expo, o " +
           "ventana de escritorio), clasificar hallazgos en Inconsistencia visual / Accesibilidad / " +
           "Responsive / Microinteracciones-UX / Lo que ya funciona bien.`n" +
           "Combina ambas auditorias en UN SOLO informe con dos secciones bien separadas (Auditoria de " +
           "Codigo, Auditoria Visual/UX) y UN solo resumen ejecutivo al inicio que cubra las dos " +
           "dimensiones (semaforo o porcentaje simple de que tan lista esta la app, tecnica y " +
           "visualmente). Cada hallazgo, en las dos secciones, debe indicar: que es, por que importa, " +
           "prioridad (Alta/Media/Baja) y accion concreta sugerida, en espanol simple. Ninguna de las " +
           "dos auditorias modifica codigo durante la revision - son solo diagnostico. Al terminar, " +
           "genera el PDF automaticamente con Puppeteer -SIN preguntar si lo quiere en PDF y SIN " +
           "preguntar donde guardarlo-: guardalo directamente en " +
           "'APPS/<proyecto>/AUDITORIAS/revision-a-fondo-<fecha>.pdf' (crear la carpeta AUDITORIAS si " +
           "no existe). Al final del mensaje del chat (no dentro del PDF), mencionar en una linea que " +
           "si el usuario quiere que se arreglen los hallazgos encontrados, PECAS se encarga de los " +
           "cambios de codigo/UI y FIXA de los bugs puntuales - pero no arrancar a arreglar nada sin " +
           "que el usuario lo pida explicitamente."
    $out = @{
        hookSpecificOutput = @{
            hookEventName     = 'UserPromptSubmit'
            additionalContext = $msg
        }
    }
    $out | ConvertTo-Json -Depth 5 -Compress
}
