/*
 * Submit Evaluation flow: sheet selection prompt, payload build, submit,
 * and submit-result application.
 *
 * Depends on globals from script.js and config.js:
 * places, currentLang, isStarterPlace, render, saveBoard, status,
 * PARTNER_CONFIG, openImportModal, setSubmitFeedback consumers in this file.
 */

let isSubmitting = false;
const SUBMIT_EVALUATION_URL = PARTNER_CONFIG.appsScriptUrl;

function setSubmitFeedback(message, isError){
  const el = document.getElementById('submitStatus');
  if(!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'inline-flex' : 'none';
  el.style.background = isError ? '#fde5db' : '#f5f4eb';
  el.style.color = isError ? '#8c4c35' : '#5d777d';
  el.style.borderColor = isError ? '#f1d1c4' : 'rgba(78,141,143,0.25)';
}

async function askSheetNameForSubmission(){
  const previousValue = localStorage.getItem(PARTNER_CONFIG.sheetNameStorageKey) || PARTNER_CONFIG.country;
  let sheetName = '';

  if(typeof openImportModal === 'function'){
    sheetName = await openImportModal({
      mode: 'input',
      initialValue: previousValue,
      promptText: 'Enter the worksheet (tab) name to submit this evaluation to:',
      title: 'Submit evaluation',
      message: 'Enter the worksheet (tab) name to submit this evaluation to.',
      confirmText: 'Submit'
    });
  } else {
    sheetName = (window.prompt('Enter the worksheet (tab) name to submit this evaluation to:', previousValue) || '').trim();
  }

  if(sheetName){
    localStorage.setItem(PARTNER_CONFIG.sheetNameStorageKey, sheetName);
  }
  return sheetName;
}

function getPassportForSubmission(sheetName){
  return {
    version:3,
    country: 'BE',
    sheetName: (sheetName || '').trim() || PARTNER_CONFIG.country,
    currentLang,
    exportedAt:new Date().toISOString(),
    places
  };
}

async function handleSubmitEvaluationClick(){
  if(isSubmitting) return;
  const sheetName = await askSheetNameForSubmission();
  if(!sheetName) return;
  return submitPassport(getPassportForSubmission(sheetName));
}

// Replaces the local base64 copy with the synced Drive URL once Apps Script confirms it.
// Per-place errors (e.g. a bad photo) don't block the rest of the batch, so report them instead of silently applying nothing.
function applySubmitResults(results){
  if(!Array.isArray(results) || !results.length) return;
  const resultById = new Map(results.map(r => [r.id, r]));
  const failedNames = [];
  places.forEach(p => {
    const r = resultById.get(p.id);
    if(!r) return;
    if(r.error){ failedNames.push(p.name || p.id); return; }
    p.photoUrl = r.photoUrl || '';
    p.photo = '';
  });
  render();
  saveBoard(false);
  if(failedNames.length){
    setSubmitFeedback(`Saved, but photo failed for: ${failedNames.join(', ')}`, true);
    status('Some photos failed to sync');
  }
}

async function submitPassport(passport){
  if(isSubmitting) return null;

  const button = document.getElementById('submitEvaluationBtn');
  isSubmitting = true;
  if(button){
    button.disabled = true;
    button.textContent = 'Submitting...';
  }
  status('Submitting evaluation...');

  try {
    const response = await fetch(SUBMIT_EVALUATION_URL, {
      method: 'POST',
      body: JSON.stringify(passport)
    });

    const result = await response.json();
    // Apps Script web apps return HTTP 200 even when doPost caught an error, so response.ok alone can't be trusted.
    if(!response.ok || !result?.success){
      throw new Error(result?.error || 'Submission failed');
    }

    setSubmitFeedback('Evaluation submitted successfully', false);
    status('Evaluation submitted successfully');
    applySubmitResults(result?.results);
    return result;
  } catch(err){
    console.error(err);
    setSubmitFeedback('Failed to submit evaluation', true);
    status('Failed to submit evaluation');
    return null;
  } finally {
    isSubmitting = false;
    if(button){
      button.disabled = false;
      button.textContent = 'Submit Evaluation';
    }
  }
}
