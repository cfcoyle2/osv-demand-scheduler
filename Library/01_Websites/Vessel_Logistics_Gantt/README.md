# OSV Demand Scheduler

Interactive planning space for the `Asset Activity Tracker_MASTER.xlsx` workbook, using the `OSV Demand Tracker` sheet as the Excel source.

## Best Platform Direction

For a team-facing production version, the best fit is a SharePoint/Teams-hosted digital workspace with one of these patterns:

- **Power Apps + SharePoint Lists or Dataverse** for fastest corporate adoption, permissions, forms, and Teams embedding.
- **Azure Static Web Apps + Azure Functions + Microsoft Graph** for a custom Gantt interface with SharePoint-backed state, matching the pattern already used by the Logistics Lookahead app.
- Keep Excel as an import/export path, not as the operating interface.

## Current Prototype

This app provides:

- Workbook upload for `Asset Activity Tracker_MASTER.xlsx`.
- OSV-only parsing from the `OSV Demand Tracker` sheet.
- Manual demand entry by logistics coordinator, Gulf of America asset, project, activity, Base Delivery Date, Offshore Required Date, on-location duration, and transit-back duration.
- Automatic calculation of offloading completion and back-to-port dates.
- Gantt-style route schedule by asset and activity duration, without assigning a specific vessel.
- Edit dialog for schedule changes.
- Conflict detection for overlapping asset routes and short route turnarounds.
- Excel export of the current schedule.

## Run Locally

```powershell
cd "Library/01_Websites/Vessel_Logistics_Gantt/backend"
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`.

Place the workbook at `backend/data/Asset Activity Tracker_MASTER.xlsx` or use the upload button in the app.

## Deploy to Azure Static Web Apps

The `frontend/` folder can be deployed as a static web app for read-only viewing without running the backend server.

### Step 1: Export Current Data

Before deploying, export the latest data from the backend:

```powershell
cd "Library/01_Websites/Vessel_Logistics_Gantt/backend"
python export_static_data.py
```

This creates/updates JSON files in `frontend/data/` with the current schedule data.

### Step 2: Deploy Frontend

**Option A: Azure Portal**
1. Go to Azure Portal → Create resource → Static Web App
2. Connect to your GitHub repo or upload directly
3. Set the app location to `Library/01_Websites/Vessel_Logistics_Gantt/frontend`
4. No API location needed (static-only deployment)

**Option B: Azure CLI**
```bash
az staticwebapp create \
  --name osv-demand-scheduler \
  --resource-group YOUR_RESOURCE_GROUP \
  --source https://github.com/YOUR_REPO \
  --location "Central US" \
  --branch main \
  --app-location "Library/01_Websites/Vessel_Logistics_Gantt/frontend" \
  --output-location ""
```

**Option C: VS Code Extension**
1. Install the Azure Static Web Apps extension
2. Right-click the `frontend` folder → Deploy to Static Web App
3. Follow the prompts to create or select an existing app

### Step 3: Update Data

To refresh the hosted app with new data:
1. Run `python export_static_data.py` locally
2. Commit and push the updated `frontend/data/*.json` files
3. Azure will automatically redeploy

### Static Mode Features

When deployed without the backend:
- **Read-only**: Users can view the schedule but cannot make changes
- **Banner**: A read-only indicator appears at the top of the page
- **Same UI**: All filtering, timeline navigation, and drill-down features work normally