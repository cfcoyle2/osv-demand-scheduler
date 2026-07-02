# OSV Demand Scheduler and Spot Hire Planner Links

Saved: May 25, 2026
Updated: July 2, 2026

---

## GitHub Pages (Public - Recommended for Sharing)

| App | URL |
|-----|-----|
| **OSV Demand Scheduler** | https://cfcoyle2.github.io/osv-demand-scheduler/ |
| **Spot Hire Planner** | https://cfcoyle2.github.io/osv-demand-scheduler/spot_hire.html |

---

## Local Server (Development)

| App | URL |
|-----|-----|
| **OSV Demand Scheduler** | http://localhost:8000/ |
| **Spot Hire Planner** | http://localhost:8000/spot_hire.html |

**Start command:**
```powershell
cd "C:\Users\Chris.Coyle\OneDrive - Shell\VS Code"
python -m http.server 8000
```

---

## Team Distribution ZIP

**File:** `OSV_Demand_Scheduler_July2.zip`  
**Location:** `C:\Users\Chris.Coyle\OneDrive - Shell\VS Code\`

Contents: index.html, app.js, styles.css, data/, START_SCHEDULER.bat, README_TEAM.txt

**Instructions:**
1. Extract ZIP to any folder
2. Double-click `START_SCHEDULER.bat`
3. Browser opens automatically

---

## Legacy Backend (Vessel Logistics Gantt)

Backend location: `Library/01_Websites/Vessel_Logistics_Gantt/backend`

Start command:
```powershell
Set-Location "Library/01_Websites/Vessel_Logistics_Gantt/backend"
..\..\..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Health check: http://127.0.0.1:8000/api/health
