"""
OSV Demand Scheduler Local Server
=================================
A Flask-based server that supports:
- Serving static files (HTML, CSS, JS)
- API endpoints for reading/writing data
- Excel workbook upload and parsing

Run with: python server.py
Access at: http://127.0.0.1:8000
"""

import os
import json
import uuid
import re
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Try to import openpyxl for Excel parsing
try:
    import openpyxl
    EXCEL_SUPPORT = True
except ImportError:
    EXCEL_SUPPORT = False
    print("WARNING: openpyxl not installed. Excel upload will be limited.")
    print("Install with: pip install openpyxl")

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Configuration
DATA_DIR = Path(__file__).parent / 'data'
UPLOAD_FOLDER = Path(__file__).parent / 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'json'}

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
UPLOAD_FOLDER.mkdir(exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_id():
    return uuid.uuid4().hex[:12]


def parse_date(value):
    """Parse various date formats to ISO string."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        # Try common formats
        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%dT%H:%M:%S']:
            try:
                return datetime.strptime(value, fmt).isoformat()
            except ValueError:
                continue
    return str(value) if value else None


def safe_string(value):
    """Convert value to string safely."""
    if value is None:
        return ''
    return str(value).strip()


def safe_float(value, default=0.0):
    """Convert value to float safely."""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


# ============== Static File Routes ==============

@app.route('/')
def index():
    return send_file('index.html')


@app.route('/spot-hire')
@app.route('/spot_hire.html')
def spot_hire():
    return send_file('spot_hire.html')


@app.route('/<path:filename>')
def serve_static(filename):
    # Serve static files from root directory
    if os.path.isfile(filename):
        return send_file(filename)
    return send_from_directory('.', filename)


# ============== Health Check ==============

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'excel_support': EXCEL_SUPPORT,
        'timestamp': datetime.now().isoformat()
    })


# ============== Data API Routes ==============

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        with open(DATA_DIR / 'tasks.json', 'r') as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify({'tasks': [], 'source': '', 'buffer_hours': 24})


@app.route('/api/tasks', methods=['POST'])
def save_tasks():
    data = request.get_json()
    with open(DATA_DIR / 'tasks.json', 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})


@app.route('/api/conflicts', methods=['GET'])
def get_conflicts():
    try:
        with open(DATA_DIR / 'conflicts.json', 'r') as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify({'conflicts': [], 'fleet': None})


@app.route('/api/conflicts', methods=['POST'])
def save_conflicts():
    data = request.get_json()
    with open(DATA_DIR / 'conflicts.json', 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})


@app.route('/api/asset-capacity', methods=['GET'])
def get_asset_capacity():
    try:
        with open(DATA_DIR / 'asset-capacity.json', 'r') as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify({'asset_capacities': [], 'monthly_capacity_entries': []})


@app.route('/api/asset-capacity', methods=['POST'])
def save_asset_capacity():
    data = request.get_json()
    with open(DATA_DIR / 'asset-capacity.json', 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})


@app.route('/api/spot-hire', methods=['GET'])
def get_spot_hire():
    try:
        with open(DATA_DIR / 'spot-hire.json', 'r') as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify({'records': [], 'source': '', 'phase_colors': {}})


@app.route('/api/spot-hire', methods=['POST'])
def save_spot_hire():
    data = request.get_json()
    
    # Check if this is a single new record (has 'asset' and 'activity' but no 'records')
    if 'asset' in data and 'activity' in data and 'records' not in data:
        # This is a new record to add - load existing data and append
        try:
            with open(DATA_DIR / 'spot-hire.json', 'r') as f:
                spot_data = json.load(f)
        except FileNotFoundError:
            spot_data = {'records': [], 'source': '', 'phase_colors': {}}
        
        # Generate ID for new record
        new_record = {
            'id': generate_id(),
            'asset': data.get('asset', ''),
            'display_asset': data.get('display_asset') or data.get('asset', ''),
            'vessel_count': data.get('vessel_count', 1),
            'area': data.get('area', ''),
            'activity': data.get('activity', ''),
            'phase': data.get('phase', ''),
            'color': data.get('color', '#78909c'),
            'start_date': data.get('start_date', ''),
            'end_date': data.get('end_date', ''),
            'status': data.get('status', 'Planned'),
            'notes': data.get('notes', ''),
            'source': 'app'
        }
        spot_data.setdefault('records', []).append(new_record)
        
        with open(DATA_DIR / 'spot-hire.json', 'w') as f:
            json.dump(spot_data, f, indent=2)
        return jsonify({'success': True, 'id': new_record['id']})
    
    # Otherwise, save the full data structure
    with open(DATA_DIR / 'spot-hire.json', 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})


# Spot hire impacts/notes per month
IMPACTS_FILE = DATA_DIR / 'spot-hire-impacts.json'

def load_impacts():
    try:
        with open(IMPACTS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_impacts_file(data):
    with open(IMPACTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


@app.route('/api/spot-hire/impacts', methods=['GET'])
def get_spot_hire_impacts():
    month = request.args.get('month', '')
    impacts = load_impacts()
    if month and month in impacts:
        return jsonify(impacts[month])
    return jsonify({
        'base_fleet': '',
        'frac_spot_hires': '',
        'operational_spot_hires': '',
        'text': '',
        'updated_at': None
    })


@app.route('/api/spot-hire/impacts', methods=['POST'])
def save_spot_hire_impacts():
    data = request.get_json()
    month = data.get('month', '')
    if not month:
        return jsonify({'error': 'Month required'}), 400
    
    impacts = load_impacts()
    impacts[month] = {
        'base_fleet': data.get('base_fleet', ''),
        'frac_spot_hires': data.get('frac_spot_hires', ''),
        'operational_spot_hires': data.get('operational_spot_hires', ''),
        'text': data.get('text', ''),
        'updated_at': datetime.now().isoformat()
    }
    save_impacts_file(impacts)
    return jsonify(impacts[month])


@app.route('/api/spot-hire/changes', methods=['POST'])
def apply_spot_hire_changes():
    """Apply batch changes to spot hire records (update dates, etc)."""
    data = request.get_json()
    changes = data.get('changes', [])
    
    # Load current data
    try:
        with open(DATA_DIR / 'spot-hire.json', 'r') as f:
            spot_data = json.load(f)
    except FileNotFoundError:
        spot_data = {'records': [], 'source': '', 'phase_colors': {}}
    
    records = spot_data.get('records', [])
    records_by_id = {r['id']: r for r in records}
    
    # Apply changes
    for change in changes:
        record_id = change.get('id')
        if record_id and record_id in records_by_id:
            record = records_by_id[record_id]
            # Update all editable fields
            for field in ['start_date', 'end_date', 'status', 'phase', 'notes', 
                          'vessel_count', 'asset', 'display_asset', 'area', 
                          'activity', 'color']:
                if field in change:
                    record[field] = change[field]
    
    # Save
    spot_data['records'] = list(records_by_id.values())
    with open(DATA_DIR / 'spot-hire.json', 'w') as f:
        json.dump(spot_data, f, indent=2)
    
    return jsonify({'success': True, 'changes_applied': len(changes)})


@app.route('/api/spot-hire/<record_id>', methods=['DELETE'])
def delete_spot_hire_record(record_id):
    """Delete a spot hire record by ID."""
    try:
        with open(DATA_DIR / 'spot-hire.json', 'r') as f:
            spot_data = json.load(f)
    except FileNotFoundError:
        return jsonify({'error': 'Record not found'}), 404
    
    records = spot_data.get('records', [])
    original_count = len(records)
    spot_data['records'] = [r for r in records if r.get('id') != record_id]
    
    if len(spot_data['records']) == original_count:
        return jsonify({'error': 'Record not found'}), 404
    
    with open(DATA_DIR / 'spot-hire.json', 'w') as f:
        json.dump(spot_data, f, indent=2)
    
    return jsonify({'success': True})


# ============== File Upload ==============

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: xlsx, xls, json'}), 400
    
    filename = secure_filename(file.filename)
    filepath = UPLOAD_FOLDER / filename
    file.save(filepath)
    
    try:
        if filename.endswith('.json'):
            # Direct JSON upload
            result = process_json_upload(filepath)
        else:
            # Excel upload
            if not EXCEL_SUPPORT:
                return jsonify({
                    'error': 'Excel support not available. Install openpyxl: pip install openpyxl'
                }), 400
            result = process_excel_upload(filepath, filename)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500


def process_json_upload(filepath):
    """Process a direct JSON file upload."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # Detect which type of data this is and save to appropriate file
    if 'tasks' in data:
        with open(DATA_DIR / 'tasks.json', 'w') as f:
            json.dump(data, f, indent=2)
        return {'success': True, 'type': 'tasks', 'count': len(data.get('tasks', []))}
    
    elif 'records' in data:
        with open(DATA_DIR / 'spot-hire.json', 'w') as f:
            json.dump(data, f, indent=2)
        return {'success': True, 'type': 'spot-hire', 'count': len(data.get('records', []))}
    
    elif 'conflicts' in data:
        with open(DATA_DIR / 'conflicts.json', 'w') as f:
            json.dump(data, f, indent=2)
        return {'success': True, 'type': 'conflicts', 'count': len(data.get('conflicts', []))}
    
    elif 'asset_capacities' in data:
        with open(DATA_DIR / 'asset-capacity.json', 'w') as f:
            json.dump(data, f, indent=2)
        return {'success': True, 'type': 'asset-capacity', 'count': len(data.get('asset_capacities', []))}
    
    return {'error': 'Unknown JSON format'}, 400


def process_excel_upload(filepath, filename):
    """Process an Excel workbook upload."""
    wb = openpyxl.load_workbook(filepath, data_only=True)
    results = {'success': True, 'sheets_processed': [], 'tasks': 0, 'spot_hire': 0}
    
    # Look for known sheet patterns
    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        
        # Detect sheet type by headers or name
        headers = [safe_string(cell.value).lower() for cell in sheet[1]]
        
        if is_tasks_sheet(sheet_name, headers):
            tasks = parse_tasks_sheet(sheet, filename, sheet_name)
            if tasks:
                save_tasks_data(tasks, filename, sheet_name)
                results['sheets_processed'].append(sheet_name)
                results['tasks'] = len(tasks)
        
        elif is_spot_hire_sheet(sheet_name, headers):
            records = parse_spot_hire_sheet(sheet, filename, sheet_name)
            if records:
                save_spot_hire_data(records, filename, sheet_name)
                results['sheets_processed'].append(sheet_name)
                results['spot_hire'] = len(records)
    
    wb.close()
    return results


# Phase color mapping - distinct colors for each category
PHASE_COLORS = {
    'EV Run': '#b79ac7',           # Light Purple
    'Top Hole': '#00b4d8',         # Cyan
    'Deepening': '#ff6b35',        # Orange
    'Completion': '#7cb518',       # Green
    'Demob': '#6c757d',            # Gray
    'PA': '#9d4edd',               # Purple
    'TA': '#3a86ff',               # Blue
    'Dedicated Run': '#ffd60a',    # Yellow/Gold
    'Frac Spot Hire': '#e76f51',   # Coral/Red
    'Other': '#f72585',            # Hot Pink (distinct)
    # Aliases for backwards compatibility
    'Abandonment': '#9d4edd',      # Same as PA
    'P&A': '#9d4edd',              # Same as PA
    'Turnaround': '#3a86ff',       # Same as TA
    'Dedicated OSV': '#ffd60a',    # Same as Dedicated Run
    'Pilot Hole': '#00b4d8',       # Same as Top Hole
    'Idle': '#adb5bd',             # Light gray
}


def infer_phase_from_activity(activity):
    """Infer the phase/type from activity text using keyword matching."""
    if not activity:
        return 'Other'
    
    text = activity.lower()
    
    # Check patterns in order of specificity
    if 'ev run' in text or 'ev ' in text:
        return 'EV Run'
    if 'frac' in text:
        return 'Frac Spot Hire'
    if 'demob' in text or 'demobilization' in text:
        return 'Demob'
    if 'dedicated' in text or 'dedicated run' in text:
        return 'Dedicated Run'
    if ' ta' in text or text.startswith('ta ') or 'turnaround' in text or 'turn around' in text:
        return 'TA'
    if 'p&a' in text or ' pa' in text or text.endswith(' pa') or text.endswith('pa') or 'abandon' in text:
        return 'PA'
    if 'completion' in text or 'complete' in text:
        return 'Completion'
    if 'top hole' in text or 'tophole' in text or 'pilot hole' in text or 'pilot' in text:
        return 'Top Hole'
    if 'deepen' in text or 'sidetrack' in text or ('drill' in text and 'pilot' not in text and 'top' not in text):
        return 'Deepening'
    if 'idle' in text:
        return 'Other'
    
    return 'Other'


def is_tasks_sheet(name, headers):
    """Check if sheet contains task data."""
    name_lower = name.lower()
    task_indicators = ['route', 'demand', 'task', 'schedule', 'osv']
    header_indicators = ['asset', 'activity', 'start_date', 'offshore', 'project']
    
    if any(ind in name_lower for ind in task_indicators):
        return True
    if sum(1 for h in header_indicators if h in ' '.join(headers)) >= 3:
        return True
    return False


def is_spot_hire_sheet(name, headers):
    """Check if sheet contains spot hire data."""
    name_lower = name.lower()
    spot_indicators = ['spot', 'hire', 'charter']
    header_indicators = ['phase', 'area', 'start', 'end']
    
    if any(ind in name_lower for ind in spot_indicators):
        return True
    if sum(1 for h in header_indicators if h in ' '.join(headers)) >= 2:
        return True
    return False


def parse_tasks_sheet(sheet, filename, sheet_name):
    """Parse a tasks sheet from Excel."""
    headers = [safe_string(cell.value).lower().replace(' ', '_') for cell in sheet[1]]
    print(f"DEBUG: Sheet '{sheet_name}' headers: {headers}")
    
    # Map common column variations (including Asset Activity Tracker format)
    column_map = {
        'asset': find_column(headers, ['asset', 'platform', 'rig']),
        'coordinator': find_column(headers, ['coordinator', 'planner', 'owner']),
        'vessel': find_column(headers, ['vessel', 'boat', 'osv']),
        'project': find_column(headers, ['project', 'well', 'campaign']),
        'activity': find_column(headers, ['activity', 'description', 'task', 'scope']),
        'status': find_column(headers, ['status', 'state']),
        'start_date': find_column(headers, ['start_date', 'start', 'sail_date', 'base_delivery_date', 'delivery_date', 'sail']),
        'offshore_start': find_column(headers, ['offshore_start', 'arrive', 'arrival', 'offshore_req_date', 'offshore_req', 'req_date']),
        'offshore_end': find_column(headers, ['offshore_end', 'depart', 'departure', 'offloading_complete_date', 'offloading_complete', 'complete_date']),
        'return_end': find_column(headers, ['return_end', 'return', 'back', 'back_to_port', 'port']),
        'duration_hours': find_column(headers, ['duration_hours', 'duration', 'hours', 'estimated_duration', 'hrs']),
        'transit_hours': find_column(headers, ['transit_hours', 'transit', 'steam', 'transit_time', 'transit_time_back']),
    }
    print(f"DEBUG: Column mappings: {column_map}")
    
    tasks = []
    for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not any(row):  # Skip empty rows
            continue
        
        task = {
            'id': generate_id(),
            'asset': get_cell_value(row, column_map['asset']),
            'coordinator': get_cell_value(row, column_map['coordinator']),
            'vessel': get_cell_value(row, column_map['vessel'], 'Route Demand'),
            'project': get_cell_value(row, column_map['project']),
            'activity': get_cell_value(row, column_map['activity']),
            'status': get_cell_value(row, column_map['status'], 'Planned'),
            'start_date': parse_date(get_cell_value(row, column_map['start_date'])),
            'offshore_start': parse_date(get_cell_value(row, column_map['offshore_start'])),
            'offshore_end': parse_date(get_cell_value(row, column_map['offshore_end'])),
            'return_end': parse_date(get_cell_value(row, column_map['return_end'])),
            'duration_hours': safe_float(get_cell_value(row, column_map['duration_hours']), 24.0),
            'transit_hours': safe_float(get_cell_value(row, column_map['transit_hours']), 18.0),
            'source': 'workbook',
            'sheet_row': row_idx
        }
        
        # Skip rows without essential data
        if task['asset'] and (task['activity'] or task['project']):
            tasks.append(task)
    
    return tasks


def find_header_row(sheet, required_headers, max_rows=20):
    """Find the row containing headers by searching for required column names."""
    for row_idx in range(1, min(max_rows + 1, sheet.max_row + 1)):
        row_values = [safe_string(cell.value).lower() for cell in sheet[row_idx]]
        row_text = ' '.join(row_values)
        matches = sum(1 for h in required_headers if h in row_text)
        if matches >= 2:  # At least 2 required headers found
            return row_idx, row_values
    return 1, [safe_string(cell.value).lower() for cell in sheet[1]]  # Default to row 1


def parse_spot_hire_sheet(sheet, filename, sheet_name):
    """Parse a spot hire sheet from Excel."""
    # Find the header row (may not be row 1)
    header_row, raw_headers = find_header_row(sheet, ['asset', 'start', 'end', 'activity'])
    headers = [h.replace(' ', '_') for h in raw_headers]
    print(f"DEBUG: Spot hire sheet '{sheet_name}' header row: {header_row}, headers: {headers[:10]}")
    
    column_map = {
        'asset': find_column(headers, ['asset', 'platform', 'rig']),
        'area': find_column(headers, ['area', 'region', 'location']),
        'activity': find_column(headers, ['activity', 'description', 'scope', 'vessel']),
        'phase': find_column(headers, ['phase', 'type', 'category']),
        'start_date': find_column(headers, ['start_date', 'start', 'from']),
        'end_date': find_column(headers, ['end_date', 'end', 'to']),
        'status': find_column(headers, ['status', 'state']),
        'notes': find_column(headers, ['notes', 'comments', 'remarks']),
    }
    print(f"DEBUG: Spot hire column mappings: {column_map}")
    
    records = []
    for row_idx, row in enumerate(sheet.iter_rows(min_row=header_row + 1, values_only=True), start=header_row + 1):
        if not any(row):
            continue
        
        asset_val = get_cell_value(row, column_map['asset'])
        if not asset_val:
            continue
        
        activity = get_cell_value(row, column_map['activity'])
        explicit_phase = get_cell_value(row, column_map['phase']) if column_map['phase'] is not None else ''
        
        # Use explicit phase if available, otherwise infer from activity
        phase = explicit_phase if explicit_phase else infer_phase_from_activity(activity)
        color = PHASE_COLORS.get(phase, PHASE_COLORS['Other'])
            
        record = {
            'id': generate_id(),
            'asset': asset_val.strip(),
            'display_asset': asset_val.strip(),
            'area': get_cell_value(row, column_map['area']),
            'activity': activity,
            'phase': phase,
            'color': color,
            'start_date': parse_date(get_cell_value(row, column_map['start_date'])),
            'end_date': parse_date(get_cell_value(row, column_map['end_date'])),
            'status': get_cell_value(row, column_map['status'], 'Planned'),
            'notes': get_cell_value(row, column_map['notes']),
            'source': 'workbook',
            'sheet_row': row_idx
        }
        
        if record['asset'] and record['start_date']:
            records.append(record)
    
    return records


def find_column(headers, variations):
    """Find column index matching any of the variations."""
    for i, header in enumerate(headers):
        for var in variations:
            if var in header:
                return i
    return None


def get_cell_value(row, col_idx, default=''):
    """Get cell value safely."""
    if col_idx is None or col_idx >= len(row):
        return default
    value = row[col_idx]
    return safe_string(value) if value is not None else default


def save_tasks_data(tasks, filename, sheet_name):
    """Save parsed tasks to JSON file."""
    data = {
        'tasks': tasks,
        'source': f'workbook:{filename}:{sheet_name}',
        'buffer_hours': 24,
        'imported_at': datetime.now().isoformat()
    }
    with open(DATA_DIR / 'tasks.json', 'w') as f:
        json.dump(data, f, indent=2)


# Standard phases that should always appear in the legend
STANDARD_PHASES = [
    'EV Run', 'Top Hole', 'Deepening', 'Completion', 'Demob',
    'PA', 'TA', 'Dedicated Run', 'Frac Spot Hire', 'Other'
]


def save_spot_hire_data(records, filename, sheet_name):
    """Save parsed spot hire records to JSON file."""
    # Always include all standard phases in color mapping for consistent legend
    phase_colors = {phase: PHASE_COLORS.get(phase, PHASE_COLORS['Other']) for phase in STANDARD_PHASES}
    
    # Also add any additional phases from records
    for record in records:
        phase = record.get('phase')
        if phase and phase not in phase_colors:
            phase_colors[phase] = PHASE_COLORS.get(phase, PHASE_COLORS['Other'])
    
    data = {
        'source': f'workbook:{filename}:{sheet_name}',
        'sheet_name': sheet_name,
        'records': records,
        'phase_colors': phase_colors,
        'imported_at': datetime.now().isoformat()
    }
    with open(DATA_DIR / 'spot-hire.json', 'w') as f:
        json.dump(data, f, indent=2)


# ============== Main ==============

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("OSV Demand Scheduler Local Server")
    print("=" * 50)
    print(f"Excel support: {'Yes' if EXCEL_SUPPORT else 'No (install openpyxl)'}")
    print(f"Data directory: {DATA_DIR}")
    print(f"Upload directory: {UPLOAD_FOLDER}")
    print("\nStarting server at http://127.0.0.1:8000")
    print("Press Ctrl+C to stop\n")
    
    app.run(host='127.0.0.1', port=8000, debug=True)
