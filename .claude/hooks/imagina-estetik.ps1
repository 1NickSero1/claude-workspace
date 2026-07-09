$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt -and ($prompt.Trim() -ieq 'IMAGINA')) {
    $msg = "El usuario quiere una auditoria visual rapida, en un MINI documento PDF, con el minimo de " +
           "preguntas. Activa la skill ESTETIK (SKILLS/ESTETIK.md). Unica pregunta obligatoria: cual " +
           "proyecto de APPS/ revisar (lista las subcarpetas reales que existan en ese momento, no una " +
           "lista memorizada). Con la respuesta, sigue el proceso real de ESTETIK: levanta la app real " +
           "(dev server o simulador) y revisala renderizada, no solo el codigo. Pero en vez del informe " +
           "completo de auditoria, genera un documento MINI enfocado solo en los cambios posibles que " +
           "recomendarias sobre el proyecto (no hace falta el detalle de 'lo que ya funciona bien', con " +
           "una linea de contexto general basta). Cada cambio sugerido debe indicar: que cambiarias, " +
           "por que importa (impacto visual/UX real) y prioridad (Alta/Media/Baja). Genera el PDF " +
           "automaticamente con Puppeteer -SIN preguntar si lo quiere en PDF y SIN preguntar donde " +
           "guardarlo- guardalo directamente en 'APPS/<proyecto>/PDF/<proyecto>-imagina-<fecha>.pdf' " +
           "(la carpeta PDF ya existe en los proyectos de APPS/, usarla tal cual; crearla solo si de " +
           "verdad no existe). No modificar ningun archivo del proyecto durante la revision."
    $out = @{
        hookSpecificOutput = @{
            hookEventName     = 'UserPromptSubmit'
            additionalContext = $msg
        }
    }
    $out | ConvertTo-Json -Depth 5 -Compress
}
