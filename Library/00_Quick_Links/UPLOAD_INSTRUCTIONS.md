# SharePoint Upload Instructions

## Destination
**SharePoint URL:** https://eu001-sp.shell.com/sites/UGPTDWGOMSupplyChain/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FUGPTDWGOMSupplyChain%2FShared%20Documents%2FSC%20Delivery%2FLogistics%20New%20Ways%20of%20Working

## Files to Upload

The following files are in this folder and ready to upload to SharePoint:

1. **OSV_Demand_Scheduler.url** - Windows shortcut to the OSV Demand Scheduler
   - Link: `http://127.0.0.1:8000/`
   
2. **Spot_Hire_Planner.url** - Windows shortcut to the Spot Hire Planner
   - Link: `http://127.0.0.1:8000/spot-hire`

3. **index.html** (Optional) - Visual portal page with both links
   - Can be used as a landing page in SharePoint

## How to Upload to SharePoint

### Option 1: Upload Individual Files
1. Navigate to the SharePoint folder link above
2. Click **"+ New"** → **"Upload"** or drag and drop files
3. Select the `.url` files (and optionally `index.html`)
4. Click **"Open"** or drop them into the folder
5. Files will upload and be accessible via SharePoint

### Option 2: Drag and Drop (Easiest)
1. Open this folder (`00_Quick_Links`) in Windows Explorer
2. Keep SharePoint folder open in your browser
3. Drag the `.url` files into the SharePoint window
4. Confirm the upload

### Option 3: Upload via Browser
1. Go to SharePoint location in browser
2. Click **"Upload"**
3. Select multiple files (hold Ctrl and click to select both `.url` files)
4. Click **"Open"**

## Verification
After upload, you should see:
- ✓ OSV_Demand_Scheduler.url
- ✓ Spot_Hire_Planner.url
- ✓ (Optional) index.html

## Notes
- The `.url` files are Windows Internet Shortcuts - they can be clicked directly
- These links work on `http://127.0.0.1:8000/` which requires the local development server to be running
- If sharing with others, they'll need to have access to the same local server or you can update the URLs to point to a deployed version

---

**Created:** May 26, 2026  
**Location:** `Library/00_Quick_Links/`
