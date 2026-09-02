#Requires -Version 5.1
<#
.SYNOPSIS
    WorldCupIQ — Windows Launcher
    Connects to the WorldCupIQ server and opens it in your browser.

.DESCRIPTION
    Tries three methods in order:
      1. Tailscale  — fastest, if you have Tailscale installed
      2. SSH tunnel — if you have the SSH key (ask Rasik)
      3. Direct URL — opens the shared Cloudflare link (always works)

.EXAMPLE
    .\Start-WorldCupIQ.ps1
    .\Start-WorldCupIQ.ps1 -Method ssh
    .\Start-WorldCupIQ.ps1 -Method url

.NOTES
    Author : WorldCupIQ
    Requires: Windows 10/11, PowerShell 5.1+
#>

[CmdletBinding()]
param(
    [ValidateSet("auto","tailscale","ssh","url")]
    [string]$Method = "auto",

    # Tower connection details — change these if needed
    [string]$TailscaleIP = "100.75.101.89",
    [string]$SshUser     = "theimp",
    [string]$SshHost     = "100.75.101.89",
    [string]$SshKeyPath  = "$env:USERPROFILE\.ssh\wciq_key",
    [int]   $FrontendPort = 3002,
    [int]   $ApiPort      = 8080,

    # The always-works Cloudflare shared URL (updated if it changes)
    [string]$CloudflareUrl = "https://deviation-pubs-fresh-leaves.trycloudflare.com",

    [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Colours ──────────────────────────────────────────────────────────────────
function Write-Banner {
    $c = [char]0x1b  # ESC
    Write-Host ""
    Write-Host "${c}[38;5;220m  ████████╗ ██████╗ ██╗  ██╗ ██████╗  ██████╗ ${c}[0m"
    Write-Host "${c}[38;5;220m  ╚══██╔══╝██╔═══██╗██║  ██║██╔═══██╗██╔═══██╗${c}[0m"
    Write-Host "${c}[38;5;154m     ██║   ██║   ██║███████║██║   ██║██║   ██║${c}[0m"
    Write-Host "${c}[38;5;154m     ██║   ██║   ██║██╔══██║██║   ██║██║   ██║${c}[0m"
    Write-Host "${c}[38;5;46m     ██║   ╚██████╔╝██║  ██║╚██████╔╝╚██████╔╝${c}[0m"
    Write-Host "${c}[38;5;46m     ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ${c}[0m"
    Write-Host ""
    Write-Host "  ${c}[38;5;51m⚽  World Cup 2026 · Intelligence Dashboard${c}[0m"
    Write-Host "  ${c}[38;5;245m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c}[0m"
    Write-Host ""
}

function Write-Step  ([string]$msg) { Write-Host "  $([char]0x1b)[38;5;51m▶${[char]0x1b}[0m $msg" }
function Write-Ok    ([string]$msg) { Write-Host "  $([char]0x1b)[38;5;46m✓${[char]0x1b}[0m $msg" }
function Write-Warn  ([string]$msg) { Write-Host "  $([char]0x1b)[38;5;220m⚠${[char]0x1b}[0m $msg" -ForegroundColor Yellow }
function Write-Fail  ([string]$msg) { Write-Host "  $([char]0x1b)[38;5;196m✗${[char]0x1b}[0m $msg" -ForegroundColor Red }
function Write-Info  ([string]$msg) { Write-Host "  $([char]0x1b)[38;5;245m·${[char]0x1b}[0m $msg" }

function Open-Browser ([string]$url) {
    if (-not $NoBrowser) {
        Write-Step "Opening $url ..."
        Start-Process $url
    }
}

function Wait-Port ([int]$port, [int]$timeoutSec = 20) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $port)
            $tcp.Close()
            return $true
        } catch { Start-Sleep -Milliseconds 500 }
    }
    return $false
}

# ── Method: Cloudflare URL ────────────────────────────────────────────────────
function Start-ViaUrl {
    Write-Step "Using shared Cloudflare URL (no setup needed)"
    Write-Info  "URL: $CloudflareUrl"
    Write-Host ""
    Write-Ok   "Opening in your browser..."
    Open-Browser $CloudflareUrl
    Write-Host ""
    Write-Host "  Press ENTER to exit." -ForegroundColor DarkGray
    $null = Read-Host
}

# ── Method: Tailscale ─────────────────────────────────────────────────────────
function Test-Tailscale {
    $ts = Get-Command tailscale -ErrorAction SilentlyContinue
    if (-not $ts) { return $false }
    try {
        $status = & tailscale status --json 2>$null | ConvertFrom-Json
        return $status.BackendState -eq "Running"
    } catch { return $false }
}

