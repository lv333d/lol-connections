@echo off
rem Starts the local admin panel and opens it in the browser (used by the desktop shortcut).
title LoL Connect - Panel admina
cd /d "%~dp0.."
rem Open the browser once the server had a moment to start; if the panel already runs, the server exits immediately.
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start "" http://127.0.0.1:4321/admin.html"
echo Panel: http://127.0.0.1:4321/admin.html
echo Zamknij to okno, aby wylaczyc panel.
echo.
node scripts\admin-server.js
if errorlevel 1 pause
