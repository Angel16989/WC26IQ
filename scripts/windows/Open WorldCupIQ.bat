@echo off
:: ============================================================
::  WorldCupIQ - Double-click launcher
::  Opens the World Cup 2026 dashboard
:: ============================================================

title WorldCupIQ Launcher

:: Check if PowerShell is available (it is on all Windows 10/11)
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PowerShell is required but not found.
    echo Please install it from: https://aka.ms/pscore6
    pause
    exit /b 1
)

echo.
echo   Starting WorldCupIQ...
echo.

:: Run the PowerShell launcher with execution policy bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-WorldCupIQ.ps1"
