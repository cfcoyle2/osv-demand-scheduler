# OSV Demand Scheduler and Spot Hire Planner Links

Saved: May 25, 2026
Updated: May 25, 2026

These local prototype links work when the Vessel Logistics Gantt backend is running on port 8000.

- OSV Demand Scheduler: http://127.0.0.1:8000/
- Spot Hire Planner: http://127.0.0.1:8000/spot-hire

Access note:

These are local prototype links. `127.0.0.1` means "this computer," so the links only work on a machine where the backend is running. If the page does not load, start the backend with the command below and refresh the browser.

Current visual update:

The OSV Demand Scheduler now uses the same dark navy, red, yellow, and blue visual scheme as the Spot Hire Planner.

Backend location:

`Library/01_Websites/Vessel_Logistics_Gantt/backend`

Start command:

```powershell
Set-Location "Library/01_Websites/Vessel_Logistics_Gantt/backend"
..\..\..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Health check:

http://127.0.0.1:8000/api/health
