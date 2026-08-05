@echo off
title PI Smart Notes
echo Spoustim PI Smart Notes...

:: Spustí tvůj zkompilovaný backend/aplikaci (uprav názvy podle potřeby)
start "" "app.exe"

:: Počká 2 sekundy, než se server nastartuje
timeout /t 2 /nobreak >nul

:: Otevře aplikaci v prohlížeči
start http://localhost:8080

exit