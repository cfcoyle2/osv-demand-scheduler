# OSV Demand Scheduler & Spot Hire Planner
## User Guide

---

## Quick Reference

| What You Want To Do | Which Link to Use |
|---------------------|-------------------|
| **View data only** (no updates) | GitHub links (no server needed) |
| **Upload workbook & update data** | Local links (server required) |

---

## Option A: View-Only Mode (No Server Required)

Use these links when you just want to view the current data without making changes.

### Links (GitHub Pages - Read-Only)
- **OSV Demand Scheduler:** https://cfcoyle2.github.io/osv-demand-scheduler/
- **Spot Hire Planner:** https://cfcoyle2.github.io/osv-demand-scheduler/spot_hire.html

### SharePoint Shortcuts
- `OSV_Demand_Scheduler_GitHub.url`
- `Spot_Hire_Planner_GitHub.url`

### Limitations
- ❌ Cannot upload workbooks
- ❌ Cannot save changes
- ❌ Data only updates when someone pushes to GitHub

---

## Option B: Full Edit Mode (Server Required)

Use this when you need to upload a new workbook and update the data.

### Step 1: Open VS Code

1. Open **VS Code**
2. Open the workspace: `VS Code.code-workspace`
   - Location: `C:\Users\Chris.Coyle\OneDrive - Shell\VS Code\`

### Step 2: Start the Server

1. Open a **Terminal** in VS Code (View → Terminal or Ctrl+`)
2. Run this command:
   ```powershell
   & ".\.venv\Scripts\python.exe" server.py
   ```
3. Wait for the message:
   ```
   ==================================================
   OSV Demand Scheduler Local Server
   ==================================================
   Excel support: Yes
   Starting server at http://127.0.0.1:8000
   ```
4. **Keep this terminal open** - the server must stay running

### Step 3: Open the Application

Use one of these methods:

**Method A - Direct URL:**
- OSV Demand Scheduler: http://127.0.0.1:8000/
- Spot Hire Planner: http://127.0.0.1:8000/spot_hire.html

**Method B - SharePoint Shortcuts:**
- `OSV_Demand_Scheduler_Local.url`
- `OSV_Demand_Scheduler_Spot_Hire_Planner.url`

### Step 4: Upload Your Workbook

1. Click **"Upload Workbook"** button (or find the file input)
2. Select your Excel file: `Asset_Activity_Tracker_MASTER.xlsx`
3. Wait for the upload to complete
4. The page will automatically refresh with new data

### Step 5: Verify the Data

- **OSV Demand Scheduler:** Check the Route Schedule Gantt chart shows your tasks
- **Spot Hire Planner:** Check the Activity Table shows records with correct phases/colors

### Step 6: When Finished

1. Close the browser tabs
2. In VS Code terminal, press **Ctrl+C** to stop the server
3. Close VS Code

---

## Workbook Format Requirements

Your Excel workbook should have these sheets:

### OSV Demand Tracker Sheet
Expected columns:
| Column | Description | Example |
|--------|-------------|---------|
| Asset | Platform name | Pontus, Poseidon |
| Project | Well/project name | Sparta 007 |
| Activity | Task description | GL 01 OSV / 24 hrs / Cement |
| Status | Task status | Planned, Complete |
| Base Delivery Date | When vessel sails | 2026-06-15 |
| Offshore Req Date | Arrival at asset | 2026-06-16 |
| Offloading Complete Date | Departure from asset | 2026-06-18 |
| Back to Port | Return to port | 2026-06-19 |
| Estimated Duration (Hrs.) | Time at asset | 48 |
| Transit time back to Port | One-way travel | 18 |

### 2026 Spot Hire Update Sheet
Expected columns (headers usually on row 10):
| Column | Description | Example |
|--------|-------------|---------|
| Asset | Platform(s) | Poseidon, Mars |
| Area | Geographic region | Whale, Perdido |
| Activity | Vessel/scope | HOS Carolina - Frac Boat |
| Start Date | Charter start | 2026-05-15 |
| End Date | Charter end | 2026-08-30 |

### Phase Detection (Automatic)
The system automatically detects phases from Activity text:
- "Top Hole" → Top Hole (Cyan)
- "Deepening" / "Deepen" / "Sidetrack" → Deepening (Orange)
- "Completion" → Completion (Green)
- "PA" / "Abandon" → Abandonment (Purple)
- "Frac" → Frac Spot Hire (Coral)
- "Pilot Hole" → Pilot Hole (Cyan)
- "EV Run" → EV Run (Light Purple)
- "Demob" → Demob (Gray)
- "Dedicated" → Dedicated OSV (Yellow)

---

## Troubleshooting

### "Can't reach this page" / ERR_CONNECTION_REFUSED
**Cause:** Server is not running
**Solution:** Start the server (Step 2 above)

### "Upload failed" or no data showing
**Cause:** Wrong file format or missing columns
**Solution:** Check your workbook matches the format above

### Data not refreshing after upload
**Solution:** Hard refresh the browser with Ctrl+Shift+R

### Server won't start / Python not found
**Solution:** Make sure you're in the correct directory and run:
```powershell
cd "C:\Users\Chris.Coyle\OneDrive - Shell\VS Code"
& ".\.venv\Scripts\python.exe" server.py
```

---

## File Locations

| File | Purpose |
|------|---------|
| `server.py` | Local server with upload support |
| `data/tasks.json` | Route demand data |
| `data/spot-hire.json` | Spot hire data |
| `data/conflicts.json` | Conflict detection results |
| `data/asset-capacity.json` | Asset capacity settings |
| `uploads/` | Uploaded workbooks stored here |

---

## Updating GitHub Pages (For Sharing)

To update the read-only GitHub version with your latest data:

1. Upload your workbook using the local server (steps above)
2. Verify data looks correct
3. Copy the updated JSON files from `data/` folder
4. Push to the GitHub repository: https://github.com/cfcoyle2/osv-demand-scheduler
5. Wait ~1 minute for GitHub Pages to update

---

## Summary Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    DAILY WORKFLOW                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Open VS Code                                         │
│  2. Start server: python server.py                       │
│  3. Open http://127.0.0.1:8000                          │
│  4. Upload workbook                                      │
│  5. Review data                                          │
│  6. Stop server when done (Ctrl+C)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

*Last updated: June 8, 2026*
