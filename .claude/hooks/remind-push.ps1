$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Push-Location $repoRoot
try {
    $status = (git status -sb 2>$null) -join "`n"
    if ($status -match 'ahead (\d+)') {
        $n = $matches[1]
        $msg = "Commit hecho, pero quedan $n commit(s) locales sin pushear a origin."
        $out = @{ systemMessage = $msg }
        $out | ConvertTo-Json -Depth 5 -Compress
    }
}
finally {
    Pop-Location
}
