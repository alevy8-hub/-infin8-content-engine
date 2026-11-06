// Run: node tests/engine.test.js   (no dependencies)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('../engine.js');
const kinds = ['x', 'linkedin', 'instagram', 'facebook', 'reels', 'substack', 'story', 'cta'];
const read = f => fs.readFileSync(path.join(__dirname, 'samples', f), 'utf8');
const BOILER = /content problem|distribution problem|Create once\. Distribute iNFiN8|YOU ALREADY CREATED THE VALUE|unused value/i;

// sentence splitting keeps decimals, money, abbreviations and URLs intact
assert.deepStrictEqual(E.splitSentences('One sat is 0.00000001 BTC. Price hit $69,000.50 once. See e.g. bitcoin.org today.'),
  ['One sat is 0.00000001 BTC.', 'Price hit $69,000.50 once.', 'See e.g. bitcoin.org today.']);

for (const f of ['bitcoin-standin.txt', 'numbered.txt', 'dupes.txt', 'short.txt']) {
  const src = read(f);
  const { doc, outputs } = E.generateAll(src, kinds);
  const srcFlat = src.replace(/\s+/g, ' ');
  for (const k of kinds) {
    const out = outputs[k];
    assert.ok(out.trim(), `${f}/${k} empty`);
    assert.ok(!BOILER.test(out), `${f}/${k} has hardcoded marketing`);
    assert.ok(!/^\s*1\.\s*$/m.test(out) && !/ 1\.$/m.test(out.split('\n')[0]), `${f}/${k} stray "1."`);
    if (E.LIMITS[k]) assert.ok(out.length <= E.LIMITS[k], `${f}/${k} over limit (${out.length})`);
    // no sentence repeated inside one draft
    const sents = E.splitSentences(out.replace(/^(→|•|\d+\.)\s*/gm, '')).map(E.keyOf).filter(s => s.split(' ').length > 3);
    assert.strictEqual(new Set(sents).size, sents.length, `${f}/${k} repeats a sentence`);
    // every number in a draft must exist in the source (no invented figures)
    (out.replace('HOOK (0–3s):', '').match(/\d[\d,.]*\d|\d/g) || []).forEach(n => {
      if (k === 'reels' && /spoken/.test(out) && out.includes(`≈ ${n}s`)) return; // labelled runtime estimate
      if (k === 'story' && out.includes(`SLIDE ${n}`)) return;
      if (k === 'reels' && new RegExp(`^${n}\\. `, 'm').test(out)) return; // beat numbering
      assert.ok(srcFlat.includes(n), `${f}/${k} has number not in source: ${n}`);
    });
  }
  assert.ok(outputs.x.length <= 280);
}

// numbered title is parsed without the "1."
assert.strictEqual(E.parse(read('numbered.txt')).title, 'Five Habits of Calm Creators');
// empty source → empty drafts, no crash
kinds.forEach(k => assert.strictEqual(E.generate(k, ''), ''));
console.log('engine tests passed');
