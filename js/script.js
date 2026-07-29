
const STORAGE_KEY = 'urbanfoxes_place_passport_v2_smartphone_print_share';

const CRITERIA = [
  { key:'safety', label:'Safety', color:'#1a7280' },
  { key:'reachability', label:'Reachability', color:'#1a7280' },
  { key:'comfort', label:'Comfort & Basics', color:'#1a7280' },
  { key:'green', label:'Green', color:'#28b67d' },
  { key:'activity', label:'Things to Do', color:'#28b67d' },
  { key:'inclusion', label:'Inclusion', color:'#f3bf4a' },
  { key:'vibe', label:'Vibe & Identity', color:'#e89faa' }
];

const PLACE_TYPES = [
  'Plein','Park','Straat','Stationsomgeving','Speelplek','Hangplek','Sportruimte','Culturele plek','Anders'
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
  'good vibe','boring place','grey','heat island','no toilets','unsafe crossing',
  'good to meet','good for sport','calm','druk / lawaai','hidden gem','too controlled',
  'nood aan schaduw','accessible','hard to reach','clean','dirty','lots to do','nothing to do',
  'fun','nice to chill','paved over','too hot','lack of green'
];

let places = [
  {
    id: crypto.randomUUID(),
    name: 'Plek A',
    evaluator: '',
    location: '',
    placeType: 'Square',
    familiarity: 'Ik kom hier vaak',
    note: '',
    photo: '',
    tags: [],
    scores: { safety:7, reachability:7, comfort:6, green:7, activity:6, inclusion:7, vibe:6 }
  }
];

let activePlaceId = places[0].id;
let sortMode = 'manual';
let isSubmitting = false;
const SUBMIT_EVALUATION_URL = 'https://script.google.com/macros/s/AKfycbw3CEYgQOm9QA-jmlM41nq_DHYj8304FJgj0e4tvKtMtThI9hsb2kzPrfmGNe-Y7apT9A/exec';

function status(text){
  const el = document.getElementById('status');
  if(el) el.textContent = text;
}

