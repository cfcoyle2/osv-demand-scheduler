# Kabal Logistics Guide – Project README

**Created:** April 13, 2026  
**Author:** Chris Coyle – Shell GoA Supply Chain  
**Purpose:** Interactive HTML reference guide for Kabal platform users on the Logistics Delivery Team

---

## What Was Built

We created an **interactive, locally-hosted HTML web application** called `kabal-guide.html` that serves as a comprehensive, navigable reference guide for the Kabal logistics platform. The guide was built entirely from Shell's existing Kabal PDF training documents and covers the full end-to-end logistics process from demand planning through offshore delivery and backhaul.

The app requires no internet connection, no server, and no installation — it opens directly in any web browser.

---

## Source Documents Used

All content was extracted from the following PDF documents located in this folder:

| Document | Content |
|---|---|
| `Kabal - Entering Cost Codes.pdf` | Creating and activating project cost codes |
| `Kabal - Get Added to Email Lists.pdf` | Subscribing to Kabal notification email lists |
| `Kabal - Suppliers Guide - Dock Appointments.pdf` | Terminal Delivery Framework, dock appointment times |
| `Kabal - Suppliers Guide for Offshore Deliveries_REV1.pdf` | Full supplier workflow — scheduling, cargo items, CCUs |
| `Kabal - Vendor to Vendor Movements.pdf` | Warehouse Orders for inter-supplier movements |
| `Kabal Route Cheat Code.xlsx` | Route reference data |
| `Kabal_Shell GoM - New User Access Guide.pdf` | Account creation, role requests, user setup |
| `Marine Mapping Process with New WoW.pdf` | End-to-end logistics process map (New Ways of Working) |
| `SC Delivery - Future Logistics Optimization_Production LT Pack.pdf` | Control Tower model, planning phases, future state |
| `Step by Step- Creating Group Loads and Cargo Packages in Kabal.pdf` | Group Load and Cargo Package creation workflow |

---

## Steps Completed Today

### Step 1 – Locate Python Installation

Python was not available on the system PATH because the Windows Store app execution alias was shadowing it. We located the actual Python installation by querying the Windows Registry:

```powershell
Get-ItemProperty "HKCU:\SOFTWARE\Python\PythonCore\*\InstallPath"
```

**Result:** Python 3.14.4 found at:
```
C:\Users\Chris.Coyle\AppData\Local\Python\pythoncore-3.14-64\python.exe
```

---

### Step 2 – Create a Python Virtual Environment

A virtual environment isolates the project's Python packages from the rest of the system. This prevents version conflicts and keeps the project self-contained.

**Command run:**
```powershell
$python = "C:\Users\Chris.Coyle\AppData\Local\Python\pythoncore-3.14-64\python.exe"
cd "C:\Users\Chris.Coyle\OneDrive - Shell\Kabal"
& $python -m venv .venv
```

**What this did:**
- Created a `.venv` folder inside the Kabal project directory
- This folder contains its own Python interpreter and a clean package environment

---

### Step 3 – Activate the Virtual Environment and Install PDF Libraries

```powershell
cd "C:\Users\Chris.Coyle\OneDrive - Shell\Kabal"
.venv\Scripts\Activate.ps1
python --version
pip install pdfplumber pymupdf
```

**What this did:**
- `.venv\Scripts\Activate.ps1` — activated the virtual environment (prompt changes to show `(.venv)`)
- `pip install pdfplumber pymupdf` — installed two PDF extraction libraries:
  - **pdfplumber** — best for extracting structured text and tables from PDF files
  - **pymupdf** — fast PDF rendering library for complex layouts

---

### Step 4 – Extract Text from All PDF Documents

We created and ran a Python script (`extract_pdfs.py`) that automatically processed every PDF in the Kabal folder.

**Script:** `extract_pdfs.py`

**Command run:**
```powershell
python extract_pdfs.py
```

**What this did:**
- Opened each PDF using `pdfplumber`
- Extracted all text content page by page
- Extracted any tables found within each page
- Saved the extracted content as `.txt` files in the `extracted_text/` subfolder
- Output example: `Kabal - Suppliers Guide for Offshore Deliveries_REV1.txt` (25,876 characters extracted)

**Output files created in `extracted_text/`:**
```
extracted_text/
├── Kabal - Entering Cost Codes.txt
├── Kabal - Get Added to Email Lists.txt
├── Kabal - Suppliers Guide - Dock Appointments.txt
├── Kabal - Suppliers Guide for Offshore Deliveries_REV1.txt
├── Kabal - Vendor to Vendor Movements.txt
├── Kabal_Shell GoM - New User Access Guide.txt
├── Marine Mapping Process with New WoW.txt
├── SC Delivery - Future Logistics Optimization_Production LT Pack.txt
└── Step by Step- Creating Group Loads and Cargo Packages in Kabal.txt
```

---

### Step 5 – Analyze Document Themes

After extraction, all text files were reviewed and the following major themes were identified across the documents:

