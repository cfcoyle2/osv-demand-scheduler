# Logistics Lookahead Website Package

This folder is the Library copy of the Logistics Lookahead HTML site.

## Current Entry File

- `index.html`

## Features

### Drag and Drop
- **Drag vessel runs** between time windows (7-14 Days, 14-21 Days, Beyond 21 Days)
- Visual drop zones highlight when dragging
- Run activities automatically update when moved
- Toast notifications confirm moves

### Trend Tracking
- **Take snapshots** to track activity trends over time
- View sparkline charts showing run counts across weeks
- Track confirmed vs planned vs issues trends
- Compare current week to previous snapshots
- Click **📈 Trends** button in header to toggle trends panel

### Free Text Issues
- **Flights/Concerns/Issues** tile supports free text entry
- Add issues directly with the input field
- Click any issue to edit or remove

### Data Sync
- **🔄 Sync** button to import data from downloaded HTML files
- Supports JSON export/import
- Automatic conversion from legacy format

## Folder Use

- `assets/`
  - Images, stylesheets, scripts, and reusable UI files.
- `docs/`
  - Notes, requirements, meeting inputs, and page change history.
- `data/`
  - Static data files such as JSON, CSV, or exports used by the page.
  - `lookahead_template.json` - Template for automated data updates
- `archive/`
  - Previous versions, exports, or retired content.

## Automation

To sync data from downloaded HTML files:

1. Click the **🔄 Sync** button in the header
2. Select the downloaded `Logistics_Lookahead (X).html` file
3. Data will be automatically converted and imported

For programmatic updates, use the JSON template in `data/lookahead_template.json`:
- Update the `assets` array with new vessel runs
- Adjust `weekOf` to the current week
- Import via the **📂 Import** button

## Data Structure

```json
{
  "weekOf": "2026-05-13",
  "activeAsset": "poseidon",
  "assets": [
    {
      "id": "poseidon",
      "name": "Deepwater Poseidon",
      "coordinator": "Christopher Coyle",
      "issues": ["Issue text..."],
      "notes": { "7-14": "Note...", "14-21": "", "21+": "" },
      "activities": { "7-14": ["Activity Name"], ... },
      "runs": [
        {
          "id": "r1",
          "window": "7-14",
          "activity": "Activity Name",
          "date": "5/20",
          "gl": "GL 09",
          "vessel": "OSV",
          "hours": "48hrs",
          "cargo": "Cargo description",
          "status": "planned"
        }
      ]
    }
  ]
}
```

## Notes

- The current page is self-contained in `index.html`.
- If it evolves into a multi-file site, keep `index.html` as the launch file and place support files in the folders above.