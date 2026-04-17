# Refuah V'Chesed — Get Involved Form

A single-page volunteer sign-up form that saves submissions (and uploaded driver's license files) to a Google Sheet + Google Drive folder via a Google Apps Script Web App.

## File layout

```
RefuahVchesedGetInvolved/
├── index.html        # The form page
├── styles.css        # Styling
├── script.js         # Client-side logic + submission
├── Code.gs           # Google Apps Script backend (paste into Apps Script editor)
├── assets/
│   └── icons/
│       ├── chaim-vchesed.svg
│       ├── chesed-on-the-go.svg
│       ├── gemach-refuah.svg
│       └── mesamchim.svg
└── README.md         # This file
```

Simple placeholder SVGs are included. Replace them with your own artwork (same filenames, 48×48 recommended) in `assets/icons/` whenever you're ready.

## One-time setup

### 1. Google Sheet
1. Create a new Google Sheet (e.g. "RefuahVchesed Submissions").
2. Rename the tab to `Submissions`.
3. Paste these headers into row 1 (19 columns):
   ```
   Timestamp | Legal First | Legal Last | Yiddish First | Yiddish Last | Address | Departments | Days | Times | ChaimVchesed - What | GemachRefuah - What | Mesamchim - Skills | COTG License ID | COTG Make | COTG Model | COTG Year | COTG Seats | COTG Plate | COTG License File
   ```
4. Copy the Sheet ID from the URL: `docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.

### 2. Google Drive folder
1. Create a folder (e.g. "RefuahVchesed Uploads").
2. Copy the folder ID from its URL: `drive.google.com/drive/folders/<FOLDER_ID>`.

### 3. Apps Script
1. In the Google Sheet, open **Extensions → Apps Script**.
2. Replace the default `Code.gs` with the contents of `Code.gs` from this project.
3. Set `SHEET_ID` and `FOLDER_ID` at the top.
4. Click **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorize when prompted. Copy the resulting **Web App URL**.

### 4. Wire the form to the backend
Open `script.js` and set:
```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/.../exec';
```

### 5. (Optional) Address autocomplete
The Address field uses the Google Places API. Open `index.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` in the `<script src="https://maps.googleapis.com/...">` tag.

To get a key: https://developers.google.com/maps/documentation/javascript/get-api-key
You need to enable the **Places API** on the key.

If you don't want Google autocomplete, just delete those two `<script>` tags — the field keeps working as a plain text input.

## Running locally
Open `index.html` directly in a browser, or (recommended) serve from the project folder so API calls behave predictably:

```pwsh
# With Python installed:
python -m http.server 8080
# Then visit http://localhost:8080
```

## Where you'll see submissions
- **Text data** → rows in the Google Sheet, one per submission, with a timestamp.
- **Driver's license files** → files in the Drive folder; a direct link appears in the `COTG License File` column of the sheet.

## Access / sharing
- **Form submitters** (website visitors) need **no access** to the Sheet or Drive folder — the Apps Script writes on your behalf.
- **You and your team** should be invited to the Sheet and Drive folder to view submissions.
- By default, uploaded license files are **private** (only folder members can open them). To let anyone-with-the-link view, set `SHARE_UPLOADS_PUBLICLY = true` in `Code.gs` and redeploy.

## Notes / limits
- Max upload size is 10MB (enforced client-side). Apps Script webapps cap payloads around ~50MB; base64 encoding adds ~33% overhead.
- Car make/model dropdowns use the free NHTSA vPIC API — no key required, but it needs internet access.
- The form is in English + Yiddish (RTL fields for the Yiddish name inputs).
