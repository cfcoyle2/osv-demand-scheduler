# OSV Demand Scheduler & Spot Hire Planner Links

**Updated:** July 13, 2026

---

## GitHub Pages (Public - Share with Anyone)

| App | URL |
|-----|-----|
| **OSV Demand Scheduler** | https://cfcoyle2.github.io/osv-demand-scheduler/?v=20260713-current-data |
| **Spot Hire Planner** | https://cfcoyle2.github.io/osv-demand-scheduler/spot_hire.html?v=20260713-spot-hire-impacts |

> Note: GitHub Pages is read-only. Good for viewing schedules but cannot save changes.

---

## Local Server (Full Features)

| App | URL |
|-----|-----|
| **OSV Demand Scheduler** | [http://127.0.0.1:8000/](http://127.0.0.1:8000/) |
| **Spot Hire Planner** | [http://127.0.0.1:8000/spot_hire.html](http://127.0.0.1:8000/spot_hire.html) |
| **API Health Check** | [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) |

**To start the server:**
```
cd "C:\Users\Chris.Coyle\OneDrive - Shell\VS Code"
python server.py
```
Or double-click: `Start_OSV_Scheduler.bat`

---

## Team Distribution

**ZIP File:** `OSV_Demand_Scheduler_July6.zip`  
**Location:** `C:\Users\Chris.Coyle\OneDrive - Shell\VS Code\`

**Instructions:**
1. Extract ZIP to any folder
2. Double-click `Start_OSV_Scheduler.bat`
3. Browser opens automatically

---

## Features (July 6, 2026 Release)

- Route Demand Gantt timeline
- Spot Hire Planner with phase colors
- **Snapshot Comparison** - Compare baseline vs current data
  - Filter by specific asset
  - See changed/new/removed tasks
  - Field-level change details
- Excel workbook upload
- Auto-snapshot on upload
