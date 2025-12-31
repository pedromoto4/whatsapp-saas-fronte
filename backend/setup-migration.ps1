# Script para configurar ambiente e executar migração do Alembic
# Para Windows PowerShell

Write-Host "🚀 Configurando ambiente para migração..." -ForegroundColor Cyan

# Verificar se Python está instalado
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "❌ Python não encontrado! Por favor, instale Python primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Python encontrado: $($pythonCmd.Source)" -ForegroundColor Green

# Verificar se há ambiente virtual
if (Test-Path "venv") {
    Write-Host "📦 Ambiente virtual encontrado. Ativando..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
} elseif (Test-Path ".venv") {
    Write-Host "📦 Ambiente virtual encontrado. Ativando..." -ForegroundColor Yellow
    & .\.venv\Scripts\Activate.ps1
} else {
    Write-Host "📦 Criando ambiente virtual..." -ForegroundColor Yellow
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
    Write-Host "✅ Ambiente virtual criado e ativado" -ForegroundColor Green
}

# Atualizar pip
Write-Host "📥 Atualizando pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Instalar dependências
Write-Host "📥 Instalando dependências..." -ForegroundColor Yellow
pip install -r requirements.txt

# Executar migração
Write-Host "🔄 Executando migração do banco de dados..." -ForegroundColor Cyan
alembic upgrade head

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migração concluída com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao executar migração. Verifique os logs acima." -ForegroundColor Red
    exit 1
}

