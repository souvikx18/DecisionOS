# ============================================================
# DecisionOS — Automated Windows PowerShell Deployment Script
# ============================================================
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
# ============================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "      🚀 DecisionOS Production Deployment Script      " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Check Docker
Write-Host "`n[1/5] Checking Docker installation..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed or not in PATH. Please install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    Exit 1
}
Write-Host "✓ Docker detected." -ForegroundColor Green

# 2. Check Environment Configuration
Write-Host "`n[2/5] Checking .env configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.docker.example") {
        Write-Host "⚠️  No .env file found. Copying .env.docker.example to .env..." -ForegroundColor Yellow
        Copy-Item ".env.docker.example" ".env"
        Write-Host "✓ Created .env file." -ForegroundColor Green
    } else {
        Write-Host "❌ Missing .env.docker.example template." -ForegroundColor Red
        Exit 1
    }
} else {
    Write-Host "✓ .env file found." -ForegroundColor Green
}

# 3. Build containers
Write-Host "`n[3/5] Building production Docker images..." -ForegroundColor Yellow
docker compose build

# 4. Start services
Write-Host "`n[4/5] Starting DecisionOS service stack..." -ForegroundColor Yellow
docker compose up -d

# 5. Summary
Write-Host "`n[5/5] Checking service status..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
docker compose ps

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "  ✨ DecisionOS has been deployed successfully!       " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  🌐 Frontend App:     http://localhost"
Write-Host "  ⚙️ Backend API:      http://localhost:5000/api/v1"
Write-Host "  🩺 Health Check:     http://localhost/health"
Write-Host "  📜 View Logs:        docker compose logs -f"
Write-Host "  🛑 Stop Stack:       docker compose down"
Write-Host "======================================================" -ForegroundColor Green
