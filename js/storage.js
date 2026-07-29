function syncAppState() {
  const state = window.APP_STATE || (window.APP_STATE = {});
  state.places = window.places || [];
  state.activePlaceId = window.activePlaceId;
  state.sortMode = window.sortMode;
  state.isSubmitting = window.isSubmitting;
  state.currentLang = window.currentLang;
  return state;
}

function saveBoardToStorage(updateStatus = true) {
  try {
    const state = syncAppState();
    const payload = {
      version: 4,
      savedAt: new Date().toISOString(),
      places: state.places || [],
      activePlaceId: state.activePlaceId,
      sortMode: state.sortMode,
      currentLang: state.currentLang || 'nl'
    };
    localStorage.setItem(PARTNER_CONFIG.storageKey, JSON.stringify(payload));
    if (updateStatus) {
      status(t('saved', { count: (state.places || []).length }));
    }
    return true;
  } catch (err) {
    console.error(err);
    const isQuota = err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    if (isQuota) {
      status(t('storageFull'));
      alert(t('storageFullMsg'));
    } else {
      status(t('saveFailed'));
    }
    return false;
  }
}

function loadBoardFromStorage() {
  try {
    const raw = localStorage.getItem(PARTNER_CONFIG.storageKey);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (payload?.places?.length) {
      const state = syncAppState();
      state.places = normalizePlaces(payload.places);
      state.activePlaceId = payload.activePlaceId || state.places[0].id;
      state.sortMode = payload.sortMode || 'manual';
      state.currentLang = payload.currentLang || state.currentLang || 'nl';
      window.places = state.places;
      window.activePlaceId = state.activePlaceId;
      window.sortMode = state.sortMode;
      window.currentLang = state.currentLang;
      status(t('loaded', { count: state.places.length }));
      return true;
    }
  } catch (err) {
    console.error(err);
  }
  return false;
}

function getStoredLanguage() {
  return localStorage.getItem(PARTNER_CONFIG.languageStorageKey) || 'nl';
}

function persistLanguage(lang) {
  localStorage.setItem(PARTNER_CONFIG.languageStorageKey, lang);
}
