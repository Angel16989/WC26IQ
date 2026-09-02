#Requires -Version 5.1
<#
.SYNOPSIS
    One-time SSH key setup for WorldCupIQ.
    Run this once after Rasik sends you the key file.

.EXAMPLE
    .\Setup-SshKey.ps1 -KeyFile "C:\Users\You\Downloads\wciq_key"
#>

param(
    [Parameter(Mandatory)]
    [string]$KeyFile
)

$dest = "$env:USERPROFILE\.ssh\wciq_key"
$sshDir = "$env:USERPROFILE\.ssh"

Write-Host ""
Write-Host "  WorldCupIQ SSH Key Setup" -ForegroundColor Cyan
Write-Host "  ─────────────────────────" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path $KeyFile)) {
    Write-Host "  ✗ Key file not found: $KeyFile" -ForegroundColor Red
    Write-Host "  Make sure you have the file Rasik sent you." -ForegroundColor DarkGray
    pause; exit 1
}

if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
    Write-Host "  ✓ Created $sshDir" -ForegroundColor Green
}

Copy-Item -Path $KeyFile -Destination $dest -Force

# Fix permissions — SSH on Windows is strict about this
try {
    $acl = Get-Acl $dest
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $env:USERNAME, "FullControl", "Allow"
    )
    $acl.SetAccessRule($rule)
    Set-Acl -Path $dest -AclObject $acl
    Write-Host "  ✓ Key permissions set correctly" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not set key permissions (run as Administrator if SSH rejects the key)" -ForegroundColor Yellow
}

Write-Host "  ✓ Key installed at: $dest" -ForegroundColor Green
Write-Host ""
Write-Host "  You are ready! Double-click 'Open WorldCupIQ.bat' to connect." -ForegroundColor Green
Write-Host ""
pause
