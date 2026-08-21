$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$prompt = $json.prompt
if ($prompt) {
    $t = $prompt.Trim()
    $proyecto = $null
    $skill = 'PECAS'
    $rutaProyecto = $null
    if ($t -ieq 'WALLET CONTROL') { $proyecto = 'wallet-control'; $rutaProyecto = "APPS/wallet-control" }
    elseif ($t -ieq 'RUTA SEGURA') { $proyecto = 'ruta-segura'; $rutaProyecto = "APPS/ruta-segura" }
    elseif ($t -ieq 'POLLITO') { $proyecto = 'pollito'; $rutaProyecto = "APPS/pollito" }

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

        # Auto npm install si package.json/package-lock.json cambiaron desde la ultima instalacion
        # (evita el error "esta en package.json pero no instalado" al cambiar de maquina o tras un pull)
        $npmStatus = ""
        $pkgJson = Join-Path $repoDir "$rutaProyecto/package.json"
        if (Test-Path $pkgJson) {
            try {
                $nodeModules = Join-Path $repoDir "$rutaProyecto/node_modules"
                $hashFile = Join-Path $nodeModules ".install-hash.txt"
                $lockFile = Join-Path $repoDir "$rutaProyecto/package-lock.json"
                $filesToHash = @($pkgJson)
                if (Test-Path $lockFile) { $filesToHash += $lockFile }
                $currentHash = ($filesToHash | Sort-Object | ForEach-Object { (Get-FileHash $_ -Algorithm SHA256).Hash }) -join '|'

                $needsInstall = $true
                if ((Test-Path $nodeModules) -and (Test-Path $hashFile)) {
                    $savedHash = Get-Content $hashFile -Raw
                    if ($savedHash.Trim() -eq $currentHash) { $needsInstall = $false }
                }

                if ($needsInstall) {
                    Push-Location (Join-Path $repoDir $rutaProyecto)
                    npm install --no-audit --no-fund --quiet 2>&1 | Out-Null
                    $npmExit = $LASTEXITCODE
                    Pop-Location
                    if ($npmExit -eq 0) {
                        Set-Content -Path $hashFile -Value $currentHash -NoNewline
                        $npmStatus = "Dependencias: se detecto que package.json/package-lock.json cambiaron y se corrio 'npm install' automaticamente, quedo al dia."
                    } else {
                        $npmStatus = "Aviso: 'npm install' automatico fallo (codigo $npmExit) - puede hacer falta correrlo a mano y revisar el error."
                    }
                }
            } catch {
                $npmStatus = "Aviso: fallo el chequeo automatico de dependencias npm ($($_.Exception.Message))."
            }
        }

        $msg = "El usuario quiere arrancar una sesion enfocada en el proyecto '$proyecto' (carpeta '$rutaProyecto'). " +
               "$npmStatus " +
               "$pullStatus " +
               "Como primera accion: menciona brevemente ese resultado de git, invoca la skill $skill y saluda recomendandole al usuario " +
               "que ejecute /clear para empezar con un contexto limpio antes de seguir " +
               "trabajando especificamente en '$rutaProyecto'."
        $out = @{
            hookSpecificOutput = @{
                hookEventName     = 'UserPromptSubmit'
                additionalContext = $msg
            }
        }
        $out | ConvertTo-Json -Depth 5 -Compress
    }
}
