$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$targets = @(
    (Join-Path $repoRoot 'APPS\ruta-segura\NOTAS\ajustes app ruta.txt'),
    (Join-Path $repoRoot 'APPS\wallet-control\NOTAS\ajustes wallet-control.txt')
)

$sections = @()
foreach ($f in $targets) {
    if (Test-Path -LiteralPath $f) {
        $lines = Get-Content -LiteralPath $f
        $startIdx = -1
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '\[PENDIENTE\]') { $startIdx = $i; break }
        }
        if ($startIdx -ge 0) {
            $endIdx = $lines.Count - 1
            for ($i = $startIdx + 2; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match '^-{10,}') { $endIdx = $i - 1; break }
            }
            if ($endIdx -ge ($startIdx + 2)) {
                $body = $lines[($startIdx + 2)..$endIdx] | Where-Object { $_.Trim() -ne '' }
                if ($body.Count -gt 0) {
                    $name = Split-Path $f -Leaf
                    $sections += "$name`:`n  " + ($body -join "`n  ")
                }
            }
        }
    }
}

if ($sections.Count -gt 0) {
    $text = "Pendientes en tablero de ajustes:`n`n" + ($sections -join "`n`n")
    $out = @{
        systemMessage       = $text
        hookSpecificOutput  = @{
            hookEventName     = 'SessionStart'
            additionalContext = $text
        }
    }
    $out | ConvertTo-Json -Depth 5 -Compress
}
