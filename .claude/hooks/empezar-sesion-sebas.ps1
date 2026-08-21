$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt) {
    $t = $prompt.Trim()
    if ($t -ieq 'empezar sesion sebas' -or $t -ieq 'empezar sesión sebas') {
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
                        $pullStatus = "Git: se hizo pull automatico y se trajeron cambios nuevos del repo remoto."
                    } else {
                        $pullStatus = "Git: se verifico el remoto, ya estaba al dia."
                    }
                } else {
                    $pullStatus = "Aviso git: no se pudo hacer pull automatico - si hace falta, ofrece hacerlo a mano en la conversacion."
                }
            }
        } catch {
            $pullStatus = "Aviso git: fallo el intento de pull automatico ($($_.Exception.Message))."
        } finally {
            Pop-Location
        }

        $escritorio = $null
        try {
            $rawDesktop = (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders' -ErrorAction Stop).Desktop
            $escritorio = [Environment]::ExpandEnvironmentVariables($rawDesktop)
        } catch {
            $escritorio = Join-Path $env:USERPROFILE 'Desktop'
        }
        $fecha = Get-Date -Format 'yyyy-MM-dd'
        $pdfPath = Join-Path $escritorio "sesion-sebas-$fecha.pdf"

        $msg = "El usuario (Nico) quiere arrancar una sesion de la skill TRADE enfocada especificamente en " +
               "el plan de equipo con Sebas (no el coaching individual de Nico). $pullStatus " +
               "Nota: la carpeta APPS/trade/equipo/ es local-only (gitignorada), el pull de arriba no la " +
               "afecta - vive solo en esta maquina. " +
               "Como primera accion: menciona brevemente el resultado de git si hubo cambios relevantes, " +
               "invoca la skill TRADE, y arranca leyendo el estado actual de APPS/trade/equipo/ " +
               "(equipo.md, equipo-etf-plan.md, y las entradas mas recientes de bitacora.md) para saludar " +
               "retomando exactamente donde quedo pendiente el plan con Sebas (ej. instrumentos del " +
               "nucleo/satelite que falten por elegir, tareas abiertas de la seccion 4 de " +
               "equipo-etf-plan.md, etc.) - no reinicies el contexto del plan, segui desde ahi. " +
               "Recomiendale al usuario ejecutar /clear si quiere arrancar con contexto limpio antes de " +
               "seguir. " +
               "INSTRUCCION PARA EL RESTO DE ESTA SESION (importante, aplica mas adelante, no ahora, y " +
               "es un procedimiento fijo confirmado por el usuario el 2026-08-14 - hacerlo SIEMPRE al " +
               "cerrar una sesion con Sebas, sin que haga falta pedirlo de nuevo cada vez): cuando el " +
               "usuario indique que la sesion/reunion con Sebas de hoy termino (frases como 'eso es todo " +
               "por hoy', 'cerramos aca', 'terminamos la sesion', o equivalente), armar un RESUMEN DE " +
               "RETROALIMENTACION DEL DIA (que se decidio, que quedo pendiente, hallazgos importantes) a " +
               "partir de TODO lo que haya quedado anotado en la entrada de bitacora.md correspondiente " +
               "a la fecha de HOY, y hacer DOS cosas con eso:`n" +
               "1) Generar un PDF (via Puppeteer) con ese resumen, bien formateado (tablas/secciones, " +
               "mismo estilo que los PDF anteriores de la skill TRADE). NO guardarlo en la carpeta del " +
               "proyecto/repo - guardarlo directo en el Escritorio real de Windows del usuario, ruta " +
               "resuelta via registro (no asumir ~/Desktop a mano, por si OneDrive lo redirige): " +
               "'$pdfPath'.`n" +
               "2) Crear un BORRADOR de Gmail (mcp__claude_ai_Gmail__create_draft) dirigido a " +
               "sebas193711@gmail.com, con el mismo resumen escrito en el cuerpo (htmlBody, formateado, " +
               "tono cercano tipo mensaje entre amigos/socios) - esa herramienta no soporta adjuntar " +
               "archivos, asi que el PDF NO va adjunto ahi: avisar a Nico que tiene que adjuntar el PDF " +
               "el mismo desde el Escritorio antes de mandarlo, y que la herramienta solo puede crear el " +
               "borrador, no enviarlo (el envio lo hace Nico a mano desde Gmail). " +
               "Si la sesion no genero ninguna entrada nueva en la bitacora ese dia, avisar en vez de " +
               "generar un PDF/borrador vacios."
        $out = @{
            hookSpecificOutput = @{
                hookEventName     = 'UserPromptSubmit'
                additionalContext = $msg
            }
        }
        $out | ConvertTo-Json -Depth 5 -Compress
    }
}
