@echo off
echo Starte Backend und Frontend in zwei neuen Fenstern...

start "Backend (Port 8000)" cmd /k "cd /d %~dp0 && .venv\Scripts\activate && uvicorn backend.api:app --reload"
start "Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Fertig. Dashboard unter http://localhost:5173
