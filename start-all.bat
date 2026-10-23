@echo off
echo ========================================================
echo Starting ResumeAI - Full Stack Architecture (Node + ML)
echo ========================================================

echo Starting Python FastAPI ML Microservice on port 8000...
start "ResumeAI ML Service (Port 8000)" cmd /k "cd /d "%~dp0ml-service" && .\venv\Scripts\activate.bat && python main.py"

timeout /t 2 /nobreak >nul

echo Starting Node.js Express Server on port 3000...
start "ResumeAI Backend (Port 3000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 2 /nobreak >nul

echo Launching ResumeAI in your browser...
start http://localhost:3000

echo All services launched!
