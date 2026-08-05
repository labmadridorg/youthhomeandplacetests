/*
 * Shared modal/prompt helper for collecting a text value or showing an error.
 * Reused by both import and submit evaluation flows.
 */

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
        window.alert(options.message || 'Could not complete this action.');
        resolve('');
        return;
      }
      const fallback = (window.prompt(options.promptText || 'Enter value:', options.initialValue || '') || '').trim();
      resolve(fallback);
      return;
    }

    const isErrorMode = options.mode === 'error';
    titleEl.textContent = options.title || (isErrorMode ? 'Error' : 'Input required');
    copyEl.textContent = options.message || (isErrorMode ? 'Could not complete this action.' : 'Enter a value to continue.');
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
