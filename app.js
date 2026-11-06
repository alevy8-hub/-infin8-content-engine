const source = document.getElementById('source');
const sourceCount = document.getElementById('sourceCount');
const distributeBtn = document.getElementById('distributeBtn');
const clearBtn = document.getElementById('clearBtn');
const replaceBtn = document.getElementById('replaceBtn');
const notice = document.getElementById('notice');
const noticeText = document.getElementById('noticeText');
const noticeAction = document.getElementById('noticeAction');
const results = document.getElementById('results');
const assetGrid = document.getElementById('assetGrid');
const template = document.getElementById('assetTemplate');
const timeSaved = document.getElementById('timeSaved');
const sourceUsed = document.getElementById('sourceUsed');
const staleBanner = document.getElementById('staleBanner');

const STORE_KEY = 'infin8-content-engine';
let currentDoc = null; // parsed source the current drafts were made from (for validation)
const MINUTES_PER_DRAFT = 5; // stated assumption, shown in the UI

const platforms = [
  { name: 'X', kind: 'x' },
  { name: 'LinkedIn', kind: 'linkedin' },
  { name: 'Instagram', kind: 'instagram' },
  { name: 'Facebook', kind: 'facebook' },
  { name: 'TikTok / Reels', kind: 'reels' },
  { name: 'Substack Note', kind: 'substack' },
  { name: 'Story', kind: 'story' },
  { name: 'CTA', kind: 'cta' }
];

// ---------- local saving (same storage key as before, so saved work carries over) ----------
function getSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}
function setSavedState(patch) {
  const next = Object.assign({}, getSavedState(), patch);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  return next;
}

function fingerprint(text) {
  // small, stable hash of the source so we know when drafts are out of date
  let h = 2166136261;
  const s = String(text || '').trim();
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + ':' + s.length;
}

// ---------- notices / undo ----------
let noticeTimer = null;
let undoHandler = null;
function showNotice(message, actionLabel, onAction, ms = 7000) {
  noticeText.textContent = message;
  undoHandler = onAction || null;
  if (actionLabel && onAction) {
    noticeAction.textContent = actionLabel;
    noticeAction.classList.remove('hidden');
  } else {
    noticeAction.classList.add('hidden');
  }
  notice.classList.remove('hidden');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(hideNotice, ms);
}
function hideNotice() {
  notice.classList.add('hidden');
  undoHandler = null;
}
noticeAction.addEventListener('click', () => {
  const fn = undoHandler;
  hideNotice();
  if (fn) fn();
});

// ---------- source field ----------
function updateCount() {
  sourceCount.textContent = `${source.value.length.toLocaleString()} characters`;
}

function updateStale() {
  const saved = getSavedState();
  const hasResults = !results.classList.contains('hidden');
  const stale = hasResults && saved.sourceHash && saved.sourceHash !== fingerprint(source.value);
  staleBanner.classList.toggle('hidden', !stale);
  document.querySelectorAll('.asset').forEach(card => card.classList.toggle('is-stale', !!stale));
  document.querySelectorAll('.asset').forEach(card => refreshStatus(card));
}

source.addEventListener('input', () => {
  updateCount();
  setSavedState({ source: source.value });
  updateStale();
});

function snapshot() {
  return JSON.parse(JSON.stringify(getSavedState()));
}
function restore(snap) {
  localStorage.setItem(STORE_KEY, JSON.stringify(snap));
  source.value = snap.source || '';
  updateCount();
  if (snap.outputs && Object.keys(snap.outputs).length && snap.source) {
    renderOutputs(snap.source, true);
  } else {
    results.classList.add('hidden');
  }
  updateStale();
}

clearBtn.addEventListener('click', () => {
  const hasAnything = source.value.trim() || !results.classList.contains('hidden');
  if (!hasAnything) { source.focus(); return; }
  const snap = snapshot();
  source.value = '';
  localStorage.removeItem(STORE_KEY);
  assetGrid.innerHTML = '';
  results.classList.add('hidden');
  updateCount();
  updateStale();
  showNotice('Cleared the source and all 8 drafts.', 'UNDO', () => restore(snap));
  source.focus();
});

replaceBtn.addEventListener('click', async () => {
  const before = source.value;
  const snap = snapshot();
  let pasted = '';
  try {
    if (navigator.clipboard && navigator.clipboard.readText) pasted = await navigator.clipboard.readText();
  } catch { pasted = ''; }

  if (pasted && pasted.trim()) {
    source.value = pasted;
    updateCount();
    setSavedState({ source: source.value });
    updateStale();
    showNotice(`Replaced with ${pasted.length.toLocaleString()} characters from your clipboard. Tap DISTRIBUTE ♾️ when ready.`,
      before.trim() ? 'UNDO' : null, before.trim() ? () => restore(snap) : null);
    source.scrollTop = 0;
  } else {
    // Clipboard not available (permission / browser): empty the field so a single paste replaces it.
    source.value = '';
    updateCount();
    setSavedState({ source: '' });
    updateStale();
    source.focus();
    showNotice('Field emptied — long-press (or ⌘V / Ctrl+V) and Paste your new content.',
      before.trim() ? 'UNDO' : null, before.trim() ? () => restore(snap) : null, 10000);
  }
});

