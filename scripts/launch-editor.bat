@echo off
cd /d "%~dp0.."
set VITE_EDITOR_MODE=true
start "" cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
start http://localhost:5173/editor.html
