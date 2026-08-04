@echo off
chcp 65001 > nul
title Pi Smart Notes
echo 🚀 Spouštím Pi Smart Notes...

:: Spustí zkompilovaný server v novém okně přímo z kořenové složky
start "Pi Smart Notes Server" ".\backend\server.exe"

:: Počká 1 sekundu na nastartování serveru a otevře prohlížeč
timeout /t 1 > nul
start http://localhost:8080