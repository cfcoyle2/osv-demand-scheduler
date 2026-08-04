OSV Demand Scheduler - Quick Start Guide
=========================================

REQUIREMENTS:
- Python 3.x installed (check: open CMD and type "python --version")

TO RUN:
1. Extract this ZIP to any folder
2. Double-click START_SCHEDULER.bat
3. Your browser will automatically open to http://localhost:8000
4. Press Ctrl+C in the command window to stop when done

FEATURES:
- Route Demand view with Gantt timeline
- Spot Hire Planner (http://localhost:8000/spot_hire.html)
- Snapshot Comparison: Compare baseline vs current to see schedule changes
  * Click "Compare" in the Snapshots section
  * Filter by specific asset to focus changes
  * Shows new/removed/changed tasks with field-level details
- Upload Excel workbooks to update schedule data

TROUBLESHOOTING:
- If Python is not found, install from https://www.python.org/downloads/
- During installation, check "Add Python to PATH"
- If port 8000 is busy, edit START_SCHEDULER.bat and change 8000 to another port

DATA:
- Route schedule data is in the data/ folder (JSON files)
- Snapshots are saved automatically on workbook upload
- Data last updated: July 6, 2026

CONTACT:
- Questions? Contact Chris Coyle
