"""Export current backend data to static JSON files for deployment.

Run this script from the backend directory to update the frontend/data/ folder
with the latest data from the Excel workbook and JSON change files.

Usage:
    cd Library/01_Websites/Vessel_Logistics_Gantt/backend
    python export_static_data.py
"""
from __future__ import annotations

import json
from pathlib import Path

from config import ASSET_CAPACITY_PATH, BUFFER_HOURS
from conflicts import detect_conflicts
from data_loader import load_raw_frame, normalize_tasks
from spot_hire_loader import PHASE_COLORS, load_spot_hire_forecast_counts, load_spot_hire_records


def _load_capacity_settings() -> dict:
    if ASSET_CAPACITY_PATH.exists():
        try:
            data = json.loads(ASSET_CAPACITY_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return {
                    "entries": data.get("entries", []),
                    "monthly_capacity_entries": data.get("monthly_capacity_entries", []),
                }
        except json.JSONDecodeError:
            pass
    return {"entries": [], "monthly_capacity_entries": []}


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "frontend" / "data"
    out_dir.mkdir(exist_ok=True)

    # Export tasks
    df, source = load_raw_frame()
    tasks = normalize_tasks(df)
    tasks_payload = {"tasks": tasks, "source": source}
    print(f"Tasks: {len(tasks)}")

    # Export conflicts
    conflicts = detect_conflicts(tasks, BUFFER_HOURS)
    conflicts_payload = {"conflicts": conflicts, "buffer_hours": BUFFER_HOURS}
    print(f"Conflicts: {len(conflicts)}")

    # Export asset capacity in API format
    capacity_settings = _load_capacity_settings()
    capacity_payload = {
        "asset_capacities": capacity_settings["entries"],
        "monthly_capacity_entries": capacity_settings["monthly_capacity_entries"],
    }
    print(f"Asset capacity entries: {len(capacity_settings['entries'])}")

    # Export spot hire
    spot_records = load_spot_hire_records()
    counts = load_spot_hire_forecast_counts()
    spot_payload = {
        "records": spot_records,
        "source": source,
        "phase_colors": PHASE_COLORS,
        "forecast_counts": counts,
    }
    print(f"Spot hire records: {len(spot_records)}")

    # Write static data files
    (out_dir / "tasks.json").write_text(json.dumps(tasks_payload, indent=2, default=str), encoding="utf-8")
    (out_dir / "conflicts.json").write_text(json.dumps(conflicts_payload, indent=2, default=str), encoding="utf-8")
    (out_dir / "asset-capacity.json").write_text(json.dumps(capacity_payload, indent=2, default=str), encoding="utf-8")
    (out_dir / "spot-hire.json").write_text(json.dumps(spot_payload, indent=2, default=str), encoding="utf-8")
    print(f"\nStatic data exported to {out_dir}")


if __name__ == "__main__":
    main()
