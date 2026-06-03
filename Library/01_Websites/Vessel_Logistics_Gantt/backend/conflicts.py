"""Per-asset and fleet demand conflict detection for vessel logistics demand."""
from __future__ import annotations

from datetime import date as date_type, datetime
import re
from typing import Iterable


def _parse(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso)
    except ValueError:
        return None


def _route_interval(task: dict) -> tuple[datetime | None, datetime | None]:
    start = _parse(task.get("start_date")) or _parse(task.get("offshore_start"))
    end = _parse(task.get("return_end")) or _parse(task.get("offshore_end")) or start
    return start, end


def _fmt(dt: datetime) -> str:
    return f"{dt:%b} {dt.day} {dt:%H:%M}" if hasattr(dt, "strftime") else str(dt)


def _fmt_day(dt: datetime) -> str:
    return f"{dt:%b} {dt.day}"


def _window_bounds(entry: dict) -> tuple[datetime, datetime, bool]:
    date_from_str = entry.get("date_from", "")
    date_to_str = entry.get("date_to", "")
    try:
        window_start = datetime.fromisoformat(date_from_str) if date_from_str else datetime.min
    except ValueError:
        window_start = datetime.min
    try:
        window_end = datetime.fromisoformat(date_to_str) if date_to_str else datetime.max
    except ValueError:
        window_end = datetime.max
    return window_start, window_end, bool(date_from_str or date_to_str)


def _best_window_match(candidates: list[dict]) -> dict | None:
    if not candidates:
        return None
    candidates.sort(
        key=lambda e: (
            1 if e.get("_has_window") else 0,
            e.get("_window_start") or datetime.min,
        ),
        reverse=True,
    )
    return candidates[0]


