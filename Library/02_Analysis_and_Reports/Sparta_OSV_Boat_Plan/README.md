# Sparta OSV Boat Plan - Project Files

**Project:** Sparta 20K Deepening & Completion Well  
**Created:** May 7, 2026  
**Status:** Ready for Implementation  

---

## 📁 Project Files

### 📋 Main Documents

#### 1. [Sparta_OSV_Boat_Plan.md](Sparta_OSV_Boat_Plan.md)
**The comprehensive boat plan** - Start here!
- Executive summary and recommendations
- Complete cargo analysis
- Fleet configuration (4 OSVs + 1 Standby + 1 FSV)
- Detailed operational schedule
- Cost estimates ($6.2M - $10.2M)
- Risk register and contingency plans
- 25+ pages of detailed planning

#### 2. [Sparta_OSV_Schedule.xlsx](Sparta_OSV_Schedule.xlsx)
**Editable Excel workbook** - For daily operations
- **Sheet 1:** Project Summary
- **Sheet 2:** Detailed Schedule (Gantt-style, color-coded)
- **Sheet 3:** Vessel Tracker (450 rows for daily updates)
- **Sheet 4:** Cargo Manifest (16 items checklist)

#### 3. [FSV_Operations_Summary.md](FSV_Operations_Summary.md)
**FSV operations guide** - Everything about the weekly FSV runs
- FSV specifications and comparison
- Weekly schedule (12 trips)
- Cargo profile and typical loads
- Cost-benefit analysis
- Implementation recommendations

#### 4. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
**Complete project history and chat log**
- Original request details
- Solution evolution (v1.0 → v2.0)
- All deliverables created
- Key decisions and rationale
- Complete conversation flow
- Next steps and success metrics

---

## 🔧 Technical Files

#### [generate_osv_schedule.py](generate_osv_schedule.py)
Python script to generate the Excel workbook
- Run to regenerate Excel file with any changes
- Fully automated with formatting
- Reusable for future projects

**To run:**
```powershell
python generate_osv_schedule.py
```

**Dependencies:**
- Python 3.14+
- openpyxl library (already installed)

---

## 📊 Quick Reference

### Fleet Configuration
| Vessel | Role | Capacity | Trips | Days |
|--------|------|----------|-------|------|
| OSV-1 | SLB Fluids | 8,000 bbls | 12 | 86 |
| OSV-2 | Tetra Fluids | 8,000 bbls | 13 | 86 |
| OSV-3 | Drill Pipe | 5,000 sq ft | 8 | 86 |
| OSV-4 | Heavy Cargo | 7,000 bbls + 4,000 sq ft | 10 | 86 |
| OSV-5 | Standby | Flex | 3 | 24 |
| **FSV-1** | **Weekly Consumables** | **2,500 sq ft + 500 bbls** | **12** | **86** |

### Key Dates
- **December 20, 2026:** First loading begins
- **December 24, 2026:** Spud date / Deepening starts
- **January 1-24, 2027:** OVERLAP PERIOD (critical)
- **February 23, 2027:** Project complete

### Costs
- **Total Program:** $6.2M - $10.2M
- **FSV Addition:** +$688K - $1.03M (10-12% increase)
- **Total Trips:** 58 trips over 86 days

---

## 🎯 How to Use These Files

### For Planning & Approval
1. Start with [Sparta_OSV_Boat_Plan.md](Sparta_OSV_Boat_Plan.md)
2. Review [FSV_Operations_Summary.md](FSV_Operations_Summary.md) for FSV justification
3. Share [Sparta_OSV_Schedule.xlsx](Sparta_OSV_Schedule.xlsx) with stakeholders

### For Operations
1. Use [Sparta_OSV_Schedule.xlsx](Sparta_OSV_Schedule.xlsx) daily
2. Update "Vessel Tracker" sheet with real-time status
3. Check off items in "Cargo Manifest" sheet

### For Historical Reference
1. Review [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for complete project history
2. Includes all decisions, rationale, and conversation flow

### For Future Projects
1. Copy [generate_osv_schedule.py](generate_osv_schedule.py)
2. Modify vessel schedules and parameters
3. Regenerate Excel workbook automatically

---

## 📈 Visual Schedules

Gantt charts are embedded in:
- [Sparta_OSV_Boat_Plan.md](Sparta_OSV_Boat_Plan.md) (Mermaid diagram)
- [Sparta_OSV_Schedule.xlsx](Sparta_OSV_Schedule.xlsx) (color-coded detailed schedule)

---

## ✅ Project Status

- [x] Cargo analysis complete
- [x] Fleet configuration finalized
- [x] Detailed schedule created
- [x] FSV weekly runs integrated
- [x] Cost estimates calculated
- [x] Excel workbook generated
- [x] All documentation complete
- [ ] Approval pending
- [ ] Vessel contracts (June 2026)
- [ ] Mobilization (December 2026)

---

## 📞 Support

**Project Location:**  
`Library\02_Analysis_and_Reports\Sparta_OSV_Boat_Plan\`

**Dependencies:**
- Python virtual environment: `.venv` (already configured)
- openpyxl package (already installed)

**To regenerate Excel file:**
```powershell
python generate_osv_schedule.py
```

---

## 📝 Notes

- All dates are in YYYY-MM-DD format
- All costs are in USD
- Transit time assumes good weather (36 hours OSV, 24-28 hours FSV)
- FSV runs weekly (every 7 days)
- Standby vessel active only during overlap period (Jan 1-24)

---

**Last Updated:** May 7, 2026  
**Version:** 2.0 (with FSV)  
**Status:** Ready for Implementation
