function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function csvCell(value) {
  const str = String(value ?? '');
  return '"' + str.replaceAll('"', '""') + '"';
}

function xmlEscape(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapTextLines(ctx, text, maxWidth) {
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

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataURL(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function humanFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function resizeImageDataURL(dataUrl, options = {}) {
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

function countBy(arr, fn) {
  const map = new Map();
  (arr || []).forEach(item => {
    const key = fn(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
