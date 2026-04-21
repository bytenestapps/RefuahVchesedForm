/**
 * Refuah V'Chesed — volunteer form receiver
 *
 * SETUP:
 *  1. Create a Google Sheet. Copy its ID from the URL
 *     (https://docs.google.com/spreadsheets/d/THIS_PART/edit) and paste into SHEET_ID.
 *     In the sheet, rename Sheet1 to "Submissions" (or change SHEET_NAME below).
 *     Paste this header row into row 1 exactly:
 *
 *     Timestamp | Legal First | Legal Last | Yiddish First | Yiddish Last |
 *     Phone Number | Email Address |
 *     Address | Departments | Days | Times | ChaimVchesed - What | GemachRefuah - What |
 *     Mesamchim - Skills | COTG License ID | COTG Make | COTG Model | COTG Year |
 *     COTG Seats | COTG Plate | COTG License File
 *
 *  2. Create a Google Drive folder for uploaded license files.
 *     Copy its ID from the URL (drive.google.com/drive/folders/THIS_PART)
 *     and paste into FOLDER_ID.
 *
 *  3. In this Apps Script editor: Deploy → New deployment →
 *     Type: Web app
 *     Execute as: Me
 *     Who has access: Anyone
 *     Click Deploy, copy the Web App URL, paste it into script.js (APPS_SCRIPT_URL).
 *
 *  4. First run will ask you to authorize access to Sheets & Drive.
 */

const SHEET_ID   = '1g7qAD8srO4f3RSp8NHd-2r19IBI8pNrzJRa52nTbJ68';
const SHEET_NAME = 'RV New submissions';
const FOLDER_ID  = '116FqT0Bjogfl0MP8p-N8BdDQcMziULXS';

const SHARE_UPLOADS_PUBLICLY = false;

// Clean + format phone numbers
function cleanPhone(phone) {
  if (!phone) return '';

  phone = String(phone); // FIX 1: was string(phone) — lowercase 's' doesn't exist → "string is not defined"

  // Keep only digits
  let digits = phone.replace(/\D/g, '');

  // Strip leading country code "1" if present
  if (digits.length === 11 && digits.startsWith('1')) { // FIX 2: was startWith (missing 's')
    digits = digits.slice(1); // FIX 3: block was empty — never actually stripped the "1"
  }

  // Format if valid 10 digits
  if (digits.length === 10) {
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  // Fallback: return cleaned digits if not standard length
  return digits;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 1) Handle uploaded file (optional)
    let fileUrl = '';
    if (data.fileData && data.fileName) {
      const bytes = Utilities.base64Decode(data.fileData);
      const blob = Utilities.newBlob(bytes, data.mimeType || 'application/octet-stream', data.fileName);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(blob);
      if (SHARE_UPLOADS_PUBLICLY) {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
      fileUrl = file.getUrl();
    }

    // 2) Append row to the sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet tab "' + SHEET_NAME + '" not found');

    sheet.appendRow([
      new Date(),
      data.legalFirstName,
      data.legalLastName,
      data.Phonenumber,      // FIX 4: was data.Phonenumber — must match front-end field name
      data.emailAddress,
      data.yiddishFirstName,
      data.yiddishLastName,
      data.address,
      data.departments,
      data.days,
      data.times,
      data.chaimVchesed_tasks,
      data.cotg_options,
      data.cotg_licenseId,
      fileUrl,
      data.cotg_carMake,
      data.cotg_carModel,
      data.cotg_carYear,
      data.cotg_seats,
      data.cotg_licensePlate,
      data.mesamchim_skills,
      data.involvedOther,
      data.otherOrgName,
      data.referenceName,
      cleanPhone(data.referencePhone)
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: (err && err.message) ? String(err.message) : String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Simple sanity check in the Apps Script editor.
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Form endpoint live' }))
    .setMimeType(ContentService.MimeType.JSON);
}