| Theme | Source Documents |
|---|---|
| End-to-end logistics lifecycle (Planning → Scheduling → Execution → Transport → Backhaul) | Marine Mapping, SC Delivery Optimization |
| Supplier workflow and responsibilities | Suppliers Guide for Offshore Deliveries, Email Lists |
| Cargo Package creation and management | Step by Step Guide, Suppliers Guide |
| Cargo item entry (manual and Excel) + CCU packing | Suppliers Guide for Offshore Deliveries |
| Vendor-to-vendor (warehouse order) movements | Vendor to Vendor Movements |
| Dock appointment scheduling at C-Port 2 | Dock Appointments Guide |
| Cost code setup and management | Entering Cost Codes |
| User onboarding and access | New User Access Guide |
| Control Tower model and New WoW | SC Delivery Optimization, Marine Mapping |
| Roles and responsibilities (SCLC, OLC, Supplier, MFP, C-Log) | All documents |

---

### Step 6 – Build the Interactive HTML Web Application

Based on the themes and process flows identified, a single-file HTML web application was created: `kabal-guide.html`.

**No libraries, frameworks, or internet connection required** — the entire app is self-contained in one HTML file using plain HTML, CSS, and JavaScript.

**Features built into the app:**
- Left sidebar navigation with 16 sections
- Shell brand colors (navy, yellow)
- Interactive process map with expandable phase steps
- Visual timeline bar showing the full logistics cycle
- Step-by-step formatted guides for each topic
- Roles & Responsibilities cards for all 8 key stakeholders
- Full offshore asset contact directory (16 platforms)
- 20-term glossary
- Color-coded status legend (matches Kabal's Supplier Layout)
- Responsive design (works on smaller screens)

---

## File Structure

After today's work, your Kabal folder contains:

```
Kabal/
├── kabal-guide.html          ← The interactive web app (OPEN THIS FILE)
├── extract_pdfs.py           ← Python script used to extract PDF text
├── extract_pdf_text.ps1      ← Earlier PowerShell extraction attempt (can be deleted)
├── README.md                 ← This file
├── .venv/                    ← Python virtual environment (do not edit)
├── extracted_text/           ← Raw text extracted from each PDF
│   ├── *.txt                 ← One file per PDF document
└── [Original PDF files]      ← Source documents (unchanged)
```

---

## How to Open and Use the Kabal Guide

### Opening the App

1. Navigate to your Kabal folder:
   `C:\Users\Chris.Coyle\OneDrive - Shell\Kabal`

2. Double-click **`kabal-guide.html`**

3. The app opens in your default web browser (Chrome, Edge, Firefox all work)

> No internet connection, login, or installation required.

---

### Navigating the App

The app has a **dark blue left sidebar** with all sections grouped by category:

**Overview**
- **Home** — What Kabal is, how the system works, quick navigation cards
- **Process Map** — The full end-to-end flow; click any phase to expand it

**Logistics Cycle** *(follow these in order)*
- **Planning Phase** — 3 months to 21 days before BDD
- **Scheduling Phase** — 21 to 4 days before BDD (supplier actions)
- **Execution Phase** — 4 days to vessel departure
- **Marine Transport** — Vessel loading through offshore delivery
- **Backhaul Process** — Equipment return flow

**How-To Guides** *(reference as needed)*
- **User Access & Setup** — New user onboarding steps
- **Group Loads & Cargo Packages** — For Shell Logistics Coordinators / OLCs
- **Cargo Items & CCUs** — For suppliers entering cargo details
- **Vendor-to-Vendor** — Warehouse Order process
- **Dock Appointments** — C-Port 2 appointment requirements
- **Cost Codes** — Creating project cost codes

**Reference**
- **Roles & Responsibilities** — Who does what
- **Contacts & Assets** — All 16 offshore platform contacts
- **Glossary** — 20 key terms defined

---

### Tip: Sharing the App with Your Team

Because `kabal-guide.html` is a single self-contained file, you can share it with your team by:

- **Email attachment** — attach the `.html` file directly
- **Shared drive** — copy to any OneDrive, SharePoint, or Teams shared folder
- **Teams message** — drag and drop the file into a Teams chat or channel

The recipient simply double-clicks the file to open it — no setup required.

---

## Re-Running the PDF Extraction (If Documents Are Updated)

If any of the source PDF documents are updated and you want to re-extract their content:

1. Open a PowerShell terminal in the Kabal folder
2. Activate the virtual environment:
   ```powershell
   .venv\Scripts\Activate.ps1
   ```
3. Run the extraction script:
   ```powershell
   python extract_pdfs.py
   ```
4. Updated `.txt` files will be saved to the `extracted_text/` folder

---

## Requirements

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.14.4 | Running the PDF extraction script |
| pdfplumber | 0.11.9 | PDF text and table extraction |
| pymupdf | 1.27.2.2 | PDF library (installed alongside pdfplumber) |
| Any web browser | Any | Opening the kabal-guide.html app |

Python install location: `C:\Users\Chris.Coyle\AppData\Local\Python\pythoncore-3.14-64\`

---

*Shell GoA Supply Chain Delivery · Confidential · April 2026*
