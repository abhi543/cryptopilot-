@echo off
title CryptoPilot - Backend Server
cd /d "%~dp0"
echo ========================================================
echo  Starting CryptoPilot FastAPI Backend Server...
echo ========================================================
call venv\Scripts\activate.bat
python backend\run.py
pause
