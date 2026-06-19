"""Regenerate conflicts.json based on tasks and asset capacity."""
import json
from datetime import datetime, date
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def parse_date(value):
    """Parse a date string to datetime."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        # Try multiple formats
        for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"]:
            try:
                return datetime.strptime(str(value).split('.')[0], fmt)
            except ValueError:
                continue
        return None
    except Exception:
        return None


def parse_date_only(value):
    """Parse a date string to date object."""
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def get_capacity_for_asset_at_time(asset_capacities, asset, check_date):
    """Get the vessel capacity for an asset at a specific date."""
    if not asset_capacities:
        return 1  # Default capacity
    
    for entry in asset_capacities:
        if entry.get("asset") != asset:
            continue
        
        date_from = parse_date_only(entry.get("date_from"))
        date_to = parse_date_only(entry.get("date_to"))
        vessel_count = int(entry.get("vessel_count", 1))
        
        # If no date range, this is a default capacity for the asset
        if not date_from and not date_to:
            return vessel_count
        
        # Check if check_date falls within the range
        if date_from and check_date < date_from:
            continue
        if date_to and check_date > date_to:
            continue
        
        return vessel_count
    
    return 1  # Default if no matching entry


def fmt_day(dt):
    """Format a datetime for display."""
    return dt.strftime("%b %d")


def detect_conflicts(tasks, asset_capacities, min_date=None):
    """Detect per-asset on-location demand conflicts."""
    if min_date is None:
        min_date = date.today()
    
    conflicts = []
    
    # Group tasks by asset
    by_asset = {}
    for t in tasks:
        asset = t.get("asset") or "Unassigned"
        by_asset.setdefault(asset, []).append(t)
    
    for asset, items in by_asset.items():
        # Build on-location intervals: offshore_start → offshore_end
        intervals = []
        for t in items:
            ol_start = parse_date(t.get("offshore_start")) or parse_date(t.get("start_date"))
            ol_end = parse_date(t.get("offshore_end")) or parse_date(t.get("return_end")) or ol_start
            if ol_start and ol_end and ol_end > ol_start:
                intervals.append((ol_start, ol_end, t))
        
        if not intervals:
            continue
        
        intervals.sort(key=lambda x: x[0])
        
        # Get all event points (starts and ends)
        events = sorted(set(point for start, end, _ in intervals for point in (start, end)))
        
        for i in range(len(events) - 1):
            start = events[i]
            end = events[i + 1]
            
            if end <= start:
                continue
            
            # Skip intervals entirely in the past
            if end.date() < min_date:
                continue
            
            # Get capacity at this time
            capacity = get_capacity_for_asset_at_time(asset_capacities, asset, start.date())
            
            # Find active tasks during this interval
            active = [task for a_start, a_end, task in intervals if a_start < end and start < a_end]
            
            if len(active) <= 1:
                continue
            
            overlap_minutes = int((end - start).total_seconds() // 60)
            activity_names = ", ".join(f"'{task.get('activity') or 'Route'}'" for task in active)
            
            if len(active) > capacity:
                # True conflict - exceeds capacity
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
                        f"against {capacity} configured vessel{'s' if capacity != 1 else ''} "
                        f"({fmt_day(start)} to {fmt_day(end)}): {activity_names}."
                    ),
                })
            # Note: We don't generate warnings for routes within capacity anymore
    
    return conflicts


def main():
    # Load tasks
    tasks_file = DATA_DIR / "tasks.json"
    with open(tasks_file, 'r') as f:
        tasks_data = json.load(f)
    tasks = tasks_data.get("tasks", [])
    
    # Load asset capacity
    capacity_file = DATA_DIR / "asset-capacity.json"
    with open(capacity_file, 'r') as f:
        capacity_data = json.load(f)
    asset_capacities = capacity_data.get("asset_capacities", [])
    
    print(f"Loaded {len(tasks)} tasks")
    print(f"Loaded {len(asset_capacities)} asset capacity entries:")
    for entry in asset_capacities:
        print(f"  - {entry['asset']}: {entry['vessel_count']} vessels ({entry.get('date_from', 'N/A')} to {entry.get('date_to', 'N/A')}) - {entry.get('notes', '')}")
    
    # Detect conflicts
    conflicts = detect_conflicts(tasks, asset_capacities)
    
    print(f"\nDetected {len(conflicts)} conflicts:")
    for c in conflicts:
        print(f"  - {c['asset']}: {c['active_routes']} routes vs {c['asset_capacity']} capacity ({c['severity']})")
    
    # Save conflicts
    conflicts_file = DATA_DIR / "conflicts.json"
    with open(conflicts_file, 'w') as f:
        json.dump({"conflicts": conflicts}, f, indent=2)
    
    print(f"\nSaved conflicts to {conflicts_file}")


if __name__ == "__main__":
    main()
