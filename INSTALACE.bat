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
choco install ffmpeg tesseract tesseract-lang-ces -y

:: 3. Stazeni AI Whisper modelu
echo Stahuji AI model Whisper (~1.5 GB)...
if not exist ".\whisper\models" mkdir ".\whisper\models"
if not exist ".\whisper\models\ggml-medium.bin" (
    powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin' -OutFile '.\whisper\models\ggml-medium.bin'"
) else (
    echo Whisper model je jiz stazen.
)

:: 4. Priprava Go modulu a kompilace
echo Kompiluji aplikaci...
if not exist "go.mod" (
    go mod init pi-smart-notes
)
go mod tidy
go build -o backend/server.exe ./backend/main.go

echo.
echo ===================================================
echo HOTOVO! Aplikace je pripravena k pouziti.
echo Muces toto okno zavrit a spoustet pres 2-SPUSTIT.bat
echo ===================================================
pause