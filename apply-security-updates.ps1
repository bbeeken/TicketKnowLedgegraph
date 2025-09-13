# Security Update Script - PowerShell
Write-Host "🚀 Applying Security Updates to All Containers" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Function to safely stop and remove containers
function Update-ContainerSecurely {
    param([string]$ServiceName)
    
    Write-Host "🔄 Updating $ServiceName with security hardening..." -ForegroundColor Yellow
    
    try {
        # Stop and remove the container
        docker-compose stop $ServiceName
        docker-compose rm -f $ServiceName
        
        # Rebuild with security updates
        docker-compose build $ServiceName
        
        # Start the container
        docker-compose up -d $ServiceName
        
        Write-Host "✅ $ServiceName updated successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to update $ServiceName`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔧 Building all services with security updates..." -ForegroundColor Cyan
try {
    docker-compose build
    Write-Host "✅ All services built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Restarting services with security-hardened containers..." -ForegroundColor Cyan

# Update each service individually to minimize downtime
Update-ContainerSecurely "worker"
Update-ContainerSecurely "alert-poller"
Update-ContainerSecurely "ui"
Update-ContainerSecurely "api"

Write-Host ""
Write-Host "⏱️  Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🔍 Running security validation..." -ForegroundColor Cyan
. .\validate-security.ps1

Write-Host ""
Write-Host "💡 For production deployment with enhanced security, run:" -ForegroundColor Magenta
Write-Host "   docker-compose -f docker-compose.yml -f docker-compose.security.yml up -d" -ForegroundColor White

Write-Host ""
Write-Host "🎉 Security update completed!" -ForegroundColor Green
