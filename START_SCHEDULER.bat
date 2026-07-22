@echo off
echo ============================================
echo   OSV Demand Scheduler - Local Server
echo ============================================
echo.
echo Starting local web server on port 8000...
echo.
echo Once started, your browser will open to:
echo   http://localhost:8000
echo.
echo Press Ctrl+C to stop the server when done.
echo ============================================
echo.

REM Wait 2 seconds then open browser
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"

REM Start Flask API server
if exist ".venv\Scripts\python.exe" (
	".venv\Scripts\python.exe" server.py
) else (
	python server.py
)

pause
