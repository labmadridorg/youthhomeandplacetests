const PHOTO_FOLDER_ID = "1OxXXCuKZWoYvO7t6UreTD71OrFVu85u4";
const PLACE_ID_COLUMN = 4;
const PHOTO_URL_COLUMN = 11;
const DEFAULT_SHEET_NAME = "BE";

// Column order must match buildRow()
const SHEET_HEADERS = [
  "Country", "Version", "Current Lang", "Exported At",
  "Place Id", "Name", "Evaluator", "Location", "Place Type", "Familiarity", "Note",
  "Photo Url", "Tags",
  "Safety", "Reachability", "Comfort", "Green", "Activity", "Inclusion", "Vibe",
  "Place Json"
];

function getOrCreateSheet(spreadsheet, sheetName) {

  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(SHEET_HEADERS);
  }

  return sheet;

}

function findPlaceRow(rows, placeId) {

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][PLACE_ID_COLUMN] === placeId) {
      return i + 1;
    }
  }

  return -1;
}

function findPhotoFile(placeId) {

  const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  const files = folder.getFiles();

  while (files.hasNext()) {

    const file = files.next();

    if (file.getName().startsWith(placeId + ".")) {
      return file;
    }
  }

  return null;
}

function directDriveImageUrl(fileId) {
  // uc?export=view is unreliable for hotlinking (Drive often serves a confirmation page instead of the image).
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

// photo: base64 data URL, only present when a new/replacement image was uploaded this session.
// photoUrl: the place's last known synced Drive URL, sent back unchanged by the frontend.
function updatePhoto(placeId, photo, photoUrl, existingFile) {

  // New or replacement photo uploaded this session.
  if (photo) {

    if (existingFile) {
      existingFile.setTrashed(true);
    }

    const matches = photo.match(/^data:(.+);base64,(.+)$/);

    if (!matches) {
      throw new Error("Invalid image format.");
    }

    const mimeType = matches[1];
    const imageData = matches[2];
    const extension = mimeType.split("/")[1];

    const blob = Utilities.newBlob(
      Utilities.base64Decode(imageData),
      mimeType,
      `${placeId}.${extension}`
    );

    const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
    const file = folder.createFile(blob);
    // New files inherit the folder's sharing; setting per-file sharing is blocked by domain policy and unnecessary.

    return directDriveImageUrl(file.getId());

  }

  // No new upload, but the place already has a synced photo: leave Drive untouched.
  if (photoUrl) {
    return photoUrl;
  }

  // No new upload and no known photoUrl: the photo was explicitly removed.
  if (existingFile) {
    existingFile.setTrashed(true);
  }

  return "";

}

// The single source of truth for import: a faithful snapshot of the place, photo bytes excluded.
function buildPlaceJson(place, photoUrl) {

  return JSON.stringify({
    id: place.id,
    name: place.name,
    evaluator: place.evaluator,
    location: place.location,
    placeType: place.placeType,
    familiarity: place.familiarity,
    note: place.note,
    photoUrl: photoUrl,
    tags: place.tags,
    scores: place.scores
  });

}

function buildRow(data, place, photoUrl) {

  return [

    data.country,
    data.version,
    data.currentLang,
    data.exportedAt,

    place.id,
    place.name,
    place.evaluator,
    place.location,
    place.placeType,
    place.familiarity,
    place.note,
    photoUrl,
    place.tags.join(", "),

    place.scores.safety,
    place.scores.reachability,
    place.scores.comfort,
    place.scores.green,
    place.scores.activity,
    place.scores.inclusion,
    place.scores.vibe,

    buildPlaceJson(place, photoUrl)

  ];

}

function doPost(e) {

  try {

    const data = JSON.parse(e.postData.contents);

    const sheetName = (data.sheetName || "").toString().trim() || DEFAULT_SHEET_NAME;

    const sheet = getOrCreateSheet(
      SpreadsheetApp.getActiveSpreadsheet(),
      sheetName
    );

    const rows = sheet.getDataRange().getValues();
    const results = [];

    for (const place of data.places) {

      // Isolate failures per place so one bad photo doesn't block the rest of the batch.
      try {

        const sheetRow = findPlaceRow(rows, place.id);

        // Only scan Drive when we might need to create, replace, or trash a file.
        const needsExistingFile = sheetRow !== -1 && (!!place.photo || !place.photoUrl);
        const existingFile = needsExistingFile ? findPhotoFile(place.id) : null;

        const photoUrl = updatePhoto(
          place.id,
          place.photo,
          place.photoUrl,
          existingFile
        );

        const rowData = buildRow(
          data,
          place,
          photoUrl
        );

        if (sheetRow === -1) {

          sheet.appendRow(rowData);
          rows.push(rowData);

        } else {

          sheet
            .getRange(sheetRow, 1, 1, rowData.length)
            .setValues([rowData]);

          rows[sheetRow - 1] = rowData;

        }

        results.push({ id: place.id, photoUrl: photoUrl });

      } catch (placeErr) {

        console.error(`Place ${place.id} failed: ${placeErr}`);
        results.push({ id: place.id, error: placeErr.toString() });

      }

    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        results: results
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  }

}