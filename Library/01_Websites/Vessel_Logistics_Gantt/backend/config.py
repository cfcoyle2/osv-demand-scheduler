"""Configuration for the Vessel Logistics Gantt backend."""
from pathlib import Path

# --- Paths -------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# OneDrive-synced SharePoint file (live data source)
SHAREPOINT_SYNC_DIR = Path(r"C:\Users\Chris.Coyle\OneDrive - Shell\DW GOM Supply Chain - SC Delivery\Logistics New Ways of Working")
WORKBOOK_FILENAME = "Asset Activity Tracker_MASTER.xlsx"
WORKBOOK_PATH = SHAREPOINT_SYNC_DIR / WORKBOOK_FILENAME

# Sheet name in the workbook - ONLY this sheet is used.
OSV_SHEET_NAME = "OSV Demand Tracker"

# Separate color-coded worksheet used for the 2026 spot-hire schedule view.
SPOT_HIRE_SHEET_NAME = "2026 Spot Hire Update"

# Local persistence for user edits (drag / resize / status changes).
CHANGES_PATH = DATA_DIR / "changes.json"

# Local persistence for demand created directly in the app.
DEMAND_PATH = DATA_DIR / "manual_demand.json"

# Local persistence for the shared Spot Hire app tab.
SPOT_HIRE_CHANGES_PATH = DATA_DIR / "spot_hire_changes.json"
SPOT_HIRE_MANUAL_PATH = DATA_DIR / "spot_hire_manual.json"
SPOT_HIRE_IMPACTS_PATH = DATA_DIR / "spot_hire_impacts.json"

# Per-asset vessel capacity config (used by Schedule Watch conflict detection).
ASSET_CAPACITY_PATH = DATA_DIR / "asset_capacity.json"

# --- Business rules ----------------------------------------------------------
# Minimum turnaround between two consecutive runs for the same asset.
BUFFER_HOURS = 24

# Default assumed transit out (in hours) when "Base Delivery Date" is missing
# but we still have an "Offshore Req Date".
DEFAULT_TRANSIT_OUT_HOURS = 12
