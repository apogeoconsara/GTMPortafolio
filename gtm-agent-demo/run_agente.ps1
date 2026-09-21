# run_agente.ps1
# Script para Windows: crea el entorno virtual, instala dependencias,
# valida ANTHROPIC_API_KEY y corre el demo (agente.py).

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "== gtm-agent-demo =="

if (-not (Test-Path ".venv")) {
    Write-Host "Creando entorno virtual (.venv)..."
    python -m venv .venv
} else {
    Write-Host "Entorno virtual (.venv) ya existe."
}

Write-Host "Activando entorno virtual..."
& ".\.venv\Scripts\Activate.ps1"

Write-Host "Instalando dependencias desde requirements.txt..."
pip install -r requirements.txt

$apiKey = $env:ANTHROPIC_API_KEY

if ([string]::IsNullOrWhiteSpace($apiKey) -or $apiKey.Length -le 40) {
    Write-Host ""
    Write-Host "ERROR: La variable de entorno ANTHROPIC_API_KEY no esta definida o parece invalida (debe tener mas de 40 caracteres)."
    Write-Host "Definela en esta misma terminal antes de volver a ejecutar este script, por ejemplo:"
    Write-Host "  `$env:ANTHROPIC_API_KEY = 'tu_api_key_aqui'"
    Write-Host ""
    exit 1
}

Write-Host "ANTHROPIC_API_KEY detectada. Ejecutando agente.py..."
python agente.py