function Start-ViaTailscale {
    Write-Step "Tailscale detected — connecting directly to tower"
    $url = "http://${TailscaleIP}:${FrontendPort}"
    Write-Info  "Tower IP   : $TailscaleIP"
    Write-Info  "Frontend   : $url"
    Write-Info  "API        : http://${TailscaleIP}:${ApiPort}"

    # Quick connectivity check
    Write-Step "Checking tower reachability..."
    try {
        $resp = Invoke-WebRequest -Uri "http://${TailscaleIP}:${FrontendPort}" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Ok   "Tower is online (HTTP $($resp.StatusCode))"
    } catch {
        Write-Warn "Could not reach tower — it may be offline or Tailscale is not connected"
        Write-Info "Falling back to Cloudflare URL..."
        Start-ViaUrl
        return
    }

    Open-Browser $url
    Write-Host ""
    Write-Host "  🏆 WorldCupIQ is open! Press ENTER to exit." -ForegroundColor Green
    $null = Read-Host
}

# ── Method: SSH Tunnel ────────────────────────────────────────────────────────
function Test-SshAvailable {
    return ($null -ne (Get-Command ssh -ErrorAction SilentlyContinue))
}

function Test-SshKey {
    return (Test-Path $SshKeyPath)
}

function Start-ViaSsh {
    if (-not (Test-SshAvailable)) {
        Write-Fail "SSH not found on this PC."
        Write-Info "SSH is built into Windows 10/11. If it is missing, enable it via:"
        Write-Info "Settings → Apps → Optional Features → Add: OpenSSH Client"
        Write-Host ""
        Write-Warn "Falling back to Cloudflare URL..."
        Start-ViaUrl
        return
    }

    # Build SSH args
    $sshArgs = @(
        "-N",                                # no remote command
        "-L", "${FrontendPort}:localhost:${FrontendPort}",
        "-L", "${ApiPort}:localhost:${ApiPort}",
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ServerAliveInterval=30",
        "-o", "ServerAliveCountMax=3",
        "-o", "ExitOnForwardFailure=yes"
    )

    if (Test-SshKey) {
        Write-Ok   "SSH key found at $SshKeyPath"
        $sshArgs += @("-i", $SshKeyPath)
    } else {
        Write-Info "No SSH key found — you will be prompted for a password"
        Write-Info "(Ask Rasik for the key file to avoid this)"
    }

    $sshArgs += "${SshUser}@${SshHost}"

    Write-Step "Starting SSH tunnel..."
    Write-Info  "  $SshUser@$SshHost  →  localhost:$FrontendPort"
    Write-Host ""

    $sshProc = Start-Process ssh -ArgumentList $sshArgs -PassThru -WindowStyle Hidden

    Write-Step "Waiting for tunnel to be ready..."
    $ready = Wait-Port -port $FrontendPort -timeoutSec 25
    if (-not $ready) {
        Write-Fail "Tunnel did not come up in 25 seconds."
        Write-Info "Possible reasons:"
        Write-Info "  · Wrong password / SSH key mismatch"
        Write-Info "  · Tower is offline"
        Write-Info "  · Firewall blocking port 22"
        if (-not $sshProc.HasExited) { $sshProc.Kill() }
        Write-Host ""
        Write-Warn "Falling back to Cloudflare URL..."
        Start-ViaUrl
        return
    }

    Write-Ok "Tunnel active!"
    $url = "http://localhost:${FrontendPort}"
    Open-Browser $url

    Write-Host ""
    Write-Host "  🏆 WorldCupIQ is running at $url" -ForegroundColor Green
    Write-Host "  Press ENTER to disconnect the tunnel and exit." -ForegroundColor DarkGray
    $null = Read-Host

    if (-not $sshProc.HasExited) {
        $sshProc.Kill()
        Write-Ok "Tunnel closed."
    }
}

# ── Main ──────────────────────────────────────────────────────────────────────
Clear-Host
Write-Banner

Write-Host "  METHOD: " -NoNewline
switch ($Method) {
    "auto" {
        Write-Host "AUTO-DETECT" -ForegroundColor Cyan
        Write-Host ""
        if (Test-Tailscale) {
            Write-Ok "Tailscale is installed and connected"
            Start-ViaTailscale
        } elseif (Test-SshAvailable) {
            Write-Ok "SSH available — setting up tunnel"
            Start-ViaSsh
        } else {
            Write-Info "No Tailscale or SSH detected"
            Start-ViaUrl
        }
    }
    "tailscale" {
        Write-Host "TAILSCALE" -ForegroundColor Cyan
        Write-Host ""
        Start-ViaTailscale
    }
    "ssh" {
        Write-Host "SSH TUNNEL" -ForegroundColor Cyan
        Write-Host ""
        Start-ViaSsh
    }
    "url" {
        Write-Host "DIRECT URL" -ForegroundColor Cyan
        Write-Host ""
        Start-ViaUrl
    }
}
