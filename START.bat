@echo off
chcp 65001 > nul
title Pi Smart Notes
echo 🚀 Spouštím Pi Smart Notes...

:: Otevře prohlížeč
start http://localhost:8080

:: Spustí zkompilovaný server
cd backend
server.exe
pause
