"""Reads and normalizes OSV Demand Tracker data into Task objects.

Only the 'OSV Demand Tracker' sheet is used. All other sheets are ignored.
"""
from __future__ import annotations

import hashlib
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from config import (
    DEFAULT_TRANSIT_OUT_HOURS,
    OSV_SHEET_NAME,
    WORKBOOK_PATH,
)

ASSET_COORDINATORS = {
    "Pontus": "Chris Coyle",
    "Poseidon": "Chris Coyle",
    "Stena Evolution": "Chris Coyle",
    "Noble Voyager": "Chris Coyle",
    "Auger": "Jennifer Palmisano",
    "ESA": "Jennifer Palmisano",
    "Stones": "Jennifer Palmisano",
    "Whale": "Jennifer Palmisano",
    "Perdido": "Jennifer Palmisano",
    "Mars": "Bryan Barron",
    "Olympus": "Bryan Barron",
    "Ursa": "Bryan Barron",
    "Appomattox": "Daphne Barrera",
    "Vito": "Daphne Barrera",
    "Q5000": "Daphne Barrera",
}

# Column names we expect in the sheet. We normalize headers (strip / lowercase)
# so small variations in spacing/case still match.
EXPECTED_COLUMNS = {
    "status": "status",
    "asset": "asset",
    "logistics coordinator": "coordinator",
    "coordinator": "coordinator",
    "vessel": "vessel",
    "boat": "vessel",
    "assigned vessel": "vessel",
    "project": "project",
    "activity": "activity",
    "base delivery date": "base_delivery_date",
    "bdd": "base_delivery_date",
    "offshore req date": "offshore_req_date",
    "offshore required date": "offshore_req_date",
    "offloading complete date": "offloading_complete_date",
    "offload complete date": "offloading_complete_date",
    "estimated duration (hrs.)": "duration_hours",
    "estimated duration (hrs)": "duration_hours",
    "estimated duration": "duration_hours",
    "back to port": "back_to_port",
    "transit time back to port": "transit_hours",
    "return transit hours": "transit_hours",
}


def _norm(col: str) -> str:
    return str(col).strip().lower().replace("\n", " ").replace("  ", " ")


def _to_dt(value: Any) -> datetime | None:
    import pandas as pd

    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, datetime):
        return value
    try:
        ts = pd.to_datetime(value, errors="coerce")
        if pd.isna(ts):
            return None
        return ts.to_pydatetime()
    except Exception:
        return None


def _to_float(value: Any) -> float | None:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return None
        return float(value)
    except (ValueError, TypeError):
        return None


def _stable_id(*parts: Any) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:12]


def _build_sample_frame() -> pd.DataFrame:
    """Tiny sample so the app runs even before the real workbook is dropped in."""
    import pandas as pd

    base = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)
    rows = [
        {
            "Status": "Planned", "Asset": "Pontus", "Logistics Coordinator": "Chris Coyle", "Project": "Drilling Campaign A",
            "Activity": "Mud + Casing Run",
            "Base Delivery Date": base + timedelta(days=1),
            "Offshore Req Date": base + timedelta(days=1, hours=14),
            "Offloading Complete Date": base + timedelta(days=2, hours=2),
            "Estimated Duration (Hrs.)": 36,
            "Back to Port": base + timedelta(days=2, hours=14),
            "Transit time back to Port": 12,
        },
        {
            "Status": "In Progress", "Asset": "Pontus", "Logistics Coordinator": "Chris Coyle", "Project": "Drilling Campaign A",
            "Activity": "Cement / Completions",
            "Base Delivery Date": base + timedelta(days=2, hours=18),  # conflict (turnaround)
            "Offshore Req Date": base + timedelta(days=3, hours=6),
            "Offloading Complete Date": base + timedelta(days=3, hours=18),
            "Estimated Duration (Hrs.)": 30,
            "Back to Port": base + timedelta(days=4, hours=6),
            "Transit time back to Port": 12,
        },
        {
            "Status": "Planned", "Asset": "Whale", "Logistics Coordinator": "Jennifer Palmisano", "Project": "Whale Tieback",
            "Activity": "Subsea Equipment",
            "Base Delivery Date": base + timedelta(days=1, hours=4),
            "Offshore Req Date": base + timedelta(days=1, hours=18),
            "Offloading Complete Date": base + timedelta(days=2, hours=12),
            "Estimated Duration (Hrs.)": 32,
            "Back to Port": base + timedelta(days=3, hours=0),
            "Transit time back to Port": 12,
        },
        {
            "Status": "Complete", "Asset": "Vito", "Logistics Coordinator": "Daphne Barrera", "Project": "Vito Workover",
            "Activity": "Backload / Recovery",
            "Base Delivery Date": base - timedelta(days=2),
            "Offshore Req Date": base - timedelta(days=2) + timedelta(hours=12),
            "Offloading Complete Date": base - timedelta(days=1, hours=12),
            "Estimated Duration (Hrs.)": 24,
            "Back to Port": base - timedelta(days=1),
            "Transit time back to Port": 12,
        },
    ]
    return pd.DataFrame(rows)


