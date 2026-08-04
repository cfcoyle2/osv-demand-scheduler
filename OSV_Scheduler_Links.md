# OSV Demand Scheduler & Spot Hire Planner Links

**Updated:** August 3, 2026

---

## GitHub Pages (Public - Share with Anyone)

| App | URL |
|-----|-----|
| **OSV Demand Scheduler** | https://cfcoyle2.github.io/osv-demand-scheduler/?v=20260731-latest-update |
| **Spot Hire Planner** | https://cfcoyle2.github.io/osv-demand-scheduler/spot_hire.html?v=20260731-latest-update |

> Note: GitHub Pages is read-only. Good for viewing schedules but cannot save changes.

---

## Local Server (Full Features)

| App | URL |
|-----|-----|
| **OSV Demand Scheduler - editable updates** | [http://127.0.0.1:8000/?v=20260731-latest-update](http://127.0.0.1:8000/?v=20260731-latest-update) |
| **Spot Hire Planner - editable updates** | [http://127.0.0.1:8000/spot_hire.html?v=20260731-latest-update](http://127.0.0.1:8000/spot_hire.html?v=20260731-latest-update) |
| **API Health Check** | [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) |

### Server Update API Links

| Update Type | URL |
|-------------|-----|
| **Route demand data** | [http://127.0.0.1:8000/api/tasks](http://127.0.0.1:8000/api/tasks) |
| **Route demand edits** | [http://127.0.0.1:8000/api/changes](http://127.0.0.1:8000/api/changes) |
| **Asset capacity** | [http://127.0.0.1:8000/api/asset-capacity](http://127.0.0.1:8000/api/asset-capacity) |
| **Spot hire data** | [http://127.0.0.1:8000/api/spot-hire](http://127.0.0.1:8000/api/spot-hire) |
| **Spot hire edits** | [http://127.0.0.1:8000/api/spot-hire/changes](http://127.0.0.1:8000/api/spot-hire/changes) |
| **Spot hire monthly notes** | [http://127.0.0.1:8000/api/spot-hire/impacts](http://127.0.0.1:8000/api/spot-hire/impacts) |
| **Workbook upload/import** | [http://127.0.0.1:8000/api/upload](http://127.0.0.1:8000/api/upload) |
| **Export current data** | [http://127.0.0.1:8000/api/export](http://127.0.0.1:8000/api/export) |

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

## Features (July 24, 2026 Release)

- Route Demand Gantt timeline
- Spot Hire Planner with phase colors
- Asset Activity Forecast uses Spot Hire planned vessel allocations and highlights spot-hire gaps
- Spot Hire Planner has a Compare section for date changes, day shifts, new activities, and cancelled/removed activities
- **Snapshot Comparison** - Compare baseline vs current data
  - Filter by specific asset
  - See changed/new/removed tasks
  - Field-level change details with aligned date-shift rows
- Excel workbook upload
- Auto-snapshot on upload
