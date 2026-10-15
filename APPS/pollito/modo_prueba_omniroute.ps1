# Arranca Pollito en MODO DE PRUEBA contra OmniRoute (gateway local de LLMs,
# https://github.com/diegosouzapw/OmniRoute) en vez de la API de Anthropic.
#
# En este modo la API key real de secreto.py NO se usa (ver config.py:
# get_api_key) - sirve para probar como se sienten las respuestas sin gastar.
#
# Requisitos (una sola vez):   npm install -g omniroute
# Antes de correr este script:  omniroute serve      (en otra terminal)
#
# Uso:  .\modo_prueba_omniroute.ps1                 (modelo por defecto)
#       .\modo_prueba_omniroute.ps1 <id-de-modelo>  (uno de http://localhost:20128/v1/models)
#
# El .exe de Sofi no lleva estas variables, asi que sigue yendo a Anthropic.

$env:POLLITO_API_BASE_URL = "http://localhost:20128"
if ($args.Count -gt 0) {
    $env:POLLITO_MODEL_ID = $args[0]
} else {
    $env:POLLITO_MODEL_ID = "claude-sonnet-5"
}

$python = Join-Path $env:LOCALAPPDATA "Programs\Python\Python38\python.exe"
if (-not (Test-Path $python)) { $python = "python" }

Write-Host "Pollito en modo de prueba -> $env:POLLITO_API_BASE_URL (modelo: $env:POLLITO_MODEL_ID)"
& $python (Join-Path $PSScriptRoot "main.py")