// ---------- cards ----------
function refreshStatus(card) {
  const kind = card.dataset.kind;
  const output = card.querySelector('.asset-output');
  const status = card.querySelector('.status');
  const count = card.querySelector('.asset-count');
  const limit = Infin8Engine.LIMITS[kind];
  const len = output.value.length;
  count.textContent = limit ? `${len.toLocaleString()} / ${limit.toLocaleString()} characters` : `${len.toLocaleString()} characters`;
  const review = card.querySelector('.asset-review');
  const edited = card.dataset.edited === '1';
  // READY only when the draft passes every quality check (coherence, source fidelity,
  // platform fit, limits, no private notes, no placeholders) — not just because it exists.
  const check = Infin8Engine.validate(kind, output.value, currentDoc, { edited });
  let label = 'READY';
  let cls = '';
  let reasons = [];
  if (!output.value.trim()) { label = 'EMPTY'; cls = 'warn'; }
  else if (limit && len > limit) { label = 'TOO LONG'; cls = 'warn'; reasons = check.issues; }
  else if (card.classList.contains('is-stale')) { label = 'OUT OF DATE'; cls = 'warn'; }
  else if (!check.ok) { label = 'NEEDS REVIEW'; cls = 'warn'; reasons = check.issues; }
  else if (edited) { label = 'EDITED'; cls = 'edited'; }
  status.textContent = label;
  status.className = 'status' + (cls ? ' ' + cls : '');
  status.title = reasons.join('\n');
  if (review) {
    review.textContent = reasons.length ? 'Check: ' + reasons.slice(0, 3).join(' · ') + (reasons.length > 3 ? ` (+${reasons.length - 3} more)` : '') : '';
    review.classList.toggle('hidden', !reasons.length);
  }
  count.classList.toggle('over', !!(limit && len > limit));
}

function saveCurrentOutputs() {
  const outputs = {};
  const edited = {};
  document.querySelectorAll('.asset').forEach(card => {
    outputs[card.dataset.kind] = card.querySelector('.asset-output').value;
    if (card.dataset.edited === '1') edited[card.dataset.kind] = true;
  });
  setSavedState({ source: source.value, outputs, edited });
}

function hasEditedDrafts() {
  return Array.from(document.querySelectorAll('.asset')).some(c => c.dataset.edited === '1');
}

function renderOutputs(text, useSavedOutputs = false) {
  assetGrid.innerHTML = '';
  const savedNow = getSavedState();
  const { doc, outputs } = Infin8Engine.generateAll(text, platforms.map(p => p.kind));
  currentDoc = doc;

  platforms.forEach((platform, index) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.asset');
    const output = node.querySelector('.asset-output');
    card.dataset.kind = platform.kind;

    node.querySelector('.asset-number').textContent = `0${index + 1}`;
    node.querySelector('.asset-title').textContent = platform.name;

    if (useSavedOutputs && savedNow.outputs && typeof savedNow.outputs[platform.kind] === 'string') {
      output.value = savedNow.outputs[platform.kind];
      if (savedNow.edited && savedNow.edited[platform.kind]) card.dataset.edited = '1';
    } else {
      output.value = outputs[platform.kind];
    }

    node.querySelector('.copy-btn').addEventListener('click', async e => {
      const btn = e.currentTarget;
      const old = btn.textContent;
      try {
        await navigator.clipboard.writeText(output.value);
      } catch {
        output.focus();
        output.select();
        document.execCommand && document.execCommand('copy');
      }
      btn.textContent = 'COPIED';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = old;
        btn.classList.remove('copied');
      }, 1200);
    });

    node.querySelector('.edit-btn').addEventListener('click', () => {
      output.focus();
      output.setSelectionRange(output.value.length, output.value.length);
    });

    node.querySelector('.export-btn').addEventListener('click', () => {
      const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `infin8-${platform.kind}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    output.addEventListener('input', () => {
      card.dataset.edited = '1';
      refreshStatus(card);
      saveCurrentOutputs();
    });
    assetGrid.appendChild(node);
  });

  timeSaved.textContent = `~${platforms.length * MINUTES_PER_DRAFT} min`;
  const secCount = doc.sections.filter(s => s.sentences.length).length;
  const skipped = [];
  if (doc.privateNotes.length) skipped.push(`${doc.privateNotes.length} private note${doc.privateNotes.length > 1 ? 's' : ''}/instruction${doc.privateNotes.length > 1 ? 's' : ''}`);
  if (doc.rejected.length) skipped.push(`${doc.rejected.length} unclear or unsupported sentence${doc.rejected.length > 1 ? 's' : ''}`);
  sourceUsed.textContent = doc.sentences.length
    ? `Drafts pulled from ${doc.sentences.length} sentences${secCount > 1 ? ` across ${secCount} sections` : ''}${doc.title ? ` · Title: “${doc.title}”` : ''}.${skipped.length ? ` Left out: ${skipped.join(' and ')}.` : ''} Facts and sentences come only from your source — review before posting.`
    : '';
  results.classList.remove('hidden');

  if (!useSavedOutputs) {
    setSavedState({ sourceHash: fingerprint(text) });
  } else if (!savedNow.sourceHash) {
    // older saved state (before this version): assume drafts match what was saved
    setSavedState({ sourceHash: fingerprint(savedNow.source || text) });
  }
  saveCurrentOutputs();
  updateStale();
}

distributeBtn.addEventListener('click', () => {
  const text = source.value.trim();

  if (!text) {
    source.focus();
    source.placeholder = 'Paste something first — article, post, transcript, idea, or story…';
    return;
  }

  if (hasEditedDrafts() && !confirm('You edited some drafts. DISTRIBUTE ♾️ will replace all 8 with fresh drafts. Continue?')) {
    return;
  }

  renderOutputs(text, false);
  hideNotice();

  setTimeout(() => {
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
});

// ---------- boot ----------
const initialSaved = getSavedState();
if (initialSaved.source) source.value = initialSaved.source;
updateCount();
if (initialSaved.source && initialSaved.source.trim()) {
  renderOutputs(initialSaved.source, true);
}
