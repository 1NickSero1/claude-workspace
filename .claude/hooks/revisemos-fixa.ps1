$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt -and ($prompt.Trim() -ieq 'REVISEMOS')) {
    $testDir = Join-Path $env:CLAUDE_PROJECT_DIR 'APPS\wallet-control'
    $output = ""
    $ranOk = $false
    try {
        Push-Location $testDir
        # cmd /c en vez del "2>&1" nativo de PowerShell — este ultimo envuelve
        # cada linea de stderr de un ejecutable externo en un ErrorRecord (ver
        # nota de la herramienta Bash/PowerShell sobre este mismo problema),
        # lo que ensucia la salida de Jest con ruido de PowerShell.
        $output = (cmd /c "npx jest --no-color 2>&1") | Out-String
        $ranOk = ($LASTEXITCODE -eq 0)
    } catch {
        $output = "No se pudo ejecutar 'npx jest' en $testDir ($($_.Exception.Message))."
    } finally {
        Pop-Location
    }

    # Recorte defensivo — a medida que crezca la suite, no vale la pena
    # meter decenas de miles de caracteres al contexto; el resumen final y
    # las ultimas fallas suelen ir al final de la salida de Jest.
    if ($output.Length -gt 12000) {
        $output = "...(salida truncada, se muestran los ultimos 12000 caracteres)...`n" + $output.Substring($output.Length - 12000)
    }

    if ($ranOk) {
        $msg = "El usuario escribio la palabra clave REVISEMOS en wallet-control: se corrio Jest (npx jest) " +
               "automaticamente y TODAS las pruebas pasaron. Confirmaselo brevemente al usuario -no hace falta " +
               "activar el protocolo de diagnostico de FIXA, no hay nada que arreglar. Salida completa:`n`n$output"
    } else {
        $msg = "El usuario escribio la palabra clave REVISEMOS en wallet-control: se corrio Jest (npx jest) " +
               "automaticamente y HAY pruebas fallando. Activa el protocolo de diagnostico de FIXA " +
               "(SKILLS/FIXA.md) sobre esta salida real de Jest -no inventes ni resumas el error, usa el mensaje " +
               "y stack trace exactos de abajo-. Para CADA prueba fallida: identifica la capa, localiza archivo " +
               "y linea, y propone UNA sola solucion concreta siguiendo el formato de respuesta de FIXA " +
               "(CAPA / CAUSA / ARCHIVO / FIX / VERIFICAR). Salida completa de Jest:`n`n$output"
    }
    $out = @{
        hookSpecificOutput = @{
            hookEventName     = 'UserPromptSubmit'
            additionalContext = $msg
        }
    }
    $out | ConvertTo-Json -Depth 5 -Compress
}
