const PHOTO_FOLDER_ID = "1OxXXCuKZWoYvO7t6UreTD71OrFVu85u4";
const PLACE_ID_COLUMN = 4;
const PHOTO_URL_COLUMN = 11;
const DEFAULT_SHEET_NAME = "BE";

// Column order must match buildRow()
const SHEET_HEADERS = [
  "Country", "Version", "Current Lang", "Exported At",
  "Place Id", "Name", "Evaluator", "Location", "Place Type", "Familiarity", "Note",
  "Photo Url", "Tags",
  "Safety", "Reachability", "Comfort", "Green", "Activity", "Inclusion", "Vibe"
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

function updatePhoto(placeId, photo, existingFile) {

  // No previous photo and no new photo
  if (!existingFile && !photo) {
    return "";
  }

  // Photo deleted
  if (!photo) {
    existingFile.setTrashed(true);
    return "";
  }

  // Replace existing photo
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

  return folder.createFile(blob).getUrl();

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
    place.scores.vibe

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

    for (const place of data.places) {

      const sheetRow = findPlaceRow(rows, place.id);

      const existingFile =
        sheetRow === -1
          ? null
          : findPhotoFile(place.id);

      const photoUrl = updatePhoto(
        place.id,
        place.photo,
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

    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true
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