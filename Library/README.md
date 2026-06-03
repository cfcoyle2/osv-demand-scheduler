# Workspace Library Structure

This folder is a central library for work created or stored in this VS Code workspace.

See `NAMING_CONVENTIONS.md` for recommended file and folder naming patterns.

## Folder Map

- `00_Inbox`
  - Drop new files here first before sorting them.
- `01_Websites`
  - HTML sites, dashboards, and web prototypes.
  - Suggested subfolders: one folder per site.
- `02_Analysis_and_Reports`
  - Written analysis, decision briefs, markdown reports, and working notes.
- `03_Presentations`
  - PowerPoint files, slide drafts, and presentation source content.
- `04_Data_and_Workbooks`
  - Excel files, CSVs, exported data, and working datasets.
- `05_Scripts_and_Automation`
  - Reusable scripts and automation helpers.
  - `PowerShell` for `.ps1`
  - `Python` for `.py`
- `06_Templates`
  - Reusable starting points for reports, decks, and project folders.
  - Includes `HTML_Project_Template` for new site or dashboard work.
  - Includes `Project_Work_Package_Template` for analysis and presentation work.
- `07_Reference_Material`
  - Supporting documents, background material, and static references.
- `08_Archive`
  - Completed or inactive work you want to keep but not keep in the active area.

## Standards

- Use `NAMING_CONVENTIONS.md` to keep project, file, and script names consistent.

## Suggested Usage

- Keep active website work in `01_Websites`.
- Keep business writeups in `02_Analysis_and_Reports`.
- Keep slide outputs in `03_Presentations`.
- Keep source Excel files in `04_Data_and_Workbooks`.
- Move finished projects to `08_Archive` when they are no longer active.

## Suggested Project Pattern

For a new piece of work, create a named folder inside the matching category.

Examples:

- `01_Websites/Kabal`
- `01_Websites/Logistics_Lookahead`
- `02_Analysis_and_Reports/Sparta_EV_Runs`
- `03_Presentations/Sparta_EV_Runs`
- `06_Templates/HTML_Project_Template`
- `06_Templates/Project_Work_Package_Template`

This structure is intentionally simple so it stays maintainable as the library grows.
