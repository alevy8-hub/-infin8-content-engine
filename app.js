
const source = document.getElementById('source');
const sourceCount = document.getElementById('sourceCount');
const distributeBtn = document.getElementById('distributeBtn');
const results = document.getElementById('results');
const assetGrid = document.getElementById('assetGrid');
const template = document.getElementById('assetTemplate');
const timeSaved = document.getElementById('timeSaved');

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

function getSavedState() {
  try {
    return JSON.parse(localStorage.getItem('infin8-content-engine') || '{}');
  } catch {
    return {};
  }
}

const initialSaved = getSavedState();
if (initialSaved.source) source.value = initialSaved.source;

function updateCount() {
  sourceCount.textContent = `${source.value.length.toLocaleString()} characters`;
}
updateCount();

source.addEventListener('input', () => {
  updateCount();
  const current = getSavedState();
  localStorage.setItem('infin8-content-engine', JSON.stringify({
    source: source.value,
    outputs: current.outputs || {}
  }));
});

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function firstSentences(text, count = 2) {
  const parts = cleanText(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return parts.slice(0, count).join(' ').trim();
}

function keywords(text) {
  const stop = new Set(
    'the a an and or but if then to of in on for with is are was were be been being it this that these those i you we they he she them our your my from as at by about into than so just'
      .split(' ')
  );
  const words = cleanText(text).toLowerCase().match(/[a-z0-9$#]+/g) || [];
  const counts = {};
  words.forEach(w => {
    if (!stop.has(w) && w.length > 3) counts[w] = (counts[w] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w);
}

function transform(kind, text) {
  const clean = cleanText(text);
  const opener = firstSentences(clean, 1) || clean.slice(0, 160);
  const two = firstSentences(clean, 2);
  const keys = keywords(clean);
  const tags = keys.length
    ? keys.map(k => `#${k.replace(/[^a-z0-9]/g, '')}`).join(' ')
    : '#content #creator';

  switch (kind) {
    case 'x':
      return `${opener}\n\n${two !== opener ? two : ''}\n\nCreate once. Distribute iNFiN8. ♾️`
        .trim()
        .slice(0, 900);
    case 'linkedin':
      return `${opener}\n\nMost creators do not have a content problem. They have a distribution problem.\n\n${two}\n\nThe opportunity is to turn work that already exists into more reach, more leverage, and more time back.\n\nCreate Once. Distribute iNFiN8. ♾️`;
    case 'instagram':
      return `${opener}\n\n${two}\n\nOne idea should not live once.\n\nCreate it once. Adapt it. Distribute it. Compound it. ♾️\n\n${tags}`;
    case 'facebook':
      return `${opener}\n\n${two}\n\nThis is the part I keep coming back to: we spend so much time creating, then let the value disappear after one post.\n\nWhat if the better move is to keep putting the work we already did back to work?`;
    case 'reels':
      return `HOOK:\nYou probably do not need more content. You need to use the content you already made.\n\nSCRIPT:\n${two}\n\nMost creators are sitting on months or years of unused value. The opportunity is to turn one strong idea into multiple platform-ready assets instead of starting from zero every day.\n\nCLOSE:\nCreate once. Distribute iNFiN8. ♾️`;
    case 'substack':
      return `${opener}\n\n${two}\n\nThe question is not always “What should I create next?”\n\nSometimes it is: “What have I already created that still has value left in it?” ♾️`;
    case 'story':
      return `YOU ALREADY CREATED THE VALUE.\n\nNOW DISTRIBUTE IT.\n\n1 SOURCE → MULTIPLE ASSETS\n\nLess repeated work.\nMore reach.\nMore time back.\n\n♾️`;
    case 'cta':
      return `You already did the hard part: creating something worth sharing.\n\nNow put it back to work.\n\nCreate Once. Distribute iNFiN8. ♾️`;
    default:
      return clean;
  }
}

function saveCurrentOutputs() {
  const outputs = {};
  document.querySelectorAll('.asset').forEach((card, i) => {
    outputs[platforms[i].kind] = card.querySelector('.asset-output').value;
  });

  localStorage.setItem(
    'infin8-content-engine',
    JSON.stringify({
      source: source.value,
      outputs
    })
  );
}

function renderOutputs(text, useSavedOutputs = false) {
  assetGrid.innerHTML = '';
  const savedNow = getSavedState();

  platforms.forEach((platform, index) => {
    const node = template.content.cloneNode(true);
    const output = node.querySelector('.asset-output');

    node.querySelector('.asset-number').textContent = `0${index + 1}`;
    node.querySelector('.asset-title').textContent = platform.name;

    if (useSavedOutputs && savedNow.outputs && savedNow.outputs[platform.kind]) {
      output.value = savedNow.outputs[platform.kind];
    } else {
      output.value = transform(platform.kind, text);
    }

    node.querySelector('.copy-btn').addEventListener('click', async e => {
      await navigator.clipboard.writeText(output.value);
      const btn = e.currentTarget;
      const old = btn.textContent;
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
      URL.revokeObjectURL(a.href);
    });

    output.addEventListener('input', saveCurrentOutputs);
    assetGrid.appendChild(node);
  });

  const approx = Math.max(18, Math.min(88, Math.round(text.length / 100)));
  timeSaved.textContent = `${approx} min`;
  results.classList.remove('hidden');
  saveCurrentOutputs();
}

distributeBtn.addEventListener('click', () => {
  const text = source.value.trim();

  if (!text) {
    source.focus();
    source.placeholder = 'Paste something first — article, post, transcript, idea, or story…';
    return;
  }

  renderOutputs(text, false);

  setTimeout(() => {
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
});

if (initialSaved.source && initialSaved.source.trim()) {
  renderOutputs(initialSaved.source, true);
}
