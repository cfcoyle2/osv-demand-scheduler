@echo off
title OSV Demand Scheduler Server
cd /d "c:\Users\Chris.Coyle\OneDrive - Shell\VS Code"
echo.
echo ======================================================
echo   OSV Demand Scheduler - Starting Server...
echo ======================================================
echo.
echo Once started, your browser will open automatically.
echo Keep this window open while using the scheduler.
echo Press Ctrl+C to stop when done.
echo.

REM Start browser after a short delay
start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:8000/"

REM Start the server
.venv\Scripts\python.exe server.py
