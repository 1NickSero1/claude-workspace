$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt) {
    $t = $prompt.Trim()
    $proyecto = $null
    if ($t -ieq 'WALLET CONTROL') { $proyecto = 'wallet-control' }
    elseif ($t -ieq 'RUTA SEGURA') { $proyecto = 'ruta-segura' }

    if ($proyecto) {
        $msg = "El usuario quiere arrancar una sesion enfocada en el proyecto '$proyecto'. " +
               "Como primera accion: invoca la skill PECAS y saluda recomendandole al usuario " +
               "que ejecute /clear para empezar con un contexto limpio antes de seguir " +
               "trabajando especificamente en '$proyecto'."
        $out = @{
            hookSpecificOutput = @{
                hookEventName     = 'UserPromptSubmit'
                additionalContext = $msg
            }
        }
        $out | ConvertTo-Json -Depth 5 -Compress
    }
}
