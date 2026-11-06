/*
 * iNFiN8 Content Engine — extractive drafting engine (free, no AI, no network).
 *
 * Quality-control rules (v0.3):
 *  - Publishable source text is separated from private notes, editorial
 *    instructions and anything that reads like a command to the app.
 *    Those are treated as untrusted data and never appear in a draft.
 *  - Every sentence is checked before use: incomplete, cut-off, mangled
 *    (bad line joins), self-contradicting, or unhedged predictions are
 *    left out instead of published.
 *  - Sentences that lean on the one before ("This is why…", "But…") are
 *    only ever used together with that sentence, in source order.
 *  - Each platform builds its draft from different, complete "idea units";
 *    no sentence repeats inside one draft.
 *  - validate() decides READY vs NEEDS REVIEW. Nothing is invented to pass.
 *
 * Every content line in a draft is copied from the source (whole sentences,
 * list items, headings). The only other text is a small set of neutral
 * labels/prompts listed in TEMPLATE_RX. No facts, numbers, offers or links
 * are invented.
 *
 * Works in the browser (window.Infin8Engine) and in Node (module.exports).
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
    'single whole small large big major global real true sure enough least less own tiny huge high low long short full free wrong right ' +
    'happen happens happened run runs running written write writes keep keeps control controls follow follows add added call calls '+
    'better worse quick quickly easy hard possible different important single dollar dollars amount ' +
    'five six seven eight nine ten twenty hundred thousand million billion work works working guide matters matter keep safe move moves start small simple best good great help helps helped lesson'
  ).split(/\s+/));

  // Abbreviations whose trailing period does not end a sentence.
  const ABBREV = ['e.g', 'i.e', 'etc', 'vs', 'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'inc', 'ltd', 'co', 'corp',
    'approx', 'no', 'fig', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'u.s', 'u.k', 'a.m', 'p.m'];


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

  const WEAK_START = /^(and|but|so|or|also|then|this|that|these|those|it|its|it['’]s|they|their|them|he|she|his|her|which|because|however|still|yet|here|there|such|plus|otherwise|instead|meanwhile|again|even so|if so|if that|in that case|that['’]s|this['’]s|not|in exchange|in return|as a result|for example|for instance|in fact|on top of that|after that|because of this|that way|by contrast|in contrast|likewise|similarly|now)\b/i;
  const CONTEXT_REF = /\b(?:the (?:opposite|former|latter|above|below|reverse|same thing)|as (?:mentioned|noted|i said|we said|discussed)|mentioned (?:above|earlier)|see (?:above|below)|(?:this|these|those) (?!week|weekend|year|month|day|days|morning|evening|time|season|summer|winter|spring|fall|quarter|decade|century)(?:\w+)|that (?:question|idea|point|reason|window|limit|number|rule|one|problem|fact|example|scarcity|habit|step|moment|process|list|key|phrase|word|answer|approach|way|experiment|story|part|concept|lesson|distinction|difference|database|outcome|thing|idea))\b/i;
  const CTA_RX = /\b(subscribe|sign up|signup|join (?:me|us|our|the (?:list|newsletter|community))|follow (?:me|us|along|for)|download (?:the|my|our|it)|read more|learn more|visit (?:my|our|the (?:site|link|page))|register|grab (?:your|the|a copy)|dm me|message me|link in bio|share (?:this|it)|comment below|book a|check out|get started|start here)\b/i;
  const CTA_NEGATED = /\b(?:never|don['’]?t|do not|not|no one should)\b[^.!?]{0,20}\b(?:share|post|join|follow|download|visit|send|subscribe)\b/i;
  const POINTER_LEAD = /^(?:here['’]s (?:the answer|why|how|what|the thing)|it['’]s this|this is it|the (?:basic |real |big |main )?(?:idea|question|answer|point|lesson|thing) (?:is|was)|so ask|it means|which means|in other words|it['’]s basically asking)\s*:$/i;
  const INVITE_RX = /^(?:learn|understand|start|ask|think about|remember|read|try|explore|study|compare|talk to|write down)\b/i;
  const TEASER_RX = /\b(?:one|a|the) (?:massive|big|huge|key|major|important|crucial|simple) (?:difference|catch|twist|problem|secret|reason)\s*[.!]?$|\bthe following\b|^here['’]s (?:how|why|what)\b[^:]*$|\bhere['’]s the (?:clever|important|key|best) part\b/i;
  const CONCL_RX = /\b(bottom line|conclusion|takeaway|summary|final thoughts?|wrap(?:ping)?[- ]up|in short|tl;?dr|remember this|the point|\d+-second version|short version|in a nutshell)\b/i;

  // ---------- private notes / embedded instructions (untrusted, never published) ----------
  const PRIVATE_LEAD = /^\s*[\[(<{]?\s*(?:from (?:your|the) source|private|internal(?: only)?|confidential|note to (?:self|me|editor)|notes? for (?:me|editor|the editor)|editor(?:['’]s)? note|editorial(?: note)?|draft note|production note|admin note|reminder to self|todo|to-?do|tk|fixme|do not (?:publish|post|share)|don['’]?t (?:publish|post|share)|not for (?:publication|publishing|posting|sharing))\b\s*(?:[:\-–—\]).!]|$)/i;
  const INSTRUCTION_RXS = [
    /\b(?:ignore|disregard|forget|override)\s+(?:all\s+|any\s+|the\s+|my\s+|your\s+)?(?:previous|prior|above|earlier|preceding|other|existing)?\s*(?:instructions?|rules|prompts?|directions|guidelines)\b/i,
    /\b(?:system prompt|developer message|you are (?:an? )?(?:ai|assistant|language model|chatbot|bot|content engine)|as an ai\b)/i,
    /^\s*(?:never|do not|don['’]?t)\s+(?:share|post|publish|include|repeat|show|copy|use|send|reveal)\s+(?:this|that|it|these|those)(?:\s+(?:part|line|section|note|bit|paragraph|anywhere|with anyone|publicly|online))?\s*[.!]*\s*$/i,
    /\b(?:remove|delete|cut)\s+(?:this|that)\s+(?:line|part|section|note|paragraph)\b/i,
    /\b(?:add|insert|check|verify|fix|double-check|update|confirm)\b[^.!?]*\bbefore (?:this goes (?:out|live)|posting|publishing|we post|i post)\b/i,
    /\b(?:keep (?:this|it) (?:private|internal|confidential|secret|between us)|this is (?:private|internal|confidential)|off the record|for internal use)\b/i,
    /\bnot for (?:publication|publishing|posting|sharing)\b/i,
    /\b(?:post|publish|share) (?:this |it )?(?:on|to|across) (?:every|all) (?:platforms?|channels?|networks?)\b/i,
    /\b(?:the )?(?:app|engine|generator|assistant|model)\s+(?:should|must|needs to|has to)\b/i,
  ];
  const BARE_DIRECTIVE = /^\s*(?:never|do not|don['’]?t)\s+(?:share|post|send|reveal|show)\s+(?:this|that|it)(?:\s+with anyone)?\s*[.!]*\s*$/i;
  const SAFETY_NOUN = /\b(seed phrase|recovery phrase|private key|password|passcode|PIN)\b/i;
  const INLINE_NOTE_RX = /\s*[\[(](?:note|notes|private|internal|editor(?:['’]s)? note|editorial|todo|tk|fixme|verify|check|insert|placeholder|add (?:link|image|photo|diagram|chart|source))\b[^\])]*[\])]/gi;
  const SHOUT_LEAD = /^(?:NEVER|DO NOT|DON['’]T|ALWAYS|MUST|IMPORTANT|NOTE|WARNING|REMEMBER|REMINDER|ONLY|STOP|PLEASE)\b/;
  const SAFETY_OBJECT = /\b(?:key|keys|phrase|password|passcode|seed|scam|scams|address|wallet|code|pin|account|parent|guardian|afford|lose|risk)\b/i;

  function upperRatio(s) {
    const letters = s.replace(/[^A-Za-z]/g, '');
    if (!letters.length) return 0;
    return letters.replace(/[^A-Z]/g, '').length / letters.length;
  }

  // true -> private/editorial/instruction text that must never be published
  function isPrivateText(s) {
    const t = collapse(s);
    if (!t) return false;
    if (PRIVATE_LEAD.test(t)) return true;
    if (/^\s*(?:<!--|\/\/)/.test(t)) return true;
    if (INSTRUCTION_RXS.some(rx => rx.test(t))) return true;
    // ALL-CAPS instruction block ("IMPORTANT: DO NOT FORGET THE LINKS") with no audience-safety content
    if (wordCount(t) >= 2 && upperRatio(t) > 0.7 && SHOUT_LEAD.test(t) && !SAFETY_OBJECT.test(t)) return true;
    return false;
  }

  // ---------- sentence quality ----------
  const MOVE_WORDS = /\b(up|down|rise|rises|rising|rose|fall|falls|falling|fell|drop|drops|dropped|climb|climbs|crash|crashes|move|moves|moved|moving|go|goes|going|went|swing|swings|higher|lower|increase|increases|decrease|decreases|grow|grows|shrink|shrinks|turn|turns|head|heads|run|runs|push|pushes|pull|pulls|spin|spins|walk|drive|travel|point|points|flow|flows|lean|leans)\b/i;
  const PREDICTION_RX = /\b(?:will (?:definitely|certainly|surely|absolutely|100%|for sure)|(?:is|are) guaranteed to|can['’]?t (?:lose|fail|go down)|will (?:hit|reach|be worth|go to|soar|explode|double|triple|moon|skyrocket|replace|overtake))\b/i;
  const HEDGE_RX = /\b(?:if|could|might|may|maybe|perhaps|possibly|some (?:people |experts |investors )?(?:think|believe|say|predict|hope|argue)|no one knows|nobody knows|predict|guess|in theory|it['’]?s possible)\b/i;
  const SPEC_RX = /\b(?:if|could|might|may|would|maybe|perhaps|possibly|someday|one day|in the future|predict|predicts|expect|expects|believe|believes|no one knows|nobody knows)\b/i;
  const OPINION_RX = /\b(?:i think|i believe|i feel|in my (?:view|opinion)|my take|we think|we believe|honestly|personally)\b/i;
  const DANGLING_END = /\b(and|or|but|the|a|an|to|of|in|with|for|because|if|that|which|than|as|so|like|from|on|at|by|into|is|are|was|were)\s*[.!?]?$/i;

  // Returns a list of reasons this sentence must not be published on its own.
  function sentenceIssues(s) {
    const t = collapse(s);
    const issues = [];
    if (!t) return ['empty'];
    if (isPrivateText(t)) issues.push('private note or instruction');
    if (/(?:…|\.\.\.)$/.test(t)) issues.push('cut off');
    else if (/:$/.test(t)) issues.push('lead-in to a list, not a complete thought');
    else if (!/[.!?]["'”’)\]]*$/.test(t)) issues.push('incomplete (no ending)');
    if (/\b(and|or|but|the|a|an|of|with|because|if|which|than)\s*[.!?]?["'”’)]*$/i.test(t)) issues.push('incomplete (dangling end)');
    const open = (t.match(/\(/g) || []).length, close = (t.match(/\)/g) || []).length;
    const oq = (t.match(/“/g) || []).length, cq = (t.match(/”/g) || []).length;
    const dq = (t.match(/"/g) || []).length;
    if (open !== close || oq !== cq || dq % 2) issues.push('unbalanced brackets or quotes');
    if (/^(?:and|or|but|in|on|of|to|with|for|from|the|a|an)\s/.test(t)) issues.push('starts mid-sentence');
    if (/[→←⇒≠]/.test(t)) issues.push('diagram/notation, not a sentence');
    // bad joins / contradictions
    if (/\b(?:in|to|from)\s+the\s+(?:opposite|other|reverse)\s+(?:direction|way)\b/i.test(t)) {
      const before = t.split(/\b(?:in|to|from)\s+the\s+(?:opposite|other|reverse)\s+(?:direction|way)\b/i)[0];
      if (!MOVE_WORDS.test(before) || /\b(?:matter|matters|mean|means|count|counts|exist|exists|be|is|are)\s*$/i.test(before.trim())) issues.push('confusing or mangled (bad join)');
    }
    if (/\b(\w{3,})\s+\1\b/i.test(t) && !/\b(that that|had had|very very)\b/i.test(t)) issues.push('repeated word (bad join)');
    const neg = t.match(/\b(?:won['’]t|will not|doesn['’]t|does not|can['’]t|cannot|isn['’]t|is not)\s+(\w+)/i);
    if (neg) {
      const pos = new RegExp('\\b(?:will|does|can|is)\\s+' + neg[1] + '\\b', 'i');
      if (pos.test(t.replace(neg[0], ''))) issues.push('contradicts itself');
    }
    if (PREDICTION_RX.test(t) && !HEDGE_RX.test(t)) issues.push('unhedged prediction stated as fact');
    return issues;
  }

  function needsContext(t, samePara) {
    let s = collapse(t);
    const lead = s.match(/^([^:]{1,40}):\s+(.+)$/);           // "It's this: Your generation…" points forward, not back
    if (lead && wordCount(lead[1]) <= 6 && /^(?:it['’]s|this is|that['’]s|here['’]s|the (?:basic |real |big )?(?:idea|question|answer|point|lesson) (?:is|was))/i.test(lead[1])) s = lead[2];
    if (WEAK_START.test(s)) return true;
    if (CONTEXT_REF.test(s) && !/^(?:in|at|by|on|for) (?:this|these) /i.test(s)) return true;
    if (/\b(?:it|that|this|them|those|these)\s*[.!?]["'”’)]*$/i.test(s) && wordCount(s) < 12) return true; // "Copy it." / "Don't teach her that."
    if (samePara && wordCount(s) < 5) return true; // short punchline ("Guard that window.")
    return false;
  }

  function claimType(t) {
    if (/\?["'”’)]*$/.test(collapse(t))) return 'question';
    if (OPINION_RX.test(t)) return 'opinion';
    if (SPEC_RX.test(t)) return 'speculation';
    return 'fact';
  }

  // "NEVER SHARE YOUR SEED PHRASE." -> "Never share your seed phrase." (keeps known proper nouns/acronyms)
  function calmCase(s, casing) {
    const words = s.split(/(\s+)/);
    const shouty = upperRatio(s) > 0.6 && wordCount(s) >= 3;
    let first = true;
    return words.map(w => {
      if (/^\s+$/.test(w) || !/[A-Za-z]/.test(w)) return w;
      const bare = w.replace(/[^A-Za-z'’]/g, '');
      const isCaps = bare.length >= 2 && bare === bare.toUpperCase();
      let out = w;
      if (isCaps && (shouty || SHOUT_LEAD.test(bare) || /^(?:NOT|NEVER|ALWAYS|DON['’]T)$/.test(bare))) {
        const low = bare.toLowerCase();
        const known = casing[low];
        const repl = known || (bare.length <= 4 && !SHOUT_LEAD.test(bare) && !/^(?:NOT|YOUR|YOU|THE|AND|FOR|WITH|ANY|ALL|THIS|THAT|IT|IS|ARE|OR|TO|OF|IN|ON|A|AN|BE|DO|NO|SO|IF|AT|BY|AS|UP|MY|WE|US|ME|HE|SHE|HIS|HER)$/.test(bare) ? bare : low);
        out = w.replace(bare, repl);
      }
      if (first) { out = out.replace(/[A-Za-z]/, c => c.toUpperCase()); first = false; }
      return out;
    }).join('');
  }

  // ---------- parse ----------
  function keyOf(s) { return collapse(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

  function parse(raw) {
    const text = normalise(raw);
    const doc = { title: '', headings: [], sections: [], sentences: [], units: [], listItems: [], questions: [], urls: [], ctaLines: [], privateNotes: [], rewrites: [], rejected: [], wordCount: 0, sourceKey: '' };
    if (!text) return doc;

    // 0) keep the author's own pairings together:
    //    a short lead-in ending in ":" + the single line it introduces ("It's this:" + "Bitcoin uses energy…"),
    //    and a numbered rule + the line directly under it ("4. Your seed phrase…" + "Never share it. Ever.")
    // separator / emoji-only lines ("⸻", "---", "😂") are just breaks
    const raw0 = text.split('\n').map(l => l.trim()).map(l => (/^[^\p{L}\p{N}]*$/u.test(l) ? '' : l));
    const merged = [];
    const joinedLines = new Set();
    const setupLines = new Set(); // lines that set up an answer given after "It's this:" — never end a draft on them
    for (let i = 0; i < raw0.length; i++) {
      let l = raw0[i];
      if (!l) { merged.push(''); continue; }
      // pure pointer lead-ins ("Here's the answer:", "It's this:") add nothing once the next line stands alone
      if (POINTER_LEAD.test(l)) {
        for (let k = merged.length - 1; k >= 0; k--) if (merged[k]) { setupLines.add(keyOf(merged[k])); break; }
        merged.push(''); continue;
      }
      if (/:$/.test(l) && wordCount(l) <= 15 && !isListItem(l)) {
        let j = i + 1; while (j < raw0.length && !raw0[j]) j++;
        const nxt = raw0[j], after = raw0[j + 1];
        if (nxt && !isListItem(nxt) && !/:$/.test(nxt) && !after) { merged.push(l + ' ' + nxt); joinedLines.add(l + ' ' + nxt); i = j; continue; }
      }
      if (/^\(?\d{1,2}[.)]\s/.test(l)) {
        while (i + 1 < raw0.length && raw0[i + 1] && !isListItem(raw0[i + 1])) { l = l + ' ' + raw0[i + 1]; i++; }
      }
      merged.push(l);
    }

    // 1) separate private notes / instructions from publishable lines
    let lines = [];
    merged.forEach(l0 => {
      let l = l0.trim();
      if (!l) { lines.push(''); return; }
      const inline = l.match(INLINE_NOTE_RX);
      if (inline) { inline.forEach(n => doc.privateNotes.push(collapse(n))); l = collapse(l.replace(INLINE_NOTE_RX, '')); }
      if (!l) return;
      const bare = isListItem(l) ? stripListMark(l) : l;
      // A bare "NEVER share this." right after a line about a seed phrase / key / password is a real
      // safety warning for the reader: rewrite it so it names what not to share. Otherwise it's private.
      const prevIdx = (() => { for (let k = lines.length - 1; k >= 0; k--) if (lines[k]) return k; return -1; })();
      const prevLine = prevIdx >= 0 ? lines[prevIdx] : '';
      const safety = BARE_DIRECTIVE.test(bare) && !PRIVATE_LEAD.test(bare) && prevLine && prevLine.match(SAFETY_NOUN);
      if (safety) {
        const verb = (bare.match(/\b(share|post|send|reveal|show)\b/i) || ['share'])[0].toLowerCase();
        const rewritten = `Never ${verb} your ${safety[1].toLowerCase()} with anyone.`;
        doc.rewrites.push({ from: bare, to: rewritten });
        lines.push(rewritten);
        return;
      }
      if (isPrivateText(bare)) { doc.privateNotes.push(bare); return; }
      lines.push(l);
    });
    const publicText = lines.join('\n');
    doc.urls = Array.from(new Set((publicText.match(/\bhttps?:\/\/[^\s)\]]+|\bwww\.[^\s)\]]+/gi) || []).map(u => u.replace(/[.,;:!?]+$/, ''))));
    doc.wordCount = wordCount(publicText);
    doc.sourceKey = ' ' + keyOf(publicText) + ' ';

    // 2) title
    let firstIdx = lines.findIndex(Boolean);
    const restHasContent = lines.slice(firstIdx + 1).some(Boolean);
    if (firstIdx > -1 && restHasContent && looksLikeHeading(lines[firstIdx], lines[firstIdx + 1])) {
      doc.title = stripHeadingMarks(lines[firstIdx]);
      lines = lines.slice(firstIdx + 1);
    }

    // Articles with numbered sections ("1. …", "2. …") only treat those, markdown/bold and ALL-CAPS
    // lines as headings — short lines like "Private key" or "Photo?" are part of the text.
    const NUM_HEAD = /^\(?\d{1,2}[.)]\s+\S/;
    const numberedMode = lines.filter((l, i) => NUM_HEAD.test(l) && !/[.:]$/.test(l) && (i === 0 || !lines[i - 1])).length >= 3;
    const headingOk = l => {
      if (/:$/.test(l) || joinedLines.has(l)) return false;
      if (!numberedMode) return true;
      return NUM_HEAD.test(l) || /^#{1,6}\s|^\*\*|^__/.test(l) || (upperRatio(l) > 0.7 && wordCount(l) >= 2);
    };

    let current = { heading: '', sentences: [] };
    doc.sections.push(current);
    let para = [];
    let paraId = 0;
    const seen = new Set();
    const titleKey = keyOf(doc.title);
    let order = 0;

    function addSentence(sec, sText, opts) {
      const s = collapse(sText);
      if (!s) return;
      const last = doc.sentences[doc.sentences.length - 1];
      const safetyFollow = BARE_DIRECTIVE.test(s) && last && last.para === opts.para && SAFETY_NOUN.test(last.text);
      if (!safetyFollow && isPrivateText(s)) { doc.privateNotes.push(s); return; }
      const k = keyOf(s);
      if (!k || seen.has(k) || k === titleKey) return; // de-duplicate
      seen.add(k);
      const item = { text: s, section: doc.sections.indexOf(sec), heading: sec.heading, order: order++, para: opts.para, list: !!opts.list, firstInPara: !!opts.first };
      sec.sentences.push(item);
      doc.sentences.push(item);
    }
    function flushPara() {
      if (!para.length) return;
      // A line break before a capitalised line is a sentence break (social posts often skip the period).
      // A line break before a lowercase word is a hard wrap and joins the lines.
      const joined = para.map((l, i) => {
        const next = para[i + 1];
        const unterminated = !/[.!?…:;,"”'’)\]—–-]$/.test(l);
        if (unterminated && wordCount(l) >= 4 && !DANGLING_END.test(l) && (!next || /^["“‘(]?[A-Z0-9$]/.test(next))) return l + '.';
        return l;
      }).join(' ');
      paraId++;
      splitSentences(joined).forEach((s, i) => addSentence(current, s, { first: i === 0, para: paraId }));
      para = [];
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevBlank = i === 0 || !lines[i - 1];
      const nextLine = lines.slice(i + 1).find(Boolean) || '';
      if (!line) { flushPara(); continue; }
      if (isListItem(line) && !(prevBlank && looksLikeHeading(line, lines[i + 1]) && !isListItem(lines[i + 1] || ''))) {
        flushPara();
        paraId++;
        let item = stripListMark(line);
        if (!/[.!?]["'”’)]*$/.test(item) && wordCount(item) >= 3 && !DANGLING_END.test(item)) item += '.';
        addSentence(current, item, { list: true, para: paraId });
        continue;
      }
      if (prevBlank && headingOk(line) && looksLikeHeading(line, lines[i + 1]) && nextLine && (lines[i + 1] === '' || !looksLikeHeading(lines[i + 1] || 'x. x.', ''))) {
        flushPara();
        if (keyOf(stripHeadingMarks(line)) === titleKey) continue; // repeated title
        current = { heading: stripHeadingMarks(line), sentences: [] };
        doc.sections.push(current);
        doc.headings.push(current.heading);
        continue;
      }
      para.push(line);
    }
    flushPara();
    doc.sections = doc.sections.filter(s => s.sentences.length || s.heading);
    doc.sections.forEach((sec, idx) => sec.sentences.forEach(it => { it.section = idx; }));

    // 3) calm SHOUTED safety lines, classify, quality-check
    const casing = {};
    doc.sentences.forEach(s => {
      if (upperRatio(s.text) > 0.6) return;
      (s.text.match(/[A-Za-z][A-Za-z'’]*/g) || []).forEach((w, i) => {
        if (i === 0) return;
        const low = w.toLowerCase();
        if (w !== low) casing[low] = casing[low] || w;
      });
    });
    doc.casing = casing;
    const paraSize = {};
    doc.sentences.forEach(x => { paraSize[x.para] = (paraSize[x.para] || 0) + 1; });
    doc.sentences.forEach((s, idx) => {
      if (upperRatio(s.text) > 0.6 || /\b[A-Z]{3,}\b/.test(s.text.split(' ')[0] || '')) s.text = calmCase(s.text, casing);
      const prev = doc.sentences[idx - 1];
      // one-line-paragraph writing ("Most beginners don't…" ⏎⏎ "They use exchanges.") still reads as one thought
      const samePara = !!(prev && !s.list && (prev.para === s.para ||
        (!prev.list && prev.section === s.section && s.firstInPara && paraSize[prev.para] === 1 && paraSize[s.para] === 1)));
      s.issues = sentenceIssues(s.text);
      if (BARE_DIRECTIVE.test(s.text) && prev && prev.para === s.para && SAFETY_NOUN.test(prev.text)) s.issues = s.issues.filter(x => x !== 'private note or instruction');
      s.bad = s.issues.length > 0;
      const crossPara = samePara && prev.para !== s.para;
      // contrast pairs: "You don't need thousands of dollars." ⏎ "You can start learning with $5."
      const contrast = samePara && /\b(?:don['’]t|doesn['’]t|isn['’]t|can['’]t|not|never|no)\b/i.test(prev.text) && /^(?:you|it|we|they) (?:can|could)\b|^instead\b/i.test(s.text) && wordCount(s.text) <= 12;
      s.needsContext = contrast || needsContext(s.text, samePara && !crossPara) || (samePara && doc.rewrites.some(r => r.to === s.text));
      s.samePara = samePara;
      s.claim = claimType(s.text);
      s.question = /\?["'”’)]*$/.test(s.text);
      s.cta = CTA_RX.test(s.text) && !CTA_NEGATED.test(s.text) && wordCount(s.text) <= 40;
    });
    // If one half of a parallel pair was rejected ("If X…, today's price won't matter." / "If Y…, …"),
    // the other half alone would distort the author's point, so it is left out too.
    doc.sentences.forEach((s, idx) => {
      if (!s.bad || s.list || s.issues.some(i => /incomplete|cut off|lead-in/.test(i))) return;
      [doc.sentences[idx - 1], doc.sentences[idx + 1]].forEach(n => {
        if (!n || n.bad || n.list || n.section !== s.section) return;
        const a = new Set(contentWords(s.text)), b = contentWords(n.text);
        const shared = b.filter(w => a.has(w)).length;
        const sameStart = s.text.split(/\s+/)[0].toLowerCase() === n.text.split(/\s+/)[0].toLowerCase();
        if ((sameStart && shared >= 3) || shared / Math.max(1, new Set([...a, ...b]).size) >= 0.5) {
          n.bad = true; n.parallel = true; n.issues = ['other half of a rejected parallel pair'];
        }
      });
    });
    doc.sentences.forEach(s => {
      if (s.bad) doc.rejected.push({ text: s.text, issues: s.issues });
      if (!s.bad && s.list) doc.listItems.push(s);
      if (!s.bad && s.question) doc.questions.push(s);
      if (!s.bad && s.cta) doc.ctaLines.push(s);
    });

    doc.setupKeys = setupLines;
    scoreSentences(doc);
    buildUnits(doc);
    return doc;
  }

  function contentWords(s) {
    return (s.toLowerCase().match(/[a-z][a-z0-9'’-]*[a-z0-9]|[a-z]/g) || [])
      .map(w => w.replace(/['’]s$/, ''))
      .filter(w => w.length > 2 && !STOP.has(w));
  }

  // ---------- scoring (word frequency across the WHOLE article) ----------
  function scoreSentences(doc) {
    const freq = {};
    const display = {};
    const good = doc.sentences.filter(s => !s.bad);
    const all = [doc.title].concat(doc.headings).concat(good.map(s => s.text)).join(' ');
    (all.match(/[A-Za-z][A-Za-z0-9'’-]*[A-Za-z0-9]/g) || []).forEach(raw => {
      const w = raw.toLowerCase().replace(/['’]s$/, '');
      if (w.length <= 2 || STOP.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
      const d = raw.replace(/['’]s$/, '');
      display[w] = display[w] || {};
      display[w][d] = (display[w][d] || 0) + 1;
    });
    const titleWords = new Set(contentWords(doc.title + ' ' + doc.headings.join(' ')));
    doc.sentences.forEach(item => {
      const words = contentWords(item.text);
      const n = wordCount(item.text);
      let score = 0;
      words.forEach(w => { score += Math.log(1 + (freq[w] || 0)) + (titleWords.has(w) ? 0.6 : 0); });
      score = words.length ? score / Math.sqrt(words.length + 2) : 0;
      if (n < 6) score *= 0.6;
      else if (n > 42) score *= 0.6;
      if (item.question) score *= 0.85;
      if (item.firstInPara) score *= 1.12;
      if (/\d/.test(item.text)) score *= 1.15;        // concrete facts/figures from the source
      if (item.cta) score *= 0.4;                      // CTAs belong in the CTA card
      if (item.claim === 'speculation') score *= 0.8;  // facts first; predictions stay hedged
      // sweeping absolutes ("nobody owns or controls") rank below the article's more precise framings
      if (!item.list && /\b(?:nobody|no one|everyone|always|completely|entirely|impossible)\b/i.test(item.text) && !/\b(?:share|network|company|government|bank|headquarters)\b/i.test(item.text.replace(/nobody owns or controls/i, ''))) score *= 0.6;
      if (item.bad) score = 0;
      item.score = score;
    });
    doc.freq = freq;
    doc.keywords = Object.keys(freq)
      .filter(w => freq[w] >= 2 && w.length > 3)
      .sort((a, b) => freq[b] - freq[a] || (titleWords.has(b) - titleWords.has(a)))
      .slice(0, 12)
      .map(w => {
        const forms = display[w];
        return Object.keys(forms).sort((a, b) => forms[b] - forms[a])[0];
      });
  }

  // ---------- idea units: a standalone sentence + the sentences that lean on it ----------
  function buildUnits(doc) {
    const units = [];
    let cur = null;
    const close = () => { if (cur && cur.sents.length) units.push(cur); cur = null; };
    doc.sentences.forEach(s => {
      if (cur && !cur.list && s.samePara && s.needsContext && cur.sents.length >= 4 && cur.sents.length > 1) {
        // the thought runs on past 4 sentences: don't leave the unit ending on a line that leans forward
        cur.sents.pop();
      }
      const startNew = !cur || s.list || !s.samePara || !s.needsContext || cur.sents.length >= 4 || cur.list;
      if (startNew) {
        close();
        cur = { sents: [], broken: false, orphan: false, list: s.list };
        if (s.needsContext && !s.list) cur.orphan = true; // leans on something we can't show with it
      }
      if (cur.broken) return;            // its anchor was rejected: drop it too
      if (s.bad) { cur.broken = true; return; }
      cur.sents.push(s);
    });
    close();
    units.forEach(u => {
      // don't stop on a set-up line ("The important concept isn't the engineering.") whose answer comes later
      while (u.sents.length > 1 && doc.setupKeys && doc.setupKeys.has(keyOf(u.sents[u.sents.length - 1].text))) u.sents.pop();
      if (u.sents.length === 1 && doc.setupKeys && doc.setupKeys.has(keyOf(u.sents[0].text))) u.orphan = true;
    });
    doc.units = units.map((u, i) => {
      const text = u.sents.map(s => s.text).join(' ');
      const spec = u.sents.some(s => s.claim === 'speculation');
      const mean = u.sents.reduce((a, s) => a + s.score, 0) / u.sents.length;
      let score = mean * (1 + 0.08 * (u.sents.length - 1));
      // a lone teaser ("…with one massive difference.") promises something the unit doesn't deliver
      if (u.sents.length === 1 && (TEASER_RX.test(text) || (/^(?:imagine|picture|think of)\b/i.test(text) && wordCount(text) < 10))) u.orphan = true; // bare analogy without its explanation
      if (u.orphan) score *= 0.3;
      return {
        id: i, text, sents: u.sents, keys: u.sents.map(s => keyOf(s.text)),
        section: u.sents[0].section, order: u.sents[0].order, list: u.list, orphan: u.orphan,
        cta: u.sents.some(s => s.cta), question: u.sents.length === 1 && u.sents[0].question,
        spec, words: wordCount(text), chars: text.length, score
      };
    });
  }

  // ---------- selection helpers ----------
  function isFree(u, used) { return u.keys.every(k => !used.has(k)); }
  function mark(u, used) { (u.keys || [keyOf(u.text || u)]).forEach(k => used.add(k)); }
  function speakable(text) { return !/https?:|www\.|[();]|\be\.g\.|\bi\.e\.|\d\.\d{3,}|\S\/\S|\s\/\s|[=≠→]/.test(text); }

  // Earlier cards' picks count against a unit, so the eight cards cover more of the article
  // instead of all leaning on the same top-scoring sentences.
  function spread(doc, u) { return Math.pow(0.7, (doc.useCount && doc.useCount[u.id]) || 0); }

  function introSection(doc) { return doc.sections.length > 1 && !doc.sections[0].heading ? 0 : -1; }
  function conclusionSection(doc) {
    for (let i = doc.sections.length - 1; i >= 0; i--) if (CONCL_RX.test(doc.sections[i].heading)) return i;
    return doc.sections.length > 2 ? doc.sections.length - 1 : -1;
  }

  function usable(doc, used, o) {
    o = o || {};
    return doc.units.filter(u => !u.orphan && !u.cta && isFree(u, used) &&
      (!o.maxWords || u.words <= o.maxWords) && (!o.maxChars || u.chars <= o.maxChars) &&
      (!o.speakable || speakable(u.text)) && (!o.noQuestion || !u.question) && (!o.facts || !u.spec));
  }

  function hookUnit(doc, used, maxHeadChars) {
    const intro = introSection(doc);
    const early = usable(doc, used).filter(u => !u.list && (intro >= 0 ? u.section === intro : u.order < Math.max(6, doc.sentences.length * 0.35)));
    const fits = early.filter(u => u.sents[0].text.length <= (maxHeadChars || 200) && !u.spec);
    const qs = fits.filter(u => u.sents[0].question && (intro >= 0 || u.order < Math.max(3, doc.sentences.length * 0.35)));
    // later cards prefer an opening question earlier cards haven't used, so cards don't all open alike
    const uses = u => (doc.useCount && doc.useCount[u.id]) || 0;
    const q = qs.slice().sort((a, b) => uses(a) - uses(b) || a.order - b.order)[0];
    if (q) return q;
    const best = fits.slice().sort((a, b) => b.score - a.score)[0];
    if (best) return best;
    return usable(doc, used).filter(u => u.sents[0].text.length <= (maxHeadChars || 200) && !u.question).sort((a, b) => b.score - a.score)[0] || null;
  }

  function takeawayUnits(doc, used, n, o) {
    o = o || {};
    const c = conclusionSection(doc);
    // hedged outlooks ("may become … or it may fall short") are allowed as closings — the hedge is kept word for word
    let pool = usable(doc, used, Object.assign({ noQuestion: true }, o)).filter(u => (!u.spec || HEDGE_RX.test(u.text)) && !u.list && !PREDICTION_RX.test(u.text));
    pool = pool.filter(u => !/\?["'”’)]*$/.test(u.text));
    let list = c >= 0 ? pool.filter(u => u.section === c) : [];
    if (!list.length) list = pool.filter(u => u.order >= doc.sentences.length * 0.7);
    // every closing line in the conclusion already ends another card → also consider the article's later body lines
    const cu = doc.closingUsed;
    if (cu && list.length && list.every(u => cu.has(u.id))) {
      const extra = usable(doc, used, Object.assign({ noQuestion: true }, o)).filter(u => u.order >= doc.sentences.length * 0.55 &&
        !list.includes(u) && (!u.spec || HEDGE_RX.test(u.text)) && !PREDICTION_RX.test(u.text) && !/\?["'”’)]*$/.test(u.text) && u.sents.length <= 2);
      list = list.concat(extra);
    }
    // the author's closing words weigh more; a line that already ends another card weighs much less (no 7-of-8 identical endings)
    const late = u => u.score * (1 + 0.4 * u.order / Math.max(1, doc.sentences.length)) * (u.spec ? 0.85 : 1) *
      ((doc.closingUsed && doc.closingUsed.has(u.id)) ? 0.15 : 1) * (o.reflective ? Math.min(1.6, Math.max(0.6, u.words / 15)) : 1);
    return list.sort((a, b) => late(b) - late(a)).slice(0, n || 1).sort((a, b) => a.order - b.order);
  }

  // Best unit per body section, spread across sections, returned in source order.
  function bodyPoints(doc, used, n, o) {
    o = o || {};
    const intro = introSection(doc), concl = conclusionSection(doc);
    const pool = usable(doc, used, o).filter(u => (doc.sections.length < 3 || (u.section !== intro && u.section !== concl)) && !u.question && (!o.prefer || true));
    const bySection = {};
    pool.forEach(u => { (bySection[u.section] = bySection[u.section] || []).push(u); });
    const rank = u => u.score * (o.prefer ? o.prefer(u) : 1) * (u.spec ? 0.7 : 1) * (o.noSpread ? 1 : spread(doc, u));
    Object.values(bySection).forEach(l => l.sort((a, b) => rank(b) - rank(a)));
    const order = Object.keys(bySection).sort((a, b) => rank(bySection[b][0]) - rank(bySection[a][0]));
    const picked = [];
    for (let round = 0; round < 6 && picked.length < n; round++) {
      for (const sec of order) {
        const cand = bySection[sec][round];
        if (cand && picked.length < n && isFree(cand, used)) { picked.push(cand); mark(cand, used); }
      }
      if (o.onePerSection && order.length >= 3) break;
    }
    return picked.sort((a, b) => a.order - b.order);
  }

  function hashtags(doc, n) {
    const tags = [];
    const head = new Set(contentWords(doc.title + ' ' + doc.headings.join(' ')));
    const kw = (doc.keywords || []).slice().sort((a, b) => (head.has(b.toLowerCase()) - head.has(a.toLowerCase())));
    kw.forEach(k => {
      const clean = k.replace(/[^A-Za-z0-9]/g, '');
      if (clean.length < 4 || /^\d+$/.test(clean)) return;
      const tag = '#' + clean.charAt(0).toUpperCase() + clean.slice(1);
      if (!tags.some(t => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
    });
    return tags.slice(0, n);
  }

  function sourceQuestion(doc, used) {
    // a discussion question that stands on its own: no quoted dialogue, no "she/he" from the story, no "that experiment"
    const q = doc.questions.filter(s => !used.has(keyOf(s.text)) && s.text.length <= 180 && wordCount(s.text) >= 4 && !needsContextAlone(s) &&
      !s.needsContext && !/["“”]/.test(s.text) && !/\b(?:she|her|he|him|his)\b/i.test(s.text));
    return q.length ? q[q.length - 1].text : '';
  }
  function needsContextAlone(s) { return WEAK_START.test(s.text); }

  // Cut at a word boundary with "…" (only used for non-sentence labels; drafts never cut sentences).
  function shorten(s, max) {
    s = collapse(s);
    if (s.length <= max) return s;
    const slice = s.slice(0, max);
    const sp = slice.lastIndexOf(' ');
    return slice.slice(0, sp > 0 ? sp : max).replace(/[,;:—–\s]+$/, '') + '…';
  }

  // Join parts, dropping whole optional parts from the end until it fits. Never cuts a sentence.
  function fitParts(parts, max, sep) {
    sep = sep === undefined ? '\n\n' : sep;
    const out = parts.filter(p => p && p.text);
    const build = () => out.map(p => p.text).join(sep).trim();
    let text = build();
    while (text.length > max) {
      let idx = -1;
      for (let i = out.length - 1; i >= 0; i--) if (out[i].optional) { idx = i; break; }
      if (idx < 0) break;
      out.splice(idx, 1);
      text = build();
    }
    return text;
  }

  const LIMITS = {
    x: 280, linkedin: 3000, instagram: 2200, facebook: 2000, reels: 2200, substack: 1000, story: 1200, cta: 600
  };
  const SOFT = { instagramFirstLine: 125, substack: 700, storySlide: 120 };

  // Neutral template text the engine may add (no facts). Everything else must come from the source.
  const TEMPLATE_RX = [
    /^Key points:$/, /^What['’]s your take\?$/, /^What do you think\?$/, /^Let me know in the comments\.$/,
    /^Save this for later\. ♾️$/, /^Questions about [^?]{1,60}\?$/, /^Drop them in the comments\.$/,
    /^Questions\?$/, /^Want the full breakdown(?: of [^?]{1,120})?\?$/, /^Read it here: (?:\S+|\[ADD LINK\])$/, /^Read the full piece: \S+$/,
    /^Link: \S+$/, /^Drop your answer in the comments\.$/, /^Read the full breakdown: (?:\S+|\[ADD LINK\])$/
  ];
  const LABEL_RX = /^(?:HOOK \(0–3s\):|ON-SCREEN TEXT:|SCRIPT:|CLOSE:|SLIDE \d+|Key points:)$/;
  const RUNTIME_RX = /^≈ \d+s spoken at a normal pace \(rough estimate\)$/;
  const PLACEHOLDER_RX = /\[(?:ADD|INSERT|YOUR|TBD|TODO|TK|LINK|URL|NAME|PLACEHOLDER)[^\]]*\]|\{\{[^}]*\}\}|\bTBD\b|\blorem ipsum\b/i;
  const INTERNAL_RX = /\bFROM YOUR SOURCE\b|\bOPTIONS \(pick one|\bINTERNAL\b|\bDEBUG\b|\bNEEDS REVIEW\b|\bundefined\b|\bnull\b|\[object Object\]/;

  // ---------- platform drafts ----------
  function generate(kind, raw) {
    const doc = typeof raw === 'string' ? parse(raw) : raw;
    if (!doc.units.length && !doc.title) return '';
    const used = new Set();
    const title = doc.title;
    const tags = hashtags(doc, 4);
    const P = (text, optional) => ({ text, optional: !!optional });
    // a proper noun the source itself capitalises mid-sentence (e.g. "Bitcoin"), else no topic
    const topic = (doc.keywords || []).find(k => /^[A-Z]/.test((doc.casing || {})[k.toLowerCase()] || '')) || '';

    switch (kind) {
      case 'x': {
        // punchy: one idea in short beats ("…problem: How do you…? That's the breakthrough. Not the price chart."), ≤280
        const parts = [];
        const punchy = usable(doc, used, { maxChars: 240, noQuestion: true }).filter(u => u.sents.length >= 2 && !u.spec && !u.list &&
          u.sents.every(x => wordCount(x.text) <= 20) && speakable(u.text) && !/["“”]/.test(u.text.replace(/“[^”]{1,30}”/g, '')))
          .sort((a, b) => b.score * (1 + 0.15 * b.sents.length) * spread(doc, b) - a.score * (1 + 0.15 * a.sents.length) * spread(doc, a))[0];
        const t = punchy || takeawayUnits(doc, used, 1, { maxChars: 230 })[0] || hookUnit(doc, used, 230);
        if (t && t.chars <= 280) { parts.push(P(t.text)); mark(t, used); }
        if (!punchy) {
          const fact = bodyPoints(doc, used, 1, { maxWords: 25, facts: true, prefer: u => (/\d/.test(u.text) ? 1.3 : 1) * (u.list ? 0.6 : 1) })[0];
          if (fact) parts.push(P(fact.text, !!parts.length));
        }
        if (tags[0]) parts.push(P(tags.slice(0, 2).join(' '), true));
        if (!parts.length && title) parts.push(P(title));
        return fitParts(parts, LIMITS.x);
      }
      case 'linkedin': {
        // professional: title, the main point up front, structured points, the practical close, a question
        // open on a question the reader can't ignore, then structure, then the article's closing idea
        const lead = hookUnit(doc, used, 220);
        if (lead) mark(lead, used);
        const end = takeawayUnits(doc, used, 1)[0];
        if (end) mark(end, used);
        const pts = bodyPoints(doc, used, 4, { maxWords: 45, facts: true });
        const q = sourceQuestion(doc, used);
        const parts = [];
        if (title) parts.push(P(title));
        if (lead) parts.push(P(lead.text));
        if (pts.length >= 2) parts.push(P('Key points:\n\n' + pts.map(p => `→ ${p.text}`).join('\n\n')));
        else pts.forEach(p => parts.push(P(p.text)));
        if (end) parts.push(P(end.text));
        parts.push(P(q || 'What’s your take?'));
        if (tags.length) parts.push(P(tags.slice(0, 3).join(' '), true));
        return fitParts(parts, LIMITS.linkedin);
      }
      case 'instagram': {
        const h = hookUnit(doc, used, SOFT.instagramFirstLine);
        const parts = [];
        if (h) {
          parts.push(P(h.sents[0].text));
          if (h.sents.length > 1) parts.push(P(h.sents.slice(1).map(s => s.text).join(' ')));
          mark(h, used);
        } else if (title && title.length <= SOFT.instagramFirstLine) parts.push(P(title));
        // practical, save-worthy points: tips/list items first
        const pts = bodyPoints(doc, used, 2, { maxWords: 30, prefer: u => (u.list ? 1.6 : 1) * (u.spec ? 0.5 : 1) });
        pts.forEach(p => parts.push(P(`• ${p.text}`)));
        const end = takeawayUnits(doc, used, 1)[0];
        if (end) { parts.push(P(end.text)); mark(end, used); }
        parts.push(P('Save this for later. ♾️', true));
        if (tags.length) parts.push(P(tags.join(' '), true));
        return fitParts(parts, LIMITS.instagram);
      }
      case 'facebook': {
        // conversational: open with the question, explain one idea in a short paragraph, land it, invite discussion
        const h = hookUnit(doc, used, 220);
        if (h) mark(h, used);
        // the richest explanation: a multi-sentence unit from the body
        const explain = bodyPoints(doc, used, 1, { maxWords: 70, facts: true, prefer: u => 1 + 0.35 * (u.sents.length - 1) - (u.list ? 0.5 : 0) });
        if (explain[0]) {
          const nxt = doc.units[explain[0].id + 1];
          if (nxt && nxt.section === explain[0].section && !nxt.list && !nxt.orphan && !nxt.cta && !nxt.question && isFree(nxt, used) && explain[0].words + nxt.words <= 90) { explain.push(nxt); mark(nxt, used); }
        }
        const end = takeawayUnits(doc, used, 1)[0];
        if (end) mark(end, used);
        const q = sourceQuestion(doc, used);
        const parts = [];
        if (h) parts.push(P(h.text)); else if (title) parts.push(P(title));
        if (explain.length) parts.push(P(explain.map(u => u.text).join(' ')));
        if (end) parts.push(P(end.text));
        parts.push(P(q || 'What do you think? Let me know in the comments.'));
        return fitParts(parts, LIMITS.facebook);
      }
      case 'reels': {
        // spoken script: hook → answer → 3 beats in order → close
        const h = hookUnit(doc, used, 140);
        const lines = [];
        const spoken = [];
        if (h) {
          mark(h, used);
          lines.push('HOOK (0–3s):', h.sents[0].text);
          spoken.push(h.sents[0].text);
        }
        if (title && title.length <= 60) lines.push('', 'ON-SCREEN TEXT:', title);
        lines.push('', 'SCRIPT:');
        if (h && h.sents.length > 1) { const rest = h.sents.slice(1).map(s => s.text).join(' '); if (speakable(rest)) { lines.push(rest); spoken.push(rest); } }
        const beats = bodyPoints(doc, used, 3, { maxWords: 32, speakable: true, onePerSection: true, prefer: u => (u.list ? 0.7 : 1) *
          (/\b(?:is|are|means|works|uses|lets|controls|records|verifies)\b/i.test(u.text) ? 1.3 : 1) * (u.sents.length === 1 && /^(?:imagine|think of|most|some)\b/i.test(u.text) ? 0.5 : 1) * (/["“”]/.test(u.text) ? 0.5 : 1) });
        let close = takeawayUnits(doc, used, 1, { speakable: true, maxWords: 40 })[0];
        if (close) mark(close, used);
        else if (beats.length) close = beats.pop();          // land on the last beat instead of trailing off
        else if (h && h.sents.length > 1 && lines[lines.length - 1] !== 'SCRIPT:') { lines.pop(); close = { text: spoken.pop() }; }
        beats.forEach(b => { lines.push(b.text); spoken.push(b.text); });
        if (lines[lines.length - 1] === 'SCRIPT:') { lines.pop(); if (lines[lines.length - 1] === '') lines.pop(); }
        if (close) { lines.push('', 'CLOSE:', close.text); spoken.push(close.text); }
        const secs = Math.round(wordCount(spoken.join(' ')) / 2.5); // ~150 spoken words per minute
        lines.push('', `≈ ${secs}s spoken at a normal pace (rough estimate)`);
        return lines.join('\n').trim();
      }
      case 'substack': {
        // stands alone: the article's core insight, the line that grounds it, then a closing thought of its own
        const insight = bodyPoints(doc, used, 1, { maxWords: 45, facts: true, noSpread: true, prefer: u => (1 + 0.2 * (u.sents.length - 1) - (u.list ? 0.4 : 0)) * (/["“”:]/.test(u.text) ? 0.4 : 1) * (wordCount(u.text) >= 12 ? 1.3 : 1) })[0];
        const parts = [];
        if (insight) {
          parts.push(P(insight.text));
          const nxt = doc.units[insight.id + 1];
          if (nxt && nxt.section === insight.section && !nxt.orphan && !nxt.cta && !nxt.list && !nxt.question && isFree(nxt, used) && nxt.words <= 40) { parts.push(P(nxt.text, true)); mark(nxt, used); }
        } else {
          const h = hookUnit(doc, used, 220);
          if (h) { parts.push(P(h.text)); mark(h, used); }
        }
        const end = takeawayUnits(doc, used, 1, { reflective: true })[0];
        if (end) { parts.push(P(end.text)); mark(end, used); }
        if (!parts.length && title) parts.push(P(title));
        let text = fitParts(parts, SOFT.substack);
        if (text.length > SOFT.substack) text = fitParts(parts, LIMITS.substack);
        return text;
      }
      case 'story': {
        // one idea, slide by slide, in source order; each slide a complete sentence.
        // Best case: the author's own step-by-step run (e.g. a "30-second version") — used as-is, in order.
        const h = hookUnit(doc, used, SOFT.storySlide);
        const hookFits = h && h.sents.every(s => s.text.length <= SOFT.storySlide);
        const concl = conclusionSection(doc);
        let run = null;
        doc.sections.forEach((sec, si) => {
          const us = doc.units.filter(u => u.section === si && !u.orphan && !u.cta && !u.list && !u.question &&
            u.sents.every(x => x.text.length <= SOFT.storySlide && !/["“”]/.test(x.text)) && !(hookFits && u === h));
          const score = us.length * (si === concl ? 1.5 : 1);
          if (us.length >= 4 && (!run || score > run.score)) {
            const budget = hookFits ? 6 - h.sents.length : 6;
            const take = []; let n = 0;
            for (const u of us) { if (n + u.sents.length > budget) break; take.push(u); n += u.sents.length; }
            if (!take.length) return;
            run = { units: take, score };
          }
        });
        let units;
        if (run) {
          units = run.units;
          units.forEach(u => mark(u, used));
          if (hookFits && h.order < units[0].order) { mark(h, used); units = [h].concat(units); }
        } else {
          units = [];
          if (hookFits) mark(h, used);
          const end = takeawayUnits(doc, used, 1, { maxChars: SOFT.storySlide })[0];
          if (end) mark(end, used);
          const room = Math.max(1, Math.min(3, 6 - (hookFits ? h.sents.length : 1) - (end ? 1 : 0)));
          const pts = bodyPoints(doc, used, room, { maxChars: SOFT.storySlide, facts: true, onePerSection: true, prefer: u => (u.sents.length === 1 ? 1.2 : 1) });
          if (hookFits) units.push(h);
          units.push(...pts);
          if (end) units.push(end);
        }
        units.sort((a, b) => a.order - b.order); // the story follows the source's own order
        const slides = [];
        if (!hookFits && title) slides.push(title);
        units.forEach(u => { if (slides.length + u.sents.length <= 6) u.sents.forEach(x => slides.push(x.text)); });
        if (doc.urls[0]) slides.push(`Link: ${doc.urls[0]}`);
        return slides.map((s, i) => `SLIDE ${i + 1}\n${s}`).join('\n\n');
      }
      case 'cta': {
        // 1) the source's own call to action, if it has one
        // 2) otherwise a soft invitation built only from the article's own advice + its own discussion question
        // 3) a link line: the source's URL, or an [ADD LINK] placeholder that keeps the card at NEEDS REVIEW
        const lines = [];
        const link = doc.urls[0];
        doc.ctaLines.slice(0, 2).forEach(c => lines.push(c.text));
        if (!lines.length) {
          const invite = doc.units.filter(u => !u.orphan && !u.question && INVITE_RX.test(u.text) && u.words <= 40 &&
            !/\b(?:she|her|he|him|his)\b/i.test(u.text) && !/["“”]/.test(u.text) && !PREDICTION_RX.test(u.text))
            .sort((a, b) => (b.list - a.list) || (b.score - a.score))[0];
          if (invite) lines.push(invite.text);
          const q = sourceQuestion(doc, new Set());
          if (q) lines.push(`${q} Drop your answer in the comments.`);
          else lines.push(topic ? `Questions about ${topic}? Drop them in the comments.` : 'Questions? Drop them in the comments.');
          lines.push(`Read the full breakdown: ${link || '[ADD LINK]'}`);
        } else {
          if (link) lines.push(`Read the full piece: ${link}`);
          if (topic) lines.push(`Questions about ${topic}? Drop them in the comments.`);
        }
        return lines.join('\n\n').trim();
      }
      default:
        return '';
    }
  }

  // ---------- validation: READY only when every check passes ----------
  function validate(kind, text, docOrRaw, opts) {
    opts = opts || {};
    const doc = typeof docOrRaw === 'string' ? parse(docOrRaw) : (docOrRaw || parse(''));
    const t = String(text || '');
    const issues = [];
    const add = m => { if (!issues.includes(m)) issues.push(m); };
    if (!t.trim()) return { ok: false, issues: ['Empty'] };
    const limit = LIMITS[kind];
    if (limit && t.length > limit) add(`Over the ${limit}-character limit`);
    if (/\[ADD LINK\]/.test(t)) add('[ADD LINK] needs your link — the source has no URL and the engine never invents one. Paste your link or delete that line.');
    else if (PLACEHOLDER_RX.test(t)) add('Unfilled placeholder — fill it in before posting');
    if (INTERNAL_RX.test(t)) add('Contains internal processing text');

    const titleKeys = new Set([keyOf(doc.title)].concat(doc.headings.map(keyOf)).filter(Boolean));
    const privKeys = doc.privateNotes.map(keyOf).filter(k => k.split(' ').length >= 3);
    const tKey = ' ' + keyOf(t) + ' ';
    if (privKeys.some(k => tKey.includes(' ' + k + ' '))) add('Contains a private note or instruction from the source');

    const seen = new Set();
    const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
    let contentSentences = 0;
    lines.forEach((line, li) => {
      if (LABEL_RX.test(line) || RUNTIME_RX.test(line)) return;
      if (/^(?:#[A-Za-z0-9_]+\s*)+$/.test(line)) {
        if (!opts.edited) line.match(/#[A-Za-z0-9_]+/g).forEach(tag => { if (!doc.sourceKey.includes(' ' + tag.slice(1).toLowerCase())) add(`Hashtag not from source: ${tag}`); });
        return;
      }
      const body = line.replace(/^(?:→|•|-|\d+\.)\s*/, '');
      if (titleKeys.has(keyOf(body))) return; // the source's own title/heading
      let prevS = '';
      const lineSents = splitSentences(body);
      if (isPrivateText(body) && !(lineSents.length > 1 && SAFETY_NOUN.test(lineSents[0]))) add('Contains a private note or instruction from the source');
      lineSents.forEach(s => {
        const safetyFollow = BARE_DIRECTIVE.test(s) && SAFETY_NOUN.test(prevS);
        prevS = s;
        if (TEMPLATE_RX.some(rx => rx.test(s))) return;
        contentSentences++;
        const k = keyOf(s);
        if (k.split(' ').length > 3) { if (seen.has(k)) add('Repeats a sentence'); seen.add(k); }
        sentenceIssues(s).filter(r => !(safetyFollow && r === 'private note or instruction')).forEach(reason => add(`Unclear sentence (${reason}): “${shorten(s, 70)}”`));
        if (!opts.edited) {
          if (!doc.sourceKey.includes(' ' + k + ' ')) add(`Not found in source: “${shorten(s, 70)}”`);
          (s.match(/\d[\d,.]*\d|\d/g) || []).forEach(n => { if (!doc.sourceKey.includes(keyOf(n))) add(`Number not in source: ${n}`); });
        }
      });
    });
    if (!contentSentences && kind !== 'cta') add('No content from the source');

    // platform suitability
    const first = lines[0] || '';
    if (kind === 'instagram' && first.length > SOFT.instagramFirstLine) add(`First line is over ${SOFT.instagramFirstLine} characters (cut off before “more”)`);
    if (kind === 'reels') {
      if (!/^HOOK \(0–3s\):$/m.test(t) && !opts.edited) add('Script has no hook');
      if (!/^CLOSE:$/m.test(t) && !opts.edited) add('Script has no closing line');
      lines.filter(l => !LABEL_RX.test(l) && !RUNTIME_RX.test(l)).forEach(l => {
        if (!speakable(l)) add('Script has text that is hard to say aloud (links, brackets, long decimals)');
        if (wordCount(l) > 45) add('A script line is too long to say in one breath');
      });
    }
    if (kind === 'story') {
      const slides = t.split(/^SLIDE \d+$/m).map(s => s.trim()).filter(Boolean);
      if (slides.length < 2) add('Story needs at least 2 slides');
      if (slides.some(s => s.length > SOFT.storySlide && !/^Link: /.test(s))) add(`A slide is over ${SOFT.storySlide} characters`);
      if (!opts.edited) {
        const orders = slides.map(s => {
          const k = keyOf(s);
          const hits = doc.sentences.filter(x => k === keyOf(x.text) || k.startsWith(keyOf(x.text) + ' '));
          const hit = hits.sort((a, b) => keyOf(b.text).length - keyOf(a.text).length)[0]; // the sentence the slide starts with, not a shorter look-alike
          return hit ? hit.order : null;
        }).filter(o => o !== null);
        if (orders.some((o, i) => i && o < orders[i - 1])) add('Slides are out of order');
      }
    }
    if (kind === 'substack' && contentSentences < 2) add('Too thin to stand alone (needs at least 2 sentences)');
    if (kind === 'cta' && !/\b(share|subscribe|follow|join|read|ask|comment|drop|sign up|download|visit|reply|try|book|learn)\b/i.test(t)) add('No clear call to action');
    if (/(?:…|\.\.\.)\s*$/m.test(t)) add('Has a cut-off line');
    return { ok: issues.length === 0, issues };
  }

  function generateAll(raw, kinds) {
    kinds = kinds || ['x', 'linkedin', 'instagram', 'facebook', 'reels', 'substack', 'story', 'cta'];
    const doc = parse(raw);
    const outputs = {};
    const checks = {};
    doc.useCount = {};
    doc.closingUsed = new Set();
    // Story first: it follows the author's own step-by-step run, so its ending is fixed;
    // the other cards then pick closings it hasn't used. Output order is unchanged.
    const genOrder = kinds.filter(k => k === 'story').concat(kinds.filter(k => k !== 'story'));
    genOrder.forEach(k => {
      outputs[k] = generate(k, doc);
      checks[k] = validate(k, outputs[k], doc);
      const outKey = ' ' + keyOf(outputs[k]) + ' ';
      const contentLines = outputs[k].split('\n').map(l => l.trim()).filter(l => l && !LABEL_RX.test(l) && !RUNTIME_RX.test(l) &&
        !/^(?:#[A-Za-z0-9_]+\s*)+$/.test(l) && !TEMPLATE_RX.some(rx => rx.test(l)) && !/\?$/.test(l));
      const lastLine = contentLines.length ? keyOf(contentLines[contentLines.length - 1].replace(/^(?:→|•)\s*/, '')) : '';
      doc.units.forEach(u => { if (lastLine && lastLine.endsWith(u.keys[u.keys.length - 1])) doc.closingUsed.add(u.id); });
      doc.units.forEach(u => { if (u.keys.every(key => outKey.includes(' ' + key + ' '))) doc.useCount[u.id] = (doc.useCount[u.id] || 0) + 1; });
    });
    delete doc.useCount;
    delete doc.closingUsed;
    const ordered = {}; kinds.forEach(k => { ordered[k] = outputs[k]; });
    return { doc, outputs: ordered, checks };
  }

  return { parse, splitSentences, generate, generateAll, validate, sentenceIssues, isPrivateText, shorten, LIMITS, keyOf };
});
