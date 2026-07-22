# Workbook Format Guide for OSV Demand Scheduler

This guide explains how to format your Excel workbook for import into the OSV Demand Scheduler.

## Quick Start

1. **Start the server**: `python server.py`
2. **Open the app**: http://127.0.0.1:8000
3. **Upload your workbook**: Click "Upload Workbook" and select your `.xlsx` file

You can now use one combined workbook for both apps. Run `python create_combined_update_template.py` to generate `OSV_Scheduler_Combined_Update_YYYYMMDD.xlsx`, then maintain both tabs in that single file:

- `OSV Demand Tracker` updates the OSV Demand Scheduler
- `Spot Hire Update` updates the Spot Hire Planner and auto-syncs asset capacity

Upload the combined workbook once from the OSV Demand Scheduler page. The server will process both recognized tabs in the same upload.

---

## Excel Workbook Format

### Tasks Sheet (Route Demand)

The server will auto-detect sheets containing route/task data. Name your sheet something like:
- "Route Demand", "OSV Schedule", "Tasks", or similar

#### Required Columns

| Column Name | Description | Example |
|-------------|-------------|---------|
| **Asset** | Platform/rig name | `Pontus`, `Poseidon`, `Mars` |
| **Activity** | Task description | `GL 01 OSV / 24 hrs / Cement Head` |
| **Start Date** | When vessel sails | `2026-06-15` or `6/15/2026` |

#### Optional Columns

| Column Name | Description | Default |
|-------------|-------------|---------|
| Coordinator | Person responsible | (empty) |
| Vessel | Vessel name | `Route Demand` |
| Project | Well/project name | (empty) |
| Status | Task status | `Planned` |
| Loading Time | When loading begins; starts the Route Schedule bar | (empty) |
| Offshore Start | Arrival at asset | (calculated) |
| Offshore End | Departure from asset | (calculated) |
| Return End | Return to port | (calculated) |
| Duration Hours | Time at asset | `24` |
| Transit Hours | One-way travel time | `18` |

#### Column Name Variations Accepted

The parser is flexible with column names:
- **Asset**: `Asset`, `Platform`, `Rig`
- **Start Date**: `Start Date`, `Start`, `Sail Date`
- **Loading Time**: `Loading Time`, `Loading`, `Load Time`, `Load Date`
- **Activity**: `Activity`, `Description`, `Task`, `Scope`
- **Duration**: `Duration Hours`, `Duration`, `Hours`
- **Transit**: `Transit Hours`, `Transit`, `Steam`

---

### Spot Hire Sheet

Name your sheet something like:
- "Spot Hire", "Charter", "2026 Spot Hire Update"

#### Required Columns

| Column Name | Description | Example |
|-------------|-------------|---------|
| **Asset** | Platform(s) covered | `Poseidon` or `Mars, Olympus` |
| **Start Date** | Charter start | `2026-05-15` |
| **End Date** | Charter end | `2026-08-30` |

#### Optional Columns

| Column Name | Description | Default |
|-------------|-------------|---------|
| Area | Geographic region | (empty) |
| Activity | Vessel/scope description | (empty) |
| Phase | Category for coloring | `Other` |
| Status | Current status | `Planned` |
| Notes | Additional info | (empty) |

---

## JSON Format Reference

If you prefer to create JSON files directly, here are the formats:

### tasks.json

```json
{
  "tasks": [
    {
      "id": "unique12char",
      "asset": "Pontus",
      "coordinator": "Chris Coyle",
      "vessel": "Route Demand",
      "project": "Sparta 007 Drill Pilot Hole",
      "activity": "GL 01 OSV / 48 hrs / 15,000 bbl of WBM",
      "status": "Planned",
      "start_date": "2026-06-15T00:00:00",
      "offshore_start": "2026-06-16T18:00:00",
      "offshore_end": "2026-06-18T18:00:00",
      "return_end": "2026-06-19T12:00:00",
      "duration_hours": 48.0,
      "transit_hours": 18.0,
      "source": "workbook"
    }
  ],
  "source": "workbook:MyFile.xlsx:Sheet1",
  "buffer_hours": 24
}
```

### spot-hire.json

```json
{
  "source": "workbook:AssetTracker.xlsx:Spot Hire",
  "records": [
    {
      "id": "unique12char",
      "asset": "Poseidon",
      "display_asset": "Poseidon",
      "area": "Whale",
      "activity": "HOS Carolina - Frac Boat",
      "phase": "Frac Spot Hire",
      "color": "#b79ac7",
      "start_date": "2026-05-15",
      "end_date": "2026-08-30",
      "status": "Planned",
      "notes": "Additional info here",
      "source": "workbook"
    }
  ],
  "phase_colors": {
    "Frac Spot Hire": "#b79ac7",
    "EV Run": "#16858c"
  }
}
```

### asset-capacity.json

```json
{
  "asset_capacities": [
    {
      "asset": "Poseidon",
      "vessel_count": 2,
      "notes": "Whale 10 Campaign",
      "date_from": "2026-05-10",
      "date_to": "2026-07-12"
    }
  ],
  "monthly_capacity_entries": [
    {
      "capacity_text": "9",
      "date_from": "2026-06-01",
      "date_to": "2026-06-30"
    }
  ]
}
```

### conflicts.json

```json
{
  "conflicts": [
    {
      "type": "on_location_overlap",
      "severity": "conflict",
      "asset": "Poseidon",
      "asset_capacity": 1,
      "active_routes": 2,
      "task_ids": ["abc123", "def456"],
      "overlap_start": "2026-06-21T16:30:00",
      "overlap_end": "2026-06-22T01:15:00",
      "message": "Description of the conflict"
    }
  ],
  "fleet": null
}
```

---

## Status Values

Valid status values for tasks and spot hire records:
- `Planned` - Scheduled but not started
- `In Progress` - Currently active
- `Complete` - Finished
- `Cancelled` - No longer needed
- `On Hold` - Temporarily paused

---

## Tips

1. **Date Formats**: Use ISO format (`2026-06-15`) or US format (`6/15/2026`)
2. **Multiple Assets**: Separate with commas: `Mars, Olympus, Ursa`
3. **Activity Format**: Follow convention: `GL 01 OSV / 24 hrs / Description`
4. **IDs**: Leave blank in Excel - they're auto-generated on import
5. **Empty Rows**: Skipped automatically
6. **Header Row**: Must be the first row of the sheet

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Excel support not available" | Run `pip install openpyxl` |
| Sheet not detected | Rename to include "Route", "Task", or "Spot" |
| Columns not mapping | Check column names match variations above |
| Dates showing wrong | Use ISO format: `2026-06-15` |
| Upload fails silently | Check browser console for errors |

---

## Server Commands

```powershell
# Install dependencies (one time)
pip install flask flask-cors openpyxl

# Start the server
python server.py

# Server will be available at:
# http://127.0.0.1:8000
```