function setSubmitFeedback(message, isError){
  const el = document.getElementById('submitStatus');
  if(!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'inline-flex' : 'none';
  el.style.background = isError ? '#fde5db' : '#f5f4eb';
  el.style.color = isError ? '#8c4c35' : '#5d777d';
  el.style.borderColor = isError ? '#f1d1c4' : 'rgba(78,141,143,0.25)';
}

function normalizePlaces(arr){
  return (arr || []).map((p, idx) => ({
    id: p.id || crypto.randomUUID(),
    name: p.name || `Place ${idx + 1}`,
    evaluator: p.evaluator || '',
    location: p.location || '',
    placeType: p.placeType || 'Other',
    familiarity: p.familiarity || 'I come here often',
    note: p.note || '',
    photo: p.photo || '',
    tags: Array.isArray(p.tags) ? p.tags : [],
    scores: {
      safety: Number(p.scores?.safety ?? 5) || 0,
      reachability: Number(p.scores?.reachability ?? 5) || 0,
      comfort: Number(p.scores?.comfort ?? 5) || 0,
      green: Number(p.scores?.green ?? 5) || 0,
      activity: Number(p.scores?.activity ?? 5) || 0,
      inclusion: Number(p.scores?.inclusion ?? 5) || 0,
      vibe: Number(p.scores?.vibe ?? 5) || 0,
    }
  }));
}

function activePlace(){
  return places.find(p => p.id === activePlaceId) || places[0];
}

function averageScore(place){
  const vals = Object.values(place.scores);
  return vals.reduce((a,b)=>a+b,0) / vals.length;
}

function strongest(place){
  const entries = Object.entries(place.scores);
  entries.sort((a,b)=>b[1]-a[1]);
  return entries[0];
}

function weakest(place){
  const entries = Object.entries(place.scores);
  entries.sort((a,b)=>a[1]-b[1]);
  return entries[0];
}

function labelForKey(key){
  return CRITERIA.find(c => c.key === key)?.label || key;
}

function descriptor(score){
  if(score >= 8) return 'Strong';
  if(score >= 6) return 'Quite good';
  if(score >= 4) return 'Mixed';
  return 'Weak';
}

function moodInfo(place){
  const s = place.scores;
  if(s.vibe >= 8 && s.activity >= 7) return { label:'Hangplek', bg:'#fae2e7', border:'#eabfc8', color:'#8e4953' };
  if(s.reachability >= 8 && s.comfort <= 5 && s.vibe <= 5) return { label:'Transit Place', bg:'#edf0ec', border:'#d8e1e5', color:'#5e747b' };
  if(s.green >= 8 && s.comfort >= 7) return { label:'Green Refuge', bg:'#dff4eb', border:'#cfeadd', color:'#29684d' };
  if(s.safety <= 4 && s.inclusion <= 4) return { label:'Needs Care', bg:'#fde5db', border:'#f1d1c4', color:'#8c4c35' };
  if(averageScore(place) >= 7.2) return { label:'Jongerenvriendelijk', bg:'#d4eae4', border:'#c7e2e6', color:'#2a6068' };
  return { label:'Full of Potential', bg:'#fdf1d2', border:'#f0e0ae', color:'#8e6b18' };
}

function summarySentence(place){
  const [bestKey] = strongest(place);
  const [worstKey] = weakest(place);
  const best = labelForKey(bestKey);
  const worst = labelForKey(worstKey);

  const templates = [
    `Sterk in ${best}, maar zwakker in ${worst}.`,
    `Aangenaam dankzij ${best}, al vraagt ${worst} nog verbetering.`,
    `Een plek met goede ${best}, maar beperkte ${worst}.`,
    `Veel potentieel, maar nog tekorten in ${worst}.`
  ];

  if(bestKey === 'vibe' && worstKey === 'comfort') return 'Strong vibe, but comfort and basic facilities remain weak.';
  if(bestKey === 'green' && worstKey === 'activity') return 'Green and pleasant, but there is not much to do.';
  if(bestKey === 'reachability' && worstKey === 'comfort') return 'Easy to reach, but not yet comfortable enough to stay.';
  if(bestKey === 'safety' && worstKey === 'inclusion') return 'Feels fairly safe, though it does not yet work equally well for everyone.';
  return templates[Math.floor((averageScore(place) * 10) % templates.length)];
}


function csvCell(value){
  const str = String(value ?? '');
  return '"' + str.replaceAll('"', '""') + '"';
}

function exportCSV(){
  const headers = [
    'id','name','evaluator','location','placeType','familiarity','note','tags','hasPhoto',
    'safety','reachability','comfort','green','activity','inclusion','vibe',
    'average','strongest','weakest','moodLabel','summarySentence','bestFor','needsAttention'
  ];
  const rows = places.map(place => {
    const mood = moodInfo(place).label;
    const [bestKey] = strongest(place);
    const [worstKey] = weakest(place);
    return [
      place.id,
      place.name,
      place.evaluator,
      place.location,
      place.placeType,
      place.familiarity,
      place.note,
      place.tags.join(' | '),
      place.photo ? 'yes' : 'no',
      place.scores.safety,
      place.scores.reachability,
      place.scores.comfort,
      place.scores.green,
      place.scores.activity,
      place.scores.inclusion,
      place.scores.vibe,
      averageScore(place).toFixed(1),
      labelForKey(bestKey),
      labelForKey(worstKey),
      mood,
      summarySentence(place),
      getBestFor(place),
      getNeedsAttention(place)
    ];
  });
  const csv = [headers.map(csvCell).join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'place_passports_v3_nl.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
  status(`CSV exported â€¢ ${places.length} place${places.length===1?'':'s'}`);
}

function printPassports(){
  document.body.classList.remove('print-single');
  document.querySelectorAll('.passport').forEach(el => el.classList.remove('print-hidden'));
  window.print();
}

function printPassport(id){
  document.body.classList.add('print-single');
  document.querySelectorAll('.passport').forEach(el => {
    el.classList.toggle('print-hidden', el.dataset.passportId !== id);
  });
  window.print();
  setTimeout(() => {
    document.body.classList.remove('print-single');
    document.querySelectorAll('.passport').forEach(el => el.classList.remove('print-hidden'));
  }, 300);
}


function xmlEscape(str){
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function getBestFor(place){
  const s = place.scores || {};
  const tags = place.tags || [];
  if ((s.vibe ?? 0) >= 8 && (s.activity ?? 0) >= 7) return 'afspreken en hangen';
  if ((s.green ?? 0) >= 8 && (s.comfort ?? 0) >= 7) return 'tot rust komen en even pauzeren';
  if ((s.reachability ?? 0) >= 8 && (s.comfort ?? 0) <= 5) return 'passeren en doorsteken';
  if ((s.activity ?? 0) >= 7 && tags.includes('good for sport')) return 'sport en beweging';
  if ((s.inclusion ?? 0) >= 7 && (s.comfort ?? 0) >= 7) return 'gemengde groepen en langer verblijven';
  if (tags.includes('good to meet')) return 'vrienden ontmoeten';
  if (tags.includes('calm')) return 'calm verblijven';
  if (tags.includes('hidden gem')) return 'ontdekken en rondhangen';
  if (tags.includes('nice to chill')) return 'chillen en blijven hangen';
  if (tags.includes('fun')) return 'vrije tijd en plezier';
  return 'dagelijks gebruik van publieke ruimte';
}

function getNeedsAttention(place){
  const s = place.scores || {};
  const tags = place.tags || [];
  if ((s.comfort ?? 0) <= 4 || tags.includes('no toilets') || tags.includes('nood aan schaduw')) {
    return 'comfort en basisvoorzieningen';
  }
  if ((s.inclusion ?? 0) <= 4 || tags.includes('too controlled')) {
    return 'inclusie en openheid';
  }
  if ((s.safety ?? 0) <= 4 || tags.includes('unsafe crossing')) {
    return 'veilige toegang en oversteken';
  }
  if ((s.activity ?? 0) <= 4 || tags.includes('nothing to do') || tags.includes('boring place')) {
    return 'dingen om te doen en redenen om te blijven';
  }
  if ((s.green ?? 0) <= 4 || tags.includes('grey') || tags.includes('heat island') || tags.includes('paved over') || tags.includes('too hot') || tags.includes('lack of green')) {
    return 'groen, schaduw en verkoeling';
  }
  return labelForKey(weakest(place)[0]).toLowerCase();
}

function renderMiniRadarSVG(place){
  const size = 98;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 34;
  const keys = CRITERIA.map(c => c.key);
  const pointAt = (index, value) => {
    const angle = (Math.PI * 2 * index / keys.length) - Math.PI / 2;
    const r = maxR * (value / 10);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const outlineAt = (index, radius) => {
    const angle = (Math.PI * 2 * index / keys.length) - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };
  const poly = keys.map((k, i) => pointAt(i, Number(place.scores?.[k] ?? 0)).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map(frac => {
    const pts = keys.map((k, i) => outlineAt(i, maxR * frac).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="rgba(26,114,128,${frac === 1 ? 0.38 : 0.18})" stroke-width="${frac === 1 ? 1.2 : 0.8}"></polygon>`;
  }).join('');
  const axes = keys.map((k, i) => {
    const [x, y] = outlineAt(i, maxR);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(26,114,128,0.18)" stroke-width="0.8"></line>`;
  }).join('');
  return `
    <svg class="mini-radar-svg" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${rings}
      ${axes}
      <polygon points="${poly}" fill="rgba(26,114,128,0.18)" stroke="rgba(26,114,128,0.78)" stroke-width="1.8"></polygon>
      ${keys.map((k, i) => {
        const [x, y] = pointAt(i, Number(place.scores?.[k] ?? 0));
        return `<circle cx="${x}" cy="${y}" r="2.1" fill="rgba(26,114,128,0.88)"></circle>`;
      }).join('')}
    </svg>
  `;
}

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataURL(dataUrl){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function estimateDataUrlBytes(dataUrl){
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function humanFileSize(bytes){
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function resizeImageDataURL(dataUrl, options = {}){
  const {
    maxDimension = 1280,
    minimumDimension = 720,
    sizeLimitBytes = 420 * 1024,
    qualitySteps = [0.82, 0.74, 0.66, 0.58, 0.5]
  } = options;

  const img = await loadImageFromDataURL(dataUrl);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return dataUrl;

  let currentMax = Math.min(maxDimension, Math.max(minimumDimension, Math.max(w, h)));
  let best = dataUrl;

  while (true) {
    const scale = Math.min(1, currentMax / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, tw, th);

    let smallestThisRound = null;
    for (const quality of qualitySteps) {
      const candidate = canvas.toDataURL('image/jpeg', quality);
      smallestThisRound = candidate;
      if (estimateDataUrlBytes(candidate) <= sizeLimitBytes) {
        return candidate;
      }
    }

    if (smallestThisRound) best = smallestThisRound;
    if (currentMax <= minimumDimension) break;
    currentMax = Math.max(minimumDimension, Math.round(currentMax * 0.82));
    if (currentMax === minimumDimension) {
      const finalCanvas = document.createElement('canvas');
      const scale2 = Math.min(1, currentMax / Math.max(w, h));
      finalCanvas.width = Math.max(1, Math.round(w * scale2));
      finalCanvas.height = Math.max(1, Math.round(h * scale2));
      finalCanvas.getContext('2d').drawImage(img, 0, 0, finalCanvas.width, finalCanvas.height);
      best = finalCanvas.toDataURL('image/jpeg', qualitySteps[qualitySteps.length - 1]);
      break;
    }
  }

  return best;
}

async function setPhotoFromFile(place, file){
  if (!file || !file.type || !file.type.startsWith('image/')) {
    alert('Please choose an image file.');
    return;
  }
  try {
    status(`Compressing photo â€¢ ${place.name || 'Place'}`);
    const raw = await fileToDataURL(file);
    const resized = await resizeImageDataURL(raw);
    place.photo = resized;
    renderPlaceList();
    renderForm();
    renderPassports();
    saveBoard(false);
    status(`Photo added â€¢ ${humanFileSize(estimateDataUrlBytes(resized))}`);
  } catch (err) {
    console.error(err);
    alert('Could not load this photo.');
    status('Photo upload failed');
  }
}

function wrapTextLines(ctx, text, maxWidth){
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function downloadPassportImage(id){
  const place = places.find(p => p.id === id);
  if (!place) return;

  const mood = moodInfo(place);
  const width = 1200;
  const height = 1600;
  const pad = 56;
  const heroY = 26;
  const heroH = 340;
  const sectionTop = heroY + heroH + 34;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  function roundRect(x, y, w, h, r, fill, stroke){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const topGrad = ctx.createLinearGradient(0, 0, width, 0);
  topGrad.addColorStop(0, '#f28b63');
  topGrad.addColorStop(0.55, '#28b67d');
  topGrad.addColorStop(1, '#f3bf4a');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 26);

  if (place.photo) {
    try {
      const img = await loadImageFromDataURL(place.photo);
      const ratio = Math.max(width / img.width, heroH / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      const dx = (width - dw) / 2;
      const dy = heroY + (heroH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      const overlay = ctx.createLinearGradient(0, heroY + heroH - 120, 0, heroY + heroH);
      overlay.addColorStop(0, 'rgba(20,62,71,0)');
      overlay.addColorStop(1, 'rgba(20,62,71,0.72)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, heroY, width, heroH);
    } catch (err) {
      ctx.fillStyle = mood.bg;
      ctx.fillRect(0, heroY, width, heroH);
    }
  } else {
    const heroGrad = ctx.createLinearGradient(0, heroY, width, heroY + heroH);
    heroGrad.addColorStop(0, mood.bg);
    heroGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = heroGrad;
    ctx.fillRect(0, heroY, width, heroH);
  }

  ctx.fillStyle = place.photo ? '#ffffff' : '#143e47';
  ctx.font = '700 56px "Avenir Next", Inter, Arial, sans-serif';
  const titleLines = wrapTextLines(ctx, place.name || 'Untitled place', width - pad * 2 - 300);
  const titleStartY = heroY + heroH - 126;
  titleLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, pad, titleStartY + idx * 64);
  });

  ctx.font = '400 26px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillStyle = place.photo ? 'rgba(255,255,255,0.92)' : '#5a7379';
  ctx.fillText(place.location || 'No location added yet', pad, heroY + heroH - 28);

  function badge(text, x, y, bg, color){
    ctx.font = '700 22px "Avenir Next", Inter, Arial, sans-serif';
    const w = ctx.measureText(text).width + 28;
    const h = 42;
    roundRect(x, y, w, h, 18, bg);
    ctx.fillStyle = color;
    ctx.fillText(text, x + 14, y + 28);
    return w;
  }

  ctx.font = '700 22px "Avenir Next", Inter, Arial, sans-serif';
  const moodW = ctx.measureText(mood.label).width + 28;
  const typeW = ctx.measureText(place.placeType || 'Place').width + 28;
  const bx = width - pad - Math.max(moodW, typeW);
  badge(place.placeType || 'Place', bx, heroY + 34, 'rgba(255,255,255,0.92)', '#355d63');
  badge(mood.label, bx, heroY + 88, mood.bg, mood.color);

  roundRect(pad, sectionTop, width - pad * 2, 112, 24, '#fbfcfd', '#e0e7ea');
  ctx.fillStyle = '#789097';
  ctx.font = '700 17px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText('Evaluator / Group', pad + 26, sectionTop + 30);
  ctx.fillText('How do you know this place?', pad + 420, sectionTop + 30);

  ctx.fillStyle = '#274247';
  ctx.font = '500 28px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText(place.evaluator || 'â€”', pad + 26, sectionTop + 72);
  ctx.fillText(place.familiarity || 'â€”', pad + 420, sectionTop + 72);

  roundRect(width - pad - 240, sectionTop, 240, 260, 24, '#f0f2ec', '#d0dcd6');
  ctx.fillStyle = '#1d6670';
  ctx.font = '700 72px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText(averageScore(place).toFixed(1), width - pad - 194, sectionTop + 92);
  ctx.fillStyle = '#688188';
  ctx.font = '700 17px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText('Average score', width - pad - 194, sectionTop + 124);

  const radarSvg = renderMiniRadarSVG(place);
  const radarData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(radarSvg);
  try {
    const radarImg = await loadImageFromDataURL(radarData);
    ctx.drawImage(radarImg, width - pad - 205, sectionTop + 145, 160, 160);
  } catch (err) {}

  const summaryY = sectionTop + 138;
  roundRect(pad, summaryY, width - pad * 2 - 260, 188, 24, '#f0f4ec', '#d0dcd6');
  ctx.fillStyle = '#6b878d';
  ctx.font = '700 17px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText('Summary', pad + 24, summaryY + 32);
  ctx.fillStyle = '#24454b';
  ctx.font = '700 28px "Avenir Next", Inter, Arial, sans-serif';
  wrapTextLines(ctx, summarySentence(place), width - pad * 2 - 320).slice(0, 3).forEach((line, idx) => {
    ctx.fillText(line, pad + 24, summaryY + 78 + idx * 34);
  });
  ctx.font = '500 24px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText(`Best for: ${getBestFor(place)}`, pad + 24, summaryY + 148);
  ctx.fillText(`Needs most attention: ${getNeedsAttention(place)}`, pad + 24, summaryY + 178);

  const noteY = summaryY + 210;
  roundRect(pad, noteY, width - pad * 2, 132, 24, '#fbfcfd', '#e0e7ea');
  ctx.fillStyle = '#789097';
  ctx.font = '700 17px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText('Jongerennotitie', pad + 24, noteY + 32);
  ctx.fillStyle = '#294247';
  ctx.font = '500 26px "Avenir Next", Inter, Arial, sans-serif';
  wrapTextLines(ctx, place.note || 'No note added yet.', width - pad * 2 - 48).slice(0, 3).forEach((line, idx) => {
    ctx.fillText(line, pad + 24, noteY + 76 + idx * 30);
  });

  const barsY = noteY + 160;
  roundRect(pad, barsY, width - pad * 2, 360, 24, '#ffffff', '#e0e7ea');
  CRITERIA.forEach((c, idx) => {
    const rowY = barsY + 44 + idx * 44;
    ctx.fillStyle = '#365359';
    ctx.font = '700 20px "Avenir Next", Inter, Arial, sans-serif';
    ctx.fillText(c.label, pad + 24, rowY);
    roundRect(pad + 260, rowY - 18, 620, 18, 9, '#edf3f5', '#deeaee');
    roundRect(pad + 260, rowY - 18, 620 * ((place.scores[c.key] || 0) / 10), 18, 9, c.color);
    ctx.fillStyle = '#486268';
    ctx.font = '700 20px "Avenir Next", Inter, Arial, sans-serif';
    ctx.fillText(String(place.scores[c.key] || 0), width - pad - 30, rowY);
  });

  const [bestKey, bestVal] = strongest(place);
  const [worstKey, worstVal] = weakest(place);
  const footerY = barsY + 388;
  roundRect(pad, footerY, (width - pad * 2 - 18) / 2, 106, 20, '#dff4eb', '#cfeadd');
  roundRect(pad + (width - pad * 2 + 18) / 2, footerY, (width - pad * 2 - 18) / 2, 106, 20, '#fde5db', '#f1d1c4');

  ctx.fillStyle = '#29684d';
  ctx.font = '700 16px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText('Strongest', pad + 22, footerY + 28);
  ctx.font = '600 24px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText(`${labelForKey(bestKey)} â€” ${bestVal}/10`, pad + 22, footerY + 68);

  const rightX = pad + (width - pad * 2 + 18) / 2;
  ctx.fillStyle = '#8c4c35';
  ctx.font = '700 16px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText('Needs work', rightX + 22, footerY + 28);
  ctx.font = '600 24px "Avenir Next", Inter, Arial, sans-serif';
  ctx.fillText(`${labelForKey(worstKey)} â€” ${worstVal}/10`, rightX + 22, footerY + 68);

  const tagsY = footerY + 130;
  if ((place.tags || []).length) {
    let x = pad;
    let y = tagsY;
    for (const tag of place.tags.slice(0, 8)) {
      ctx.font = '700 18px "Avenir Next", Inter, Arial, sans-serif';
      const tw = ctx.measureText(tag).width + 28;
      if (x + tw > width - pad) {
        x = pad;
        y += 44;
      }
      roundRect(x, y, tw, 32, 16, '#f6f9fa', '#d9e3e7');
      ctx.fillStyle = '#567178';
      ctx.fillText(tag, x + 14, y + 22);
      x += tw + 10;
    }
  }

  const out = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = out;
  a.download = `${(place.name || 'place-passport').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  status(`Image downloaded â€¢ ${place.name || 'Place'}`);
}

async function sharePassport(id){
  const place = places.find(p => p.id === id);
  if(!place) return;
  const mood = moodInfo(place).label;
  const [bestKey, bestVal] = strongest(place);
  const [worstKey, worstVal] = weakest(place);
  const text = [
    `${place.name}`,
    place.location || '',
    `Moodlabel: ${mood}`,
    `Gemiddelde: ${averageScore(place).toFixed(1)}/10`,
    summarySentence(place),
    `Best for: ${getBestFor(place)}`,
    `Needs most attention: ${getNeedsAttention(place)}`,
    `Strongest point: ${labelForKey(bestKey)} (${bestVal}/10)`,
    `Needs work: ${labelForKey(worstKey)} (${worstVal}/10)`,
    place.note ? `Note: ${place.note}` : ''
  ].filter(Boolean).join('\n');

  try {
    if(navigator.share){
      await navigator.share({ title: place.name, text });
      status(`Shared passport â€¢ ${place.name}`);
      return;
    }
  } catch(err){
    if(err && err.name === 'AbortError') return;
  }

  try {
    await navigator.clipboard.writeText(text);
    alert('Passport summary copied to clipboard.');
    status(`Copied summary â€¢ ${place.name}`);
  } catch(err){
    alert(text);
  }
}

function saveBoard(updateStatus=true){
  try{
    const payload = { version:3, savedAt:new Date().toISOString(), places, activePlaceId, sortMode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if(updateStatus){
      status(`Saved in this browser â€¢ ${places.length} plek${places.length===1?'':'ken'}`);
    }
  }catch(err){
    console.error(err);
    const isQuota = err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    if(isQuota){
      status('Browser storage is full');
      alert('This browser is running out of storage. Try using fewer photos, replacing large photos, or exporting your work as JSON.');
    }else{
      status('Kon niet opslaan');
    }
  }
}

function loadBoard(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const payload = JSON.parse(raw);
    if(payload?.places?.length){
      places = normalizePlaces(payload.places);
      activePlaceId = payload.activePlaceId || places[0].id;
      sortMode = payload.sortMode || 'manual';
      status(`Loaded browser save â€¢ ${places.length} plek${places.length===1?'':'ken'}`);
      return true;
    }
  }catch(err){
    console.error(err);
  }
  return false;
}

function exportJSON(){
  const payload = { version:3, exportedAt:new Date().toISOString(), places };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'place_passports_v3_nl.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
  status(`JSON exported â€¢ ${places.length} place${places.length===1?'':'s'}`);
}

function getPassportForSubmission(){
  return { 
    version:3, 
    country: "BE",  
    currentLang,
    exportedAt:new Date().toISOString(), 
    places 
  };
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
    if(!response.ok){
      throw new Error(result?.error || 'Submission failed');
    }

    setSubmitFeedback('Evaluation submitted successfully', false);
    status('Evaluation submitted successfully');
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

function addPlace(){
  const letter = String.fromCharCode(65 + places.length);
  const p = {
    id: crypto.randomUUID(),
    name: `Place ${letter}`,
    evaluator: '',
    location: '',
    placeType: 'Other',
    familiarity: 'Ik kom hier vaak',
    note: '',
    photo: '',
    tags: [],
    scores: { safety:5, reachability:5, comfort:5, green:5, activity:5, inclusion:5, vibe:5 }
  };
  places.push(p);
  activePlaceId = p.id;
  render();
  saveBoard(true);
}

function deletePlace(id){
  places = places.filter(p => p.id !== id);
  if(!places.length){
    addPlace();
    return;
  }
  if(activePlaceId === id){
    activePlaceId = places[0].id;
  }
  render();
  saveBoard(true);
}

function sortedPlaces(){
  const arr = [...places];
  switch(sortMode){
    case 'average_desc': return arr.sort((a,b)=>averageScore(b)-averageScore(a));
    case 'average_asc': return arr.sort((a,b)=>averageScore(a)-averageScore(b));
    case 'name_asc': return arr.sort((a,b)=>a.name.localeCompare(b.name));
    case 'vibe_desc': return arr.sort((a,b)=>b.scores.vibe-a.scores.vibe);
    case 'green_desc': return arr.sort((a,b)=>b.scores.green-a.scores.green);
    case 'safety_desc': return arr.sort((a,b)=>b.scores.safety-a.scores.safety);
    case 'comfort_desc': return arr.sort((a,b)=>b.scores.comfort-a.scores.comfort);
    case 'inclusion_desc': return arr.sort((a,b)=>b.scores.inclusion-a.scores.inclusion);
    case 'activity_desc': return arr.sort((a,b)=>b.scores.activity-a.scores.activity);
    default: return arr;
  }
}

function bestBy(key){
  const best = [...places].sort((a,b)=>b.scores[key]-a.scores[key])[0];
  return best ? `${best.name} (${best.scores[key]}/10)` : 'â€”';
}

function lowestBy(key){
  const weak = [...places].sort((a,b)=>a.scores[key]-b.scores[key])[0];
  return weak ? `${weak.name} (${weak.scores[key]}/10)` : 'â€”';
}

function renderCompareStrip(){
  const wrap = document.getElementById('compareStrip');
  const bestAvg = [...places].sort((a,b)=>averageScore(b)-averageScore(a))[0];
  wrap.innerHTML = `
    <div class="compare-card">
      <strong>Best overall</strong>
      <div class="big">${escapeHtml(bestAvg?.name || 'â€”')}</div>
      <div class="small">Average score ${bestAvg ? averageScore(bestAvg).toFixed(1) : 'â€”'}</div>
    </div>
    <div class="compare-card">
      <strong>Safest place</strong>
      <div class="big">${escapeHtml(bestBy('safety'))}</div>
      <div class="small">Sterkst op sociale en verkeersveiligheid</div>
    </div>
    <div class="compare-card">
      <strong>Greenest place</strong>
      <div class="big">${escapeHtml(bestBy('green'))}</div>
      <div class="small">Beste groen- en natuurkwaliteit</div>
    </div>
    <div class="compare-card">
      <strong>Beste sfeer</strong>
      <div class="big">${escapeHtml(bestBy('vibe'))}</div>
      <div class="small">Sterkste sfeer en identiteit</div>
    </div>
    <div class="compare-card">
      <strong>Weakest basics</strong>
      <div class="big">${escapeHtml(lowestBy('comfort'))}</div>
      <div class="small">Needs the most attention on comfort and basic needs</div>
    </div>
    <div class="compare-card">
      <strong>Weakest inclusion</strong>
      <div class="big">${escapeHtml(lowestBy('inclusion'))}</div>
      <div class="small">Needs most attention openheid en accessibleheid</div>
    </div>
  `;
}

function renderPlaceList(){
  const list = document.getElementById('placeList');
  list.innerHTML = '';
  places.forEach(place => {
    const mood = moodInfo(place);
    const thumb = place.photo
      ? `<img class="place-thumb" src="${escapeAttr(place.photo)}" alt="${escapeAttr(place.name)}" />`
      : `<div class="place-thumb-fallback">Place</div>`;
    const el = document.createElement('div');
    el.className = 'place-tab' + (place.id === activePlaceId ? ' active' : '');
    el.innerHTML = `
      <div class="place-tab-main">
        ${thumb}
        <div style="min-width:0;">
          <strong>${escapeHtml(place.name)}</strong>
          <span>${mood.label} â€¢ score ${averageScore(place).toFixed(1)}</span>
        </div>
      </div>
      <div class="tab-actions">
        <button class="mini-btn">Openen</button>
        <button class="mini-btn">Deleteen</button>
      </div>
    `;
    const [openBtn, delBtn] = el.querySelectorAll('.mini-btn');
    openBtn.onclick = (e) => { e.stopPropagation(); activePlaceId = place.id; render(); };
    delBtn.onclick = (e) => { e.stopPropagation(); deletePlace(place.id); };
    el.onclick = () => { activePlaceId = place.id; render(); };
    list.appendChild(el);
  });
}

function renderForm(){
  const place = activePlace();
  const form = document.getElementById('placeForm');
  form.innerHTML = `
    <div class="field span-2">
      <label>Naam van de plek</label>
      <input id="f_name" type="text" value="${escapeAttr(place.name)}" />
    </div>
    <div class="field">
      <label>Evaluator / groep</label>
      <input id="f_evaluator" type="text" value="${escapeAttr(place.evaluator)}" />
    </div>
    <div class="field">
      <label>Wijk / locatie</label>
      <input id="f_location" type="text" value="${escapeAttr(place.location)}" />
    </div>
    <div class="field">
      <label>Place type</label>
      <select id="f_type">${PLACE_TYPES.map(x => `<option ${x===place.placeType?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>How do you know this place?</label>
      <select id="f_familiarity">${FAMILIARITY.map(x => `<option ${x===place.familiarity?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select>
    </div>
    <div class="field span-2">
      <label>Foto van de plek</label>
      <div class="photo-upload-wrap">
        <div class="photo-preview" id="photoPreview">${place.photo ? `<img src="${escapeAttr(place.photo)}" alt="${escapeAttr(place.name || 'Place photo')}" />` : 'No photo added yet'}</div>
        <div class="photo-actions">
          <button type="button" class="btn" id="photoUploadBtn">Choose photo</button>
          <button type="button" class="btn" id="photoCameraBtn">Take photo</button>
          <button type="button" class="btn" id="photoRemoveBtn" ${place.photo ? '' : 'disabled'}>Delete foto</button>
          <input id="f_photo" type="file" accept="image/*" style="display:none" />
          <input id="f_photo_camera" type="file" accept="image/*" capture="environment" style="display:none" />
        </div>
        <div class="helper">Kies uit je galerij/bestanden of neem een nieuwe foto. Gebruikt in de passport-header, beeldexport en printweergave.</div>
      </div>
    </div>

    <div class="field span-2">
      <label>Short note</label>
      <textarea id="f_note">${escapeHtml(place.note)}</textarea>
    </div>

    <div class="section-title" style="grid-column:1 / -1;">Fast tags</div>
    <div class="tag-cloud" id="tagCloud" style="grid-column:1 / -1;"></div>

    <div class="section-title" style="grid-column:1 / -1;">Youth public space criteria</div>
    <div class="slider-block" id="sliders" style="grid-column:1 / -1;"></div>
  `;

  document.getElementById('f_name').addEventListener('input', e => {
    place.name = e.target.value;
    renderPlaceList(); renderCompareStrip(); renderPassports(); saveBoard(false);
  });
  document.getElementById('f_evaluator').addEventListener('input', e => {
    place.evaluator = e.target.value;
    renderPassports(); saveBoard(false);
  });
  document.getElementById('f_location').addEventListener('input', e => {
    place.location = e.target.value;
    renderPassports(); saveBoard(false);
  });
  document.getElementById('f_type').addEventListener('change', e => {
    place.placeType = e.target.value;
    renderPlaceList(); renderPassports(); saveBoard(false);
  });
  document.getElementById('f_familiarity').addEventListener('change', e => {
    place.familiarity = e.target.value;
    renderPassports(); saveBoard(false);
  });
  document.getElementById('f_note').addEventListener('input', e => {
    place.note = e.target.value;
    renderPassports(); saveBoard(false);
  });

  const photoInput = document.getElementById('f_photo');
  const photoCameraInput = document.getElementById('f_photo_camera');
  const uploadBtn = document.getElementById('photoUploadBtn');
  const cameraBtn = document.getElementById('photoCameraBtn');
  const removeBtn = document.getElementById('photoRemoveBtn');
  if(uploadBtn) uploadBtn.addEventListener('click', () => photoInput.click());
  if(cameraBtn) cameraBtn.addEventListener('click', () => photoCameraInput.click());
  if(photoInput) photoInput.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    await setPhotoFromFile(place, file);
    e.target.value = '';
  });
  if(photoCameraInput) photoCameraInput.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    await setPhotoFromFile(place, file);
    e.target.value = '';
  });
  if(removeBtn) removeBtn.addEventListener('click', () => {
    place.photo = '';
    render();
    saveBoard(false);
  });

  const tagWrap = document.getElementById('tagCloud');
  TAGS.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag-chip' + (place.tags.includes(tag) ? ' active' : '');
    chip.textContent = tag;
    chip.onclick = () => {
      if(place.tags.includes(tag)){
        place.tags = place.tags.filter(t => t !== tag);
      }else{
        place.tags = [...place.tags, tag];
      }
      renderForm();
      renderPassports();
      saveBoard(false);
    };
    tagWrap.appendChild(chip);
  });

  const sliderWrap = document.getElementById('sliders');
  CRITERIA.forEach(c => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <label>${c.label}</label>
      <input type="range" min="0" max="10" step="1" value="${place.scores[c.key]}" />
      <div class="val">${place.scores[c.key]}</div>
    `;
    const input = row.querySelector('input');
    const val = row.querySelector('.val');
    const stabilizeTouch = () => {
      if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement !== input) {
        document.activeElement.blur();
      }
    };
    input.addEventListener('pointerdown', stabilizeTouch, {passive:true});
    input.addEventListener('touchstart', stabilizeTouch, {passive:true});
    input.addEventListener('input', () => {
      place.scores[c.key] = Number(input.value);
      val.textContent = input.value;
      renderPlaceList();
      renderCompareStrip();
      renderPassports();
      saveBoard(false);
    });
    sliderWrap.appendChild(row);
  });
}

function renderPassports(){
  const grid = document.getElementById('passportGrid');
  grid.innerHTML = '';

  sortedPlaces().forEach(place => {
    const avg = averageScore(place);
    const [bestKey, bestVal] = strongest(place);
    const [worstKey, worstVal] = weakest(place);
    const mood = moodInfo(place);
    const heroInner = place.photo
      ? `<img class="passport-hero-image" src="${escapeAttr(place.photo)}" alt="${escapeAttr(place.name)}" /><div class="passport-hero-overlay"><div class="passport-head"><div><h3 class="passport-title">${escapeHtml(place.name)}</h3><div class="passport-sub">${escapeHtml(place.location || 'No location added yet')}</div></div><div class="badge-stack"><div class="badge">${escapeHtml(place.placeType || 'Place')}</div><div class="badge">Place Passport</div></div></div></div>`
      : `<div class="passport-hero-fallback" style="background:linear-gradient(135deg, ${mood.bg}, #ffffff 85%);"><div style="width:100%;"><div class="passport-head" style="margin-top:0;"><div><h3 class="passport-title">${escapeHtml(place.name)}</h3><div class="passport-sub">${escapeHtml(place.location || 'No location added yet')}</div></div><div class="badge-stack"><div class="badge">${escapeHtml(place.placeType || 'Place')}</div><div class="badge">Place Passport</div></div></div></div></div>`;

    const card = document.createElement('div');
    card.className = 'passport';
    card.dataset.passportId = place.id;
    card.innerHTML = `
      <div class="passport-hero">${heroInner}</div>

      <div class="mood-row">
        <div class="mood-pill" style="background:${mood.bg}; border:1px solid ${mood.border}; color:${mood.color};">${escapeHtml(mood.label)}</div>
        <div class="mood-pill" style="background:#f0f2ec; border:1px solid #d4e0e4; color:#355d63;">${escapeHtml(place.familiarity || 'â€”')}</div>
      </div>

      <div class="passport-meta">
        <div class="meta-card">
          <strong>Evaluator / Group</strong>
          <div>${escapeHtml(place.evaluator || 'â€”')}</div>
        </div>
        <div class="meta-card score-meta-card">
          <div class="score-big">
            <div class="n">${avg.toFixed(1)}</div>
            <div class="label">Average score</div>
          </div>
          <div class="mini-radar-wrap">${renderMiniRadarSVG(place)}</div>
        </div>
      </div>

      <div class="summary-card">
        <strong>Samenvattende zin</strong>
        <p>${escapeHtml(summarySentence(place))}</p>
        <p style="margin-top:8px;"><strong style="display:inline;color:#24454b;font-size:12px;text-transform:none;letter-spacing:0;">Best for:</strong> ${escapeHtml(getBestFor(place))}</p>
        <p style="margin-top:6px;"><strong style="display:inline;color:#24454b;font-size:12px;text-transform:none;letter-spacing:0;">Needs most attention:</strong> ${escapeHtml(getNeedsAttention(place))}</p>
      </div>

      <div class="passport-note">
        <strong>Jongerennotitie</strong>
        <p>${escapeHtml(place.note || 'No note added yet.')}</p>
      </div>

      <div class="score-wrap" style="grid-template-columns:1fr;">
        <div class="bars">
          ${CRITERIA.map(c => {
            const v = place.scores[c.key];
            return `
              <div class="bar-row">
                <div class="name">${escapeHtml(c.label)}</div>
                <div class="bar"><span style="width:${v * 10}%; background:${c.color};"></span></div>
                <div class="num">${v}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="passport-footer">
        <div class="insight good">
          <strong>Strongest point</strong>
          ${escapeHtml(labelForKey(bestKey))} stands out at <strong>${bestVal}/10</strong>.
        </div>
        <div class="insight warn">
          <strong>Needs work</strong>
          ${escapeHtml(labelForKey(worstKey))} is weakest at <strong>${worstVal}/10</strong>.
        </div>
      </div>

      <div class="passport-tags">
        ${(place.tags.length ? place.tags : ['no tags yet']).slice(0,6).map(tag => `<span class="passport-tag">${escapeHtml(tag)}</span>`).join('')}
        ${place.tags.length > 6 ? `<span class="passport-tag">+${place.tags.length - 6} more</span>` : ''}
      </div>

      <div class="passport-quote">Gegenereerd op basis van de 7 jongerencriteria uit de Place Evaluation Compass.</div>

      <div class="passport-actions">
        <button class="passport-action-btn" type="button" data-action="image">Download afbeelding</button>
        <button class="passport-action-btn" type="button" data-action="share">Share summary</button>
        <button class="passport-action-btn" type="button" data-action="print">Print dit passport</button>
      </div>
    `;
    const imageBtn = card.querySelector('[data-action="image"]');
    const shareBtn = card.querySelector('[data-action="share"]');
    const printBtn = card.querySelector('[data-action="print"]');
    if(imageBtn) imageBtn.addEventListener('click', () => downloadPassportImage(place.id));
    if(shareBtn) shareBtn.addEventListener('click', () => sharePassport(place.id));
    if(printBtn) printBtn.addEventListener('click', () => printPassport(place.id));
    grid.appendChild(card);
  });
}


function countBy(arr, fn){
  const map = new Map();
  (arr || []).forEach(item => {
    const key = fn(item);
    if(!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a,b)=>b[1]-a[1]);
}

function renderAtlasPanel(){
  const panel = document.getElementById('atlasPanel');
  if(!panel) return;
  const source = places || [];
  if(!source.length){
    panel.innerHTML = '';
    return;
  }

  const locations = countBy(source, p => (p.location || '').trim() || 'Onbekende locatie').slice(0,6);
  const topTags = countBy(source.flatMap(place => (place.tags || []).map(tag => ({tag}))), x => x.tag).slice(0,8);
  const heatWatch = source.filter(place => {
    const tags = place.tags || [];
    return tags.includes('heat island') || tags.includes('grey') || tags.includes('paved over') || tags.includes('lack of green') || tags.includes('too hot') || (place.scores.green ?? 0) <= 4;
  }).slice(0,6);
  const socialSpots = source.filter(place => {
    const tags = place.tags || [];
    return tags.includes('good to meet') || tags.includes('good vibe') || tags.includes('fun') || tags.includes('nice to chill') || (place.scores.vibe ?? 0) >= 8;
  }).slice(0,6);
  const activePlaces = source.filter(place => (place.scores.activity ?? 0) >= 7 || (place.tags || []).includes('lots to do')).slice(0,6);

  const W = 640, H = 360, pad = 38;
  const axisX = (place) => ((Number(place.scores.reachability||0) + Number(place.scores.activity||0) + Number(place.scores.vibe||0)) / 30);
  const axisY = (place) => ((Number(place.scores.safety||0) + Number(place.scores.comfort||0) + Number(place.scores.inclusion||0)) / 30);
  const circles = source.map((place, idx) => {
    const mood = moodInfo(place);
    const x = pad + axisX(place) * (W - pad * 2);
    const y = H - pad - axisY(place) * (H - pad * 2);
    const r = 8 + ((Number(place.scores.green||0) / 10) * 10);
    const short = escapeHtml((place.name || `P${idx+1}`).slice(0, 16));
    return `
      <g>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${mood.bg}" stroke="${mood.color}" stroke-width="2"></circle>
        <text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#214248">${short}</text>
      </g>`;
  }).join('');

  panel.innerHTML = `
    <div class="atlas-top">
      <div>
        <h2 class="atlas-title">Jongerenatlas van plekken</h2>
        <div class="atlas-sub">A first atlas layer on top of the Place Passport: not a GPS map, but a visual landscape of your places based on liveliness, staying quality, and thematic signals such as heat, greyness, social value, and activity.</div>
      </div>
      <div class="mood-pill" style="background:#f0f2ec;border:1px solid #d4e0e4;color:#355d63;">${source.length} plek${source.length===1?'':'ken'}</div>
    </div>
    <div class="atlas-grid">
      <div class="atlas-board">
        <strong>Atlaslandschap</strong>
        <svg class="atlas-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Atlaslandschap">
          <defs>
            <linearGradient id="atlasbg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#fbfcfd"></stop>
              <stop offset="100%" stop-color="#f5fafb"></stop>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${W}" height="${H}" fill="url(#atlasbg)"></rect>
          <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#d7e1e5" stroke-width="2"></line>
          <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#d7e1e5" stroke-width="2"></line>
          <line x1="${pad}" y1="${H/2}" x2="${W-pad}" y2="${H/2}" stroke="#ebf1f3" stroke-width="1"></line>
          <line x1="${W/2}" y1="${pad}" x2="${W/2}" y2="${H-pad}" stroke="#ebf1f3" stroke-width="1"></line>
          <text x="${W/2}" y="${H-10}" text-anchor="middle" font-size="12" font-weight="700" fill="#5f787d">More lively / reachable / things to do â†’</text>
          <text x="18" y="${H/2}" transform="rotate(-90 18 ${H/2})" text-anchor="middle" font-size="12" font-weight="700" fill="#5f787d">â†‘ More safe / comfortable / inclusive</text>
          ${circles}
        </svg>
        <div class="atlas-caption">Grotere cirkels wijzen op meer groen. Meer naar rechts betekent vaker levendige, bereikbare en actieve plekken. Hoger betekent meestal betere verblijfskwaliteit, veiligheid en inclusie.</div>
      </div>
      <div class="atlas-mini-grid">
        <div class="atlas-side">
          <strong>Legend & criteria</strong>
          <div class="atlas-legend">
            <div class="atlas-legend-item">
              <b>X-as: levendig / bereikbaar / iets te doen</b>
              <span>Meer naar rechts betekent meestal dat een plek makkelijker te bereiken is, meer sfeer heeft en meer redenen geeft om er te blijven of terug te komen.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Y-as: veilig / comfortabel / inclusief</b>
              <span>Hoe hoger een plek staat, hoe sterker ze meestal scoort op veiligheid, basiscomfort en het gevoel dat verschillende mensen er welkom zijn.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Grootte van de cirkel = groenkwaliteit</b>
              <span>Larger circles indicate more greenery, shade, softness, and breathing space. Smaller circles point more quickly to paving, heat, or little nature.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Safety</b>
              <span>Gaat over of een plek sociaal en in het verkeer veilig aanvoelt om er te zijn, over te steken of te blijven hangen.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Reachability</b>
              <span>Gaat over hoe makkelijk je er geraakt te voet, met de fiets, met het openbaar vervoer of langs je dagelijkse route.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Comfort & Basics</b>
              <span>Gaat over of je er echt kan blijven: zitten, schaduw vinden, beschutting hebben, water of toiletten in de buurt hebben.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Green</b>
              <span>Gaat over natuur, bomen, schaduw, zachtheid en of een plek minder stenig en warm aanvoelt.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Things to Do</b>
              <span>Gaat over of er redenen zijn om er te spelen, sporten, chillen, af te spreken of gewoon langer te blijven.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Inclusion</b>
              <span>Gaat over of verschillende jongeren en andere gebruikers zich welkom voelen en of de plek open en accessible aanvoelt.</span>
            </div>
            <div class="atlas-legend-item">
              <b>Vibe & Identity</b>
              <span>Gaat over karakter, uitstraling en of een plek herkenbaar, aantrekkelijk en eigen aanvoelt.</span>
            </div>
          </div>
        </div>
        <div class="atlas-side">
          <strong>Recurring themes</strong>
          <div class="atlas-chip-list">
            ${(topTags.length ? topTags : [['no tags yet', 1]]).map(([tag,count]) => `<span class="atlas-chip">${escapeHtml(tag)} Â· ${count}</span>`).join('')}
          </div>
        </div>
        <div class="atlas-side">
          <strong>Key locations</strong>
          <ul class="atlas-list">
            ${(locations.length ? locations : [['Onbekende locatie', source.length]]).map(([loc,count]) => `<li><span>${escapeHtml(loc)}</span><small>${count} plek${count===1?'':'ken'}</small></li>`).join('')}
          </ul>
        </div>
        <div class="atlas-side">
          <strong>Heat, grey, and paving</strong>
          <ul class="atlas-list">
            ${(heatWatch.length ? heatWatch : []).map(place => `<li><span>${escapeHtml(place.name)}</span><small>${escapeHtml(getNeedsAttention(place))}</small></li>`).join('') || '<li><span>No strong heat or greyness issue found</span><small>â€”</small></li>'}
          </ul>
        </div>
        <div class="atlas-side">
          <strong>Sociale en fune plekken</strong>
          <ul class="atlas-list">
            ${(socialSpots.length ? socialSpots : []).map(place => `<li><span>${escapeHtml(place.name)}</span><small>${escapeHtml(getBestFor(place))}</small></li>`).join('') || '<li><span>No strong social hotspots identified yet</span><small>â€”</small></li>'}
          </ul>
        </div>
        <div class="atlas-side">
          <strong>Active places</strong>
          <ul class="atlas-list">
            ${(activePlaces.length ? activePlaces : []).map(place => `<li><span>${escapeHtml(place.name)}</span><small>Activity ${place.scores.activity}/10</small></li>`).join('') || '<li><span>No clearly active places yet</span><small>â€”</small></li>'}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function render(){
  document.getElementById('sortSelect').value = sortMode;
  renderPlaceList();
  renderCompareStrip();
  renderAtlasPanel();
  renderForm();
  renderPassports();
}

function escapeHtml(str){
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(str){ return escapeHtml(str); }

function wireImport(){
  const input = document.getElementById('importFile');
  input.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const payload = JSON.parse(text);
      if(payload?.places?.length){
        places = normalizePlaces(payload.places);
        activePlaceId = places[0].id;
        sortMode = payload.sortMode || 'manual';
        render();
        saveBoard(true);
        status(`Imported file â€¢ ${places.length} place${places.length===1?'':'s'}`);
      }else{
        alert('Dit JSON-bestand bevat geen geldige place-data.');
      }
    }catch(err){
      console.error(err);
      alert('Kon dit JSON-bestand niet importeren.');
    }
    input.value = '';
  });

  document.getElementById('sortSelect').addEventListener('change', e => {
    sortMode = e.target.value;
    renderPassports();
    saveBoard(false);
  });
}



/* Smartphone interaction helpers */
let __lastScrollY = 0;
function rememberScroll(){
  __lastScrollY = window.scrollY || window.pageYOffset || 0;
}
function restoreScrollSoon(){
  const y = __lastScrollY;
  requestAnimationFrame(() => {
    window.scrollTo({ top:y, left:0, behavior:'auto' });
  });
}
function blurTextInputsBeforeSlider(){
  const a = document.activeElement;
  if(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') && a.type !== 'range'){
    a.blur();
  }
}
function isRange(el){
  return el && el.matches && el.matches('input[type="range"]');
}
document.addEventListener('pointerdown', (e) => {
  if(isRange(e.target)){
    rememberScroll();
    blurTextInputsBeforeSlider();
  }
}, true);
document.addEventListener('touchstart', (e) => {
  const t = e.target;
  if(isRange(t)){
    rememberScroll();
    blurTextInputsBeforeSlider();
  }
}, {capture:true, passive:true});
document.addEventListener('input', (e) => {
  if(isRange(e.target)){
    restoreScrollSoon();
  }
}, true);
document.addEventListener('change', (e) => {
  if(isRange(e.target)){
    restoreScrollSoon();
  }
}, true);
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    document.getElementById('passportGrid') && renderPassports();
  }, 250);
});
window.addEventListener('afterprint', () => {
  document.body.classList.remove('print-single');
  document.querySelectorAll('.passport').forEach(el => el.classList.remove('print-hidden'));
});

const LANG_STORAGE_KEY = 'urbanfoxes_place_passport_lang';
let currentLang = localStorage.getItem(LANG_STORAGE_KEY) || 'nl';

const CRITERIA_META = {
  safety: { nl:{label:'Veiligheid', desc:'Of een plek sociaal en in het verkeer veilig aanvoelt om er te zijn, over te steken of te blijven hangen.'}, en:{label:'Safety', desc:'Whether a place feels socially and traffic-wise safe to be in, cross, or spend time in.'}},
  reachability: { nl:{label:'Bereikbaarheid', desc:'Hoe makkelijk je er geraakt te voet, met de fiets, met het openbaar vervoer of langs je dagelijkse route.'}, en:{label:'Reachability', desc:'How easily you can get there on foot, by bike, by public transport, or along your daily route.'}},
  comfort: { nl:{label:'Comfort & basis', desc:'Of je er echt kan blijven: zitten, schaduw vinden, beschutting hebben, water of toiletten in de buurt hebben.'}, en:{label:'Comfort & Basics', desc:'Whether you can actually stay there: sit, find shade, have shelter, and have water or toilets nearby.'}},
  green: { nl:{label:'Groen', desc:'Of een plek natuur, bomen, schaduw en zachtheid heeft en minder stenig en warm aanvoelt.'}, en:{label:'Green', desc:'Whether a place has nature, trees, shade, and softness and feels less paved and hot.'}},
  activity: { nl:{label:'Dingen te doen', desc:'Of er redenen zijn om er te spelen, sporten, chillen, af te spreken of gewoon langer te blijven.'}, en:{label:'Things to Do', desc:'Whether there are reasons to play, exercise, chill, meet up, or simply stay longer.'}},
  inclusion: { nl:{label:'Inclusie', desc:'Of verschillende jongeren en andere gebruikers zich welkom voelen en de plek open en toegankelijk aanvoelt.'}, en:{label:'Inclusion', desc:'Whether different young people and other users feel welcome and the place feels open and accessible.'}},
  vibe: { nl:{label:'Sfeer & identiteit', desc:'Of een plek karakter, uitstraling en aantrekkingskracht heeft.'}, en:{label:'Vibe & Identity', desc:'Whether a place has character, atmosphere, and a recognizable identity.'}},
};

const PLACE_TYPE_META = {
  square:{nl:'Plein', en:'Square'},
  park:{nl:'Park', en:'Park'},
  street:{nl:'Straat', en:'Street'},
  station_area:{nl:'Stationsomgeving', en:'Station area'},
  playground:{nl:'Speelplek', en:'Playground'},
  hangout_spot:{nl:'Hangplek', en:'Hangout spot'},
  sports_space:{nl:'Sportruimte', en:'Sports space'},
  cultural_place:{nl:'Culturele plek', en:'Cultural place'},
  other:{nl:'Anders', en:'Other'},
};

const FAMILIARITY_META = {
  often:{nl:'Ik kom hier vaak', en:'I come here often'},
  pass_through:{nl:'Ik passeer hier', en:'I pass through'},
  first_time:{nl:'Eerste keer hier', en:'First time here'},
  near_school:{nl:'Dicht bij school', en:'Near school'},
  near_home:{nl:'Dicht bij huis', en:'Near home'},
  with_friends:{nl:'Met vrienden', en:'With friends'},
  sport_play:{nl:'Voor sport / spel', en:'For sport / play'},
  other:{nl:'Anders', en:'Other'},
};

const TAG_META = {
  good_vibe:{nl:'goede sfeer', en:'good vibe'},
  boring_place:{nl:'saaie plek', en:'boring place'},
  grey:{nl:'grijs', en:'grey'},
  heat_island:{nl:'hitte-eiland', en:'heat island'},
  no_toilets:{nl:'geen toiletten', en:'no toilets'},
  unsafe_crossing:{nl:'onveilige oversteek', en:'unsafe crossing'},
  good_to_meet:{nl:'goed om af te spreken', en:'good to meet'},
  good_for_sport:{nl:'goed voor sport', en:'good for sport'},
  calm:{nl:'rustig', en:'calm'},
  noisy:{nl:'druk / lawaai', en:'busy / noisy'},
  hidden_gem:{nl:'verborgen parel', en:'hidden gem'},
  too_controlled:{nl:'te gecontroleerd', en:'too controlled'},
  need_shade:{nl:'nood aan schaduw', en:'needs shade'},
  accessible:{nl:'toegankelijk', en:'accessible'},
  hard_to_reach:{nl:'moeilijk bereikbaar', en:'hard to reach'},
  clean:{nl:'proper', en:'clean'},
  dirty:{nl:'vuil', en:'dirty'},
  lots_to_do:{nl:'veel te doen', en:'lots to do'},
  nothing_to_do:{nl:'niets te doen', en:'nothing to do'},
  fun:{nl:'leuk', en:'fun'},
  nice_to_chill:{nl:'fijn om te chillen', en:'nice to chill'},
  paved_over:{nl:'versteend', en:'paved over'},
  too_hot:{nl:'te warm', en:'too hot'},
  lack_of_green:{nl:'groen tekort', en:'lack of green'},
};

const I18N = {
  nl: {
    title:'Place Passport Generator v3 by Urban Foxes', subtitle:'Een smartphonegerichte passport-tool met sterkere vergelijklogica, printoutput, foto-ondersteuning, mini-radars en deelbare export per passport.', addPlace:'+ Plek toevoegen', saveBrowser:'Bewaar in deze browser', exportJSON:'Export JSON', exportCSV:'Export CSV', printPassports:'Print passports', submitEvaluation:'Submit Evaluation', importMerge:'Importeer / voeg JSON samen',
    places:'Plekken', placeName:'Naam van de plek', evaluator:'Evaluator / groep', location:'Wijk / locatie', placeType:'Type plek', familiarity:'Hoe ken je deze plek?', photo:'Foto van de plek', choosePhoto:'Kies foto', takePhoto:'Neem foto', removePhoto:'Verwijder foto', noPhoto:'Nog geen foto toegevoegd', photoHelper:'Kies uit je galerij/bestanden of neem een nieuwe foto. Gebruikt in de passport-header, beeldexport en printweergave.', shortNote:'Korte notitie', fastTags:'Snelle tags', criteria:'Jongerencriteria voor publieke ruimte',
    sortBy:'Sorteer op', manual:'Aanmaakvolgorde', avgDesc:'Gemiddelde score â†“', avgAsc:'Gemiddelde score â†‘', nameAZ:'Naam Aâ€“Z', safetyDesc:'Veiligheid â†“', comfortDesc:'Comfort â†“', greenDesc:'Groen â†“', activityDesc:'Activiteit â†“', inclusionDesc:'Inclusie â†“', vibeDesc:'Sfeer â†“', passportHint:'Elke plek wordt een sterker passport met moodlabel, samenvattende zin, tags en duidelijkere vergelijking.',
    notSaved:'Nog niet opgeslagen', csvExported:'CSV geÃ«xporteerd â€¢ {count} plek(ken)', jsonExported:'JSON geÃ«xporteerd â€¢ {count} plek(ken)', imageDownloaded:'Afbeelding gedownload â€¢ {name}', shared:'Passport gedeeld â€¢ {name}', copied:'Samenvatting gekopieerd â€¢ {name}', copiedMsg:'Passport-samenvatting gekopieerd naar klembord.', saved:'Opgeslagen in deze browser â€¢ {count} plek(ken)', loaded:'Browsersave geladen â€¢ {count} plek(ken)', imported:'JSON geÃ¯mporteerd â€¢ {count} plek(ken)', merged:'{files} JSON-bestand(en) samengevoegd â€¢ {count} plek(ken)', importInvalid:'Dit JSON-bestand bevat geen geldige place-data.', importInvalidMulti:'Geen geldige plekken gevonden in de geselecteerde JSON-bestanden.', importFailed:'Kon deze JSON-bestanden niet importeren.', storageFull:'Browseropslag is vol', storageFullMsg:'Deze browser raakt vol. Gebruik minder of kleinere fotoâ€™s, vervang grote fotoâ€™s, of exporteer je werk als JSON.', saveFailed:'Kon niet opslaan',
    strong:'Sterk', quiteGood:'Best goed', mixed:'Gemengd', weak:'Zwak', mood_hangout:'Hangplek', mood_transit:'Transitplek', mood_refuge:'Groene toevlucht', mood_care:'Heeft zorg nodig', mood_youth:'Jongerenvriendelijk', mood_potential:'Veel potentieel',
    summaryTitle:'Samenvattende zin', bestFor:'Goed voor', needsAttention:'Meeste aandacht nodig voor', youthNote:'Jongerennotitie', noNote:'Nog geen notitie toegevoegd.', evaluatorGroup:'Evaluator / groep', averageScore:'Gemiddelde score', strongest:'Sterkste punt', needsWork:'Werkpunt', strongestText:'{label} springt eruit met {score}/10.', weakestText:'{label} is het zwakst met {score}/10.', noTags:'nog geen tags', more:'+{count} meer', generatedFrom:'Gegenereerd op basis van de 7 jongerencriteria uit de Place Evaluation Compass.', downloadImage:'Download afbeelding', shareSummary:'Deel samenvatting', printPassport:'Print dit passport',
    bestOverall:'Beste overall', safest:'Veiligste plek', greenest:'Groenste plek', bestVibe:'Beste sfeer', weakestBasics:'Zwakste basis', weakestInclusion:'Zwakste inclusie', socialTraffic:'Sterk op sociale en verkeersveiligheid', greenQuality:'Sterke groen- en natuurkwaliteit', vibeIdentity:'Sterkste sfeer en identiteit', basicsNeeds:'Vraagt de meeste aandacht op comfort en basis', inclusionNeeds:'Vraagt de meeste aandacht op inclusie en openheid', open:'Open', delete:'Verwijder', scoreWord:'score', placeWord:'Plek',
    atlasTitle:'Jongerenatlas van plekken', atlasSub:'Een eerste atlaslaag boven op het Place Passport: geen GPS-kaart, maar een visueel landschap van plekken op basis van levendigheid, verblijfskwaliteit en thematische signalen zoals hitte, grijsheid, sociale waarde en activiteit.', atlasLandscape:'Atlaslandschap', atlasCaption:'Grotere cirkels wijzen op meer groen. Meer naar rechts betekent vaker levendige, bereikbare en actieve plekken. Hoger betekent meestal betere verblijfskwaliteit, veiligheid en inclusie.', legendCriteria:'Legenda & criteria', recurringThemes:'Terugkerende themaâ€™s', keyLocations:'Belangrijkste locaties', heatGrey:'Hitte, grijs en verstening', socialFun:'Sociale en leuke plekken', activePlaces:'Actieve plekken', noHeat:'Geen sterk hitte- of grijsheidsprobleem gevonden', noSocial:'Nog geen sterke sociale hotspots', noActive:'Nog geen duidelijk actieve plekken',
    xAxis:'X-as: levendig / bereikbaar / iets te doen', xAxisDesc:'Meer naar rechts betekent meestal dat een plek makkelijker te bereiken is, meer sfeer heeft en meer redenen geeft om er te blijven of terug te komen.', yAxis:'Y-as: veilig / comfortabel / inclusief', yAxisDesc:'Hoe hoger een plek staat, hoe sterker ze meestal scoort op veiligheid, basiscomfort en het gevoel dat verschillende mensen er welkom zijn.', sizeLegend:'Grootte van de cirkel = groenkwaliteit', sizeLegendDesc:'Grotere cirkels wijzen op meer groen, schaduw, zachtheid en ademruimte. Kleinere cirkels wijzen sneller op verharding, hitte of weinig natuur.', axisBottom:'Meer levendig / bereikbaar / iets te doen â†’', axisLeft:'â†‘ Meer veilig / comfortabel / inclusief', language:'Taal',
    bestFor_meeting:'afspreken en hangen', bestFor_rest:'tot rust komen en even pauzeren', bestFor_pass:'passeren en doorsteken', bestFor_sport:'sport en beweging', bestFor_mixed:'gemengde groepen en langer verblijven', bestFor_friends:'vrienden ontmoeten', bestFor_calm:'rustig verblijven', bestFor_discover:'ontdekken en rondhangen', bestFor_chill:'chillen en blijven hangen', bestFor_fun:'vrije tijd en plezier', bestFor_daily:'dagelijks gebruik van publieke ruimte', need_basics:'comfort en basisvoorzieningen', need_inclusion:'inclusie en openheid', need_safety:'veilige toegang en oversteken', need_activity:'dingen om te doen en redenen om te blijven', need_green:'groen, schaduw en verkoeling'
  },
  en: {
    title:'Place Passport Generator v3 by Urban Foxes', subtitle:'A smartphone-first passport tool with stronger compare logic, print output, photo support, mini radars, and shareable exports per passport.', addPlace:'+ Add place', saveBrowser:'Save in this browser', exportJSON:'Export JSON', exportCSV:'Export CSV', printPassports:'Print passports', submitEvaluation:'Submit Evaluation', importMerge:'Import / merge JSON',
    places:'Places', placeName:'Place name', evaluator:'Evaluator / group', location:'Neighbourhood / location', placeType:'Place type', familiarity:'How do you know this place?', photo:'Place photo', choosePhoto:'Choose photo', takePhoto:'Take photo', removePhoto:'Remove photo', noPhoto:'No photo added yet', photoHelper:'Choose from your gallery/files or take a new photo. Used in the passport header, image export, and print view.', shortNote:'Short note', fastTags:'Fast tags', criteria:'Youth public space criteria',
    sortBy:'Sort by', manual:'Creation order', avgDesc:'Average score â†“', avgAsc:'Average score â†‘', nameAZ:'Name Aâ€“Z', safetyDesc:'Safety â†“', comfortDesc:'Comfort â†“', greenDesc:'Green â†“', activityDesc:'Activity â†“', inclusionDesc:'Inclusion â†“', vibeDesc:'Vibe â†“', passportHint:'Each place becomes a stronger passport with a mood label, summary sentence, tags, and clearer comparison.',
    notSaved:'Not saved yet', csvExported:'CSV exported â€¢ {count} place(s)', jsonExported:'JSON exported â€¢ {count} place(s)', imageDownloaded:'Image downloaded â€¢ {name}', shared:'Passport shared â€¢ {name}', copied:'Summary copied â€¢ {name}', copiedMsg:'Passport summary copied to clipboard.', saved:'Saved in this browser â€¢ {count} place(s)', loaded:'Loaded browser save â€¢ {count} place(s)', imported:'Imported JSON â€¢ {count} place(s)', merged:'Merged {files} JSON file(s) â€¢ {count} place(s)', importInvalid:'This JSON file does not contain valid place data.', importInvalidMulti:'No valid places were found in the selected JSON files.', importFailed:'Could not import these JSON files.', storageFull:'Browser storage is full', storageFullMsg:'This browser is running out of storage. Use fewer or smaller photos, replace large photos, or export your work as JSON.', saveFailed:'Could not save',
    strong:'Strong', quiteGood:'Quite good', mixed:'Mixed', weak:'Weak', mood_hangout:'Hangout Spot', mood_transit:'Transit Place', mood_refuge:'Green Refuge', mood_care:'Needs Care', mood_youth:'Youth-Friendly', mood_potential:'Full of Potential',
    summaryTitle:'Summary sentence', bestFor:'Best for', needsAttention:'Needs most attention', youthNote:'Youth note', noNote:'No note added yet.', evaluatorGroup:'Evaluator / group', averageScore:'Average score', strongest:'Strongest point', needsWork:'Needs work', strongestText:'{label} stands out at {score}/10.', weakestText:'{label} is weakest at {score}/10.', noTags:'no tags yet', more:'+{count} more', generatedFrom:'Generated from the 7 youth criteria in the Place Evaluation Compass.', downloadImage:'Download image', shareSummary:'Share summary', printPassport:'Print this passport',
    bestOverall:'Best overall', safest:'Safest place', greenest:'Greenest place', bestVibe:'Best vibe', weakestBasics:'Weakest basics', weakestInclusion:'Weakest inclusion', socialTraffic:'Strong on social and traffic safety', greenQuality:'Strong green and nature quality', vibeIdentity:'Strongest atmosphere and identity', basicsNeeds:'Needs the most attention on comfort and basics', inclusionNeeds:'Needs the most attention on inclusion and openness', open:'Open', delete:'Delete', scoreWord:'score', placeWord:'Place',
    atlasTitle:'Youth place atlas', atlasSub:'A first atlas layer on top of the Place Passport: not a GPS map, but a visual landscape of places based on liveliness, staying quality, and thematic signals such as heat, greyness, social value, and activity.', atlasLandscape:'Atlas landscape', atlasCaption:'Larger circles indicate more greenery. Further right usually means more lively, reachable, and active places. Higher up usually means better staying quality, safety, and inclusion.', legendCriteria:'Legend & criteria', recurringThemes:'Recurring themes', keyLocations:'Key locations', heatGrey:'Heat, grey, and paving', socialFun:'Social and fun places', activePlaces:'Active places', noHeat:'No strong heat or greyness issue found', noSocial:'No strong social hotspots yet', noActive:'No clearly active places yet',
    xAxis:'X-axis: lively / reachable / things to do', xAxisDesc:'Further right usually means a place is easier to reach, has more atmosphere, and gives more reasons to stay or come back.', yAxis:'Y-axis: safe / comfortable / inclusive', yAxisDesc:'The higher a place appears, the stronger it usually scores on safety, basic comfort, and feeling welcoming to different people.', sizeLegend:'Circle size = green quality', sizeLegendDesc:'Larger circles point to more greenery, shade, softness, and breathing space. Smaller circles point more quickly to paving, heat, or little nature.', axisBottom:'More lively / reachable / things to do â†’', axisLeft:'â†‘ More safe / comfortable / inclusive', language:'Language',
    bestFor_meeting:'meeting and hanging out', bestFor_rest:'slowing down and taking a break', bestFor_pass:'passing through and crossing', bestFor_sport:'sport and movement', bestFor_mixed:'mixed groups and staying longer', bestFor_friends:'meeting friends', bestFor_calm:'calm staying', bestFor_discover:'discovering and hanging out', bestFor_chill:'chilling and staying around', bestFor_fun:'free time and fun', bestFor_daily:'everyday public-space use', need_basics:'comfort and basic facilities', need_inclusion:'inclusion and openness', need_safety:'safe access and crossing', need_activity:'things to do and reasons to stay', need_green:'green, shade, and cooling'
  }
};

function t(key, vars={}) { let str = (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en && I18N.en[key]) || key; Object.entries(vars).forEach(([k,v]) => { str = str.replaceAll(`{${k}}`, v); }); return str; }
function getCriteriaLabel(key){ return CRITERIA_META[key]?.[currentLang]?.label || key; }
function getCriteriaDesc(key){ return CRITERIA_META[key]?.[currentLang]?.desc || ''; }
function localizePlaceType(key){ return PLACE_TYPE_META[key]?.[currentLang] || key; }
function localizeFamiliarity(key){ return FAMILIARITY_META[key]?.[currentLang] || key; }
function tagLabel(key){ return TAG_META[key]?.[currentLang] || key; }
const PLACE_TYPE_KEYS = Object.keys(PLACE_TYPE_META);
const FAMILIARITY_KEYS = Object.keys(FAMILIARITY_META);
const TAG_KEYS = Object.keys(TAG_META);

function setupLanguageUI(){
  const toolbar = document.querySelector('.toolbar');
  if (toolbar && !document.getElementById('langSelect')) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-left:auto;';
    wrap.innerHTML = `<span id="langLabel" style="font-size:12px;font-weight:700;color:#5d777d;">${t('language')}</span><select id="langSelect" class="btn" style="padding-right:28px;"><option value="nl">NL</option><option value="en">EN</option></select>`;
    toolbar.appendChild(wrap);
    wrap.querySelector('#langSelect').addEventListener('change', e => setLanguage(e.target.value));
  }
  const input = document.getElementById('importFile');
  if (input) input.multiple = true;
}
function setLanguage(lang){ currentLang = lang === 'en' ? 'en' : 'nl'; localStorage.setItem(LANG_STORAGE_KEY, currentLang); applyStaticTexts(); render(); }
function applyStaticTexts(){
  document.title = t('title');
  const h1 = document.querySelector('.topbar h1'); if (h1) h1.textContent = t('title');
  const sub = document.querySelector('.topbar .sub'); if (sub) sub.textContent = t('subtitle');
  const leftH2 = document.querySelector('.panel.left h2'); if (leftH2) leftH2.textContent = t('places');
  const submitBtn = document.getElementById('submitEvaluationBtn');
  if (submitBtn) {
    const submitLabel = t('submitEvaluation');
    submitBtn.textContent = submitLabel === 'submitEvaluation' ? 'Submit Evaluation' : submitLabel;
  }
  const importBtn = document.getElementById('importJsonBtn');
  if (importBtn) {
    const importLabel = t('importMerge');
    importBtn.textContent = importLabel === 'importMerge' ? 'Import / merge JSON' : importLabel;
  }
  const btns = document.querySelectorAll('.toolbar .btn');
  if (btns[0]) btns[0].textContent = t('addPlace');
  if (btns[1]) btns[1].textContent = t('saveBrowser');
  if (btns[2]) btns[2].textContent = t('exportJSON');
  if (btns[3]) btns[3].textContent = t('exportCSV');
  if (btns[4]) btns[4].textContent = t('printPassports');
  const ls = document.getElementById('langSelect'); if (ls) ls.value = currentLang;
  const langLabel = document.getElementById('langLabel'); if (langLabel) langLabel.textContent = t('language');
  const st = document.getElementById('status'); if (st && (!st.textContent || st.textContent === 'Not saved yet' || st.textContent === 'Nog niet opgeslagen')) st.textContent = t('notSaved');
}
function normalizePlaceType(value){ const v = String(value || '').trim().toLowerCase(); const map = {'plein':'square','square':'square','park':'park','straat':'street','street':'street','stationsomgeving':'station_area','station area':'station_area','speelplek':'playground','playground':'playground','hangplek':'hangout_spot','hangout spot':'hangout_spot','sportruimte':'sports_space','sports space':'sports_space','culturele plek':'cultural_place','cultural place':'cultural_place','anders':'other','other':'other'}; return map[v] || 'other'; }
function normalizeFamiliarity(value){ const v = String(value || '').trim().toLowerCase(); const map = {'ik kom hier vaak':'often','i come here often':'often','ik passeer hier':'pass_through','i pass through':'pass_through','eerste keer hier':'first_time','first time here':'first_time','dicht bij school':'near_school','near school':'near_school','dicht bij huis':'near_home','near home':'near_home','met vrienden':'with_friends','with friends':'with_friends','voor sport / spel':'sport_play','for sport / play':'sport_play','anders':'other','other':'other'}; return map[v] || 'often'; }
function normalizeTag(value){ const v = String(value || '').trim().toLowerCase(); const map = {'good vibe':'good_vibe','goede sfeer':'good_vibe','boring place':'boring_place','saaie plek':'boring_place','boring':'boring_place','grey':'grey','grijs':'grey','heat island':'heat_island','hitte-eiland':'heat_island','no toilets':'no_toilets','geen toiletten':'no_toilets','unsafe crossing':'unsafe_crossing','onveilige oversteek':'unsafe_crossing','good to meet':'good_to_meet','goed om af te spreken':'good_to_meet','good for sport':'good_for_sport','goed voor sport':'good_for_sport','calm':'calm','rustig':'calm','druk / lawaai':'noisy','busy / noisy':'noisy','noisy':'noisy','te druk':'noisy','hidden gem':'hidden_gem','verborgen parel':'hidden_gem','too controlled':'too_controlled','te gecontroleerd':'too_controlled','nood aan schaduw':'need_shade','needs shade':'need_shade','accessible':'accessible','toegankelijk':'accessible','hard to reach':'hard_to_reach','moeilijk bereikbaar':'hard_to_reach','clean':'clean','proper':'clean','dirty':'dirty','vuil':'dirty','lots to do':'lots_to_do','veel te doen':'lots_to_do','nothing to do':'nothing_to_do','niets te doen':'nothing_to_do','fun':'fun','leuk':'fun','nice to chill':'nice_to_chill','fijn om te chillen':'nice_to_chill','paved over':'paved_over','versteend':'paved_over','too hot':'too_hot','te warm':'too_hot','lack of green':'lack_of_green','groen tekort':'lack_of_green'}; return map[v] || v.replace(/\s+/g,'_'); }
function normalizePlaces(arr){ return (arr || []).map((p, idx) => ({ id: p.id || crypto.randomUUID(), name: p.name || `${t('placeWord')} ${idx+1}`, evaluator: p.evaluator || '', location: p.location || '', placeType: normalizePlaceType(p.placeType), familiarity: normalizeFamiliarity(p.familiarity), note: p.note || '', photo: p.photo || '', tags: Array.isArray(p.tags) ? [...new Set(p.tags.map(normalizeTag))] : [], scores: { safety: Number(p.scores?.safety ?? 5) || 0, reachability: Number(p.scores?.reachability ?? 5) || 0, comfort: Number(p.scores?.comfort ?? 5) || 0, green: Number(p.scores?.green ?? 5) || 0, activity: Number(p.scores?.activity ?? 5) || 0, inclusion: Number(p.scores?.inclusion ?? 5) || 0, vibe: Number(p.scores?.vibe ?? 5) || 0 } })); }
function labelForKey(key){ return getCriteriaLabel(key); }
function descriptor(score){ if(score>=8) return t('strong'); if(score>=6) return t('quiteGood'); if(score>=4) return t('mixed'); return t('weak'); }
function moodInfo(place){ const s=place.scores; if(s.vibe>=8&&s.activity>=7) return {label:t('mood_hangout'),bg:'#fae2e7',border:'#eabfc8',color:'#8e4953'}; if(s.reachability>=8&&s.comfort<=5&&s.vibe<=5) return {label:t('mood_transit'),bg:'#edf0ec',border:'#d8e1e5',color:'#5e747b'}; if(s.green>=8&&s.comfort>=7) return {label:t('mood_refuge'),bg:'#dff4eb',border:'#cfeadd',color:'#29684d'}; if(s.safety<=4&&s.inclusion<=4) return {label:t('mood_care'),bg:'#fde5db',border:'#f1d1c4',color:'#8c4c35'}; if(averageScore(place)>=7.2) return {label:t('mood_youth'),bg:'#d4eae4',border:'#c7e2e6',color:'#2a6068'}; return {label:t('mood_potential'),bg:'#fdf1d2',border:'#f0e0ae',color:'#8e6b18'}; }
function summarySentence(place){ const [bestKey]=strongest(place), [worstKey]=weakest(place), best=labelForKey(bestKey), worst=labelForKey(worstKey); const templates = currentLang==='nl' ? [`Sterk in ${best}, maar zwakker in ${worst}.`,`Aangenaam dankzij ${best}, al vraagt ${worst} nog verbetering.`,`Een plek met goede ${best}, maar beperkte ${worst}.`,`Veel potentieel, maar nog tekorten in ${worst}.`] : [`Strong on ${best}, but weaker on ${worst}.`,`Easy to enjoy thanks to ${best}, though ${worst} still needs improvement.`,`A place with good ${best}, but limited ${worst}.`,`Promising overall, but still lacking in ${worst}.`]; if(bestKey==='vibe'&&worstKey==='comfort') return currentLang==='nl' ? 'Sterke sfeer, maar comfort en basisvoorzieningen blijven zwak.' : 'Strong vibe, but comfort and basic facilities remain weak.'; if(bestKey==='green'&&worstKey==='activity') return currentLang==='nl' ? 'Groen en aangenaam, maar er is niet veel te doen.' : 'Green and pleasant, but there is not much to do.'; if(bestKey==='reachability'&&worstKey==='comfort') return currentLang==='nl' ? 'Makkelijk bereikbaar, maar nog niet comfortabel genoeg om te blijven.' : 'Easy to reach, but not yet comfortable enough to stay.'; if(bestKey==='safety'&&worstKey==='inclusion') return currentLang==='nl' ? 'Voelt redelijk veilig, maar werkt nog niet even goed voor iedereen.' : 'Feels fairly safe, though it does not yet work equally well for everyone.'; return templates[Math.floor((averageScore(place)*10)%templates.length)]; }
function getBestFor(place){ const s=place.scores||{}, tags=place.tags||[]; if((s.vibe??0)>=8&&(s.activity??0)>=7) return t('bestFor_meeting'); if((s.green??0)>=8&&(s.comfort??0)>=7) return t('bestFor_rest'); if((s.reachability??0)>=8&&(s.comfort??0)<=5) return t('bestFor_pass'); if((s.activity??0)>=7&&tags.includes('good_for_sport')) return t('bestFor_sport'); if((s.inclusion??0)>=7&&(s.comfort??0)>=7) return t('bestFor_mixed'); if(tags.includes('good_to_meet')) return t('bestFor_friends'); if(tags.includes('calm')) return t('bestFor_calm'); if(tags.includes('hidden_gem')) return t('bestFor_discover'); if(tags.includes('nice_to_chill')) return t('bestFor_chill'); if(tags.includes('fun')) return t('bestFor_fun'); return t('bestFor_daily'); }
function getNeedsAttention(place){ const s=place.scores||{}, tags=place.tags||[]; if((s.comfort??0)<=4||tags.includes('no_toilets')||tags.includes('need_shade')) return t('need_basics'); if((s.inclusion??0)<=4||tags.includes('too_controlled')) return t('need_inclusion'); if((s.safety??0)<=4||tags.includes('unsafe_crossing')) return t('need_safety'); if((s.activity??0)<=4||tags.includes('nothing_to_do')||tags.includes('boring_place')) return t('need_activity'); if((s.green??0)<=4||tags.includes('grey')||tags.includes('heat_island')||tags.includes('paved_over')||tags.includes('too_hot')||tags.includes('lack_of_green')) return t('need_green'); return labelForKey(weakest(place)[0]).toLowerCase(); }
function isStarterPlace(p){ return !!p && ['Plek A','Place A'].includes(p.name) && !p.evaluator && !p.location && !p.note && !p.photo && (!p.tags || !p.tags.length); }
async function sharePassport(id){ const place=places.find(p=>p.id===id); if(!place) return; const [bestKey,bestVal]=strongest(place), [worstKey,worstVal]=weakest(place); const text=[`${place.name}`, place.location||'', `${t('bestFor')}: ${getBestFor(place)}`, `${t('needsAttention')}: ${getNeedsAttention(place)}`, `${t('averageScore')}: ${averageScore(place).toFixed(1)}/10`, summarySentence(place), `${t('strongest')}: ${labelForKey(bestKey)} (${bestVal}/10)`, `${t('needsWork')}: ${labelForKey(worstKey)} (${worstVal}/10)`, place.note ? `${t('youthNote')}: ${place.note}` : ''].filter(Boolean).join('\n'); try{ if(navigator.share){ await navigator.share({title:place.name,text}); status(t('shared',{name:place.name})); return; } }catch(err){ if(err && err.name==='AbortError') return; } try{ await navigator.clipboard.writeText(text); alert(t('copiedMsg')); status(t('copied',{name:place.name})); }catch(err){ alert(text); } }
function saveBoard(updateStatus=true){ try{ const payload={version:4,savedAt:new Date().toISOString(),places,activePlaceId,sortMode,currentLang}; localStorage.setItem(STORAGE_KEY,JSON.stringify(payload)); if(updateStatus) status(t('saved',{count:places.length})); }catch(err){ console.error(err); const isQuota=err&&(err.name==='QuotaExceededError'||err.name==='NS_ERROR_DOM_QUOTA_REACHED'); if(isQuota){ status(t('storageFull')); alert(t('storageFullMsg')); } else { status(t('saveFailed')); } } }
function loadBoard(){ try{ const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return false; const payload=JSON.parse(raw); if(payload?.places?.length){ places=normalizePlaces(payload.places); activePlaceId=payload.activePlaceId||places[0].id; sortMode=payload.sortMode||'manual'; currentLang=payload.currentLang||currentLang; status(t('loaded',{count:places.length})); return true; } }catch(err){ console.error(err); } return false; }
function exportJSON(){ const payload={version:4,exportedAt:new Date().toISOString(),currentLang,places}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`place_passports_${currentLang}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),800); status(t('jsonExported',{count:places.length})); }
function exportCSV(){ const headers=['id','name','evaluator','location','placeType','familiarity','note','tags','hasPhoto','safety','reachability','comfort','green','activity','inclusion','vibe','average','strongest','weakest','moodLabel','summarySentence','bestFor','needsAttention']; const rows=places.map(place=>{ const mood=moodInfo(place).label,[bestKey]=strongest(place),[worstKey]=weakest(place); return [place.id,place.name,place.evaluator,place.location,localizePlaceType(place.placeType),localizeFamiliarity(place.familiarity),place.note,place.tags.map(tagLabel).join(' | '),place.photo?'yes':'no',place.scores.safety,place.scores.reachability,place.scores.comfort,place.scores.green,place.scores.activity,place.scores.inclusion,place.scores.vibe,averageScore(place).toFixed(1),labelForKey(bestKey),labelForKey(worstKey),mood,summarySentence(place),getBestFor(place),getNeedsAttention(place)];}); const csv=[headers.map(csvCell).join(','),...rows.map(r=>r.map(csvCell).join(','))].join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`place_passports_${currentLang}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),800); status(t('csvExported',{count:places.length})); }
function addPlace(){ const letter=String.fromCharCode(65+places.length); const p={id:crypto.randomUUID(),name:`${t('placeWord')} ${letter}`,evaluator:'',location:'',placeType:'other',familiarity:'often',note:'',photo:'',tags:[],scores:{safety:5,reachability:5,comfort:5,green:5,activity:5,inclusion:5,vibe:5}}; places.push(p); activePlaceId=p.id; render(); saveBoard(true); }
function localizedSortOptions(){ return {manual:t('manual'),average_desc:t('avgDesc'),average_asc:t('avgAsc'),name_asc:t('nameAZ'),safety_desc:t('safetyDesc'),comfort_desc:t('comfortDesc'),green_desc:t('greenDesc'),activity_desc:t('activityDesc'),inclusion_desc:t('inclusionDesc'),vibe_desc:t('vibeDesc')}; }
function renderCompareStrip(){ const wrap=document.getElementById('compareStrip'); const bestAvg=[...places].sort((a,b)=>averageScore(b)-averageScore(a))[0]; wrap.innerHTML=`<div class="compare-card"><strong>${t('bestOverall')}</strong><div class="big">${escapeHtml(bestAvg?.name||'â€”')}</div><div class="small">${t('averageScore')} ${bestAvg?averageScore(bestAvg).toFixed(1):'â€”'}</div></div><div class="compare-card"><strong>${t('safest')}</strong><div class="big">${escapeHtml(bestBy('safety'))}</div><div class="small">${t('socialTraffic')}</div></div><div class="compare-card"><strong>${t('greenest')}</strong><div class="big">${escapeHtml(bestBy('green'))}</div><div class="small">${t('greenQuality')}</div></div><div class="compare-card"><strong>${t('bestVibe')}</strong><div class="big">${escapeHtml(bestBy('vibe'))}</div><div class="small">${t('vibeIdentity')}</div></div><div class="compare-card"><strong>${t('weakestBasics')}</strong><div class="big">${escapeHtml(lowestBy('comfort'))}</div><div class="small">${t('basicsNeeds')}</div></div><div class="compare-card"><strong>${t('weakestInclusion')}</strong><div class="big">${escapeHtml(lowestBy('inclusion'))}</div><div class="small">${t('inclusionNeeds')}</div></div>`; }
function renderPlaceList(){ const list=document.getElementById('placeList'); list.innerHTML=''; places.forEach(place=>{ const mood=moodInfo(place); const thumb=place.photo?`<img class="place-thumb" src="${escapeAttr(place.photo)}" alt="${escapeAttr(place.name)}" />`:`<div class="place-thumb-fallback">${escapeHtml(t('placeWord'))}</div>`; const el=document.createElement('div'); el.className='place-tab'+(place.id===activePlaceId?' active':''); el.innerHTML=`<div class="place-tab-main">${thumb}<div style="min-width:0;"><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(mood.label)} â€¢ ${t('scoreWord')} ${averageScore(place).toFixed(1)}</span></div></div><div class="tab-actions"><button class="mini-btn">${t('open')}</button><button class="mini-btn">${t('delete')}</button></div>`; const [openBtn,delBtn]=el.querySelectorAll('.mini-btn'); openBtn.onclick=e=>{e.stopPropagation(); activePlaceId=place.id; render();}; delBtn.onclick=e=>{e.stopPropagation(); deletePlace(place.id);}; el.onclick=()=>{activePlaceId=place.id; render();}; list.appendChild(el); }); }
function renderForm(){ const place=activePlace(); const form=document.getElementById('placeForm'); form.innerHTML=`<div class="field span-2"><label>${t('placeName')}</label><input id="f_name" type="text" value="${escapeAttr(place.name)}" /></div><div class="field"><label>${t('evaluator')}</label><input id="f_evaluator" type="text" value="${escapeAttr(place.evaluator)}" /></div><div class="field"><label>${t('location')}</label><input id="f_location" type="text" value="${escapeAttr(place.location)}" /></div><div class="field"><label>${t('placeType')}</label><select id="f_type">${PLACE_TYPE_KEYS.map(x=>`<option value="${x}" ${x===place.placeType?'selected':''}>${escapeHtml(localizePlaceType(x))}</option>`).join('')}</select></div><div class="field"><label>${t('familiarity')}</label><select id="f_familiarity">${FAMILIARITY_KEYS.map(x=>`<option value="${x}" ${x===place.familiarity?'selected':''}>${escapeHtml(localizeFamiliarity(x))}</option>`).join('')}</select></div><div class="field span-2"><label>${t('photo')}</label><div class="photo-upload-wrap"><div class="photo-preview" id="photoPreview">${place.photo?`<img src="${escapeAttr(place.photo)}" alt="${escapeAttr(place.name||t('photo'))}" />`:t('noPhoto')}</div><div class="photo-actions"><button type="button" class="btn" id="photoUploadBtn">${t('choosePhoto')}</button><button type="button" class="btn" id="photoCameraBtn">${t('takePhoto')}</button><button type="button" class="btn" id="photoRemoveBtn" ${place.photo?'':'disabled'}>${t('removePhoto')}</button><input id="f_photo" type="file" accept="image/*" style="display:none" /><input id="f_photo_camera" type="file" accept="image/*" capture="environment" style="display:none" /></div><div class="helper">${t('photoHelper')}</div></div></div><div class="field span-2"><label>${t('shortNote')}</label><textarea id="f_note">${escapeHtml(place.note)}</textarea></div><div class="section-title" style="grid-column:1 / -1;">${t('fastTags')}</div><div class="tag-cloud" id="tagCloud" style="grid-column:1 / -1;"></div><div class="section-title" style="grid-column:1 / -1;">${t('criteria')}</div><div class="slider-block" id="sliders" style="grid-column:1 / -1;"></div>`; document.getElementById('f_name').addEventListener('input',e=>{place.name=e.target.value; renderPlaceList(); renderCompareStrip(); renderAtlasPanel(); renderPassports(); saveBoard(false);}); document.getElementById('f_evaluator').addEventListener('input',e=>{place.evaluator=e.target.value; renderPassports(); saveBoard(false);}); document.getElementById('f_location').addEventListener('input',e=>{place.location=e.target.value; renderAtlasPanel(); renderPassports(); saveBoard(false);}); document.getElementById('f_type').addEventListener('change',e=>{place.placeType=e.target.value; renderPlaceList(); renderPassports(); saveBoard(false);}); document.getElementById('f_familiarity').addEventListener('change',e=>{place.familiarity=e.target.value; renderPassports(); saveBoard(false);}); document.getElementById('f_note').addEventListener('input',e=>{place.note=e.target.value; renderPassports(); saveBoard(false);}); const photoInput=document.getElementById('f_photo'), photoCameraInput=document.getElementById('f_photo_camera'); document.getElementById('photoUploadBtn').onclick=()=>photoInput.click(); document.getElementById('photoCameraBtn').onclick=()=>photoCameraInput.click(); photoInput.addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0]; if(file) await setPhotoFromFile(place,file); e.target.value='';}); photoCameraInput.addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0]; if(file) await setPhotoFromFile(place,file); e.target.value='';}); document.getElementById('photoRemoveBtn').onclick=()=>{place.photo=''; render(); saveBoard(false);}; const tagWrap=document.getElementById('tagCloud'); TAG_KEYS.forEach(tag=>{ const chip=document.createElement('button'); chip.type='button'; chip.className='tag-chip'+(place.tags.includes(tag)?' active':''); chip.textContent=tagLabel(tag); chip.onclick=()=>{ if(place.tags.includes(tag)) place.tags=place.tags.filter(t=>t!==tag); else place.tags=[...place.tags,tag]; renderForm(); renderAtlasPanel(); renderPassports(); saveBoard(false); }; tagWrap.appendChild(chip); }); const sliderWrap=document.getElementById('sliders'); Object.keys(CRITERIA_META).forEach(key=>{ const row=document.createElement('div'); row.className='slider-row'; row.innerHTML=`<label title="${escapeAttr(getCriteriaDesc(key))}">${escapeHtml(getCriteriaLabel(key))}</label><input type="range" min="0" max="10" step="1" value="${place.scores[key]}" /><div class="val">${place.scores[key]}</div>`; const input=row.querySelector('input'), val=row.querySelector('.val'); const stabilizeTouch=()=>{ if(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement!==input){ document.activeElement.blur(); } }; input.addEventListener('pointerdown', stabilizeTouch, {passive:true}); input.addEventListener('touchstart', stabilizeTouch, {passive:true}); input.addEventListener('input',()=>{ place.scores[key]=Number(input.value); val.textContent=input.value; renderPlaceList(); renderCompareStrip(); renderAtlasPanel(); renderPassports(); saveBoard(false); }); sliderWrap.appendChild(row); }); }
function renderPassports(){ const grid=document.getElementById('passportGrid'); grid.innerHTML=''; sortedPlaces().forEach(place=>{ const avg=averageScore(place), [bestKey,bestVal]=strongest(place), [worstKey,worstVal]=weakest(place), mood=moodInfo(place); const heroInner=place.photo?`<img class="passport-hero-image" src="${escapeAttr(place.photo)}" alt="${escapeAttr(place.name)}" /><div class="passport-hero-overlay"><div class="passport-head"><div><h3 class="passport-title">${escapeHtml(place.name)}</h3><div class="passport-sub">${escapeHtml(place.location||'â€”')}</div></div><div class="badge-stack"><div class="badge">${escapeHtml(localizePlaceType(place.placeType)||t('placeWord'))}</div><div class="badge">Place Passport</div></div></div></div>`:`<div class="passport-hero-fallback" style="background:linear-gradient(135deg, ${mood.bg}, #ffffff 85%);"><div style="width:100%;"><div class="passport-head" style="margin-top:0;"><div><h3 class="passport-title">${escapeHtml(place.name)}</h3><div class="passport-sub">${escapeHtml(place.location||'â€”')}</div></div><div class="badge-stack"><div class="badge">${escapeHtml(localizePlaceType(place.placeType)||t('placeWord'))}</div><div class="badge">Place Passport</div></div></div></div></div>`; const card=document.createElement('div'); card.className='passport'; card.dataset.passportId=place.id; card.innerHTML=`<div class="passport-hero">${heroInner}</div><div class="mood-row"><div class="mood-pill" style="background:${mood.bg}; border:1px solid ${mood.border}; color:${mood.color};">${escapeHtml(mood.label)}</div><div class="mood-pill" style="background:#f0f2ec; border:1px solid #d4e0e4; color:#355d63;">${escapeHtml(localizeFamiliarity(place.familiarity)||'â€”')}</div></div><div class="passport-meta"><div class="meta-card"><strong>${t('evaluatorGroup')}</strong><div>${escapeHtml(place.evaluator||'â€”')}</div></div><div class="meta-card score-meta-card"><div class="score-big"><div class="n">${avg.toFixed(1)}</div><div class="label">${t('averageScore')}</div></div><div class="mini-radar-wrap">${renderMiniRadarSVG(place)}</div></div></div><div class="summary-card"><strong>${t('summaryTitle')}</strong><p>${escapeHtml(summarySentence(place))}</p><p style="margin-top:8px;"><strong style="display:inline;color:#24454b;font-size:12px;text-transform:none;letter-spacing:0;">${t('bestFor')}:</strong> ${escapeHtml(getBestFor(place))}</p><p style="margin-top:6px;"><strong style="display:inline;color:#24454b;font-size:12px;text-transform:none;letter-spacing:0;">${t('needsAttention')}:</strong> ${escapeHtml(getNeedsAttention(place))}</p></div><div class="passport-note"><strong>${t('youthNote')}</strong><p>${escapeHtml(place.note||t('noNote'))}</p></div><div class="score-wrap" style="grid-template-columns:1fr;"><div class="bars">${Object.keys(CRITERIA_META).map(key=>{const v=place.scores[key]; const color=({safety:'#1a7280',reachability:'#1a7280',comfort:'#1a7280',green:'#28b67d',activity:'#28b67d',inclusion:'#f3bf4a',vibe:'#e89faa'})[key]; return `<div class="bar-row"><div class="name">${escapeHtml(getCriteriaLabel(key))}</div><div class="bar"><span style="width:${v*10}%; background:${color};"></span></div><div class="num">${v}</div></div>`;}).join('')}</div></div><div class="passport-footer"><div class="insight good"><strong>${t('strongest')}</strong>${escapeHtml(t('strongestText',{label:labelForKey(bestKey),score:bestVal}))}</div><div class="insight warn"><strong>${t('needsWork')}</strong>${escapeHtml(t('weakestText',{label:labelForKey(worstKey),score:worstVal}))}</div></div><div class="passport-tags">${(place.tags.length?place.tags:['']).slice(0,6).map(tag=>tag?`<span class="passport-tag">${escapeHtml(tagLabel(tag))}</span>`:`<span class="passport-tag">${t('noTags')}</span>`).join('')}${place.tags.length>6?`<span class="passport-tag">${t('more',{count:place.tags.length-6})}</span>`:''}</div><div class="passport-quote">${t('generatedFrom')}</div><div class="passport-actions"><button class="passport-action-btn" type="button" data-action="image">${t('downloadImage')}</button><button class="passport-action-btn" type="button" data-action="share">${t('shareSummary')}</button><button class="passport-action-btn" type="button" data-action="print">${t('printPassport')}</button></div>`; card.querySelector('[data-action="image"]').addEventListener('click',()=>downloadPassportImage(place.id)); card.querySelector('[data-action="share"]').addEventListener('click',()=>sharePassport(place.id)); card.querySelector('[data-action="print"]').addEventListener('click',()=>printPassport(place.id)); grid.appendChild(card); }); }
function renderAtlasPanel(){ const panel=document.getElementById('atlasPanel'); if(!panel) return; const source=places||[]; if(!source.length){panel.innerHTML=''; return;} const locations=countBy(source,p=>(p.location||'').trim()||(currentLang==='nl'?'Onbekende locatie':'Unknown location')).slice(0,6); const topTags=countBy(source.flatMap(place=>(place.tags||[]).map(tag=>({tag}))),x=>x.tag).slice(0,8); const heatWatch=source.filter(place=>{const tags=place.tags||[]; return tags.includes('heat_island')||tags.includes('grey')||tags.includes('paved_over')||tags.includes('lack_of_green')||tags.includes('too_hot')||(place.scores.green??0)<=4;}).slice(0,6); const socialSpots=source.filter(place=>{const tags=place.tags||[]; return tags.includes('good_to_meet')||tags.includes('good_vibe')||tags.includes('fun')||tags.includes('nice_to_chill')||(place.scores.vibe??0)>=8;}).slice(0,6); const activePlaces=source.filter(place=>(place.scores.activity??0)>=7 || (place.tags||[]).includes('lots_to_do')).slice(0,6); const W=640,H=360,pad=38; const axisX=(place)=>((Number(place.scores.reachability||0)+Number(place.scores.activity||0)+Number(place.scores.vibe||0))/30); const axisY=(place)=>((Number(place.scores.safety||0)+Number(place.scores.comfort||0)+Number(place.scores.inclusion||0))/30); const circles=source.map((place,idx)=>{const mood=moodInfo(place); const x=pad+axisX(place)*(W-pad*2); const y=H-pad-axisY(place)*(H-pad*2); const r=8+((Number(place.scores.green||0)/10)*10); const short=escapeHtml((place.name||`P${idx+1}`).slice(0,16)); return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${mood.bg}" stroke="${mood.color}" stroke-width="2"></circle><text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#214248">${short}</text></g>`;}).join(''); panel.innerHTML=`<div class="atlas-top"><div><h2 class="atlas-title">${t('atlasTitle')}</h2><div class="atlas-sub">${t('atlasSub')}</div></div><div class="mood-pill" style="background:#f0f2ec;border:1px solid #d4e0e4;color:#355d63;">${source.length} ${currentLang==='nl'?(source.length===1?'plek':'plekken'):(source.length===1?'place':'places')}</div></div><div class="atlas-grid"><div class="atlas-board"><strong>${t('atlasLandscape')}</strong><svg class="atlas-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Atlas"><defs><linearGradient id="atlasbg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#fbfcfd"></stop><stop offset="100%" stop-color="#f5fafb"></stop></linearGradient></defs><rect x="0" y="0" width="${W}" height="${H}" fill="url(#atlasbg)"></rect><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#d7e1e5" stroke-width="2"></line><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#d7e1e5" stroke-width="2"></line><line x1="${pad}" y1="${H/2}" x2="${W-pad}" y2="${H/2}" stroke="#ebf1f3" stroke-width="1"></line><line x1="${W/2}" y1="${pad}" x2="${W/2}" y2="${H-pad}" stroke="#ebf1f3" stroke-width="1"></line><text x="${W/2}" y="${H-10}" text-anchor="middle" font-size="12" font-weight="700" fill="#5f787d">${t('axisBottom')}</text><text x="18" y="${H/2}" transform="rotate(-90 18 ${H/2})" text-anchor="middle" font-size="12" font-weight="700" fill="#5f787d">${t('axisLeft')}</text>${circles}</svg><div class="atlas-caption">${t('atlasCaption')}</div></div><div class="atlas-mini-grid"><div class="atlas-side"><strong>${t('legendCriteria')}</strong><div class="atlas-legend"><div class="atlas-legend-item"><b>${t('xAxis')}</b><span>${t('xAxisDesc')}</span></div><div class="atlas-legend-item"><b>${t('yAxis')}</b><span>${t('yAxisDesc')}</span></div><div class="atlas-legend-item"><b>${t('sizeLegend')}</b><span>${t('sizeLegendDesc')}</span></div>${Object.keys(CRITERIA_META).map(key=>`<div class="atlas-legend-item"><b>${escapeHtml(getCriteriaLabel(key))}</b><span>${escapeHtml(getCriteriaDesc(key))}</span></div>`).join('')}</div></div><div class="atlas-side"><strong>${t('recurringThemes')}</strong><div class="atlas-chip-list">${(topTags.length?topTags:[['',1]]).map(([tag,count])=>tag?`<span class="atlas-chip">${escapeHtml(tagLabel(tag))} Â· ${count}</span>`:'').join('') || `<span class="atlas-chip">${t('noTags')}</span>`}</div></div><div class="atlas-side"><strong>${t('keyLocations')}</strong><ul class="atlas-list">${(locations.length?locations:[[currentLang==='nl'?'Onbekende locatie':'Unknown location',source.length]]).map(([loc,count])=>`<li><span>${escapeHtml(loc)}</span><small>${count} ${currentLang==='nl'?(count===1?'plek':'plekken'):(count===1?'place':'places')}</small></li>`).join('')}</ul></div><div class="atlas-side"><strong>${t('heatGrey')}</strong><ul class="atlas-list">${(heatWatch.length?heatWatch:[]).map(place=>`<li><span>${escapeHtml(place.name)}</span><small>${escapeHtml(getNeedsAttention(place))}</small></li>`).join('') || `<li><span>${t('noHeat')}</span><small>â€”</small></li>`}</ul></div><div class="atlas-side"><strong>${t('socialFun')}</strong><ul class="atlas-list">${(socialSpots.length?socialSpots:[]).map(place=>`<li><span>${escapeHtml(place.name)}</span><small>${escapeHtml(getBestFor(place))}</small></li>`).join('') || `<li><span>${t('noSocial')}</span><small>â€”</small></li>`}</ul></div><div class="atlas-side"><strong>${t('activePlaces')}</strong><ul class="atlas-list">${(activePlaces.length?activePlaces:[]).map(place=>`<li><span>${escapeHtml(place.name)}</span><small>${getCriteriaLabel('activity')} ${place.scores.activity}/10</small></li>`).join('') || `<li><span>${t('noActive')}</span><small>â€”</small></li>`}</ul></div></div></div>`; }
function updateSortSelect(){ const select=document.getElementById('sortSelect'); if(!select) return; const opts=localizedSortOptions(); select.innerHTML=Object.entries(opts).map(([v,l])=>`<option value="${v}" ${v===sortMode?'selected':''}>${escapeHtml(l)}</option>`).join(''); }
function render(){ applyStaticTexts(); updateSortSelect(); const hint=document.querySelector('.passport-toolbar .hint'); if(hint) hint.textContent=t('passportHint'); const sortWrapLabel=document.querySelector('.passport-toolbar .sort-wrap span'); if(sortWrapLabel) sortWrapLabel.textContent=t('sortBy'); renderPlaceList(); renderCompareStrip(); renderAtlasPanel(); renderForm(); renderPassports(); }
function wireImport(){ const input=document.getElementById('importFile'); input.multiple=true; input.addEventListener('change', async e=>{ const files=Array.from(e.target.files||[]); if(!files.length) return; try{ let incoming=[]; for(const file of files){ const text=await file.text(); const payload=JSON.parse(text); if(payload?.places?.length) incoming.push(...normalizePlaces(payload.places)); } if(!incoming.length){ alert(t('importInvalidMulti')); input.value=''; return; } if(places.length===1 && isStarterPlace(places[0])) places=[]; const existingIds=new Set(places.map(p=>p.id)); incoming.forEach(p=>{ while(existingIds.has(p.id)) p.id=crypto.randomUUID(); existingIds.add(p.id); places.push(p); }); activePlaceId=activePlaceId||places[0]?.id||''; render(); saveBoard(true); status(files.length>1 ? t('merged',{files:files.length,count:incoming.length}) : t('imported',{count:incoming.length})); }catch(err){ console.error(err); alert(t('importFailed')); } input.value=''; }); document.getElementById('sortSelect').addEventListener('change', e=>{ sortMode=e.target.value; renderPassports(); saveBoard(false); }); }
setupLanguageUI();
wireImport();
loadBoard();
applyStaticTexts();
render();
window.addEventListener('orientationchange', () => setTimeout(renderPassports, 120));


