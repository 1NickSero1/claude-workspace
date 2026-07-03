$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$path = $json.tool_input.file_path
if ($path -and ($path -match '(?i)metricas.*\.txt$')) {
    $reason = "Archivo protegido (marcado NO MODIFICAR): $path. No editar sin confirmacion explicita del usuario."
    $out = @{
        hookSpecificOutput = @{
            hookEventName = 'PreToolUse'
            permissionDecision = 'deny'
            permissionDecisionReason = $reason
        }
    }
    $out | ConvertTo-Json -Depth 5 -Compress
}
