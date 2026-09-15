@echo off
REM ================================================
REM  SIH Surveillance Console — Quick Start Script
REM ================================================

echo.
echo  =============================================
echo   SIH AI Surveillance Console - PROTOTYPE
echo  =============================================
echo.
echo  Make sure conda env "SIH" exists and deps are installed.
echo  Place your .mp4 in data\videos\ folder before starting.
echo.

REM Start backend in new window
echo [1/2] Starting backend (FastAPI + YOLO pipeline)...
start "SIH-Backend" cmd /k "cd /d "%~dp0backend" && conda run -n SIH python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Wait for backend to initialize (YOLO model download on first run takes longer)
echo     Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

REM Start frontend in new window
echo [2/2] Starting frontend (React + Vite)...
start "SIH-Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  =============================================
echo   SERVICES STARTING
echo  =============================================
echo.
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo.
echo   STEP 1: Open http://localhost:5173
echo   STEP 2: Select a camera feed and click "[ ENTER ]"
echo   STEP 3: Enjoy the demo!
echo.
echo   TIP: Place a real CCTV .mp4 in data\videos\
echo        for actual YOLO detections.
echo.
pause
