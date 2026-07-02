#!/usr/bin/env python3
"""
Update Monthly Capacity from Excel file.

Reads activity data from the Excel file and calculates the maximum vessel
count needed per month based on overlapping activities.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

try:
    import openpyxl
except ImportError:
    print("Error: openpyxl not installed. Run: pip install openpyxl")
    sys.exit(1)

# Configuration
EXCEL_FILE = Path(r"C:\Users\Chris.Coyle\OneDrive - Shell\VS Code\Spot_Hire_Update_20260611.xlsx")
DATA_DIR = Path(__file__).parent / "data"
ASSET_CAPACITY_FILE = DATA_DIR / "asset-capacity.json"


def load_excel_activities(excel_path: Path, status_filter: str = "Planned") -> tuple[list[dict], dict]:
    """Load activities from Excel file, filtering by status.
    
    Args:
        excel_path: Path to the Excel file
        status_filter: Only include activities with this status (case-insensitive)
    
    Returns:
        Tuple of (activities list, stats dict with counts)
    """
    wb = openpyxl.load_workbook(excel_path)
    ws = wb["Spot Hire Update"]
    
    activities = []
    stats = {"total": 0, "planned": 0, "skipped": 0}
    
    for row in ws.iter_rows(min_row=2, values_only=True):
        asset, vessel_count, area, activity, phase, start_date, end_date, status, notes = row[:9]
        
        # Skip empty rows
        if not asset:
            continue
        
        stats["total"] += 1
        
        # Only include activities matching the status filter (case-insensitive)
        if status and status.strip().lower() != status_filter.lower():
            stats["skipped"] += 1
            continue
        
        stats["planned"] += 1
        
        # Ensure dates are datetime objects
        if isinstance(start_date, datetime) and isinstance(end_date, datetime):
            # Build notes without duplicating activity/phase
            if notes:
                note_text = notes
            elif activity and phase:
                # Avoid duplication if activity contains phase or they're the same
                if phase.lower() in activity.lower() or activity.lower() == phase.lower():
                    note_text = activity
                else:
                    note_text = f"{activity} {phase}"
            else:
                note_text = activity or phase or ""
            
            activities.append({
                "asset": asset,
                "vessel_count": int(vessel_count) if vessel_count else 1,
                "area": area,
                "activity": activity,
                "phase": phase,
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
                "notes": note_text
            })
    
    return activities, stats


def calculate_monthly_capacity(activities: list[dict], months_ahead: int = 6) -> list[dict]:
    """
    Calculate maximum vessel count needed per month.
    
    For each day in a month, sum up vessel counts from all activities
    active on that day. The monthly capacity is the maximum daily sum.
    """
    if not activities:
        return []
    
    # Determine date range
    today = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_date = today + timedelta(days=months_ahead * 31)
    
    monthly_entries = []
    current_month = today
    
    while current_month < end_date:
        # Get first and last day of month
        month_start = current_month.replace(day=1)
        if current_month.month == 12:
            next_month = current_month.replace(year=current_month.year + 1, month=1, day=1)
        else:
            next_month = current_month.replace(month=current_month.month + 1, day=1)
        month_end = next_month - timedelta(days=1)
        
        # Calculate max vessels needed on any day in this month
        max_vessels = 0
        current_day = month_start
        
        while current_day <= month_end:
            daily_vessels = 0
            for act in activities:
                # Check if activity is active on this day
                if act["start_date"] <= current_day <= act["end_date"]:
                    daily_vessels += act["vessel_count"]
            max_vessels = max(max_vessels, daily_vessels)
            current_day += timedelta(days=1)
        
        if max_vessels > 0:
            monthly_entries.append({
                "capacity_text": str(max_vessels),
                "date_from": month_start.strftime("%Y-%m-%d"),
                "date_to": month_end.strftime("%Y-%m-%d")
            })
        
        current_month = next_month
    
    return monthly_entries


def update_asset_capacities(activities: list[dict]) -> list[dict]:
    """Convert activities to asset_capacities format.
    
    Only includes activities that haven't ended yet (end_date >= today).
    """
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    asset_capacities = []
    
    for act in activities:
        # Skip activities that have already ended
        if act["end_date"] < today:
            continue
        
        asset_capacities.append({
            "asset": act["asset"],
            "vessel_count": act["vessel_count"],
            "notes": act["notes"],
            "date_from": act["start_date"].strftime("%Y-%m-%d"),
            "date_to": act["end_date"].strftime("%Y-%m-%d")
        })
    
    # Sort by start date
    asset_capacities.sort(key=lambda x: x["date_from"])
    return asset_capacities


def main():
    print("=" * 60)
    print("Update Monthly Capacity from Excel")
    print("=" * 60)
    
    # Load current data
    if ASSET_CAPACITY_FILE.exists():
        with open(ASSET_CAPACITY_FILE, 'r') as f:
            current_data = json.load(f)
        print(f"\nCurrent monthly capacity entries: {len(current_data.get('monthly_capacity_entries', []))}")
        print(f"Current asset capacities: {len(current_data.get('asset_capacities', []))}")
    else:
        current_data = {"asset_capacities": [], "monthly_capacity_entries": []}
    
    # Load Excel activities (only "Planned" status)
    print(f"\nReading Excel file: {EXCEL_FILE}")
    activities, stats = load_excel_activities(EXCEL_FILE, status_filter="Planned")
    print(f"Total activities in Excel: {stats['total']}")
    print(f"  - Planned (included): {stats['planned']}")
    print(f"  - Other statuses (excluded): {stats['skipped']}")
    
    if not activities:
        print("No planned activities found. Nothing to update.")
        return
    
    # Show activity summary
    print("\nPlanned activities:")
    for act in activities[:10]:
        print(f"  - {act['asset']}: {act['notes']} ({act['start_date'].strftime('%Y-%m-%d')} to {act['end_date'].strftime('%Y-%m-%d')}) - {act['vessel_count']} vessel(s)")
    if len(activities) > 10:
        print(f"  ... and {len(activities) - 10} more")
    
    # Calculate monthly capacity
    monthly_entries = calculate_monthly_capacity(activities)
    print(f"\nCalculated monthly capacity for {len(monthly_entries)} months:")
    for entry in monthly_entries:
        print(f"  - {entry['date_from']} to {entry['date_to']}: {entry['capacity_text']} vessels")
    
    # Update asset capacities
    asset_capacities = update_asset_capacities(activities)
    
    # Update the data
    current_data["monthly_capacity_entries"] = monthly_entries
    current_data["asset_capacities"] = asset_capacities
    
    # Save
    with open(ASSET_CAPACITY_FILE, 'w') as f:
        json.dump(current_data, f, indent=2)
    
    print(f"\n✓ Updated {ASSET_CAPACITY_FILE}")
    print(f"  - {len(monthly_entries)} monthly capacity entries")
    print(f"  - {len(asset_capacities)} asset capacities")


if __name__ == "__main__":
    main()
