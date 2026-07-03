$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$path = $json.tool_input.file_path
if ($path -and ($path -match '(?i)(^|[\\/])\.env(\.[^\\/]*)?$')) {
    $reason = "Acceso bloqueado a archivo de entorno protegido: $path. Los .env* nunca deben leerse ni editarse."
    $out = @{
        hookSpecificOutput = @{
            hookEventName = 'PreToolUse'
            permissionDecision = 'deny'
            permissionDecisionReason = $reason
        }
    }
    $out | ConvertTo-Json -Depth 5 -Compress
}
