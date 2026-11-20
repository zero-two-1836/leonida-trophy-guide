// Progress store for the Leonida Trophy Guide tracker.
//
// Earned trophies live in the browser's localStorage as a JSON array of trophy
// ids, under one key. The store is deliberately dumb: it loads, saves, and
// converts the set to and from the portable export format. Rendering and
// filtering live in app.js.

const STORAGE_KEY = 'leonida-trophy-guide/earned-v1';
const EXPORT_FORMAT = 'leonida-trophy-guide-progress';

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch {
    // Storage can be unavailable (private mode, quotas). The tracker keeps
    // working in memory; the header note tells the reader it may not persist.
  }
}

export function clearEarned() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unreachable.
  }
}

// The export file is a small JSON document: a format tag, when it was made,
// and the earned ids. Import accepts this document or a bare array of ids.
export function exportText(earned) {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      exportedAt: new Date().toISOString(),
      earned: [...earned].sort((a, b) => a - b),
    },
    null,
    2,
  );
}

export function parseImport(text) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(list)) {
    throw new Error('That file does not hold a list of earned trophies.');
  }
  return new Set(list.filter((id) => Number.isInteger(id)));
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
