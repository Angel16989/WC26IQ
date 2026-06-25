#Requires -Version 5.1
<#
.SYNOPSIS
    Gets the current WorldCupIQ share link from the tower.
    Run this if the link in HOW TO OPEN.txt stops working.
#>

param([string]$SshUser = "theimp", [string]$SshHost = "100.75.101.89")

Write-Host ""
Write-Host "  Fetching current WorldCupIQ share link..." -ForegroundColor Cyan
Write-Host ""

try {
    $url = & ssh "${SshUser}@${SshHost}" `
        "journalctl --user -u wciq-tunnel.service -n 50 --no-pager 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1" `
        2>$null

    if ($url) {
        Write-Host "  ✓ Current link: " -NoNewline -ForegroundColor Green
        Write-Host $url -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Copy this link and send it to anyone!" -ForegroundColor DarkGray
        Set-Clipboard -Value $url
        Write-Host "  (Copied to clipboard)" -ForegroundColor DarkGray
    } else {
        Write-Host "  ✗ Could not get link — is the tower online?" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ SSH connection failed: $_" -ForegroundColor Red
    Write-Host "  Make sure you can SSH to ${SshUser}@${SshHost}" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  Press ENTER to exit." -ForegroundColor DarkGray
$null = Read-Host