def load_raw_frame(workbook_path: Path | None = None) -> tuple[pd.DataFrame, str]:
    """Load the OSV Demand Tracker sheet. Returns (df, source_label)."""
    import pandas as pd

    path = workbook_path or WORKBOOK_PATH
    if path.exists():
        df = pd.read_excel(path, sheet_name=OSV_SHEET_NAME, engine="openpyxl")
        return df, f"workbook:{path.name}"
    return _build_sample_frame(), "sample-data (workbook not found)"


def normalize_tasks(df: pd.DataFrame) -> list[dict]:
    """Map raw DataFrame rows to the normalized Task model."""
    # Build a header lookup tolerant to whitespace / case.
    header_map = {}
    for col in df.columns:
        key = _norm(col)
        if key in EXPECTED_COLUMNS:
            header_map[EXPECTED_COLUMNS[key]] = col

    def get(row: pd.Series, field: str) -> Any:
        col = header_map.get(field)
        if col is None:
            return None
        return row.get(col)

    tasks: list[dict] = []
    for idx, row in df.iterrows():
        asset = get(row, "asset")
        if asset is None or (isinstance(asset, float) and math.isnan(asset)):
            continue  # skip empty rows
        asset = str(asset).strip()
        if not asset:
            continue

        base_delivery = _to_dt(get(row, "base_delivery_date"))
        offshore_start = _to_dt(get(row, "offshore_req_date"))
        offshore_end = _to_dt(get(row, "offloading_complete_date"))
        return_end = _to_dt(get(row, "back_to_port"))
        duration_hours = _to_float(get(row, "duration_hours"))
        transit_hours = _to_float(get(row, "transit_hours"))

        # Infer missing endpoints so we can still draw a meaningful bar.
        if base_delivery is None and offshore_start is not None:
            base_delivery = offshore_start - timedelta(hours=DEFAULT_TRANSIT_OUT_HOURS)
        if offshore_start is None and base_delivery is not None:
            offshore_start = base_delivery + timedelta(hours=DEFAULT_TRANSIT_OUT_HOURS)
        if offshore_end is None and offshore_start is not None and duration_hours:
            offshore_end = offshore_start + timedelta(hours=duration_hours)
        if return_end is None and offshore_end is not None and transit_hours:
            return_end = offshore_end + timedelta(hours=transit_hours)
        if return_end is None and offshore_end is not None:
            return_end = offshore_end + timedelta(hours=DEFAULT_TRANSIT_OUT_HOURS)

        # If we still have nothing usable, skip.
        if base_delivery is None and offshore_start is None:
            continue

        start_date = base_delivery or offshore_start
        end_date = return_end or offshore_end or start_date

        task_id = _stable_id(
            asset,
            get(row, "coordinator"),
            get(row, "project"),
            get(row, "activity"),
            start_date.isoformat() if start_date else idx,
            idx,
        )

        tasks.append({
            "id": task_id,
            "asset": asset,
            "coordinator": (str(get(row, "coordinator")).strip()
                            if get(row, "coordinator") is not None
                            and not (isinstance(get(row, "coordinator"), float)
                                     and math.isnan(get(row, "coordinator")))
                            else ASSET_COORDINATORS.get(asset, "Unassigned")),
            "vessel": "Route Demand",
            "project": (str(get(row, "project")).strip()
                        if get(row, "project") is not None
                        and not (isinstance(get(row, "project"), float)
                                 and math.isnan(get(row, "project")))
                        else ""),
            "activity": (str(get(row, "activity")).strip()
                         if get(row, "activity") is not None
                         and not (isinstance(get(row, "activity"), float)
                                  and math.isnan(get(row, "activity")))
                         else ""),
            "status": (str(get(row, "status")).strip()
                       if get(row, "status") is not None
                       and not (isinstance(get(row, "status"), float)
                                and math.isnan(get(row, "status")))
                       else "Planned"),
            "start_date": start_date.isoformat() if start_date else None,
            "offshore_start": offshore_start.isoformat() if offshore_start else None,
            "offshore_end": offshore_end.isoformat() if offshore_end else None,
            "return_end": end_date.isoformat() if end_date else None,
            "duration_hours": duration_hours,
            "transit_hours": transit_hours,
            "source": "workbook",
        })

    return tasks
