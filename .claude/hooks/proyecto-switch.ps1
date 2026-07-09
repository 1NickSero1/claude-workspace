$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt) {
    $t = $prompt.Trim()
    $proyecto = $null
    if ($t -ieq 'WALLET CONTROL') { $proyecto = 'wallet-control' }
    elseif ($t -ieq 'RUTA SEGURA') { $proyecto = 'ruta-segura' }

    if ($proyecto) {
        $repoDir = $env:CLAUDE_PROJECT_DIR
        $pullStatus = ""
        try {
            Push-Location $repoDir
            $dirty = git status --porcelain
            if ($dirty) {
                $pullStatus = "Aviso git: hay cambios sin commitear en el repo, no se intento pull automatico para no arriesgarlos."
            } else {
                $beforeHash = (git rev-parse HEAD).Trim()
                git pull --ff-only --quiet
                $exitCode = $LASTEXITCODE
                if ($exitCode -eq 0) {
                    $afterHash = (git rev-parse HEAD).Trim()
                    if ($beforeHash -ne $afterHash) {
                        $pullStatus = "Git: se hizo pull automatico y se trajeron cambios nuevos del repo remoto (posiblemente de la otra maquina)."
                    } else {
                        $pullStatus = "Git: se verifico el remoto, ya estaba al dia (sin cambios nuevos)."
                    }
                } else {
                    $pullStatus = "Aviso git: no se pudo hacer pull automatico (posible historial divergente o sin conexion) - si hace falta, ofrece hacer git pull manualmente en la conversacion."
                }
            }
        } catch {
            $pullStatus = "Aviso git: fallo el intento de pull automatico ($($_.Exception.Message))."
        } finally {
            Pop-Location
        }

        $msg = "El usuario quiere arrancar una sesion enfocada en el proyecto '$proyecto'. " +
               "$pullStatus " +
               "Como primera accion: menciona brevemente ese resultado de git, invoca la skill PECAS y saluda recomendandole al usuario " +
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
