"""Generate static spot-hire.json for GitHub Pages deployment."""
import json
from spot_hire_loader import load_spot_hire_records, load_spot_hire_forecast_counts

PHASE_COLORS = {
    'confirmed': {'phase': 'Confirmed', 'color': '#1a73e8'},
    'pending': {'phase': 'Pending', 'color': '#fbbc05'},
    'planned': {'phase': 'Planned', 'color': '#34a853'},
    'cancelled': {'phase': 'Cancelled', 'color': '#ea4335'},
    'high_risk': {'phase': 'High Risk', 'color': '#ff6d00'},
    'other': {'phase': 'Other', 'color': '#5f6368'}
}

def main():
    records, source = load_spot_hire_records()
    forecast = load_spot_hire_forecast_counts()
    phase_colors = {value['phase']: value['color'] for value in PHASE_COLORS.values()}
    
    # Filter out any non-dict entries (corrupted data)
    clean_records = [r for r in records if isinstance(r, dict)]
    
    output = {
        'source': source,
        'sheet_name': '2026 Spot Hire Update',
        'records': clean_records,
        'phase_colors': phase_colors,
        'monthly_forecast_counts': forecast
    }
    
    print(f"Records: {len(clean_records)}")
    
    with open('../frontend/data/spot-hire.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print("Saved to ../frontend/data/spot-hire.json")

if __name__ == '__main__':
    main()
