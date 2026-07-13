# OSV Demand Scheduler

## Current App Links

Open the active local prototypes here when the backend server is running:

- OSV Demand Scheduler: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Spot Hire Planner: [http://127.0.0.1:8000/spot_hire.html](http://127.0.0.1:8000/spot_hire.html)

Windows internet shortcuts are included in this folder for both pages.

The OSV Demand Scheduler now uses a dark navy, red, yellow, and blue visual scheme matching the Spot Hire Planner.

## Active App Location

The working application files are currently stored here:

`Library/01_Websites/Vessel_Logistics_Gantt`

The dedicated folder you are reading now is a quick-access reference folder for the current link and project overview.

## Overview

The OSV Demand Scheduler is an interactive planning prototype for Gulf of America offshore supply vessel demand. It turns the demand tracker workflow into a route-based schedule view that supports filtering, schedule review, fleet-capacity context, and operational drill-downs.

The app is designed around route demand rather than assigning specific vessels. It uses asset, coordinator, base delivery date, offshore required date, offload duration, transit back to port, and readiness timing to visualize each route in the schedule.

## Work Completed

1. Retargeted the prototype from the previous vessel logistics Gantt concept into an OSV demand scheduler.
2. Connected the workflow to the `Asset Activity Tracker_MASTER.xlsx` workbook structure and the `OSV Demand Tracker` tab.
3. Added workbook upload support while preserving a local workbook path and sample data fallback.
4. Added Gulf of America asset dropdowns and logistics coordinator assignments.
5. Shifted the schedule model away from specific vessel assignment and toward route duration and demand timing.
6. Added route schedule bars for BDD to offshore required date, on-location/offload duration, and transit back to port.
7. Added color coding and a legend for the schedule route segments.
8. Added date-range filtering so the schedule can focus on current demand windows.
9. Added horizontal drag-to-pan across the Route Schedule timeline.
10. Added a 15-row scrollable Route Schedule viewport with sticky date headers.
11. Added interactive header metrics for Active Routes, Assets, Coordinators, and Watch Items.
12. Removed Demand Rows from the header because the Demand Table already sits below the Route Schedule.
13. Added compact scrollable drill-down panels so each header metric can show all related items while only displaying about six boxes at a time.
14. Added fleet-capacity context using 12 base OSVs plus 1 spot-hire OSV, for a total planning capacity of 13 OSVs.
15. Reworked schedule watch logic to summarize fleet capacity and show a compact list of potential route overlaps instead of overwhelming raw conflict counts.
16. Fixed the Adjust Route modal close behavior.
17. Cleared stale vessel override data and kept the app aligned to route demand rather than vessel assignment.

## Current Header Metrics

- Active Routes: routes not marked Complete.
- Assets: asset demand count in the current filtered view.
- Coordinators: coordinator load in the current filtered view.
- Watch Items: fleet-capacity and potential overlap items that may need review.

Each metric is clickable and opens a compact drill-down panel below the header metrics.

## Route Color Legend

- Teal: BDD to offshore required date.
- Green: on-location/offload duration.
- Amber: transit back to port.

## How To Run Locally

From PowerShell, start the backend with:

```powershell
Set-Location "Library/01_Websites/Vessel_Logistics_Gantt/backend"
..\..\..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Then open:

- OSV Demand Scheduler: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Spot Hire Planner: [http://127.0.0.1:8000/spot_hire.html](http://127.0.0.1:8000/spot_hire.html)

## Recommended Hosting Direction

For a production-ready shared team experience, the recommended path is either:

- Power Apps with SharePoint Lists or Dataverse for fast Microsoft 365 adoption.
- Azure Static Web Apps with Azure Functions and Microsoft Graph for a more customized interactive Gantt-style experience while still using Microsoft-backed storage and authentication.

Excel should remain useful for import/export, but the operating workflow should move into the interactive app experience.
