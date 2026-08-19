# DGI Quantrum - Setup & Deploy Script
# Ejecutar: powershell -ExecutionPolicy Bypass -File deploy.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  DGI Quantrum - Deploy Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Git
Write-Host "[1/5] Verificando Git..." -ForegroundColor Yellow
$gitVersion = git --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git no instalado. Instalar desde https://git-scm.com" -ForegroundColor Red
    exit 1
}
Write-Host "  Git: $gitVersion" -ForegroundColor Green

# 2. Inicializar repositorio
Write-Host "[2/5] Preparando repositorio..." -ForegroundColor Yellow
cd C:\network-ai-os
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}
Write-Host "  Repositorio listo" -ForegroundColor Green

# 3. Agregar archivos
Write-Host "[3/5] Agregando archivos..." -ForegroundColor Yellow
git add .
$changes = git status --porcelain
if ($changes) {
    git commit -m "feat: DGI Quantrum v1.0 - AI-powered lead generation platform"
    Write-Host "  Commit realizado" -ForegroundColor Green
} else {
    Write-Host "  Sin cambios pendientes" -ForegroundColor Green
}

# 4. Verificar remote
Write-Host "[4/5] Verificando remote..." -ForegroundColor Yellow
$remote = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  No hay remote configurado." -ForegroundColor Yellow
    Write-Host "  Ejecuta: git remote add origin https://github.com/TU_USUARIO/dgi-quantrum.git" -ForegroundColor Cyan
    Write-Host "  Luego: git push -u origin main" -ForegroundColor Cyan
} else {
    Write-Host "  Remote: $remote" -ForegroundColor Green
}

# 5. Instrucciones
Write-Host ""
Write-Host "[5/5] Siguientes pasos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Crear repositorio en GitHub:" -ForegroundColor White
Write-Host "     https://github.com/new" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Conectar y push:" -ForegroundColor White
Write-Host "     git remote add origin https://github.com/TU_USUARIO/dgi-quantrum.git" -ForegroundColor Cyan
Write-Host "     git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. En Railway:" -ForegroundColor White
Write-Host "     - Crear proyecto desde GitHub" -ForegroundColor Cyan
Write-Host "     - Agregar PostgreSQL" -ForegroundColor Cyan
Write-Host "     - Configurar variables (ver DEPLOY.md)" -ForegroundColor Cyan
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  DGI Quantrum listo para vivir!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
