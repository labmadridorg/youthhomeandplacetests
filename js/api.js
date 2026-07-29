function getPassportForSubmissionPayload() {
  const state = window.APP_STATE || {};
  return {
    version: 3,
    country: PARTNER_CONFIG.country,
    currentLang: state.currentLang || 'nl',
    exportedAt: new Date().toISOString(),
    places: state.places || []
  };
}

async function submitPassportToApi(passport) {
  if (window.isSubmitting) return null;

  const button = document.getElementById('submitEvaluationBtn');
  window.isSubmitting = true;
  if (button) {
    button.disabled = true;
    button.textContent = 'Submitting...';
  }
  status('Submitting evaluation...');

  try {
    const response = await fetch(PARTNER_CONFIG.appsScriptUrl, {
      method: 'POST',
      body: JSON.stringify(passport)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || 'Submission failed');
    }

    setSubmitFeedback('Evaluation submitted successfully', false);
    status('Evaluation submitted successfully');
    return result;
  } catch (err) {
    console.error(err);
    setSubmitFeedback('Failed to submit evaluation', true);
    status('Failed to submit evaluation');
    return null;
  } finally {
    window.isSubmitting = false;
    if (button) {
      button.disabled = false;
      button.textContent = 'Submit Evaluation';
    }
  }
}
