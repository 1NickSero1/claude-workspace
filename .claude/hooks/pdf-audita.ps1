$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt -and ($prompt.Trim() -ieq 'PDF AUDITA')) {
    $msg = "El usuario quiere una auditoria completa y directa, en PDF, con el minimo de preguntas. " +
           "Activa la skill AUDITA. Unica pregunta obligatoria: cual proyecto de APPS/ auditar " +
           "(lista las subcarpetas reales que existan en ese momento, no una lista memorizada). " +
           "Con la respuesta, ejecuta la auditoria completa (bugs, para eliminar, mejoras, lo que ya " +
           "funciona bien) tal como la describe SKILLS/AUDITA.md, y al terminar genera automaticamente " +
           "el informe en PDF con Puppeteer -SIN preguntar si lo quiere en PDF y SIN preguntar donde " +
           "guardarlo-: guardalo directamente en 'APPS/<proyecto>/AUDITORIAS/auditoria-<fecha>.pdf' " +
           "(crear la carpeta AUDITORIAS si no existe). El PDF debe incluir el resumen ejecutivo y la " +
           "auditoria completa (todos los hallazgos con su categoria, por que importa, prioridad y " +
           "accion sugerida), no solo un resumen."
    $out = @{
        hookSpecificOutput = @{
            hookEventName     = 'UserPromptSubmit'
            additionalContext = $msg
        }
    }
    $out | ConvertTo-Json -Depth 5 -Compress
}
