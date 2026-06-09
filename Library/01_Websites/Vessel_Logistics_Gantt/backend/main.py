"""FastAPI app exposing OSV Demand Tracker as a Gantt-ready API."""
from __future__ import annotations

import io
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from config import (
    ASSET_CAPACITY_PATH,
    BUFFER_HOURS,
    CHANGES_PATH,
    DEMAND_PATH,
    OSV_SHEET_NAME,
    SPOT_HIRE_CHANGES_PATH,
    SPOT_HIRE_IMPACTS_PATH,
    SPOT_HIRE_MANUAL_PATH,
    SPOT_HIRE_SHEET_NAME,
    WORKBOOK_PATH,
)
from conflicts import detect_conflicts
from data_loader import load_raw_frame, normalize_tasks
from spot_hire_loader import PHASE_COLORS, load_spot_hire_forecast_counts, load_spot_hire_records

app = FastAPI(title="Vessel Logistics Gantt API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------
def _load_changes() -> dict[str, dict]:
    if CHANGES_PATH.exists():
        try:
            return json.loads(CHANGES_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def _save_changes(changes: dict[str, dict]) -> None:
    CHANGES_PATH.write_text(json.dumps(changes, indent=2, default=str), encoding="utf-8")


def _load_manual_tasks() -> list[dict]:
    if DEMAND_PATH.exists():
        try:
            data = json.loads(DEMAND_PATH.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []
    return []


def _save_manual_tasks(tasks: list[dict]) -> None:
    DEMAND_PATH.write_text(json.dumps(tasks, indent=2, default=str), encoding="utf-8")


def _load_json_list(path: Path) -> list[dict]:
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []
    return []


def _save_json_list(path: Path, rows: list[dict]) -> None:
    path.write_text(json.dumps(rows, indent=2, default=str), encoding="utf-8")


def _load_json_dict(path: Path) -> dict[str, dict]:
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _save_json_dict(path: Path, rows: dict[str, dict]) -> None:
    path.write_text(json.dumps(rows, indent=2, default=str), encoding="utf-8")


def _apply_overrides(tasks: list[dict], overrides: dict[str, dict]) -> list[dict]:
    if not overrides:
        return tasks
    allowed_override_keys = {
        "coordinator",
        "status",
        "start_date",
        "offshore_start",
        "offshore_end",
        "return_end",
        "duration_hours",
        "transit_hours",
        "deleted",
        "_updated_at",
    }
    out: list[dict] = []
    for t in tasks:
        patch = overrides.get(t["id"])
        if patch:
            if patch.get("deleted"):
                continue
            merged = {**t, **{k: v for k, v in patch.items() if k in allowed_override_keys and v is not None}}
            out.append(merged)
        else:
            out.append(t)
    return out


def _get_tasks() -> tuple[list[dict], str]:
    df, source = load_raw_frame()
    tasks = normalize_tasks(df)
    tasks.extend(_load_manual_tasks())
    tasks = _apply_overrides(tasks, _load_changes())
    return tasks, source


def _apply_spot_hire_overrides(records: list[dict], overrides: dict[str, dict]) -> list[dict]:
    allowed_keys = {
        "asset",
        "display_asset",
        "vessel_count",
        "area",
        "activity",
        "phase",
        "color",
        "start_date",
        "end_date",
        "status",
        "notes",
        "parent_activity",
        "record_type",
        "deleted",
        "_updated_at",
    }
    out: list[dict] = []
    for record in records:
        patch = overrides.get(record["id"])
        if patch:
            if patch.get("deleted"):
                continue
            out.append({**record, **{key: value for key, value in patch.items() if key in allowed_keys and value is not None}})
        else:
            out.append(record)
    return out


def _get_spot_hire_records() -> tuple[list[dict], str]:
    records, source = load_spot_hire_records()
    records.extend(_load_json_list(SPOT_HIRE_MANUAL_PATH))
    records = _apply_spot_hire_overrides(records, _load_json_dict(SPOT_HIRE_CHANGES_PATH))
    return records, source


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _recalculate_task(task: dict) -> dict:
    base_delivery = _parse_iso(task.get("start_date"))
    offshore_start = _parse_iso(task.get("offshore_start"))
    duration_hours = float(task.get("duration_hours") or 0)
    transit_hours = float(task.get("transit_hours") or 0)

    if base_delivery and not offshore_start:
        offshore_start = base_delivery + timedelta(hours=12)
    offshore_end = offshore_start + timedelta(hours=duration_hours) if offshore_start and duration_hours else _parse_iso(task.get("offshore_end"))
    return_end = offshore_end + timedelta(hours=transit_hours) if offshore_end and transit_hours else _parse_iso(task.get("return_end"))

    task["start_date"] = base_delivery.isoformat() if base_delivery else None
    task["offshore_start"] = offshore_start.isoformat() if offshore_start else None
    task["offshore_end"] = offshore_end.isoformat() if offshore_end else None
    task["return_end"] = return_end.isoformat() if return_end else task.get("offshore_end")
    return task


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class TaskChange(BaseModel):
    id: str
    start_date: str | None = None
    offshore_start: str | None = None
    offshore_end: str | None = None
    return_end: str | None = None
    status: str | None = None
    duration_hours: float | None = None
    transit_hours: float | None = None
    coordinator: str | None = None
    deleted: bool | None = None


class ChangeBatch(BaseModel):
    changes: list[TaskChange] = Field(default_factory=list)


class DemandCreate(BaseModel):
    asset: str
    activity: str
    project: str = ""
    coordinator: str = "Unassigned"
    status: str = "Planned"
    start_date: str
    offshore_start: str | None = None
    duration_hours: float = 24
    transit_hours: float = 12


class SpotHireChange(BaseModel):
    id: str
    asset: str | None = None
    display_asset: str | None = None
    vessel_count: int | None = None
    area: str | None = None
    activity: str | None = None
    phase: str | None = None
    color: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    status: str | None = None
    notes: str | None = None
    deleted: bool | None = None


class SpotHireChangeBatch(BaseModel):
    changes: list[SpotHireChange] = Field(default_factory=list)


class SpotHireCreate(BaseModel):
    asset: str
    vessel_count: int = 1
    area: str = ""
    activity: str
    phase: str = "Deepening"
    color: str | None = None
    start_date: str
    end_date: str
    status: str = "Planned"
    notes: str = ""


class SpotHireImpactsUpdate(BaseModel):
    month: str = "overview"
    text: str = ""
    base_fleet: str = ""
    frac_spot_hires: str = ""
    operational_spot_hires: str = ""


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "workbook_found": WORKBOOK_PATH.exists(),
        "workbook_path": str(WORKBOOK_PATH),
        "sheet_name": OSV_SHEET_NAME,
        "spot_hire_sheet_name": SPOT_HIRE_SHEET_NAME,
        "buffer_hours": BUFFER_HOURS,
        "schedule_watch_basis": "per_asset_on_location_capacity",
    }


@app.get("/api/tasks")
def get_tasks() -> dict:
    tasks, source = _get_tasks()
    return {"source": source, "buffer_hours": BUFFER_HOURS, "tasks": tasks}


@app.get("/api/spot-hire")
def get_spot_hire() -> dict:
    records, source = _get_spot_hire_records()
    phase_colors = {value["phase"]: value["color"] for value in PHASE_COLORS.values()}
    return {
        "source": source,
        "sheet_name": SPOT_HIRE_SHEET_NAME,
        "records": records,
        "phase_colors": phase_colors,
        "monthly_forecast_counts": load_spot_hire_forecast_counts(),
    }


@app.get("/api/spot-hire/impacts")
def get_spot_hire_impacts(month: str = "overview") -> dict:
    data = _load_json_dict(SPOT_HIRE_IMPACTS_PATH)
    if "months" in data:
        month_data = data.get("months", {}).get(month, {})
        return {
            "month": month,
            "text": month_data.get("text", ""),
            "base_fleet": month_data.get("base_fleet", ""),
            "frac_spot_hires": month_data.get("frac_spot_hires", ""),
            "operational_spot_hires": month_data.get("operational_spot_hires", ""),
            "updated_at": month_data.get("updated_at"),
        }
    return {
        "month": month,
        "text": data.get("text", ""),
        "base_fleet": data.get("base_fleet", ""),
        "frac_spot_hires": data.get("frac_spot_hires", ""),
        "operational_spot_hires": data.get("operational_spot_hires", ""),
        "updated_at": data.get("updated_at"),
    }


@app.post("/api/spot-hire/impacts")
def save_spot_hire_impacts(update: SpotHireImpactsUpdate) -> dict:
    current = _load_json_dict(SPOT_HIRE_IMPACTS_PATH)
    months = current.get("months", {}) if isinstance(current.get("months"), dict) else {}
    month = update.month.strip() or "overview"
    month_data = {
        "text": update.text,
        "base_fleet": update.base_fleet,
        "frac_spot_hires": update.frac_spot_hires,
        "operational_spot_hires": update.operational_spot_hires,
        "updated_at": datetime.utcnow().isoformat(),
    }
    months[month] = month_data
    data = {"months": months}
    _save_json_dict(SPOT_HIRE_IMPACTS_PATH, data)
    return {"ok": True, "month": month, **month_data}


@app.post("/api/spot-hire")
def create_spot_hire(record: SpotHireCreate) -> dict:
    start = _parse_iso(record.start_date)
    end = _parse_iso(record.end_date)
    if start is None or end is None:
        raise HTTPException(status_code=400, detail="start_date and end_date must be ISO date values.")
    if end < start:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date.")

    phase_colors = {value["phase"]: value["color"] for value in PHASE_COLORS.values()}
    item = {
        "id": f"spot-manual-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
        "asset": record.asset.strip(),
        "display_asset": record.asset.strip(),
        "vessel_count": max(1, record.vessel_count or 1),
        "area": record.area.strip(),
        "activity": record.activity.strip(),
        "phase": record.phase.strip() or "Other",
        "color": record.color or phase_colors.get(record.phase, "#16858c"),
        "start_date": start.date().isoformat(),
        "end_date": end.date().isoformat(),
        "status": record.status.strip() or "Planned",
        "notes": record.notes.strip(),
        "source": "manual",
    }
    if not item["asset"] or not item["activity"]:
        raise HTTPException(status_code=400, detail="asset and activity are required.")

    records = _load_json_list(SPOT_HIRE_MANUAL_PATH)
    records.append(item)
    _save_json_list(SPOT_HIRE_MANUAL_PATH, records)
    return {"record": item, "total_manual_records": len(records)}


@app.post("/api/spot-hire/changes")
def post_spot_hire_changes(batch: SpotHireChangeBatch) -> dict:
    if not batch.changes:
        raise HTTPException(status_code=400, detail="No changes provided.")
    store = _load_json_dict(SPOT_HIRE_CHANGES_PATH)
    for change in batch.changes:
        if not change.id.strip():
            raise HTTPException(status_code=400, detail="Change id is required.")
        existing = store.get(change.id, {})
        patch = change.model_dump(exclude_none=True)
        patch.pop("id", None)
        existing.update(patch)
        existing["_updated_at"] = datetime.utcnow().isoformat()
        store[change.id] = existing
    _save_json_dict(SPOT_HIRE_CHANGES_PATH, store)
    return {"saved": len(batch.changes), "total_overrides": len(store)}


@app.delete("/api/spot-hire/{record_id}")
def delete_spot_hire(record_id: str) -> dict:
    record_id = record_id.strip()
    if not record_id:
        raise HTTPException(status_code=400, detail="Record id is required.")

    manual_records = _load_json_list(SPOT_HIRE_MANUAL_PATH)
    remaining_manual = [record for record in manual_records if record.get("id") != record_id]
    removed_manual = len(remaining_manual) != len(manual_records)
    if removed_manual:
        _save_json_list(SPOT_HIRE_MANUAL_PATH, remaining_manual)

    store = _load_json_dict(SPOT_HIRE_CHANGES_PATH)
    if removed_manual:
        store.pop(record_id, None)
    else:
        existing = store.get(record_id, {})
        existing["deleted"] = True
        existing["_updated_at"] = datetime.utcnow().isoformat()
        store[record_id] = existing
    _save_json_dict(SPOT_HIRE_CHANGES_PATH, store)
    return {"ok": True, "deleted": record_id, "removed_manual": removed_manual}


@app.post("/api/tasks")
def create_task(demand: DemandCreate) -> dict:
    base_delivery = _parse_iso(demand.start_date)
    if base_delivery is None:
        raise HTTPException(status_code=400, detail="start_date must be an ISO date/time value.")

    task = _recalculate_task({
        "id": f"manual-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
        "asset": demand.asset.strip(),
        "coordinator": demand.coordinator.strip() or "Unassigned",
        "vessel": "Route Demand",
        "project": demand.project.strip(),
        "activity": demand.activity.strip(),
        "status": demand.status.strip() or "Planned",
        "start_date": base_delivery.isoformat(),
        "offshore_start": demand.offshore_start,
        "duration_hours": demand.duration_hours,
        "transit_hours": demand.transit_hours,
        "source": "manual",
    })
    if not task["asset"] or not task["activity"]:
        raise HTTPException(status_code=400, detail="asset and activity are required.")

    tasks = _load_manual_tasks()
    tasks.append(task)
    _save_manual_tasks(tasks)
    return {"task": task, "total_manual_tasks": len(tasks)}


@app.get("/api/conflicts")
def get_conflicts(buffer_hours: int | None = None) -> dict:
    tasks, _ = _get_tasks()
    buf = buffer_hours if buffer_hours is not None else BUFFER_HOURS
    capacity_settings = _load_capacity_settings()
    return {
        "buffer_hours": buf,
        "conflicts": detect_conflicts(
            tasks,
            buf,
            capacity_settings["entries"],
            capacity_settings["monthly_capacity_entries"],
            min_date=__import__('datetime').date.today(),
        ),
        "asset_capacities": capacity_settings["entries"],
        "monthly_capacity_entries": capacity_settings["monthly_capacity_entries"],
    }


class AssetCapacityEntry(BaseModel):
    asset: str
    vessel_count: int = Field(default=1, ge=0, le=10)
    notes: str = ""
    date_from: str = ""
    date_to: str = ""


class AssetCapacityBatch(BaseModel):
    entries: list[AssetCapacityEntry]


class MonthlyOSVCapacityEntry(BaseModel):
    capacity_text: str = ""
    date_from: str = ""
    date_to: str = ""


class AssetCapacityBatch(BaseModel):
    entries: list[AssetCapacityEntry]
    monthly_capacity_entries: list[MonthlyOSVCapacityEntry] = Field(default_factory=list)


def _normalize_asset_capacity_entries(data: object) -> list[dict]:
    if isinstance(data, list):
        return [entry for entry in data if isinstance(entry, dict) and entry.get("asset")]
    if isinstance(data, dict):
        maybe_entries = data.get("entries")
        if isinstance(maybe_entries, list):
            return [entry for entry in maybe_entries if isinstance(entry, dict) and entry.get("asset")]
        normalized: list[dict] = []
        for asset, value in data.items():
            if asset in {"entries", "monthly_capacity_entries"}:
                continue
            if isinstance(value, dict):
                normalized.append({
                    "asset": asset,
                    "vessel_count": value.get("vessel_count", 1),
                    "notes": value.get("notes", ""),
                    "date_from": value.get("date_from", ""),
                    "date_to": value.get("date_to", ""),
                })
            else:
                normalized.append({
                    "asset": asset,
                    "vessel_count": value,
                    "notes": "",
                    "date_from": "",
                    "date_to": "",
                })
        return normalized
    return []


def _normalize_monthly_capacity_entries(data: object) -> list[dict]:
    if not isinstance(data, list):
        return []
    return [
        {
            "capacity_text": str(entry.get("capacity_text") or "").strip(),
            "date_from": str(entry.get("date_from") or "").strip(),
            "date_to": str(entry.get("date_to") or "").strip(),
        }
        for entry in data
        if isinstance(entry, dict) and (entry.get("capacity_text") or entry.get("date_from") or entry.get("date_to"))
    ]


def _load_capacity_settings() -> dict[str, list[dict]]:
    if ASSET_CAPACITY_PATH.exists():
        try:
            data = json.loads(ASSET_CAPACITY_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return {
                    "entries": _normalize_asset_capacity_entries(data),
                    "monthly_capacity_entries": _normalize_monthly_capacity_entries(data.get("monthly_capacity_entries")),
                }
            return {
                "entries": _normalize_asset_capacity_entries(data),
                "monthly_capacity_entries": [],
            }
        except json.JSONDecodeError:
            return {"entries": [], "monthly_capacity_entries": []}
    return {"entries": [], "monthly_capacity_entries": []}


def _load_asset_capacity() -> list[dict]:
    return _load_capacity_settings()["entries"]


def _save_capacity_settings(entries: list[dict], monthly_capacity_entries: list[dict]) -> None:
    payload = {"entries": entries, "monthly_capacity_entries": monthly_capacity_entries}
    ASSET_CAPACITY_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


@app.get("/api/asset-capacity")
def get_asset_capacity() -> dict:
    settings = _load_capacity_settings()
    return {
        "asset_capacities": settings["entries"],
        "monthly_capacity_entries": settings["monthly_capacity_entries"],
    }


@app.post("/api/asset-capacity")
def post_asset_capacity(batch: AssetCapacityBatch) -> dict:
    entries = [
        {
            "asset": entry.asset,
            "vessel_count": entry.vessel_count,
            "notes": entry.notes,
            "date_from": entry.date_from,
            "date_to": entry.date_to,
        }
        for entry in batch.entries
        if entry.asset.strip()
    ]
    monthly_capacity_entries = [
        {
            "capacity_text": entry.capacity_text,
            "date_from": entry.date_from,
            "date_to": entry.date_to,
        }
        for entry in batch.monthly_capacity_entries
        if entry.capacity_text.strip() or entry.date_from.strip() or entry.date_to.strip()
    ]
    _save_capacity_settings(entries, monthly_capacity_entries)
    return {
        "saved": len(entries),
        "monthly_saved": len(monthly_capacity_entries),
        "total": len(entries) + len(monthly_capacity_entries),
    }


@app.post("/api/changes")
def post_changes(batch: ChangeBatch) -> dict:
    if not batch.changes:
        raise HTTPException(status_code=400, detail="No changes provided.")
    store = _load_changes()
    for ch in batch.changes:
        if not ch.id.strip():
            raise HTTPException(status_code=400, detail="Change id is required.")
        existing = store.get(ch.id, {})
        patch = ch.model_dump(exclude_none=True)
        patch.pop("id", None)
        existing.update(patch)
        existing = _recalculate_task(existing)
        existing["_updated_at"] = datetime.utcnow().isoformat()
        store[ch.id] = existing
    _save_changes(store)
    return {"saved": len(batch.changes), "total_overrides": len(store)}


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str) -> dict:
    task_id = task_id.strip()
    if not task_id:
        raise HTTPException(status_code=400, detail="Task id is required.")

    manual_tasks = _load_manual_tasks()
    remaining_manual = [task for task in manual_tasks if task.get("id") != task_id]
    removed_manual = len(remaining_manual) != len(manual_tasks)
    if removed_manual:
        _save_manual_tasks(remaining_manual)

    store = _load_changes()
    if removed_manual:
        store.pop(task_id, None)
    else:
        existing = store.get(task_id, {})
        existing["deleted"] = True
        existing["_updated_at"] = datetime.utcnow().isoformat()
        store[task_id] = existing
    _save_changes(store)
    return {"ok": True, "deleted": task_id, "removed_manual": removed_manual}


@app.post("/api/changes/reset")
def reset_changes() -> dict:
    if CHANGES_PATH.exists():
        CHANGES_PATH.unlink()
    return {"ok": True}


@app.post("/api/upload")
def upload_workbook(file: UploadFile = File(...)) -> dict:
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Upload an .xlsx workbook.")
    with WORKBOOK_PATH.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    return {"ok": True, "workbook_path": str(WORKBOOK_PATH), "sheet_name": OSV_SHEET_NAME}


@app.get("/api/export")
def export_schedule():
    import pandas as pd

    tasks, _ = _get_tasks()
    df = pd.DataFrame(tasks)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Schedule")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="schedule_export.xlsx"'},
    )


# ---------------------------------------------------------------------------
# Static frontend
# ---------------------------------------------------------------------------
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
    app.mount("/data", StaticFiles(directory=FRONTEND_DIR / "data"), name="data")

    @app.get("/")
    def root() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/spot-hire")
    def spot_hire_page() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "spot_hire.html")

    @app.get("/spot_hire.html")
    def spot_hire_html() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "spot_hire.html")

    @app.get("/styles.css")
    def styles_css() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "styles.css", media_type="text/css")

    @app.get("/app.js")
    def app_js() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "app.js", media_type="application/javascript")

    @app.get("/spot_hire.js")
    def spot_hire_js() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "spot_hire.js", media_type="application/javascript")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
