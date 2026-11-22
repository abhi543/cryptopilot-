@echo off
title CryptoPilot Desktop Launcher
cd /d "%~dp0"
echo ========================================================
echo  Launching CryptoPilot Full Stack System...
echo ========================================================
echo Starting Backend (FastAPI on Port 8000)...
start "CryptoPilot Backend" cmd /k "call venv\Scripts\activate.bat && python backend\run.py"

timeout /t 3 /nobreak >nul

echo Starting Frontend (Next.js on Port 3000)...
start "CryptoPilot Frontend" cmd /k "cd frontend && npm run dev"

echo ========================================================
echo  Both servers launched!
echo  - Backend:  http://127.0.0.1:8000
echo  - Frontend: http://localhost:3000
echo  - Swagger:  http://127.0.0.1:8000/api/v1/docs
echo ========================================================
pause
