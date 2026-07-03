$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt -and ($prompt.Trim() -ceq 'SUBIR')) {
    $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    Push-Location $repoRoot
    try {
        $result = git push 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) {
            $msg = "git push ejecutado correctamente.`n`n$result"
        }
        else {
            $msg = "git push fallo (exit $exitCode).`n`n$result"
        }
        $out = @{
            systemMessage      = $msg
            hookSpecificOutput = @{
                hookEventName     = 'UserPromptSubmit'
                additionalContext = $msg
            }
        }
        $out | ConvertTo-Json -Depth 5 -Compress
    }
    finally {
        Pop-Location
    }
}
