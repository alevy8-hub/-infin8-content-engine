/*
 * iNFiN8 Content Engine — extractive drafting engine (free, no AI, no network).
 *
 * Every line of every draft is either copied from the source article
 * (whole sentences, list items, headings) or is a neutral format label
 * such as "HOOK" or "[ADD LINK]". Nothing here invents facts, numbers,
 * titles, offers, or links.
 *
 * Works in the browser (window.Infin8Engine) and in Node (module.exports)
 * so it can be tested without a browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Infin8Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STOP = new Set((
    'a about above after again against all also am an and any are as at be because been before being below between both but by ' +
    'can could did do does doing down during each few for from further had has have having he her here hers herself him himself ' +
    'his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ' +
    'ourselves out over own same she should so some such than that the their theirs them themselves then there these they this ' +
    'those through to too under until up very was we were what when where which while who whom why will with would you your yours ' +
    'yourself yourselves one two three also many much may might must even every get gets got make makes made like way ways thing ' +
    'things really still yet ever never well back new first last next us lot lots per via etc using used use uses within without ' +
    'across around another however therefore instead whether rather though although since able need needs want wants know take ' +
    'takes going goes come comes see say says said part parts called simply often usually something anything everything nothing ' +
    'someone anyone everyone people time times year years day days today why what step steps section chapter article post ' +
    'five six seven eight nine ten twenty hundred thousand million billion work works working guide matters matter keep safe move moves start small simple best good great help helps helped lesson'
  ).split(/\s+/));

  // Abbreviations whose trailing period does not end a sentence.
  const ABBREV = ['e.g', 'i.e', 'etc', 'vs', 'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'inc', 'ltd', 'co', 'corp',
    'approx', 'no', 'fig', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'u.s', 'u.k', 'a.m', 'p.m'];

  const WEAK_START = /^(and|but|so|or|also|then|this|that|these|those|it|they|he|she|which|because|however|still|yet|here|there)\b/i;
  const CTA_RX = /\b(subscribe|sign up|signup|join|follow|download|read more|learn more|visit|register|grab|dm me|message me|link in bio|share this|comment below|reply|book a|check out|get started|start here)\b/i;

  // ---------- normalising ----------
  function normalise(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200b\ufeff]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function collapse(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // "1. Intro", "2) Intro", "Step 3:", "# Intro", "**Intro**" -> "Intro"
  function stripHeadingMarks(line) {
    return collapse(line)
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\*\*(.+)\*\*$/, '$1')
      .replace(/^__(.+)__$/, '$1')
      .replace(/^(?:part|step|section|chapter)\s+\d+\s*[:.\-–—]\s*/i, '')
      .replace(/^\(?\d{1,2}[.)]\s+/, '')
      .replace(/^[ivx]{1,4}[.)]\s+/i, '')
      .replace(/[:]\s*$/, '')
      .trim();
  }

  function isListItem(line) {
    return /^\s*(?:[-*•▪◦·–]|\(?\d{1,2}[.)]|[a-z][.)])\s+\S/.test(line);
  }
  function stripListMark(line) {
    return collapse(line).replace(/^(?:[-*•▪◦·–]|\(?\d{1,2}[.)]|[a-z][.)])\s+/, '');
  }

  function wordCount(s) { return (collapse(s).match(/\S+/g) || []).length; }

  function looksLikeHeading(line, nextLine) {
    const t = collapse(line);
    if (!t) return false;
    if (/^#{1,6}\s/.test(t)) return true;
    if (/^\*\*[^*]+\*\*$/.test(t)) return true;
    const words = wordCount(t);
    if (words > 14 || t.length > 110) return false;
    if (/[.,;]$/.test(t)) return false; // ends like a sentence/clause
    // Numbered heading ("1. What Is Bitcoin?") only counts when it stands alone
    // as a short line and isn't one item inside a run of list items.
    if (/^\(?\d{1,2}[.)]\s/.test(t)) {
      return words <= 12 && !(nextLine && isListItem(nextLine));
    }
    if (/^(?:part|step|section|chapter)\s+\d+/i.test(t)) return true;
    if (isListItem(t)) return false;
    return words <= 12;
  }

  // ---------- sentence splitting (decimals, $ amounts, abbreviations, URLs safe) ----------
  function splitSentences(text) {
    let s = collapse(text);
    if (!s) return [];
    const urls = [];
    s = s.replace(/\bhttps?:\/\/\S+|\bwww\.\S+|\b[\w-]+\.(?:com|org|net|io|co|xyz|app|dev)(?:\/\S*)?/gi, m => {
      urls.push(m); return `\u0001${urls.length - 1}\u0001`;
    });
    // protect abbreviations and initials
    ABBREV.forEach(a => {
      const rx = new RegExp('\\b' + a.replace(/\./g, '\\.') + '\\.', 'gi');
      s = s.replace(rx, m => m.replace(/\./g, '\u0002'));
    });
    s = s.replace(/\b([A-Z])\.(?=\s?[A-Z]\.)/g, '$1\u0002');
    // protect decimals / versions (3.5, 0.00000001, v2.1)
    s = s.replace(/(\d)\.(\d)/g, '$1\u0002$2');
    // protect ellipses mid-sentence
    s = s.replace(/\.\.\.(?=\s+[a-z])/g, '\u0003');

    const parts = s.split(/(?<=[.!?…]["'”’)\]]*)\s+(?=["'“‘(\[]?[A-Z0-9$#@€£¥₿])/);
    return parts
      .map(p => p
        .replace(/\u0002/g, '.')
        .replace(/\u0003/g, '...')
        .replace(/\u0001(\d+)\u0001/g, (_, i) => urls[+i])
        .trim())
      .filter(Boolean);
  }

  // ---------- parse ----------
  function parse(raw) {
    const text = normalise(raw);
    const doc = { title: '', sections: [], sentences: [], listItems: [], questions: [], urls: [], ctaLines: [], wordCount: 0 };
    if (!text) return doc;

    doc.urls = Array.from(new Set((text.match(/\bhttps?:\/\/[^\s)\]]+|\bwww\.[^\s)\]]+/gi) || []).map(u => u.replace(/[.,;:!?]+$/, ''))));
    doc.wordCount = wordCount(text);

    let lines = text.split('\n').map(l => l.trim());
    // Title: first non-empty line if it's short and isn't a sentence of a paragraph.
    let firstIdx = lines.findIndex(Boolean);
    const restHasContent = lines.slice(firstIdx + 1).some(Boolean);
    if (firstIdx > -1 && restHasContent && looksLikeHeading(lines[firstIdx], lines[firstIdx + 1])) {
      doc.title = stripHeadingMarks(lines[firstIdx]);
      lines = lines.slice(firstIdx + 1);
    }

    let current = { heading: '', sentences: [] };
    doc.sections.push(current);
    let para = [];
    const seen = new Set();
    const titleKey = keyOf(doc.title);
    let order = 0;

    function addSentence(sec, sText, opts) {
      const s = collapse(sText);
      if (!s) return;
      const k = keyOf(s);
      if (!k || seen.has(k) || k === titleKey) return; // de-duplicate
      seen.add(k);
      const item = { text: s, section: doc.sections.indexOf(sec), heading: sec.heading, order: order++, list: !!(opts && opts.list), firstInPara: !!(opts && opts.first) };
      sec.sentences.push(item);
      doc.sentences.push(item);
      if (item.list) doc.listItems.push(item);
      if (/\?$/.test(s)) doc.questions.push(item);
      if (CTA_RX.test(s) && wordCount(s) <= 40) doc.ctaLines.push(item);
    }
    function flushPara() {
      if (!para.length) return;
      splitSentences(para.join(' ')).forEach((s, i) => addSentence(current, s, { first: i === 0 }));
      para = [];
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevBlank = i === 0 || !lines[i - 1];
      const nextLine = lines.slice(i + 1).find(Boolean) || '';
      if (!line) { flushPara(); continue; }
      if (isListItem(line) && !(prevBlank && looksLikeHeading(line, lines[i + 1]) && !isListItem(lines[i + 1] || ''))) {
        flushPara();
        // a long list item may contain several sentences — keep it as one point
        addSentence(current, stripListMark(line), { list: true });
        continue;
      }
      if (prevBlank && looksLikeHeading(line, lines[i + 1]) && nextLine && (lines[i + 1] === '' || !looksLikeHeading(lines[i + 1] || 'x. x.', ''))) {
        flushPara();
        if (keyOf(stripHeadingMarks(line)) === titleKey) continue; // repeated title
        current = { heading: stripHeadingMarks(line), sentences: [] };
        doc.sections.push(current);
        continue;
      }
      para.push(line);
    }
    flushPara();
    doc.sections = doc.sections.filter(s => s.sentences.length || s.heading);
    // re-index sections after filtering
    doc.sections.forEach((sec, idx) => sec.sentences.forEach(it => { it.section = idx; }));
    scoreSentences(doc);
    return doc;
  }

  function keyOf(s) { return collapse(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  function contentWords(s) {
    return (s.toLowerCase().match(/[a-z][a-z0-9'’-]*[a-z0-9]|[a-z]/g) || [])
      .map(w => w.replace(/['’]s$/, ''))
      .filter(w => w.length > 2 && !STOP.has(w));
  }

  // ---------- scoring (word frequency across the WHOLE article) ----------
  function scoreSentences(doc) {
    const freq = {};
    const display = {};
    const all = [doc.title].concat(doc.sections.map(s => s.heading)).concat(doc.sentences.map(s => s.text)).join(' ');
    (all.match(/[A-Za-z][A-Za-z0-9'’-]*[A-Za-z0-9]/g) || []).forEach(raw => {
      const w = raw.toLowerCase().replace(/['’]s$/, '');
      if (w.length <= 2 || STOP.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
      const d = raw.replace(/['’]s$/, '');
      display[w] = display[w] || {};
      display[w][d] = (display[w][d] || 0) + 1;
    });
    const titleWords = new Set(contentWords(doc.title + ' ' + doc.sections.map(s => s.heading).join(' ')));
    const total = doc.sentences.length || 1;
    doc.sentences.forEach(item => {
      const words = contentWords(item.text);
      const n = wordCount(item.text);
      let score = 0;
      words.forEach(w => { score += Math.log(1 + (freq[w] || 0)) + (titleWords.has(w) ? 0.6 : 0); });
      score = words.length ? score / Math.sqrt(words.length + 2) : 0;
      if (n < 6) score *= 0.45;
      else if (n > 42) score *= 0.6;
      if (WEAK_START.test(item.text)) score *= 0.7;   // needs earlier context
      if (/\?$/.test(item.text)) score *= 0.85;
      if (item.firstInPara) score *= 1.12;
      if (item.order === 0) score *= 1.05;
      if (/:$/.test(item.text)) score *= 0.3;          // lead-in to a list
      if (/\d/.test(item.text)) score *= 1.2;          // concrete facts/figures from the source
      if (CTA_RX.test(item.text)) score *= 0.4;        // CTAs belong in the CTA card
      item.score = score;
      item.rank = 0;
    });
    doc.sentences.slice().sort((a, b) => b.score - a.score).forEach((s, i) => { s.rank = i; });
    doc.freq = freq;
    doc.keywords = Object.keys(freq)
      .filter(w => freq[w] >= 2 && w.length > 3)
      .sort((a, b) => freq[b] - freq[a] || (titleWords.has(b) - titleWords.has(a)))
      .slice(0, 12)
      .map(w => {
        // keep the most common spelling (e.g. "Bitcoin" not "bitcoin")
        const forms = display[w];
        return Object.keys(forms).sort((a, b) => forms[b] - forms[a])[0];
      });
    doc.total = total;
  }

  // Best sentences across the article: covers every section before doubling up.
  function keyPoints(doc, n, opts) {
    opts = opts || {};
    const maxWords = opts.maxWords || 40;
    const exclude = new Set((opts.exclude || []).map(keyOf));
    const pool = doc.sentences.filter(s => !exclude.has(keyOf(s.text)) && wordCount(s.text) >= 5 && wordCount(s.text) <= maxWords && !/:$/.test(s.text) && !CTA_RX.test(s.text));
    const bySection = {};
    pool.forEach(s => { (bySection[s.section] = bySection[s.section] || []).push(s); });
    Object.values(bySection).forEach(list => list.sort((a, b) => b.score - a.score));
    const sectionOrder = Object.keys(bySection).sort((a, b) => bySection[b][0].score - bySection[a][0].score);
    const ranked = [];
    for (let round = 0; round < 8; round++) {
      let added = false;
      for (const sec of sectionOrder) {
        const cand = bySection[sec][round];
        if (cand) { ranked.push(cand); added = true; }
      }
      if (!added) break;
    }
    // offset lets each platform lead with different points (less copy-paste across platforms)
    const off = ranked.length > n ? (opts.offset || 0) % ranked.length : 0;
    const picked = [];
    for (let i = 0; i < ranked.length && picked.length < n; i++) picked.push(ranked[(off + i) % ranked.length]);
    return picked.sort((a, b) => a.order - b.order);
  }

  function hookOf(doc, maxLen) {
    maxLen = maxLen || 200;
    doc.hookParts = [];
    const intro = doc.sections[0] && !doc.sections[0].heading && doc.sections.length > 1 ? doc.sections[0].sentences : [];
    const early = (intro.length >= 2 ? intro : doc.sentences.filter(s => s.order < Math.max(8, doc.sentences.length * 0.3)));
    const q = doc.questions.find(s => s.text.length <= maxLen && wordCount(s.text) >= 4 && s.order < Math.max(10, doc.sentences.length * 0.5));
    if (q) return q.text;
    const best = early.filter(s => s.text.length <= maxLen && wordCount(s.text) >= 6 && !WEAK_START.test(s.text))
      .sort((a, b) => b.score - a.score)[0];
    if (best) {
      const next = doc.sentences.find(s => s.order === best.order + 1);
      if (next && !next.firstInPara && !next.list && /^(but|and|so|yet)\b/i.test(next.text) && (best.text.length + next.text.length + 1) <= maxLen) {
        doc.hookParts = [best.text, next.text];
        return best.text + ' ' + next.text;
      }
      doc.hookParts = [best.text];
      return best.text;
    }
    if (doc.title && doc.title.length <= maxLen) return doc.title;
    const any = doc.sentences.slice().sort((a, b) => b.score - a.score)[0];
    return any ? shorten(any.text, maxLen) : '';
  }

  function closingOf(doc, exclude) {
    const ex = new Set((exclude || []).map(keyOf));
    const lastSec = doc.sections[doc.sections.length - 1];
    const tail = doc.sentences.filter(s => s.order >= doc.sentences.length * 0.7 && !ex.has(keyOf(s.text)) && wordCount(s.text) >= 5 && wordCount(s.text) <= 40 && !CTA_RX.test(s.text));
    const fromLast = tail.filter(s => lastSec && s.section === doc.sections.indexOf(lastSec));
    const list = (fromLast.length ? fromLast : tail).sort((a, b) => b.score - a.score);
    return list[0] ? list[0].text : '';
  }

  // Cut at a natural clause boundary, else at a word boundary with "…".
  function shorten(s, max) {
    s = collapse(s);
    if (s.length <= max) return s;
    const slice = s.slice(0, max);
    const clause = Math.max(slice.lastIndexOf('; '), slice.lastIndexOf(' — '), slice.lastIndexOf(' – '), slice.lastIndexOf(', '), slice.lastIndexOf(': '));
    if (clause > max * 0.45) return slice.slice(0, clause).replace(/[,;:—–\s]+$/, '') + '…';
    const sp = slice.lastIndexOf(' ');
    return slice.slice(0, sp > 0 ? sp : max).replace(/[,;:—–\s]+$/, '') + '…';
  }

  function hashtags(doc, n) {
    const tags = [];
    (doc.keywords || []).forEach(k => {
      const clean = k.replace(/[^A-Za-z0-9]/g, '');
      if (clean.length < 4 || /^\d+$/.test(clean)) return;
      const tag = '#' + clean.charAt(0).toUpperCase() + clean.slice(1);
      if (!tags.some(t => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
    });
    return tags.slice(0, n);
  }

  function topicLabel(doc) {
    if (doc.title) return doc.title;
    return (doc.keywords || [])[0] || '';
  }

  function sourceQuestion(doc, exclude) {
    const ex = new Set((exclude || []).map(keyOf));
    const q = doc.questions.filter(s => !ex.has(keyOf(s.text)) && s.text.length <= 180 && wordCount(s.text) >= 4);
    // prefer a question near the end (often the reflective one)
    return q.length ? q[q.length - 1].text : '';
  }

  function fitTo(lines, max) {
    // Build text from lines, dropping trailing lines until it fits.
    const out = lines.filter(l => l !== null && l !== undefined);
    let text = out.join('\n\n').trim();
    while (text.length > max && out.length > 1) {
      out.pop();
      text = out.join('\n\n').trim();
    }
    if (text.length > max) text = shorten(text, max);
    return text;
  }

  const LIMITS = {
    x: 280, linkedin: 3000, instagram: 2200, facebook: 2000, reels: 2200, substack: 1000, story: 1200, cta: 600
  };

  // ---------- platform drafts ----------
  function generate(kind, raw) {
    const doc = typeof raw === 'string' ? parse(raw) : raw;
    if (!doc.sentences.length && !doc.title) return '';
    const hookText = hookOf(doc, 200);
    // "hook" in exclude lists stands for every source sentence used in the hook
    const H = [hookText].concat(doc.hookParts || []);
    const hook = hookText;
    const pts = keyPoints(doc, 5, { exclude: H, maxWords: 38 });
    const tags = hashtags(doc, 4);
    const title = doc.title;

    switch (kind) {
      case 'x': {
        const lead = hook.length <= 200 ? hook : shorten(hook, 200);
        const lines = [lead];
        keyPoints(doc, 4, { exclude: H, maxWords: 30 }).forEach(p => lines.push(p.text));
        let text = fitTo(lines, 280);
        if (text === lead && title && title !== lead && (lead.length + title.length + 2) <= 280) text = `${title}\n\n${lead}`;
        return text;
      }
      case 'linkedin': {
        const opener = title || hook;
        const context = title ? hook : (pts[0] ? pts[0].text : '');
        const bullets = pts.filter(p => p.text !== context).slice(0, 4).map(p => `→ ${p.text}`);
        const closing = closingOf(doc, H.concat([context]).concat(pts.map(p => p.text)));
        const q = sourceQuestion(doc, H.concat([context]));
        const parts = [opener];
        if (context && context !== opener) parts.push(context);
        if (bullets.length) parts.push(bullets.join('\n\n'));
        if (closing) parts.push(closing);
        parts.push(q || 'What’s your take?');
        if (tags.length) parts.push(tags.slice(0, 3).join(' '));
        return fitTo(parts, LIMITS.linkedin);
      }
      case 'instagram': {
        const first = shorten(hook, 125); // what shows before "…more"
        const body = keyPoints(doc, 3, { exclude: H, maxWords: 38, offset: 3 }).map(p => p.text);
        const closing = closingOf(doc, H.concat(body));
        const parts = [first];
        if (first !== hook) parts.push(hook);
        parts.push(...body);
        if (closing) parts.push(closing);
        parts.push('Save this for later. ♾️');
        if (tags.length) parts.push(tags.join(' '));
        return fitTo(parts, LIMITS.instagram);
      }
      case 'facebook': {
        const lead = title ? `${title}\n\n${hook}` : hook;
        const fbPts = keyPoints(doc, 3, { exclude: H, maxWords: 38, offset: 5 }).map(p => p.text);
        const body = fbPts.join(' ');
        const closing = closingOf(doc, H.concat(fbPts));
        const q = sourceQuestion(doc, H);
        const parts = [lead, body];
        if (closing) parts.push(closing);
        parts.push(q || 'What do you think? Let me know in the comments.');
        return fitTo(parts, LIMITS.facebook);
      }
      case 'reels': {
        const beats = keyPoints(doc, 4, { exclude: H, maxWords: 28, offset: 1 });
        const closing = closingOf(doc, H.concat(beats.map(b => b.text)));
        const lines = ['HOOK (0–3s):', hook, '', 'ON-SCREEN TEXT:', shorten(title || hook, 60), '', 'SCRIPT:'];
        beats.forEach((b, i) => lines.push(`${i + 1}. ${b.text}`));
        if (closing) { lines.push('', 'CLOSE:', closing); }
        const spoken = [hook].concat(beats.map(b => b.text)).concat(closing ? [closing] : []).join(' ');
        const secs = Math.round(wordCount(spoken) / 2.5); // ~150 spoken words per minute
        lines.push('', `≈ ${secs}s spoken at a normal pace (rough estimate)`);
        return lines.join('\n').trim();
      }
      case 'substack': {
        const insights = keyPoints(doc, 2, { exclude: H, maxWords: 38, offset: 6 }).map(p => p.text);
        const closing = closingOf(doc, H.concat(insights));
        const parts = [hook].concat(insights);
        if (closing) parts.push(closing);
        return fitTo(parts, 700);
      }
      case 'story': {
        const slides = [];
        slides.push(shorten(title || hook, 80));
        const sp = keyPoints(doc, 3, { exclude: H.concat([title]), maxWords: 30, offset: 2 });
        sp.forEach(p => slides.push(shorten(p.text, 110)));
        const closing = closingOf(doc, H.concat(sp.map(p => p.text)));
        if (closing) slides.push(shorten(closing, 110));
        const linkSlide = doc.urls[0] ? `Link: ${doc.urls[0]}` : '[Add link sticker to the full piece]';
        slides.push(linkSlide);
        return slides.map((s, i) => `SLIDE ${i + 1}\n${s}`).join('\n\n');
      }
      case 'cta': {
        const lines = [];
        if (doc.ctaLines.length) {
          lines.push('FROM YOUR SOURCE:');
          doc.ctaLines.slice(0, 3).forEach(c => lines.push(`• ${c.text}`));
          lines.push('');
        }
                const link = doc.urls[0] || '[ADD LINK]';
        lines.push('OPTIONS (pick one, edit freely):');
        lines.push(title ? `• Read the full piece: ${shorten(title, 90)} → ${link}` : `• Read the full piece → ${link}`);
        lines.push(`• If this helped, share it with someone who’s curious about ${(doc.keywords && doc.keywords[0]) || 'this'}.`);
        lines.push('• Questions? Drop them in the comments.');
        return lines.join('\n').trim();
      }
      default:
        return collapse(raw);
    }
  }

  function generateAll(raw, kinds) {
    const doc = parse(raw);
    const out = {};
    kinds.forEach(k => { out[k] = generate(k, doc); });
    return { doc, outputs: out };
  }

  return { parse, splitSentences, generate, generateAll, shorten, LIMITS, keyOf };
});