def _parse_fleet_capacity_text(value: str | None) -> int | None:
    text = (value or "").strip().lower()
    if not text:
        return None
    patterns = [
        r"(\d+)\s*(?:osvs?|vessels?)",
        r"(?:capacity|available|total)\D{0,24}(\d+)",
        r"(?:max|limit)\D{0,24}(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                return max(0, int(match.group(1)))
            except (TypeError, ValueError):
                return None
    numbers = re.findall(r"\d+", text)
    if not numbers:
        return None
    try:
        return max(0, int(numbers[-1]))
    except (TypeError, ValueError):
        return None


def _capacity_for_time(
    asset_capacities: list[dict] | dict[str, dict],
    asset: str,
    interval_start: datetime,
    interval_end: datetime,
) -> int:
    """Return the effective vessel count for an asset at a given time interval.

    If the capacity entry has ``date_from`` / ``date_to`` set, the configured
    vessel count only applies when the interval overlaps that window.  Outside
    the window the default capacity (1) is returned.
    """
    entries = _normalize_capacity_entries(asset_capacities)
    candidates: list[dict] = []
    for entry in entries:
        if (entry.get("asset") or "") != asset:
            continue
        window_start, window_end, has_window = _window_bounds(entry)
        if interval_start < window_end and interval_end > window_start:
            candidates.append({
                **entry,
                "_window_start": window_start,
                "_window_end": window_end,
                "_has_window": has_window,
            })

    selected = _best_window_match(candidates)
    if not selected:
        return 1

    try:
        return max(0, int(selected.get("vessel_count", 1)))
    except (TypeError, ValueError):
        return 1


def _normalize_capacity_entries(asset_capacities: list[dict] | dict[str, dict] | None) -> list[dict]:
    if not asset_capacities:
        return []
    if isinstance(asset_capacities, list):
        return [entry for entry in asset_capacities if isinstance(entry, dict) and entry.get("asset")]
    if isinstance(asset_capacities, dict):
        # New format: {"entries": [...]}
        maybe_entries = asset_capacities.get("entries")
        if isinstance(maybe_entries, list):
            return [entry for entry in maybe_entries if isinstance(entry, dict) and entry.get("asset")]
        # Legacy format: {"Asset": {"vessel_count": ...}, ...}
        normalized: list[dict] = []
        for asset, value in asset_capacities.items():
            if asset == "entries":
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
                normalized.append({"asset": asset, "vessel_count": value, "notes": "", "date_from": "", "date_to": ""})
        return normalized
    return []


def _normalize_monthly_capacity_entries(monthly_capacity_entries: list[dict] | None) -> list[dict]:
    if not monthly_capacity_entries or not isinstance(monthly_capacity_entries, list):
        return []
    normalized: list[dict] = []
    for entry in monthly_capacity_entries:
        if not isinstance(entry, dict):
            continue
        normalized.append({
            "capacity_text": str(entry.get("capacity_text") or "").strip(),
            "date_from": str(entry.get("date_from") or "").strip(),
            "date_to": str(entry.get("date_to") or "").strip(),
        })
    return [entry for entry in normalized if entry.get("capacity_text") or entry.get("date_from") or entry.get("date_to")]


def _fleet_capacity_for_time(
    monthly_capacity_entries: list[dict] | None,
    interval_start: datetime,
    interval_end: datetime,
) -> tuple[int | None, dict | None]:
    entries = _normalize_monthly_capacity_entries(monthly_capacity_entries)
    candidates: list[dict] = []
    for entry in entries:
        window_start, window_end, has_window = _window_bounds(entry)
        if interval_start < window_end and interval_end > window_start:
            parsed_capacity = _parse_fleet_capacity_text(entry.get("capacity_text"))
            if parsed_capacity is None:
                continue
            candidates.append({
                **entry,
                "_window_start": window_start,
                "_window_end": window_end,
                "_has_window": has_window,
                "_parsed_capacity": parsed_capacity,
            })
    selected = _best_window_match(candidates)
    if not selected:
        return None, None
    return int(selected.get("_parsed_capacity", 0)), selected


def detect_conflicts(
    tasks: Iterable[dict],
    buffer_hours: int,
    asset_capacities: list[dict] | dict[str, dict] | None = None,
    monthly_capacity_entries: list[dict] | None = None,
    max_warnings: int = 30,
    min_date: date_type | None = None,
) -> list[dict]:
    """Detect per-asset and fleet-wide on-location demand conflicts.

    A conflict is raised when the number of routes simultaneously on location
    (offshore_start → offshore_end) for a given asset exceeds that asset's
    configured vessel count (default 1). An additional conflict is raised when
    total simultaneous on-location demand exceeds the configured monthly fleet
    OSV capacity parsed from the team-provided free-text setting.

    Only conflicts whose overlap window ends on or after ``min_date`` are
    returned (defaults to today so past conflicts are silently dropped).
    """
    if min_date is None:
        min_date = datetime.utcnow().date()

    task_list = list(tasks)
    if asset_capacities is None:
        asset_capacities = {}
    if monthly_capacity_entries is None:
        monthly_capacity_entries = []

    all_intervals: list[tuple[datetime, datetime, dict]] = []

    by_asset: dict[str, list[dict]] = {}
    for t in task_list:
        asset = t.get("asset") or "Unassigned"
        by_asset.setdefault(asset, []).append(t)

    conflicts: list[dict] = []

    for asset, items in by_asset.items():
        # Build on-location intervals: offshore_start → offshore_end
        intervals: list[tuple[datetime, datetime, dict]] = []
        for t in items:
            ol_start = _parse(t.get("offshore_start")) or _parse(t.get("start_date"))
            ol_end = _parse(t.get("offshore_end")) or _parse(t.get("return_end")) or ol_start
            if ol_start and ol_end and ol_end > ol_start:
                intervals.append((ol_start, ol_end, t))
                all_intervals.append((ol_start, ol_end, t))

        intervals.sort(key=lambda x: x[0])

        events = sorted({point for start, end, _ in intervals for point in (start, end)})
        for start, end in zip(events, events[1:]):
            if end <= start:
                continue
            # Skip intervals that are entirely in the past
            if end.date() < min_date:
                continue
            if len(conflicts) >= max_warnings:
                return conflicts
            capacity = _capacity_for_time(asset_capacities, asset, start, end)
            active = [task for a_start, a_end, task in intervals if a_start < end and start < a_end]
            if len(active) <= 1:
                continue
            overlap_minutes = int((end - start).total_seconds() // 60)
            activity_names = ", ".join(f"'{task.get('activity') or 'Route'}'" for task in active)

            if len(active) > capacity:
                conflicts.append({
                    "type": "on_location_overlap",
                    "severity": "conflict",
                    "asset": asset,
                    "asset_capacity": capacity,
                    "active_routes": len(active),
                    "task_ids": [task["id"] for task in active],
                    "tasks": [
                        {"id": task["id"], "activity": task.get("activity"), "project": task.get("project")}
                        for task in active
                    ],
                    "overlap_minutes": overlap_minutes,
                    "overlap_start": start.isoformat(),
                    "overlap_end": end.isoformat(),
                    "message": (
                        f"{asset}: {len(active)} routes are on location at the same time "
                        f"against {capacity} configured vessel{'' if capacity == 1 else 's'} "
                        f"({_fmt_day(start)} to {_fmt_day(end)}): {activity_names}."
                    ),
                })
                continue

            conflicts.append({
                "type": "simultaneous_on_location_warning",
                "severity": "warning",
                "asset": asset,
                "asset_capacity": capacity,
                "active_routes": len(active),
                "task_ids": [task["id"] for task in active],
                "tasks": [
                    {"id": task["id"], "activity": task.get("activity"), "project": task.get("project")}
                    for task in active
                ],
                "overlap_minutes": overlap_minutes,
                "overlap_start": start.isoformat(),
                "overlap_end": end.isoformat(),
                "message": (
                    f"{asset}: {len(active)} routes are on location at the same time "
                    f"({_fmt_day(start)} to {_fmt_day(end)}). This is within the configured "
                    f"capacity of {capacity} but should be reviewed."
                ),
            })

    fleet_events = sorted({point for start, end, _ in all_intervals for point in (start, end)})
    for start, end in zip(fleet_events, fleet_events[1:]):
        if end <= start:
            continue
        if end.date() < min_date:
            continue
        if len(conflicts) >= max_warnings:
            return conflicts
        fleet_capacity, matched_entry = _fleet_capacity_for_time(monthly_capacity_entries, start, end)
        if fleet_capacity is None:
            continue
        active = [task for a_start, a_end, task in all_intervals if a_start < end and start < a_end]
        if len(active) <= fleet_capacity:
            continue
        overlap_minutes = int((end - start).total_seconds() // 60)
        activity_names = ", ".join(
            f"{task.get('asset') or 'Unassigned'} '{task.get('activity') or 'Route'}'"
            for task in active
        )
        capacity_text = (matched_entry or {}).get("capacity_text", "")
        conflicts.append({
            "type": "fleet_monthly_capacity",
            "severity": "conflict",
            "asset": "Fleet",
            "fleet_capacity": fleet_capacity,
            "fleet_capacity_text": capacity_text,
            "active_routes": len(active),
            "task_ids": [task["id"] for task in active],
            "tasks": [
                {"id": task["id"], "asset": task.get("asset"), "activity": task.get("activity"), "project": task.get("project")}
                for task in active
            ],
            "overlap_minutes": overlap_minutes,
            "overlap_start": start.isoformat(),
            "overlap_end": end.isoformat(),
            "message": (
                f"Fleet: {len(active)} routes are on location at the same time against "
                f"{fleet_capacity} monthly OSV vessel{'' if fleet_capacity == 1 else 's'} "
                f"({_fmt_day(start)} to {_fmt_day(end)}). Source: {capacity_text or 'Monthly OSV Capacity'} - {activity_names}."
            ),
        })

    return conflicts
