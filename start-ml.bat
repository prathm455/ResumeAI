@echo off
echo ===================================================
echo Starting ResumeAI Python ML Microservice (Port 8000)
echo ===================================================
cd /d "%~dp0ml-service"
call .\venv\Scripts\activate.bat
python main.py
pause
