/*
 * Import Evaluation: reads one named worksheet (tab) from a local .xlsx file
 * and converts its rows into the app's Place objects, merging them into the
 * current in-memory board. This never talks to Google Sheets — that only
 * happens when the user explicitly presses "Submit Evaluation".
 *
 * Depends on globals defined in js/script.js (places, activePlaceId, render,
 * status, t, isStarterPlace, normalizePlaces) and on the SheetJS "XLSX"
 * global loaded via CDN in index.html. Must load after both of those scripts.
 *
 * Each row's "Place Json" column (written by Code.js's buildPlaceJson) is the
 * single source of truth for import; the other labeled columns are a
 * human-readable mirror and are not read here.
 */

const IMPORT_WORKSHEET_STORAGE_KEY = 'urbanfoxes_place_passport_import_worksheet_name';
const PLACE_JSON_HEADER = 'place json';

let isImportingEvaluation = false;

function handleImportEvaluationClick(){
  if(isImportingEvaluation) return;
  document.getElementById('importEvaluationFile')?.click();
}

function openImportModal(options = {}){
  return new Promise((resolve) => {
    const modal = document.getElementById('worksheetModal');
    const form = document.getElementById('worksheetModalForm');
    const input = document.getElementById('worksheetNameInputModal');
    const cancelBtn = document.getElementById('worksheetModalCancel');
    const titleEl = document.getElementById('worksheetModalTitle');
    const copyEl = modal?.querySelector('.modal-copy');
    const submitBtn = form?.querySelector('button[type="submit"]');

    if(!modal || !form || !input || !cancelBtn || !titleEl || !copyEl || !submitBtn){
      if(options.mode === 'error'){
        window.alert(options.message || 'Could not import this evaluation file.');
        resolve('');
        return;
      }
      const fallback = (window.prompt('Enter the worksheet (tab) name to import:', options.initialValue || '') || '').trim();
      resolve(fallback);
      return;
    }

    const isErrorMode = options.mode === 'error';
    titleEl.textContent = options.title || (isErrorMode ? 'Import error' : 'Import evaluation');
    copyEl.textContent = options.message || (isErrorMode ? 'Could not import this evaluation file.' : 'Enter the worksheet (tab) name from your exported evaluation file.');
    submitBtn.textContent = options.confirmText || (isErrorMode ? 'OK' : 'Continue');
    cancelBtn.hidden = isErrorMode;
    input.hidden = isErrorMode;
    input.value = isErrorMode ? '' : (options.initialValue || '');

    const close = (value) => {
      modal.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
      form.removeEventListener('submit', onSubmit);
      cancelBtn.removeEventListener('click', onCancelClick);
      modal.removeEventListener('click', onBackdropClick);
      resolve((value || '').trim());
    };

    const onSubmit = (e) => {
      e.preventDefault();
      close(isErrorMode ? 'ok' : input.value);
    };

    const onCancelClick = () => close('');

    const onBackdropClick = (e) => {
      if(e.target === modal) close('');
    };

    const onKeyDown = (e) => {
      if(e.key === 'Escape') close('');
    };

    modal.hidden = false;
    form.addEventListener('submit', onSubmit);
    cancelBtn.addEventListener('click', onCancelClick);
    modal.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onKeyDown);
    setTimeout(() => {
      if(isErrorMode){
        submitBtn.focus();
      } else {
        input.focus();
        input.select();
      }
    }, 0);
  });
}

function askWorksheetNameWithModal(previousValue){
  return openImportModal({
    mode: 'input',
    initialValue: previousValue,
    title: 'Import evaluation',
    message: 'Enter the worksheet (tab) name from your exported evaluation file.',
    confirmText: 'Continue'
  });
}

function showImportErrorWithModal(message){
  return openImportModal({
    mode: 'error',
    title: 'Import error',
    message: message || 'Could not import this evaluation file.',
    confirmText: 'OK'
  });
}

function normalizeImportHeaderKey(value){
  return String(value || '').trim().toLowerCase();
}

function findPlaceJsonColumnIndex(headerRow){
  return (headerRow || []).findIndex(h => normalizeImportHeaderKey(h) === PLACE_JSON_HEADER);
}

function importRowsToPlaces(rows){
  if(!rows || rows.length < 2) return [];
  const jsonColIndex = findPlaceJsonColumnIndex(rows[0]);
  if(jsonColIndex === -1){
    throw new Error(`This worksheet has no "${PLACE_JSON_HEADER}" column. Re-export it from Submit Evaluation first.`);
  }

  const placesFromRows = [];
  for(const row of rows.slice(1)){
    const raw = row?.[jsonColIndex];
    if(raw === undefined || raw === null || String(raw).trim() === '') continue;
    try {
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object') placesFromRows.push(parsed);
    } catch(err){
      console.warn('Skipping row with invalid Place Json:', err);
    }
  }
  return normalizePlaces(placesFromRows);
}

function mergeImportedPlaces(incoming){
  if(!incoming.length) return 0;
  if(places.length === 1 && isStarterPlace(places[0])) places = [];
  const existingIds = new Set(places.map(p => p.id));
  incoming.forEach(p => {
    while(existingIds.has(p.id)) p.id = crypto.randomUUID();
    existingIds.add(p.id);
    places.push(p);
  });
  activePlaceId = activePlaceId || places[0]?.id || '';
  render();
  return incoming.length;
}

function readFileAsArrayBufferForImport(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read this file.'));
    reader.readAsArrayBuffer(file);
  });
}

async function importEvaluationFromFile(file, worksheetName){
  if(typeof XLSX === 'undefined'){
    throw new Error('Spreadsheet reader is not available. Check your internet connection and try again.');
  }
  const buffer = await readFileAsArrayBufferForImport(file);
  const workbook = XLSX.read(buffer, { type: 'array' });

  const target = worksheetName.trim().toLowerCase();
  const matchedName = workbook.SheetNames.find(n => n.trim().toLowerCase() === target);

  if(!matchedName){
    const available = workbook.SheetNames.join(', ') || 'none';
    throw new Error(`Worksheet "${worksheetName}" was not found. Available worksheets: ${available}`);
  }

  const sheet = workbook.Sheets[matchedName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const incoming = importRowsToPlaces(rows);

  if(!incoming.length){
    throw new Error(`No valid places were found on worksheet "${matchedName}".`);
  }

  const count = mergeImportedPlaces(incoming);
  status(`Imported evaluation \u2022 ${count} place(s) from "${matchedName}"`);
}

async function resolveWorksheetName(){
  const previousValue = localStorage.getItem(IMPORT_WORKSHEET_STORAGE_KEY) || '';
  const worksheetName = await askWorksheetNameWithModal(previousValue);
  if(worksheetName){
    localStorage.setItem(IMPORT_WORKSHEET_STORAGE_KEY, worksheetName);
  }
  return worksheetName;
}

function wireImportEvaluation(){
  const fileInput = document.getElementById('importEvaluationFile');
  if(!fileInput) return;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file || isImportingEvaluation) return;

    const worksheetName = await resolveWorksheetName();
    if(!worksheetName){
      return;
    }

    isImportingEvaluation = true;
    const btn = document.getElementById('importEvaluationBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Importing...'; }

    try {
      await importEvaluationFromFile(file, worksheetName);
    } catch(err){
      console.error(err);
      await showImportErrorWithModal(err?.message || 'Could not import this evaluation file.');
      status('Import evaluation failed');
    } finally {
      isImportingEvaluation = false;
      if(btn){ btn.disabled = false; btn.textContent = 'Import Evaluation'; }
    }
  });
}

wireImportEvaluation();
