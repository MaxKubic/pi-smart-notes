@echo off
title Instalace Pi Smart Notes
echo ===================================================
echo Instaluji Pi Smart Notes (prosim nezavirejte)...
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Kontrola / Instalace Go
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo Stahuji a instaluji Go pro Windows...
    powershell -Command "Invoke-WebRequest -Uri 'https://go.dev/dl/go1.22.0.windows-amd64.msi' -OutFile '$env:TEMP\go_installer.msi'; Start-Process msiexec.exe -ArgumentList '/i $env:TEMP\go_installer.msi /quiet /norestart' -Wait"
    set "PATH=%PATH%;C:\Program Files\Go\bin"
) else (
    echo Go je jiz nainstalovano.
)

:: 2. Kontrola / Instalace Chocolatey + FFmpeg + Tesseract
where choco >nul 2>nul
if %errorlevel% neq 0 (
    echo Instaluji Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    set "PATH=%PATH%;C:\ProgramData\chocolatey\bin"
) else (
    echo Chocolatey je jiz nainstalovano.
)

echo Instaluji FFmpeg a Tesseract OCR...
choco install ffmpeg tesseract -y

:: 3. Stazeni AI Whisper modelu
echo Stahuji AI model Whisper (~1.5 GB)...
if not exist ".\backend\whisper\models" mkdir ".\backend\whisper\models"
if not exist ".\backend\whisper\models\ggml-medium.bin" (
    powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin' -OutFile '.\backend\whisper\models\ggml-medium.bin'"
) else (
    echo Whisper model je jiz stazen.
)

:: 4. Priprava Go modulu a kompilace v adresari backend
echo Kompiluji aplikaci...
cd backend
if exist "go.mod" del /f /q go.mod
if exist "go.sum" del /f /q go.sum
go mod init pi-smart-notes/backend
go mod tidy
go build -o server.exe main.go
cd ..

echo.
echo ===================================================
echo HOTOVO! Aplikace je pripravena k pouziti.
echo Muces toto okno zavrit a spoustet pres 2-SPUSTIT.bat
echo ===================================================
pause
