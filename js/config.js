const PARTNER_CONFIG = {
  country: 'BE',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbw3CEYgQOm9QA-jmlM41nq_DHYj8304FJgj0e4tvKtMtThI9hsb2kzPrfmGNe-Y7apT9A/exec',
  storageKey: 'urbanfoxes_place_passport_v2_smartphone_print_share',
  languageStorageKey: 'urbanfoxes_place_passport_lang',
  futureOptions: {
    enableDarkMode: false,
    defaultLocale: 'nl'
  }
};

const CRITERIA = [
  { key: 'safety', label: 'Safety', color: '#1a7280' },
  { key: 'reachability', label: 'Reachability', color: '#1a7280' },
  { key: 'comfort', label: 'Comfort & Basics', color: '#1a7280' },
  { key: 'green', label: 'Green', color: '#28b67d' },
  { key: 'activity', label: 'Things to Do', color: '#28b67d' },
  { key: 'inclusion', label: 'Inclusion', color: '#f3bf4a' },
  { key: 'vibe', label: 'Vibe & Identity', color: '#e89faa' }
];

const PLACE_TYPES = [
  'Plein', 'Park', 'Straat', 'Stationsomgeving', 'Speelplek', 'Hangplek', 'Sportruimte', 'Culturele plek', 'Anders'
];

const FAMILIARITY = [
  'Ik kom hier vaak',
  'Ik passeer hier',
  'Eerste keer hier',
  'Dicht bij school',
  'Dicht bij huis',
  'Met vrienden',
  'Voor sport / spel',
  'Anders'
];

const TAGS = [
  'good vibe', 'boring place', 'grey', 'heat island', 'no toilets', 'unsafe crossing',
  'good to meet', 'good for sport', 'calm', 'druk / lawaai', 'hidden gem', 'too controlled',
  'nood aan schaduw', 'accessible', 'hard to reach', 'clean', 'dirty', 'lots to do', 'nothing to do',
  'fun', 'nice to chill', 'paved over', 'too hot', 'lack of green'
];
