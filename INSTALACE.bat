@echo off
title Instalace Pi Smart Notes
echo ===================================================
echo Instaluji Pi Smart Notes (prosim nezavirejte)...
echo ===================================================
echo.

:: 1. Kontrola / Instalace Go
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo Stahuji a instaluji Go pro Windows...
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://go.dev/dl/go1.22.0.windows-amd64.msi' -OutFile '$env:TEMP\go_installer.msi'; Start-Process msiexec.exe -ArgumentList '/i $env:TEMP\go_installer.msi /quiet /norestart' -Wait"
    set "PATH=%PATH%;C:\Program Files\Go\bin"
) else (
    echo [OK] Go je jiz nainstalovano.
)

:: 2. Kontrola / Instalace Chocolatey + FFmpeg + Tesseract
where choco >nul 2>nul
if %errorlevel% neq 0 (
    echo Instaluji Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    set "PATH=%PATH%;C:\ProgramData\chocolatey\bin"
) else (
    echo [OK] Chocolatey je jiz nainstalovano.
)

echo Instaluji FFmpeg a Tesseract OCR (muze chvili trvat)...
choco install ffmpeg tesseract -y
set "PATH=%PATH%;C:\Program Files\Tesseract-OCR;C:\ProgramData\chocolatey\bin"

:: 3. Stazeni AI Whisper modelu do backend/whisper/models
echo Stahuji AI model Whisper (~1.5 GB)...
if not exist ".\backend\whisper\models" mkdir ".\backend\whisper\models"
if not exist ".\backend\whisper\models\ggml-medium.bin" (
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin' -OutFile '.\backend\whisper\models\ggml-medium.bin'"
) else (
    echo [OK] Whisper model je jiz stazen.
)

:: 4. Priprava Go modulu a kompilace
echo Kompiluji aplikaci backend/server.exe...
if not exist "go.mod" (
    go mod init pi-smart-notes
)
go mod tidy
go build -o backend/server.exe ./backend/main.go

echo.
echo ===================================================
echo HOTOVO! Aplikace je pripravena k pouziti.
echo Muzes toto okno zavrit a spoustet pres START.bat
echo ===================================================
pause