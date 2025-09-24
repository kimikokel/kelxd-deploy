# Update cache-busting version for Kelist
Write-Host "🔄 Updating cache-busting version..." -ForegroundColor Cyan

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Write-Host "New version: $timestamp" -ForegroundColor Green

try {
    # Update index.html
    $indexPath = "static\index.html"
    if (Test-Path $indexPath) {
        $content = Get-Content $indexPath -Raw
        $content = $content -replace '\?v=[^"'']*', "?v=$timestamp"
        $content | Set-Content $indexPath -NoNewline
        Write-Host "✅ Updated $indexPath" -ForegroundColor Green
    } else {
        Write-Host "❌ File not found: $indexPath" -ForegroundColor Red
    }

    # Update service worker
    $swPath = "static\sw.js"
    if (Test-Path $swPath) {
        $swContent = Get-Content $swPath -Raw
        $swContent = $swContent -replace "kelist-v[^']*", "kelist-v$timestamp"
        $swContent | Set-Content $swPath -NoNewline
        Write-Host "✅ Updated $swPath" -ForegroundColor Green
    } else {
        Write-Host "❌ File not found: $swPath" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "🎉 Cache-busting version updated successfully!" -ForegroundColor Green
    Write-Host "You can now commit and push your changes." -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error updating files: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Read-Host "Press Enter to continue"
