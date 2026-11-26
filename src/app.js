(function(){
'use strict';

/* ---------- helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LET = 'abcdefgh';
const KEY = 'linie-c1-v1';
const SCHEMA = 2;
const TTS = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DOMLBL = { S: 'Sektör', G: 'Genel C1', SG: 'Sektör + Genel' };
const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

/* ---------- state ---------- */
let state = { v: SCHEMA, days: {} };
const ui = { view: 'day', day: null, rpos: undefined, busy: false, glErr: false, step: -1, trAll: false, en: true, sheet: false, tro: {}, eno: {}, q: {}, planWeek: 1, order: null, flip: false, trCard: false, sumShown: false, glDay: null, glQ: '', glDom: '', glCover: '' };
let db = null, saving = false, again = false, saveTimer = null;
const dirtyDays = new Set();

function D(id) {
  id = id || ui.day;
  if (!state.days[id]) state.days[id] = {};
  const d = state.days[id];
  d.sel = d.sel || {}; d.res = d.res || {}; d.secs = d.secs || {}; d.vocab = d.vocab || {}; d.write = d.write || {}; d.speak = d.speak || {}; d.time = d.time || {}; d.rev = d.rev || {}; d.seenNew = d.seenNew || {}; d.mockT = d.mockT || {}; d.plays = d.plays || {};
  if (typeof d.card !== 'number') d.card = 0;
  if (typeof d.notes !== 'string') d.notes = '';
  if (!d.started) d.started = Date.now();
  return d;
}
function loadLocal() { try { const s = localStorage.getItem(KEY); if (s) { const p = JSON.parse(s); if (p && p.days) state = p; } } catch (e) {} }
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function setStatus(kind) {
  const el = $('#savestate'); if (!el) return;
  const m = { saving: ['Kaydediliyor…', ''], synced: ['Kaydedildi', 'ok'], local: ['Bu cihazda kayıtlı', 'ok'], none: ['', ''] }[kind] || ['', ''];
  el.textContent = m[0]; el.className = 'savestate ' + m[1];
}
let lastStatus = 'none';
function status(k) { lastStatus = k; setStatus(k); }
function queueSave(id) {
  id = id || ui.day;
  D(id).updatedAt = new Date().toISOString();
  if (DAYS[id]) { try { D(id).sum = summary(id); } catch (e) {} }
  dirtyDays.add(id); saveLocal();
  if (!db) { status('local'); return; }
  status('saving');
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 900);
}
async function flush() {
  if (!db) return;
  if (saving) { again = true; return; }
  saving = true;
  try {
    for (const id of Array.from(dirtyDays)) {
      if (!DAYS[id]) { try { await ensureDay(id); } catch (e) { continue; } }
      dirtyDays.delete(id); await db.doc('days/' + id).set(buildDoc(id));
    }
    status('synced');
  } catch (e) { status('local'); }
  saving = false;
  if (again || dirtyDays.size) { again = false; flush(); }
}
function buildDoc(id) {
  const d = JSON.parse(JSON.stringify(D(id)));
  delete d.sum;
  d.schema = SCHEMA; d.no = DAYS[id].no; d.day = id; d.week = DAYS[id].week;
  d.summary = summary(id);
  d.updatedAt = d.updatedAt || new Date().toISOString();
  return d;
}
async function initDb() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') { status('local'); return; }
    const dbh = await window.claude.use('db');
    if (!dbh) { status('local'); return; }
    db = dbh;
    let changed = false;
    for (const id of dayIds()) {
      const snap = await db.doc('days/' + id).get();
      const r = snap.exists ? (snap.data() || {}) : null;
      const usable = r && r.schema === SCHEMA;
      const l = D(id);
      if (usable) {
        if (!l.updatedAt || (r.updatedAt && r.updatedAt > l.updatedAt)) {
          const keep = {}; ['sel', 'res', 'secs', 'vocab', 'seenNew', 'rev', 'deckVer', 'write', 'speak', 'time', 'mockT', 'card', 'notes', 'started', 'updatedAt', 'closed'].forEach(k => { if (r[k] !== undefined) keep[k] = r[k]; });
          if (r.summary) keep.sum = r.summary;
          state.days[id] = keep; D(id); migrateDay(id); changed = true;
        } else if (l.updatedAt && (!r.updatedAt || l.updatedAt > r.updatedAt)) dirtyDays.add(id);
      } else if (Object.keys(l.res).length || Object.keys(l.vocab).length || Object.keys(l.sel).length || Object.keys(l.rev).length) dirtyDays.add(id);
    }
    saveLocal(); status('synced');
    if (dirtyDays.size) flush();
    if (changed) render();
  } catch (e) { status('local'); }
}

/* ---------- manifest + lazy day files ---------- */
const MAN = () => window.MANIFEST || { days: [] };
const MD = id => MAN().days.find(x => x.id === id);
const mDays = () => MAN().days.slice().sort((a, b) => a.no - b.no);
const dayIds = () => mDays().map(x => x.id);
const liveDays = () => mDays().filter(m => !m.archive);
const liveIds = () => liveDays().map(x => x.id);
const LD = id => { const m = MD(id); return m && !m.archive ? m : null; };
const loadingDays = {};
function loadScript(src, v) {
  return new Promise((res, rej) => {
    const add = (u, fallback) => {
      const s = document.createElement('script'); s.src = u; s.async = true;
      s.onload = () => res();
      s.onerror = () => { s.remove(); if (fallback) add(fallback, null); else rej(new Error(src)); };
      document.head.appendChild(s);
    };
    add(v ? src + '?v=' + encodeURIComponent(v) : src, v ? src : null);
  });
}
function ensureDay(id) {
  if (DAYS[id]) return Promise.resolve(DAYS[id]);
  const m = MD(id); if (!m) return Promise.reject(new Error(id));
  if (!loadingDays[id]) loadingDays[id] = loadScript(m.file, m.v).then(() => { if (!DAYS[id]) throw new Error(id); migrateDay(id); return DAYS[id]; }).catch(e => { delete loadingDays[id]; throw e; });
  return loadingDays[id];
}
const ensureDays = ids => Promise.all(ids.map(ensureDay));
function migrateDay(id) {
  const day = DAYS[id]; if (!day) return;
  const d = D(id), v = day.deckVer || 1;
  if ((d.deckVer || 1) !== v) { d.vocab = {}; d.seenNew = {}; d.card = 0; d.deckVer = v; }
}
function pickStartDay() {
  const ids = liveIds(), cur = MAN().current && LD(MAN().current) ? MAN().current : ids[ids.length - 1];
  try { const s = JSON.parse(localStorage.getItem(KEY + ':day') || 'null'); if (s && s.cur === cur && LD(s.day)) return s.day; } catch (e) {}
  return cur;
}
function rememberDay(id) { try { localStorage.setItem(KEY + ':day', JSON.stringify({ day: id, cur: MAN().current })); } catch (e) {} }
function openDay(id, view) {
  stopSpeech();
  ui.busy = true; ui.view = view || 'day'; render();
  ensureDay(id).then(() => {
    ui.day = id; ui.step = -1; ui.q = {}; ui.order = null; ui.flip = false; ui.rpos = undefined; ui.sheet = false; ui.busy = false; ui.glDay = id;
    rememberDay(id); render(); window.scrollTo(0, 0);
  }).catch(() => { ui.busy = false; render(); });
}

/* ---------- spaced repetition: 1-3-7-14 (study days) ---------- */
const SRS = [1, 3, 7, 14];
const SRS_CAP = 30;
const isNewMark = (d, i) => !!((d.seenNew && d.seenNew[i]) || (d.vocab && d.vocab[i] === 'new'));
const wrongWord = (d, w) => !!(w && w.q && d.res && w.q.some(id => d.res[id] && !d.res[id].ok));
function srsBuild(uptoNo) {
  const items = {};
  mDays().forEach(m => {
    if (m.no > uptoNo) return;
    const st = state.days[m.id] || {};
    const rev = st.rev || {};
    Object.keys(rev).forEach(k => {
      const it = items[k]; if (!it || it.done || it.due > m.no) return;
      if (rev[k] === 'know') {
        it.step++; it.hist.push([m.no, 1]);
        if (it.step >= SRS.length) { it.done = true; it.doneOn = m.no; }
        else it.due = Math.max(it.start + SRS[it.step], m.no + 1);
      } else { it.start = m.no; it.step = 0; it.due = m.no + 1; it.lapses++; it.hist.push([m.no, 0]); }
    });
    (m.words || []).forEach((w, i) => {
      if (!isNewMark(st, i) && !wrongWord(st, w)) return;
      const k = m.id + ':' + i;
      if (!items[k]) items[k] = { k, w, day: m.id, origin: m.no, start: m.no, step: 0, due: m.no + 1, lapses: 0, hist: [] };
    });
  });
  return items;
}
function srsQueue(no) {
  return Object.values(srsBuild(no - 1)).filter(it => !it.done && it.due <= no)
    .sort((a, b) => a.due - b.due || a.origin - b.origin || a.k.localeCompare(b.k, undefined, { numeric: true })).slice(0, SRS_CAP);
}
function srsStats(no) {
  const all = Object.values(srsBuild(no));
  return { active: all.filter(x => !x.done).length, learned: all.filter(x => x.done).length, next: all.filter(x => !x.done && x.due <= no + 1).length };
}

/* ---------- data helpers ---------- */
function curDay() { return DAYS[ui.day]; }
function curSec() { return ui.step >= 0 ? curDay().sections[ui.step] : null; }
function clozeContext(text, n) {
  const m = text.match(new RegExp('([^\\n]{0,40})\\{' + n + '\\}([^\\n]{0,28})'));
  if (!m) return '';
  let pre = m[1], post = m[2];
  if (pre.length === 40) pre = pre.replace(/^\S+\s+/, '');
  if (post.length === 28) post = post.replace(/\s+\S*$/, '');
  return ('… ' + pre.replace(/\{\d+\}/g, '___') + '___' + post.replace(/\{\d+\}/g, '___') + ' …').replace(/\s+/g, ' ');
}
function itemsOf(sec) {
  const out = [];
  (sec.blocks || []).forEach(b => {
    if (b.type === 'mc') out.push({ id: sec.id + '_' + b.id, kind: 'mc', b, a: b.a, opts: b.opts, tag: b.tag, dom: b.dom || (sec.dom !== 'SG' ? sec.dom : null), exp: b.exp, q: b.q, letters: !!b.letters });
    else if (b.type === 'cloze') b.gaps.forEach((g, i) => {
      out.push({ id: sec.id + '_' + b.id + '_' + (i + 1), kind: 'gap', b, gi: i, a: g.a, opts: g.opts || b.sentences, tag: g.tag, dom: sec.dom !== 'SG' ? sec.dom : null, exp: g.exp, q: 'Lücke ' + (i + 1) + ': ' + clozeContext(b.text, i + 1), sentences: !!b.sentences });
    });
  });
  return out;
}
function tagLabel(day, t) { return (day.tags[t] && day.tags[t].label) || t; }
function secDone(sec) {
  const d = D();
  if (sec.kind === 'cards') return Object.keys(d.vocab).length >= sec.words.length;
  if (sec.kind === 'quiz') return !!d.secs[sec.id];
  if (sec.kind === 'write') return !!d.write.submitted;
  if (sec.kind === 'speak') return !!d.speak.done;
  if (sec.kind === 'wrap') return !!d.closed;
  if (sec.kind === 'review') return srsQueue(curDay().no).every(it => d.rev[it.k]);
  return false;
}
function secPart(sec) {
  const d = D();
  if (sec.kind === 'cards') { const n = Object.keys(d.vocab).length; return n && n < sec.words.length ? n + '/' + sec.words.length : ''; }
  if (sec.kind === 'quiz') { const its = itemsOf(sec); const n = its.filter(i => d.res[i.id] || (sec.mock && d.sel[i.id] !== undefined)).length; return n && n < its.length ? n + '/' + its.length : ''; }
  if (sec.kind === 'write') return (d.write.text || '').trim() && !d.write.submitted ? 'taslak' : '';
  if (sec.kind === 'speak') return Object.keys(d.speak.checks || {}).length && !d.speak.done ? 'taslak' : '';
  if (sec.kind === 'review') { const q = srsQueue(curDay().no), n = q.filter(it => d.rev[it.k]).length; return n && n < q.length ? n + '/' + q.length : ''; }
  return '';
}
function secStatus(sec) {
  const d = D();
  if (secDone(sec)) { const s = d.secs[sec.id]; if (sec.kind === 'review') { const q = srsQueue(curDay().no); return { st: 'done', txt: q.length ? q.filter(it => d.rev[it.k] === 'know').length + '/' + q.length : '✓' }; } return { st: 'done', txt: sec.kind === 'quiz' && s ? s.ok + '/' + s.total : '✓' }; }
  const p = secPart(sec); return { st: p ? 'part' : 'none', txt: p };
}
function finalizeSec(sec) {
  const d = D(), items = itemsOf(sec), had = !!d.secs[sec.id];
  if (items.length && items.every(it => d.res[it.id])) {
    const ok = items.filter(it => d.res[it.id].ok).length; d.secs[sec.id] = { ok, total: items.length, ts: Date.now() };
    if (!had) { const xp = secXP(sec, d.secs[sec.id]); setTimeout(() => celebrate(ok === items.length ? 'Fehlerfrei!' : sec.mock ? 'Abgegeben!' : 'Geschafft!', '+' + xp + ' XP · ' + ok + '/' + items.length + ' richtig'), 80); }
  }
}
function mockLive(sec) { return !!(sec && sec.mock && !D().secs[sec.id]); }
function mockPts(sec) { const d = D(), s = d.secs[sec.id], p = sec.mock.pts || 1, n = itemsOf(sec).length; return { ok: s ? s.ok : 0, n, pts: s ? s.ok * p : 0, max: n * p, t: d.mockT[sec.id] || 0, done: !!s }; }
function hasSector(day) { return day.sections.some(s => s.dom === 'S' || (s.dom === 'SG' && s.kind !== 'cards' && s.kind !== 'review' && s.kind !== 'wrap')) || day.sections.some(s => s.kind === 'cards' && s.words.some(w => w.dom === 'S')); }
function minsOf(day, pred) { return day.sections.reduce((a, s) => a + (pred(s) ? s.min : 0), 0); }
function splitMins(day) {
  let S = 0, G = 0;
  day.sections.forEach(s => { if (s.dom === 'S') S += s.min; else if (s.dom === 'G') G += s.min; else { S += s.min / 2; G += s.min / 2; } });
  return { S, G };
}
function wordCount(t) { return (t.trim().match(/\S+/g) || []).length; }
function barClass(p) { return p >= 75 ? '' : (p >= 55 ? ' mid' : ' low'); }
function fmtMin(sec) { return Math.round(sec / 60); }

function summary(id) {
  const day = DAYS[id], d = D(id);
  const out = { scores: {}, total: [0, 0], wrong: [], tags: {}, vocabNew: [], open: [], byExam: {}, byDom: { S: [0, 0], G: [0, 0] }, time: {}, minutes: 0, mock: {} };
  day.sections.forEach(sec => {
    out.time[sec.id] = Math.round((d.time[sec.id] || 0) / 60 * 10) / 10;
    out.minutes += (d.time[sec.id] || 0) / 60;
    if (sec.kind === 'quiz') {
      const items = itemsOf(sec);
      const s = d.secs[sec.id];
      if (!s) { out.open.push(sec.id); }
      if (sec.mock) { const p = sec.mock.pts || 1; out.mock[sec.id] = { label: sec.mock.label, ok: s ? s.ok : null, n: items.length, pts: s ? s.ok * p : null, max: items.length * p, t: Math.round((d.mockT[sec.id] || 0) / 6) / 10, plan: sec.min }; }
      out.scores[sec.id] = s ? [s.ok, s.total] : null;
      items.forEach(it => {
        const r = d.res[it.id]; if (!r) return;
        out.total[1]++; if (r.ok) out.total[0]++;
        const ex = out.byExam[sec.exam] = out.byExam[sec.exam] || [0, 0]; ex[1]++; if (r.ok) ex[0]++;
        if (it.dom && out.byDom[it.dom]) { out.byDom[it.dom][1]++; if (r.ok) out.byDom[it.dom][0]++; }
        if (!r.ok) {
          out.wrong.push({ id: it.id, sec: sec.id, exam: sec.exam, dom: it.dom, q: String(it.q).slice(0, 170), chosen: r.c >= 0 ? (it.letters ? it.opts[r.c] : (it.sentences ? LET[r.c] + ') ' + it.opts[r.c] : it.opts[r.c])) : null, correct: it.sentences ? LET[it.a] + ') ' + it.opts[it.a] : it.opts[it.a], tag: it.tag });
          out.tags[it.tag] = (out.tags[it.tag] || 0) + 1;
        }
      });
    } else if (sec.kind === 'cards') {
      sec.words.forEach((w, i) => { if (isNewMark(d, i)) out.vocabNew.push(w.de); });
      if (Object.keys(d.vocab).length < sec.words.length) out.open.push(sec.id);
    } else if (sec.kind === 'review') {
      const q = srsQueue(day.no);
      out.rev = { due: q.length, know: q.filter(it => d.rev[it.k] === 'know').length, again: q.filter(it => d.rev[it.k] === 'again').map(it => it.w.de + ' (Tag ' + it.origin + ')'), open: q.filter(it => !d.rev[it.k]).length };
      if (out.rev.open) out.open.push(sec.id);
    } else if (sec.kind === 'write') {
      if (!d.write.submitted) out.open.push(sec.id);
      out.writeWords = wordCount(d.write.text || ''); out.writeChecks = Object.values(d.write.checks || {}).filter(Boolean).length;
    } else if (sec.kind === 'speak') {
      if (!d.speak.done) out.open.push(sec.id);
      out.speakRating = d.speak.rating || null; out.speakSecs = d.speak.secs || null;
    } else if (sec.kind === 'wrap') { if (!d.closed) out.open.push(sec.id); }
  });
  out.minutes = Math.round(out.minutes);
  return out;
}

/* ---------- speech ---------- */
const SAY = [], SCRIPTS = [];
function sayIdx(t) { SAY.push(t); return SAY.length - 1; }
function germanVoices() { try { return speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang)); } catch (e) { return []; } }
function speakText(text, rate, lang) {
  if (!TTS) return false;
  lang = lang || 'de-DE';
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate || 0.95; const re = new RegExp('^' + lang.slice(0, 2), 'i'); const v = speechSynthesis.getVoices().filter(x => re.test(x.lang)); if (v.length) u.voice = v[0]; speechSynthesis.speak(u); return true; } catch (e) { return false; }
}
function speakScript(script, rate) {
  if (!TTS) return false;
  try {
    speechSynthesis.cancel(); const v = germanVoices();
    const who = []; script.forEach(l => { if (!who.includes(l.who)) who.push(l.who); });
    const PITCH = [0.85, 1.15, 1.0, 1.3, 0.75, 1.2, 0.95, 1.1];
    script.forEach(line => { const r = who.indexOf(line.who);
      if (line.ann) { const a = new SpeechSynthesisUtterance(line.ann + '.'); a.lang = 'de-DE'; a.rate = rate; if (v.length) a.voice = v[0]; a.pitch = 1; speechSynthesis.speak(a); }
      const u = new SpeechSynthesisUtterance(line.text); u.lang = 'de-DE'; u.rate = rate; if (v.length) u.voice = v[r % v.length]; u.pitch = PITCH[r % PITCH.length]; speechSynthesis.speak(u); });
    return true;
  } catch (e) { return false; }
}
function stopSpeech() { try { if (TTS) speechSynthesis.cancel(); } catch (e) {} }
const spkBtn = t => TTS ? `<button class="spk" type="button" data-act="spk" data-say="${sayIdx(t)}" aria-label="Vorlesen">▶ Vorlesen</button>` : '';

/* ---------- html builders ---------- */
function trBox(html, key, label) {
  const open = key && ui.tro[key];
  return `<div class="trbox${open ? ' open' : ''}" data-k="${esc(key || '')}"><button class="trbtn" type="button" data-act="tr" aria-expanded="${open ? 'true' : 'false'}">${esc(label || 'Türkçesi')}</button><div class="tr pl">${html}</div></div>`;
}
function domChip(dom) { return `<span class="chip ${dom}">${DOMLBL[dom]}</span>`; }

function optLetter(item, i) { return item.letters ? item.opts[i] : LET[i]; }
function mcTrText(b) {
  let t = b.tr;
  if (b.optTr) t += '\n\n' + b.opts.map((o, i) => (b.letters ? '' : LET[i] + ') ') + b.optTr[i]).join('\n');
  return t;
}
function fbHTML(day, it, r) {
  const ok = r && r.ok;
  const corr = it.letters ? it.opts[it.a].toUpperCase() : (LET[it.a] + ') ' + (it.sentences ? '' : it.opts[it.a]));
  return `<div class="fb ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Doğru.' : 'Yanlış. Doğru cevap: ' + esc(corr.trim())}</b><p class="pl">${esc(it.exp)}</p><div class="chips"><span class="chip tagc">${esc(tagLabel(day, it.tag))}</span></div></div>`;
}
function eoptsHTML(b, res) {
  if (!b.optsEn) return '';
  return `<div class="eopts">${b.optsEn.map((o, i) => `<div class="eo${res ? (i === b.a ? ' right' : (res.c === i ? ' wrong' : '')) : ''}"><span class="k">${LET[i]}</span><span lang="en">${esc(o)}</span></div>`).join('')}</div>`;
}
function mcHTML(sec, b, opt) {
  opt = opt || {};
  const day = curDay(), d = D(), id = sec.id + '_' + b.id, res = d.res[id];
  const it = itemsOf(sec).find(x => x.id === id);
  const cls = b.row ? ' row' : (b.letters ? ' letters' : '');
  const opts = b.opts.map((o, i) => {
    let c = '';
    if (res) { c = ' lock'; if (i === b.a) c += ' right'; else if (res.c === i) c += ' wrong'; else c += ' dim'; }
    else if (sec.mock && d.sel[id] === i) c = ' chosen';
    return `<button class="opt${c}" type="button" data-act="pick" data-id="${id}" data-i="${i}" ${res ? 'aria-disabled="true"' : ''}><span class="k">${b.letters ? esc(o) : LET[i]}</span>${b.letters ? '' : `<span class="t" lang="de">${esc(o)}</span>`}</button>`;
  }).join('');
  const key = 'i_' + id, hasEn = !!b.qEn, enOn = hasEn && ((res && ui.en) || ui.eno[key]);
  const corrEn = b.optsEn ? LET[b.a] + ') ' + b.optsEn[b.a] : (b.letters ? b.opts[b.a].toUpperCase() : '');
  const enFb = res && b.expEn ? `<div class="fb en ${res.ok ? 'ok' : 'bad'}"><b lang="en">${res.ok ? 'Correct.' : 'Not quite. Correct answer: ' + esc(corrEn)}</b><p class="pl" lang="en">${esc(b.expEn)}</p></div>` : '';
  const btn = hasEn ? `<button class="spk enbtn" type="button" data-act="enitem" data-id="${id}" aria-pressed="${ui.eno[key] ? 'true' : 'false'}" title="English version">EN</button>` : '';
  const sayB = b.say && TTS && !mockLive(sec) ? `<div class="qsay"><button class="btn" type="button" data-act="spk" data-say="${sayIdx(b.say.text)}">▶ ${esc(b.say.label)}</button></div>` : '';
  const left = `<div class="qrow"><p class="q pl" lang="de">${esc(b.q)}</p>${btn}</div>${sayB}<div class="opts${cls}" role="group" aria-label="Antworten">${opts}</div>${res ? fbHTML(day, it, res) : ''}`;
  const right = hasEn ? `<div class="col en"><span class="collab" lang="en">English version</span><p class="q pl" lang="en">${esc(b.qEn)}</p>${eoptsHTML(b, res)}${enFb}</div>` : '';
  return `<div class="item" data-item="${id}"><div class="bi${enOn ? ' en-on' : ''}" data-bi="${key}"><div class="col de" style="display:grid;gap:10px;align-content:start">${left}</div>${right}</div>${trBox(esc(mcTrText(b)), id)}</div>`;
}
function enText(b, key) { return esc(b.en); }
function clozeHTML(sec, b) {
  const day = curDay(), d = D();
  const ids = b.gaps.map((g, i) => sec.id + '_' + b.id + '_' + (i + 1));
  const checked = ids.every(id => d.res[id]);
  const parts = b.text.split(/\{(\d+)\}/); let html = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { html += esc(parts[i]); continue; }
    const n = +parts[i], g = b.gaps[n - 1], id = ids[n - 1], opts = g.opts || b.sentences, sel = d.sel[id], res = d.res[id];
    if (checked) {
      if (b.sentences) {
        if (res.ok) html += `<span class="gapdone ok"><sup>${n}·${LET[g.a]}</sup>${esc(opts[g.a])}</span>`;
        else html += `<span class="gapdone bad"><sup>${n}</sup>${res.c >= 0 ? '<s>' + LET[res.c] + '</s> ' : ''}<b>${LET[g.a]})</b> ${esc(opts[g.a])}</span>`;
      } else if (res.ok) html += `<span class="gapdone ok"><sup>${n}</sup>${esc(opts[g.a])}</span>`;
      else html += `<span class="gapdone bad"><sup>${n}</sup>${res.c >= 0 ? '<s>' + esc(opts[res.c]) + '</s> ' : ''}<b>${esc(opts[g.a])}</b></span>`;
    } else {
      html += `<select class="gap${sel !== undefined ? ' set' : ''}" data-id="${id}" aria-label="Lücke ${n}"><option value="">${n}</option>${opts.map((o, k) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${b.sentences ? LET[k] : esc(o)}</option>`).join('')}</select>`;
    }
  }
  const usedSet = ids.map(id => d.sel[id]).filter(v => v !== undefined);
  let bank = '';
  if (b.sentences) {
    bank = `<div class="bank" data-bank="${sec.id}_${b.id}" aria-label="Sätze zur Auswahl">${b.sentences.map((s, k) => `<div class="bs${!checked && usedSet.includes(k) ? ' used' : ''}"><i>${LET[k]}</i><span lang="de">${esc(s)}</span>${''}</div>`).join('')}</div>${trBox(b.sentences.map((s, k) => LET[k] + ') ' + esc(b.sentencesTr[k])).join('\n'), sec.id + '_' + b.id + '_bank', 'Türkçesi (cümleler)')}`;
  }
  const n = ids.filter(id => d.sel[id] !== undefined).length;
  let foot = '';
  if (!checked && sec.mock) foot = `<div class="qnav"><span class="hint" data-gapprog="${sec.id}_${b.id}">${n}/${ids.length} seçildi</span></div>`;
  else if (!checked) foot = `<div class="qnav"><button class="btn primary" type="button" data-act="chkgaps" data-blk="${sec.id}_${b.id}" ${n < ids.length ? 'disabled' : ''}>Prüfen</button><span class="hint" data-gapprog="${sec.id}_${b.id}">${n}/${ids.length} seçildi</span></div>`;
  else {
    const bad = b.gaps.map((g, i) => ({ g, i, r: d.res[ids[i]] })).filter(x => !x.r.ok);
    const lab = (g, k) => b.sentences ? LET[k] + ')' : '';
    foot = (bad.length ? `<ul class="eval">${bad.map(x => `<li><b>Lücke ${x.i + 1}: ${b.sentences ? LET[x.g.a] + ') ' : ''}${esc((x.g.opts || b.sentences)[x.g.a])}</b><br>${esc(x.g.exp)} <span class="chip tagc">${esc(tagLabel(day, x.g.tag))}</span></li>`).join('')}</ul>` : `<p class="allok">Tüm boşluklar doğru.</p>`)
      + `<details class="alls"${bad.length ? '' : ' open'}><summary>Tüm boşluklar için açıklamalar (${b.gaps.length})</summary><ol>${b.gaps.map((g, i) => `<li><b lang="de">${b.sentences ? LET[g.a] + ') ' : ''}${esc((g.opts || b.sentences)[g.a])}</b><br>${esc(g.exp)}${g.opts ? `<div class="optline">${g.opts.map((o, k) => `<span class="${k === g.a ? 'okw' : ''}">${LET[k]}) ${esc(o)} = ${esc(g.optTr[k])}</span>`).join('')}</div>` : ''}</li>`).join('')}</ol></details>`;
  }
  const enOn = checked && ui.en || ui.eno[sec.id + '_' + b.id];
  const enSent = b.sentencesEn ? `<span class="collab" lang="en">Sentences to choose from</span><div class="bank">${b.sentencesEn.map((x, k) => `<div class="bs"><i>${LET[k]}</i><span lang="en">${esc(x)}</span></div>`).join('')}</div>` : '';
  const enAns = checked ? `<div class="enx"><span class="collab" lang="en">Answers and explanations</span><ol>${b.gaps.map((g, i) => { const corr = b.sentences ? LET[g.a] + ') ' + (b.sentencesEn ? b.sentencesEn[g.a] : '') : (g.optsEn ? g.optsEn[g.a] + ' (' + g.opts[g.a] + ')' : ''); return `<li><b lang="en">${i + 1}. ${esc(corr)}</b><br><span lang="en">${esc(g.expEn || '')}</span>${g.optsEn ? `<div class="optline">${g.optsEn.map((o, k) => `<span class="${k === g.a ? 'okw' : ''}">${LET[k]}) ${esc(o)}</span>`).join('')}</div>` : ''}</li>`; }).join('')}</ol></div>` : '';
  const enBlock = `<div class="bi${enOn ? ' en-on' : ''}" data-bi="${sec.id}_${b.id}"><div class="col en">${enSent}<span class="collab" lang="en" style="margin-top:8px">English version (complete text)</span><div class="pbody pl" lang="en">${esc(b.en)}</div>${enAns}</div></div>`;
  return `<div class="cloze"><div class="pt"><span lang="de">${esc(b.title)}</span><span class="acts">${spkBtn(b.text.replace(/\{\d+\}/g, '…'))}<button class="spk" type="button" data-act="enbtn" data-key="${sec.id}_${b.id}">EN</button></span></div>${bank}<div class="cl-body" lang="de">${html}</div>${foot}${enBlock}${trBox(esc(b.tr), sec.id + '_' + b.id + '_tr', checked ? 'Türkçesi (tam metin)' : 'Türkçesi (cevapları gösterebilir)')}</div>`;
}
function textHTML(sec, b, idx) {
  const key = sec.id + '_t' + idx;
  const done = secDone(sec);
  const enOn = (done && ui.en) || ui.eno[key];
  let de, en, tr;
  if (b.paras) {
    de = b.paras.map(p => `<div class="para"><span class="pk">${esc(p.k)}</span><div><h4>${esc(p.h)}</h4><div class="pbody pl" lang="de">${esc(p.de)}</div></div></div>`).join('');
    en = b.paras.map(p => `<div class="para"><span class="pk">${esc(p.k)}</span><div class="pbody pl" lang="en">${esc(p.en)}</div></div>`).join('');
    tr = b.paras.map(p => p.k.toUpperCase() + ') ' + esc(p.h) + '\n' + esc(p.tr)).join('\n\n');
  } else { de = `<div class="pbody pl" lang="de">${esc(b.de)}</div>`; en = `<div class="pbody pl" lang="en">${esc(b.en)}</div>`; tr = esc(b.tr); }
  const full = b.paras ? b.paras.map(p => p.de).join(' ') : b.de;
  return `<div class="passage"><div class="pt"><span lang="de">${esc(b.title)}</span><span class="acts">${spkBtn(full)}<button class="spk" type="button" data-act="enbtn" data-key="${key}">EN</button></span></div><div class="bi${enOn ? ' en-on' : ''}" data-bi="${key}"><div class="col de">${de}</div><div class="col en"><span class="collab" lang="en">English version</span>${en}</div></div>${trBox(tr, key + '_tr')}</div>`;
}
function noteHTML(b, single, first) {
  const body = `<div class="bi${b.en && ui.en ? ' en-on' : ''}"><div class="col de"><div class="nb" lang="de">${esc(b.de)}</div></div>${b.en ? `<div class="col en"><span class="collab" lang="en">${esc(b.titleEn || 'English version')}</span><div class="nb" lang="en">${esc(b.en)}</div></div>` : ''}</div>${trBox(esc(b.tr), 'note_' + b.title)}`;
  if (single) return `<details class="notefold"${first ? ' open' : ''}><summary>${esc(b.title)}</summary>${body}</details>`;
  return `<div class="note${b.pre ? ' pre' : ''}"><div class="nt" lang="de">${esc(b.title)}</div>${body}</div>`;
}
function listenHTML(sec, b) {
  const si = SCRIPTS.push(b.announce ? b.script.map(l => Object.assign({}, l, { ann: b.roles[l.who] })) : b.script) - 1, key = sec.id + '_listen';
  const whos = []; b.script.forEach(l => { if (!whos.includes(l.who)) whos.push(l.who); });
  const live = mockLive(sec), played = live && !!D().plays[sec.id];
  const per = b.perLine && TTS && !live ? `<div class="lper"><span class="hint">Tek tek dinle:</span>${whos.map(w => `<button class="btn" type="button" data-act="lplay1" data-who="${esc(w)}">▶ ${esc(b.roles[w])}</button>`).join('')}</div>` : '';
  const open = ui.eno[key + '_t'] || !TTS || secDone(sec);
  const lines = b.script.map((l, i) => `<div class="ln"><b>${esc(b.roles[l.who])}</b><div><span lang="de">${esc(l.text)}</span><div class="eng" lang="en">${esc(b.enScript[i])}</div></div></div>`).join('');
  const trl = b.trScript.map((t, i) => esc(b.roles[b.script[i].who]) + ': ' + esc(t)).join('\n\n');
  return `<div class="listen" data-script="${si}"><div class="pt"><span lang="de">${esc(b.title)}</span></div>
    <div class="lctl">${TTS && live ? `<button class="btn primary" type="button" data-act="lplayonce"${played ? ' disabled' : ''}>${played ? '✓ Gehört' : '▶ Einmal anhören'}</button><button class="btn" type="button" data-act="lstop">■ Stopp</button>` : TTS ? `<button class="btn primary" type="button" data-act="lplay">▶ Anhören</button><button class="btn" type="button" data-act="lstop">■ Stopp</button><label class="slow"><input type="checkbox" class="lslow"> langsamer</label>` : ''}<button class="btn" type="button" data-act="ltrans" aria-expanded="${open ? 'true' : 'false'}">Transkript</button></div>
    <p class="hint">${TTS && live ? (played ? 'Ses çalındı. Gerçek sınavdaki gibi ikinci kez dinlenmez; notlarınla cevapla. „Abgeben“den sonra istediğin kadar tekrar dinleyebilir, transkripti açabilirsin.' : 'Sınav modu: Ses gerçek sınavdaki gibi yalnızca bir kez çalar; durdurursan yeniden başlatamazsın. Önce soruları oku, dinlerken not al. „Abgeben“den sonra istediğin kadar tekrar dinleyebilirsin.') : TTS ? 'Ses, cihazının Almanca sesiyle çalar. Sınavda her metni yalnızca bir kez duyarsın; önce bir kez dinleyip cevapla, sonra kontrol için tekrar dinle. Ses gelmezse Transkript’i aç.' : 'Bu cihazda sesli okuma yok. Transkripti oku, sonra soruları çöz.'}</p>
    ${per}<div class="ltext${ui.en && open ? ' show-en' : ''}" ${open ? '' : 'hidden'}>${lines}</div>${trBox(trl, key + '_tr')}</div>`;
}
function blockHTML(sec, b, idx, single) {
  switch (b.type) {
    case 'text': return textHTML(sec, b, idx);
    case 'note': return noteHTML(b, single, idx === 0);
    case 'listen': return listenHTML(sec, b);
    case 'mc': return mcHTML(sec, b);
    case 'cloze': return clozeHTML(sec, b);
  }
  return '';
}
function resultHTML(sec) {
  const d = D(), s = d.secs[sec.id]; if (!s) return '';
  const p = Math.round(100 * s.ok / s.total);
  const items = itemsOf(sec), day = curDay();
  const missed = {}; items.forEach(it => { if (!d.res[it.id].ok) missed[it.tag] = (missed[it.tag] || 0) + 1; });
  const tags = Object.entries(missed).sort((a, b) => b[1] - a[1]);
  const msg = p >= 85 ? 'Çok iyi.' : p >= 70 ? 'İyi.' : p >= 55 ? 'Orta; yanlışlara bak.' : 'Bu bölümü yarın yeniden çalışacağız.';
  return `<div class="result" id="result"><div class="big">${s.ok} / ${s.total} <span style="font-size:15px;color:var(--ink2)">(${p}%) · ${msg}</span></div><div class="bar${barClass(p)}"><i style="width:${p}%"></i></div>${tags.length ? `<div class="chips">${tags.map(([t, c]) => `<span class="chip tagc">${esc(tagLabel(day, t))} · ${c}</span>`).join('')}</div>` : ''}</div>`;
}
function reviewHTML(sec) {
  const d = D(), day = curDay();
  return `<div class="review">${itemsOf(sec).map(it => { const r = d.res[it.id]; const chosen = r.c >= 0 ? it.opts[r.c] : '—'; return `<div class="rv ${r.ok ? 'ok' : 'bad'}"><div class="rq pl" lang="de">${esc(it.q)}</div><div class="ra">${r.ok ? 'Doğru: <b>' + esc(it.sentences ? LET[it.a] + ') ' + it.opts[it.a] : it.opts[it.a]) + '</b>' : 'Senin cevabın: <s>' + esc(it.sentences ? LET[r.c] : chosen) + '</s> · Doğru: <b>' + esc(it.sentences ? LET[it.a] + ') ' + it.opts[it.a] : it.opts[it.a]) + '</b>'}</div>${r.ok ? '' : `<div class="ra">${esc(it.exp)}</div>`}</div>`; }).join('')}</div>`;
}
function firstOpen(sec) { const d = D(); const its = itemsOf(sec); const i = its.findIndex(x => !d.res[x.id]); return i < 0 ? its.length : i; }

function quizBody(sec) {
  const d = D(), items = itemsOf(sec);
  if (sec.mode === 'single') {
    const mcs = sec.blocks.filter(b => b.type === 'mc');
    const notes = sec.blocks.filter(b => b.type === 'note');
    if (ui.q[sec.id] === undefined) ui.q[sec.id] = firstOpen(sec);
    let qi = ui.q[sec.id];
    qi = Math.max(0, Math.min(qi, mcs.length));
    const dots = `<div class="qdots">${mcs.map((b, i) => { const r = d.res[sec.id + '_' + b.id]; return `<button class="qd${r ? (r.ok ? ' ok' : ' bad') : ''}${i === qi ? ' cur' : ''}" type="button" data-act="qjump" data-i="${i}" aria-label="Soru ${i + 1}"></button>`; }).join('')}</div>`;
    if (qi >= mcs.length && d.secs[sec.id]) {
      return `<div id="qarea">${resultHTML(sec)}<details class="alls" open><summary>Tüm soruların gözden geçirilmesi</summary>${reviewHTML(sec)}</details></div>`;
    }
    const b = mcs[Math.min(qi, mcs.length - 1)], res = d.res[sec.id + '_' + b.id];
    const last = qi === mcs.length - 1;
    return `<div id="qarea" class="surface">${notes.map((n, i) => noteHTML(n, true, qi === 0)).join('')}<div class="qtop"><span class="qn">Soru ${qi + 1} / ${mcs.length}</span>${dots}</div>${mcHTML(sec, b)}
      <div class="qnav">${qi > 0 ? `<button class="btn ghost" type="button" data-act="qprev">← Önceki</button>` : ''}${res ? `<button class="btn primary" type="button" data-act="qnext">${last ? 'Sonucu gör' : 'Sonraki soru →'}</button>` : '<span class="hint">Bir şık seç. Klavyeden a, b, c tuşları da çalışır.</span>'}</div></div>`;
  }
  const blocks = sec.blocks.map((b, i) => blockHTML(sec, b, i, false)).join('');
  if (sec.mock) return mockHead(sec) + `<div class="surface" id="qarea">${blocks}</div>` + mockFoot(sec);
  return `<div class="surface" id="qarea">${blocks}</div>${d.secs[sec.id] ? resultHTML(sec) : `<div class="hint" id="qprog">${items.filter(i => d.res[i.id]).length}/${items.length} soru tamamlandı</div>`}`;
}
function mockAnswered(sec) { const d = D(); return itemsOf(sec).filter(it => d.sel[it.id] !== undefined).length; }
function mockClock(sec) { const used = D().mockT[sec.id] || 0, rem = sec.min * 60 - used; return rem >= 0 ? fmt(rem) : '+' + fmt(-rem); }
function mockHead(sec) {
  const m = mockPts(sec);
  if (!m.done) return `<div class="mockbar" role="status"><span class="mk">Probeprüfung · <span lang="de">${esc(sec.mock.label)}</span></span><span class="mt${(D().mockT[sec.id] || 0) > sec.min * 60 ? ' over' : ''}" id="mockt" aria-label="Kalan süre">${mockClock(sec)}</span><span class="mp">${m.n} Aufgaben · ${m.max} Punkte</span></div><p class="mockover" id="mockover" ${(D().mockT[sec.id] || 0) > sec.min * 60 ? '' : 'hidden'}>Süre doldu. Gerçek sınavda cevap kâğıdı şimdi toplanırdı; işaretlediklerini teslim et.</p>`;
  const p = Math.round(100 * m.pts / m.max);
  return `<div class="mockres" id="result"><div class="mk" lang="de">Probeprüfung · ${esc(sec.mock.label)}</div><div class="big">${m.pts} / ${m.max} Punkte <span>(${p}%) · ${m.ok}/${m.n} richtig · Zeit ${fmt(m.t)} / ${sec.min}:00</span></div><div class="bar${barClass(p)}"><i style="width:${p}%"></i></div><p class="hint">${p >= 60 ? 'Bu bölümde sınav eşiğinin (%60) üzerindesin.' : 'Bu bölüm sınav eşiğinin (%60) altında; aşağıdaki açıklamaları oku.'} Açıklamalar her sorunun altında; İngilizce ve Türkçe yardımlar artık açık.</p></div>`;
}
function mockFoot(sec) {
  const m = mockPts(sec);
  if (m.done) return resultHTML(sec);
  const n = mockAnswered(sec), left = m.n - n;
  const conf = ui.mconfirm === sec.id && left ? `<p class="mockwarn">${left} soru boş. Boş sorular 0 puan sayılır. Yine de teslim etmek için tekrar “Abgeben”e bas.</p>` : '';
  return `<div class="mockfoot">${conf}<div class="qnav"><button class="btn primary big" type="button" data-act="mocksub">Abgeben</button><span class="hint" id="mockprog">${n}/${m.n} beantwortet</span></div><p class="hint">Sınav modu: cevaplar teslimden sonra kontrol edilir; o zamana kadar seçimini değiştirebilirsin. İngilizce ve Türkçe yardımlar teslimden sonra açılır.</p></div>`;
}
function mockSubmit() {
  const sec = curSec(), d = D(); if (!mockLive(sec)) return;
  const items = itemsOf(sec), left = items.filter(it => d.sel[it.id] === undefined).length;
  if (left && ui.mconfirm !== sec.id) { ui.mconfirm = sec.id; rerender(); nudge('.mockfoot'); return; }
  ui.mconfirm = null;
  items.forEach(it => { const s = d.sel[it.id]; d.res[it.id] = { c: s === undefined ? -1 : s, ok: s === it.a ? 1 : 0 }; });
  finalizeSec(sec); queueSave(); render(); const r = $('#result'); if (r) r.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
}
function mockProg() { const sec = curSec(); if (!mockLive(sec)) return; const el = $('#mockprog'); if (el) el.textContent = mockAnswered(sec) + '/' + itemsOf(sec).length + ' beantwortet'; const w = $('.mockwarn'); if (w && !itemsOf(sec).some(it => D().sel[it.id] === undefined)) w.remove();
}

/* vocabulary deck */
function deckOrder(sec) { const n = sec.words.length; if (ui.order && ui.order.length) return ui.order; return Array.from({ length: n }, (_, i) => i); }
function deckBody(sec) {
  const d = D(), order = deckOrder(sec), total = sec.words.length;
  const nMarked = Object.keys(d.vocab).length;
  let pos = Math.max(0, Math.min(d.card, order.length));
  if (!ui.order && nMarked >= total) pos = order.length;
  if (pos >= order.length) return summaryDeck(sec);
  const wi = order[pos], w = sec.words[wi], m = d.vocab[wi];
  const ticks = `<div class="ticks">${order.map((k, i) => `<button class="tk ${d.vocab[k] || ''}${i === pos ? ' cur' : ''}" type="button" data-act="cjump" data-i="${i}" aria-label="Karte ${i + 1}"></button>`).join('')}</div>`;
  const trShow = ui.trCard;
  const back = ui.flip ? `<div class="fc-back"><div class="cols2">
      <div class="cbox en"><h4 lang="en">English</h4><div class="w" lang="en">${esc(w.en)}</div></div>
      <div class="cbox trb"><h4>Türkçe</h4>${trShow ? `<div class="w">${esc(w.tr)}</div>` : `<div class="trv">${esc(w.tr)}</div><button class="revbtn" type="button" data-act="revtr">Türkçesini göster</button>`}</div></div>
    <div class="exde" lang="de">${esc(w.ex)} ${spkBtn(w.ex)}</div>
    <div class="cols2"><div class="cbox en"><h4 lang="en">Example · EN</h4><div class="ex en" lang="en">${esc(w.exEn)}</div></div><div class="cbox trb"><h4>Örnek · TR</h4>${trShow ? `<div class="ex">${esc(w.exTr)}</div>` : `<div class="trv">${esc(w.exTr)}</div><span class="hint">Türkçe açılınca görünür.</span>`}</div></div>
    <div class="marks"><button class="btn know" type="button" data-act="mark" data-m="know">Kannte ich</button><button class="btn newb" type="button" data-act="mark" data-m="new">Neu für mich</button></div></div>` : '';
  return `<div class="deck"><div class="dtop"><span class="qn">Karte ${pos + 1} / ${order.length}${ui.order ? ' · sadece yeni kartlar' : ''}</span>${domChip(w.dom)}</div>${ticks}
    <div class="fc ${w.dom}"><div class="fc-front"><div class="fc-de" lang="de">${esc(w.de)}</div><div class="fc-info">${esc(w.info || '')}</div>${spkBtn(w.de.replace(/^(der|die|das) /, '$1 '))}
    ${ui.flip ? '' : `<button class="btn primary big" type="button" data-act="flip">Aufdecken</button><span class="hint">Önce anlamını tahmin et. Klavyede Boşluk tuşu da açar.</span>`}</div>${back}</div>
    <div class="qnav"><button class="btn ghost" type="button" data-act="cprev" ${pos === 0 ? 'disabled' : ''}>← Önceki</button><button class="btn ghost" type="button" data-act="cnext">Atla →</button>${m ? `<span class="chip ${m === 'know' ? 'S' : 'tagc'}">${m === 'know' ? 'bildiğin' : 'yeni'}</span>` : ''}</div></div>`;
}
function summaryDeck(sec) {
  const d = D(), known = sec.words.filter((w, i) => d.vocab[i] === 'know').length, fresh = sec.words.map((w, i) => ({ w, i })).filter(x => d.vocab[x.i] === 'new');
  const rows = (fresh.length ? fresh : []).map(x => `<tr><td lang="de">${esc(x.w.de)}</td><td lang="en">${esc(x.w.en)}</td><td><span class="trv">${esc(x.w.tr)}</span><button class="revbtn" type="button" data-act="revrow">TR</button></td></tr>`).join('');
  return `<div class="result"><div class="big">${known} bildiğin · ${fresh.length} yeni</div><p>${fresh.length ? 'Yeni kelimeler aşağıda. Yarın, sonra 3., 7. ve 14. çalışma gününde Wiederholung adımında geri gelecekler.' : 'Hepsini biliyordun. Yarın bir sonraki sete geçiyoruz.'}</p>
    <div class="qnav"><button class="btn" type="button" data-act="deckreset">Baştan başla</button>${fresh.length ? `<button class="btn primary" type="button" data-act="decknew">Sadece yeni kartları tekrar et</button>` : ''}</div></div>
    ${fresh.length ? `<div class="surface"><h3>Yeni kelimelerin</h3><div class="tw"><table class="vtab"><thead><tr><th lang="de">Deutsch</th><th lang="en">English</th><th>Türkçe</th></tr></thead><tbody>${rows}</tbody></table></div></div>` : ''}`;
}

/* spaced-repetition review (1-3-7-14) */
function reviewBody(sec) {
  const day = curDay(), d = D(), q = srsQueue(day.no);
  if (!q.length) {
    const st = srsStats(day.no - 1);
    return `<div class="result"><div class="big">Bugün tekrar sırası gelen kelime yok.</div><p>Kartlarda “Neu für mich” işaretlediğin kelimeler 1., 3., 7. ve 14. çalışma gününde buraya gelir. ${st.active ? 'Şu an tekrar sırasında ' + st.active + ' kelime var; sıraları sonraki günlerde.' : 'Henüz tekrar sırasında kelime yok.'}</p></div>`;
  }
  let pos = ui.rpos;
  if (pos === undefined) { pos = q.findIndex(it => !d.rev[it.k]); if (pos < 0) pos = q.length; }
  pos = Math.max(0, Math.min(pos, q.length));
  if (pos >= q.length) {
    const know = q.filter(it => d.rev[it.k] === 'know'), again = q.filter(it => d.rev[it.k] === 'again'), open = q.filter(it => !d.rev[it.k]);
    const rows = again.map(it => `<tr><td lang="de">${esc(it.w.de)} ${spkBtn(it.w.de)}</td><td lang="en">${esc(it.w.en)}</td><td><span class="trv">${esc(it.w.tr)}</span><button class="revbtn" type="button" data-act="revrow">TR</button></td></tr>`).join('');
    return `<div class="result"><div class="big">${know.length} bildin · ${again.length} tekrar gelecek${open.length ? ' · ' + open.length + ' açık' : ''}</div>
      <p>Bildiklerin bir sonraki aralığa geçti (1 → 3 → 7 → 14. gün; 14. günü de bilirsen kelime “öğrenildi” sayılır). Bilemediklerin yarın yeniden gelir.</p>
      <div class="qnav">${open.length ? `<button class="btn primary" type="button" data-act="rgo" data-i="${q.indexOf(open[0])}">Açık kartlara dön</button>` : ''}<button class="btn" type="button" data-act="rreset">Tekrarı baştan yap</button></div></div>
      ${again.length ? `<div class="surface"><h3>Yarın yeniden gelecek</h3><div class="tw"><table class="vtab"><thead><tr><th lang="de">Deutsch</th><th lang="en">English</th><th>Türkçe</th></tr></thead><tbody>${rows}</tbody></table></div></div>` : ''}`;
  }
  const it = q[pos], w = it.w, m = d.rev[it.k];
  const ticks = `<div class="ticks">${q.map((x, i) => `<button class="tk ${d.rev[x.k] === 'know' ? 'know' : d.rev[x.k] === 'again' ? 'new' : ''}${i === pos ? ' cur' : ''}" type="button" data-act="rgo" data-i="${i}" aria-label="Karte ${i + 1}"></button>`).join('')}</div>`;
  const trShow = ui.trCard;
  const back = ui.flip ? `<div class="fc-back"><div class="cols2">
      <div class="cbox en"><h4 lang="en">English</h4><div class="w" lang="en">${esc(w.en)}</div></div>
      <div class="cbox trb"><h4>Türkçe</h4>${trShow ? `<div class="w">${esc(w.tr)}</div>` : `<div class="trv">${esc(w.tr)}</div><button class="revbtn" type="button" data-act="revtr">Türkçesini göster</button>`}</div></div>
    ${w.ex ? `<div class="exde" lang="de">${esc(w.ex)} ${spkBtn(w.ex)}</div>
    <div class="cols2"><div class="cbox en"><h4 lang="en">Example · EN</h4><div class="ex en" lang="en">${esc(w.exEn || '')}</div></div><div class="cbox trb"><h4>Örnek · TR</h4>${trShow ? `<div class="ex">${esc(w.exTr || '')}</div>` : `<div class="trv">${esc(w.exTr || '')}</div><span class="hint">Türkçe açılınca görünür.</span>`}</div></div>` : ''}
    <div class="marks"><button class="btn know" type="button" data-act="rmark" data-m="know">Wusste ich</button><button class="btn newb" type="button" data-act="rmark" data-m="again">Noch nicht</button></div></div>` : '';
  const lbl = `Tag ${it.origin} · Tekrar ${it.step + 1}/4${it.lapses ? ' · ' + it.lapses + '× sıfırlandı' : ''}${it.due < day.no ? ' · gecikmiş' : ''}`;
  return `<div class="deck"><div class="dtop"><span class="qn">Karte ${pos + 1} / ${q.length}</span><span class="chip min">${esc(lbl)}</span>${domChip(w.dom)}</div>${ticks}
    <div class="fc ${w.dom}"><div class="fc-front"><div class="fc-de" lang="de">${esc(w.de)}</div><div class="fc-info">${esc(w.info || '')}</div>${spkBtn(w.de)}
    ${ui.flip ? '' : `<button class="btn primary big" type="button" data-act="flip">Aufdecken</button><span class="hint">Önce anlamını hatırlamaya çalış. Boşluk tuşu açar; ← biliyordum, → henüz değil.</span>`}</div>${back}</div>
    <div class="qnav"><button class="btn ghost" type="button" data-act="rgo" data-i="${pos - 1}" ${pos === 0 ? 'disabled' : ''}>← Önceki</button><button class="btn ghost" type="button" data-act="rgo" data-i="${pos + 1}">Atla →</button>${m ? `<span class="chip ${m === 'know' ? 'S' : 'tagc'}">${m === 'know' ? 'bildin' : 'tekrar gelecek'}</span>` : ''}</div></div>`;
}
function markReview(m) {
  const day = curDay(), d = D(), q = srsQueue(day.no);
  let pos = ui.rpos === undefined ? q.findIndex(it => !d.rev[it.k]) : ui.rpos;
  const it = q[pos]; if (!it) return;
  d.rev[it.k] = m; ui.flip = false; ui.trCard = false;
  const nxt = q.findIndex((x, i) => i > pos && !d.rev[x.k]);
  const any = q.findIndex(x => !d.rev[x.k]);
  ui.rpos = nxt >= 0 ? nxt : (any >= 0 ? any : q.length);
  queueSave(); rerender(); if (ui.rpos >= q.length) window.scrollTo(0, 0);
}

/* writing / speaking */
const HINS = [];
function helpersHTML(list, label, ins) {
  return `<details class="helpers"${ins ? ' open' : ''}><summary>${label} (${list.length})</summary>${ins ? '<p class="hint" style="margin:6px 0 0">“+ Ekle” kalıbı metnin imlecin olduğu yere ekler; “…” yerlerini kendin doldur.</p>' : ''}<ul class="hl">${list.map(h => `<li><div class="hde" lang="de"><span>${esc(h.de)}</span>${spkBtn(h.de)}${ins ? `<button class="spk hins" type="button" data-act="hins" data-h="${HINS.push(h.de) - 1}">+ Ekle</button>` : ''}</div><div class="hen" lang="en">${esc(h.en)}</div><span class="trbox-inline">${trBox(esc(h.tr), 'h_' + h.de.slice(0, 24))}</span></li>`).join('')}</ul></details>`;
}
function writeBody(sec) {
  const w = D().write, text = w.text || '', n = wordCount(text), sub = !!w.submitted;
  const checks = sec.checks.map((c, i) => `<label class="chk"><input type="checkbox" class="wchk" data-i="${i}" ${w.checks && w.checks[i] ? 'checked' : ''}><span><span lang="de">${esc(c)}</span>${ui.en && sec.checksEn ? `<span class="enl" lang="en">${esc(sec.checksEn[i])}</span>` : ''}</span></label>`).join('');
  const model = sub ? `<div class="model" id="model"><div class="pt"><span lang="de">Mustertext (Beispiel, kein Lösungsschlüssel)</span><span class="acts">${spkBtn(sec.model)}</span></div><div class="bi${ui.en ? ' en-on' : ''}"><div class="col de"><div class="pbody pl" lang="de">${esc(sec.model)}</div></div><div class="col en"><span class="collab" lang="en">English version</span><div class="pbody pl" lang="en">${esc(sec.modelEn)}</div></div></div>${trBox(esc(sec.modelTr), 'model_tr')}<p class="hint">Kendi metnini sohbete yapıştırıp "yazımı kontrol et" dersen düzeltilmiş cümleleri veririm.</p></div>` : `<div class="qnav"><button class="btn primary" type="button" data-act="wsub">${ui.wconfirm ? 'Yine de örnek metni göster' : 'Bitirdim, örnek metni göster'}</button><span class="hint">${ui.wconfirm ? 'Henüz ' + n + ' kelime yazdın. Kalıplardan birkaçını “+ Ekle” ile alıp tamamlamayı dene; 3 cümle bile yeter.' : 'Önce kendi metnini yaz. Örnek metin sonra açılır.'}</span></div>`;
  return `<div class="surface"><div class="${ui.en ? 'en-vis' : ''}">${helpersHTML(sec.helpers, 'Hilfreiche Formulierungen', !sub)}</div>
    <label class="lbl" for="wr_text">Dein Text · <span lang="de">${esc(sec.topic)}</span></label>${ui.en && sec.topicEn ? `<span class="enl" lang="en" style="margin-top:-8px">${esc(sec.topicEn)}</span>` : ''}
    <textarea id="wr_text" lang="de" spellcheck="false" placeholder="Schreiben Sie hier …">${esc(text)}</textarea>
    <div class="wc"><span id="wc" class="${n >= sec.minWords && n <= sec.maxWords ? 'okc' : ''}">${n} Wörter</span><span>Ziel: ${sec.minWords}–${sec.maxWords}</span></div>
    <fieldset class="checks"><legend>Selbstkontrolle</legend>${checks}</fieldset>${model}</div>`;
}
const FREE_PARTNER = 'https://claude.ai/artifact/Kxxn5QzTgQfJ53gdCzhF7z';
function speakBody(sec) {
  const s = D().speak, ck = s.checks || {};
  const checks = sec.checks.map((c, i) => `<label class="chk"><input type="checkbox" class="schk" data-i="${i}" ${ck[i] ? 'checked' : ''}><span><span lang="de">${esc(c)}</span>${ui.en && sec.checksEn ? `<span class="enl" lang="en">${esc(sec.checksEn[i])}</span>` : ''}</span></label>`).join('');
  const struct = sec.structure.map(x => `<li lang="de">${esc(x.de)}<span>${esc(x.tr)}</span>${ui.en && x.en ? `<span class="enl" lang="en">${esc(x.en)}</span>` : ''}</li>`).join('');
  const done = (D().partner || []).filter(x => x.id === curDay().id + '-1a');
  const partner = `<div class="partner-cta"><div><b>Sprechpartner</b><p>Sunumunu Claude’a mikrofonla anlat: Claude doğal sesle cevap verir, önce cümlenin doğru hâlini söyler, ek soru sorar ve sonunda telc ölçütleriyle not verir. Laptopta Chrome’da ya da Claude uygulamasında Pro ile ücretsiz; telefonda kendi anahtarlarınla.${done.length ? ` <b>Son sonucun: ${done[done.length - 1].pct}% · Not ${done[done.length - 1].grade}</b>` : ''}</p></div><div class="pc-btns"><a class="btn primary" href="${FREE_PARTNER}#${encodeURIComponent(curDay().id + '-1a')}" target="_blank" rel="noopener">Laptopta ücretsiz</a><a class="btn" href="sprechen/#today">Telefonda (kendi anahtarınla)</a></div></div>`;
  return `<div class="surface"><h3>Thema: <span lang="de">${esc(sec.topic)}</span></h3>${ui.en && sec.topicEn ? `<span class="enl" lang="en" style="margin-top:-8px">${esc(sec.topicEn)}</span>` : ''}${partner}<ol class="struct">${struct}</ol>
    <div class="${ui.en ? 'en-vis' : ''}">${helpersHTML(sec.helpers, 'Redemittel für den Vortrag')}</div>
    <div class="timer"><span class="tm" id="tm">${fmt(tSec)}</span><button class="btn primary" type="button" data-act="tstart">Başlat</button><button class="btn" type="button" data-act="tstop">Durdur</button><button class="btn ghost" type="button" data-act="treset">Sıfırla</button><span class="hint">Hedef: ${fmt(sec.target)}</span></div>
    <fieldset class="checks"><legend>Selbstkontrolle</legend>${checks}</fieldset>
    <label class="lbl" for="sp_rate">Akıcılığını 1 (çok takıldım) ile 5 (akıcıydı) arasında puanla</label>
    <div><select id="sp_rate" class="rate"><option value="">Seç</option>${[1, 2, 3, 4, 5].map(v => `<option value="${v}" ${s.rating === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <label class="lbl" for="sp_notes">Nerede takıldın? Hangi kelimeyi bilmiyordun?</label>
    <textarea id="sp_notes" class="sp-notes" lang="de">${esc(s.notes || '')}</textarea>
    <div class="qnav"><button class="btn primary" type="button" data-act="sdone">${s.done ? '✓ Tamamlandı' : 'Bölümü tamamla'}</button></div></div>`;
}
function wrapBody(sec) {
  const day = curDay(), d = D(), cards = day.sections.find(s => s.kind === 'cards');
  const fresh = cards ? cards.words.map((w, i) => ({ w, i })).filter(x => isNewMark(d, x.i)) : [];
  const sm = summary(ui.day);
  const rows = fresh.map(x => `<tr><td lang="de">${esc(x.w.de)} ${spkBtn(x.w.de)}</td><td lang="en">${esc(x.w.en)}</td><td><span class="trv">${esc(x.w.tr)}</span><button class="revbtn" type="button" data-act="revrow">TR</button></td></tr>`).join('');
  return `<div class="surface"><h3>Yeni kelimelerin (${fresh.length})</h3>${fresh.length ? `<div class="tw"><table class="vtab"><thead><tr><th lang="de">Deutsch</th><th lang="en">English</th><th>Türkçe</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">Kartlarda "Neu für mich" işaretlediğin kelime yok.</div>'}
    <label class="lbl" for="notes">Öğretmenine not: takıldığın bir soru, anlamadığın bir kural ya da öğrenmek istediğin bir konu</label>
    <textarea id="notes" class="sp-notes" style="min-height:120px">${esc(d.notes || '')}</textarea>
    <div class="qnav"><button class="btn primary big" type="button" data-act="finish">${d.closed ? 'Raporu aç' : 'Günü bitir ve raporu aç'}</button><span class="hint">Bugün: ${sm.total[0]}/${sm.total[1]} doğru · ${sm.minutes} dk</span></div></div>`;
}

/* ---------- views ---------- */
function stepBody(sec) {
  if (sec.kind === 'quiz') return quizBody(sec);
  if (sec.kind === 'cards') return deckBody(sec);
  if (sec.kind === 'write') return writeBody(sec);
  if (sec.kind === 'speak') return speakBody(sec);
  if (sec.kind === 'wrap') return wrapBody(sec);
  if (sec.kind === 'review') return reviewBody(sec);
  return '';
}
function stepHTML(day, sec, i) {
  return `<div class="stephead"><div class="sh-row"><span class="chip" lang="de">${esc(sec.exam)}</span>${sec.mock ? '<span class="chip mockc">Probeprüfung</span>' : (hasSector(day) ? domChip(sec.dom) : '')}<span class="chip min">${sec.min} dk</span></div><h1>${esc(sec.title)}</h1>${ui.en && sec.titleEn ? `<div class="h1en" lang="en">${esc(sec.titleEn)}</div>` : ''}
    <div class="task ${sec.dom === 'SG' ? '' : sec.dom}"><div class="bi${ui.en && sec.taskEn ? ' en-on' : ''}"><div class="col de"><p class="pl" lang="de">${esc(sec.task)}</p></div>${sec.taskEn ? `<div class="col en"><span class="collab" lang="en">English version</span><p class="pl" lang="en">${esc(sec.taskEn)}</p></div>` : ''}</div>${trBox(esc(sec.taskTr), 'task_' + sec.id)}</div></div>
    <div id="body"${mockLive(sec) ? ` class="mock-live${TTS ? ' tts' : ''}"` : ''}>${stepBody(sec)}</div>`;
}
let TOTAL_DAYS = 90;
const WEEK_GOAL = 4;
const RANKS = ['Neuling', 'Lehrling', 'Wortsammler', 'Satzbauer', 'Grammatik-Ass', 'Textprofi', 'Prüfungsjäger', 'C1-Kandidat', 'Fast C1', 'C1-Legende'];
const XP_LEVEL = 500;
function todayKey(t) { const d = t ? new Date(t) : new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function secXP(sec, s) { const n = s.total || 1; return 25 + (s.ok || 0) * 10 + (sec && sec.mock && s.ok / n >= 0.6 ? 50 : 0); }
function dayXP(id) {
  const d = state.days[id]; if (!d) return 0;
  const day = DAYS[id]; let xp = 0;
  Object.entries(d.secs || {}).forEach(([sid, s]) => { xp += secXP(day && day.sections.find(x => x.id === sid), s); });
  xp += Object.values(d.rev || {}).filter(v => v === 'know').length * 5 + Object.keys(d.vocab || {}).length * 2;
  if (d.write && d.write.submitted) xp += 60;
  if (d.speak && d.speak.done) xp += 60;
  if (d.closed) xp += 100;
  return xp;
}
function xpInfo() {
  const xp = Object.keys(state.days).reduce((a, id) => a + dayXP(id), 0);
  const lvl = Math.floor(xp / XP_LEVEL) + 1, into = xp % XP_LEVEL;
  return { xp, lvl, rank: RANKS[Math.min(lvl, RANKS.length) - 1], into, need: XP_LEVEL - into, pct: Math.round(100 * into / XP_LEVEL) };
}
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); }
function chainInfo() {
  // Weekly chain: a week counts when it has at least WEEK_GOAL study days (3–4 days a week is the plan).
  const log = state.log || {}, weeks = [], now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate()); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  for (let w = 7; w >= 0; w--) {
    const s = new Date(mon); s.setDate(s.getDate() - 7 * w); let n = 0;
    for (let k = 0; k < 7; k++) { const x = new Date(s); x.setDate(x.getDate() + k); if ((log[todayKey(x)] || 0) >= 60) n++; }
    weeks.push({ kw: isoWeek(s), n, cur: w === 0, done: n >= WEEK_GOAL });
  }
  let i = weeks.length - 1, streak = 0; if (!weeks[i].done) i--;
  for (; i >= 0 && weeks[i].done; i--) streak++;
  return { weeks, streak, thisWeek: weeks[weeks.length - 1].n };
}
function weeksToExam() { if (!window.PLAN || !PLAN.examDate) return null; return Math.max(0, Math.ceil((new Date(PLAN.examDate + 'T09:00:00') - Date.now()) / 6048e5)); }
function celebrate(title, sub) {
  const el = document.createElement('div'); el.className = 'pop'; el.setAttribute('role', 'status');
  el.innerHTML = `<b>${esc(title)}</b><span>${esc(sub)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2300); setTimeout(() => el.remove(), 2900);
}
function closedDays() { return Object.keys(state.days).filter(id => state.days[id] && state.days[id].closed); }
function bestMock() {
  let best = null;
  Object.entries(state.days).forEach(([id, d]) => {
    const sm = DAYS[id] ? summary(id) : d.sum; if (!sm || !sm.mock) return;
    const ms = Object.values(sm.mock).filter(m => m.pts !== null && m.pts !== undefined); if (!ms.length) return;
    const p = Math.round(100 * ms.reduce((a, m) => a + m.pts, 0) / ms.reduce((a, m) => a + m.max, 0));
    if (best === null || p > best) best = p;
  });
  return best;
}
function routeHTML(day) {
  const stops = [];
  for (let n = 1; n <= TOTAL_DAYS; n++) {
    const id = 'day' + n, d = state.days[id], m = LD(id);
    const st = (n === day.no ? 'cur' : d && d.closed ? 'done' : m ? 'ready' : 'future') + ((n - 1) % 5 === 0 ? ' wks' : '');
    const wk = (n - 1) % 5 === 0 ? `<span class="wkl">E${(n - 1) / 5 + 1}</span>` : '';
    const inner = `${wk}<span class="dot"></span><span class="n">${n}</span>`;
    stops.push(m && n !== day.no ? `<li class="stop ${st}"><button type="button" data-act="openday" data-id="${id}" aria-label="Tag ${n} aç">${inner}</button></li>` : `<li class="stop ${st}"${n === day.no ? ' aria-current="step"' : ''}>${inner}</li>`);
  }
  stops.push('<li class="stop end"><span class="dot"></span><span class="n">Prüfung</span></li>');
  return `<div class="route" id="route"><ol class="stops" aria-label="${TOTAL_DAYS} çalışma günü, sonunda sınav">${stops.join('')}</ol></div>`;
}
function startHTML(day) {
  const d = D(), md = MD(ui.day) || {};
  const tot = minsOf(day, () => true);
  const nextIdx = day.sections.findIndex(s => !secDone(s));
  const started = Object.keys(d.res).length || Object.keys(d.vocab).length || Object.keys(d.sel).length;
  const xi = xpInfo(), ch = chainInfo(), srs = srsStats(day.no);
  const daysLeft = TOTAL_DAYS - day.no + (d.closed ? 0 : 1);
  const allWords = mDays().filter(m => m.no <= day.no).reduce((a, m) => a + (m.words || []).length, 0);
  const dateDE = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const doneN = day.sections.filter(secDone).length;
  const rows = day.sections.map((s, i) => {
    const st = secStatus(s), its = s.kind === 'quiz' ? itemsOf(s).length : 0;
    const reward = s.kind === 'quiz' ? 25 + its * 10 + (s.mock ? 50 : 0) : s.kind === 'wrap' ? 100 : (s.kind === 'write' || s.kind === 'speak') ? 60 : 20;
    return `<li class="ms ${st.st}${s.mock ? ' boss' : ''}"><button type="button" data-act="go" data-i="${i}"><span class="box" aria-hidden="true">${st.st === 'done' ? '✓' : ''}</span><span class="mt"><span class="mti">${esc(s.title)}</span><span class="mex"><span lang="de">${esc(s.exam)}</span> · ${s.min} dk${st.txt ? ' · ' + esc(st.txt) : ''}</span></span>${s.mock ? '<span class="bosstag">Boss</span>' : ''}<span class="xp">+${reward}</span></button></li>`;
  }).join('');
  const chain = ch.weeks.map(x => `<span class="cd wk${x.done ? ' done' : ''}${x.cur ? ' today' : ''}" title="KW ${x.kw}: ${x.n} çalışma günü"><i>KW${x.kw}</i>${x.n ? `<b aria-label="${x.n} gün">${x.n}</b>` : ''}</span>`).join('');
  const wl = weeksToExam();
  const note = day.teacherNote || '';
  const nextReady = LD('day' + (day.no + 1));
  const waitBox = d.closed && !nextReady ? `<div class="waitnext"><b>Tag ${day.no} bitti.</b> <span>Tag ${day.no + 1} sonuçlarına göre hazırlanacak: Karne’de „Sonuç dosyasını indir“e bas, dosyayı Claude’daki telc C1 Projesine „${day.no}. günü bitirdim“ diye gönder. Yeni gün bu adreste açılır.</span><button class="btn sm" type="button" data-act="tab" data-view="report">Karne’ye git</button></div>` : (d.closed && nextReady ? `<div class="waitnext ok"><b>Tag ${day.no + 1} hazır!</b><button class="btn sm primary" type="button" data-act="openday" data-id="day${day.no + 1}">Tag ${day.no + 1}’i aç</button></div>` : '');
  return `<div class="home">${waitBox}
    <header class="pg-head"><p class="hw date">${esc(dateDE)}</p><div class="stamp-day" aria-hidden="true">Tag ${day.no}</div><h1><span class="hlt">${esc(md.short || day.title)}</span></h1><p class="sub">${esc(day.subtitle)} · ${tot} dakika</p></header>
    <div class="home-grid">
      <section class="missions" aria-labelledby="mh"><div class="mh-row"><h2 id="mh">Bugünün görevleri</h2><span class="hw cnt">${doneN}/${day.sections.length} bitti</span></div><ol class="mlist">${rows}</ol>
        <div class="go-row"><button class="btn primary big" type="button" data-act="go" data-i="${nextIdx < 0 ? 0 : nextIdx}">${started ? 'Kaldığın yerden devam' : 'Hadi başlayalım'}</button><span class="hw">${nextIdx < 0 ? 'Bugünkü her şey bitti, Karne’ye bak.' : 'Sıradaki: ' + esc(day.sections[nextIdx].title)}</span></div></section>
      <aside class="stack">
        ${note ? `<div class="rednote"><span class="rn-h">Hocanın notu</span><p class="hw">${esc(note)}</p></div>` : ''}
        <div class="lvl"><div class="lvl-top"><span class="lv">Level ${xi.lvl}</span><span class="rk" lang="de">${esc(xi.rank)}</span></div><div class="pencil" role="img" aria-label="Level ilerlemesi yüzde ${xi.pct}"><i style="width:${xi.pct}%"></i></div><p class="lvl-sub"><b>${xi.xp} XP</b> · Level ${xi.lvl + 1} için ${xi.need} XP daha</p></div>
        <div class="chain"><div class="ch-top"><span>Zincir</span><b class="hw">${ch.streak ? ch.streak + ' hafta üst üste' : 'Bu hafta ' + ch.thisWeek + '/' + WEEK_GOAL + ' gün'}</b></div><div class="ch-row wks">${chain}</div><p class="hint">Kutudaki sayı o hafta çalıştığın gün sayısı. Haftada ${WEEK_GOAL} gün olunca kutu dolar ve zincir uzar.</p></div>
        <div class="sp-home"><b>Sprechpartner</b><span>Claude’la sesli Almanca konuş: günün sunumu, tartışma, gündelik hayat</span><span class="sp-links"><a href="${FREE_PARTNER}" target="_blank" rel="noopener">Laptopta ücretsiz</a> · <a href="sprechen/">Telefonda</a></span></div>
        <div class="minis">${wl !== null ? `<div class="mini m1" title="Hedef sınav: ${esc(PLAN.examShort || '')} · ${daysLeft} çalışma günü kaldı"><b>${wl}</b><span>hafta kaldı<br>sınava</span></div>` : `<div class="mini m1"><b>${daysLeft}</b><span>gün kaldı<br>sınav durağına</span></div>`}<div class="mini m2"><b>${srs.active}</b><span>kelime<br>tekrarda</span></div><div class="mini m3"><b>${allWords}</b><span>kelime<br>albümde</span></div></div>
      </aside>
    </div>
    ${hasSector(day) ? '' : mockOverview(day)}
    <details class="more"><summary>Bugünün ayrıntılı planı</summary><p class="pl">${esc(day.goal)}</p><ul class="learn">${day.learn.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="reset"><span>Günü baştan başlatmak istersen:</span><button class="link" type="button" data-act="reset">Bu günün kayıtlarını sil</button></div></details>
  </div>`;
}
function mockOverview(day) {
  const ms = day.sections.filter(s => s.mock); if (!ms.length) return '';
  const rows = ms.map(s => { const m = mockPts(s); return `<li><span lang="de">${esc(s.mock.label)}</span><span>${m.n} Aufgaben · ${m.max} P · ${s.min} dk</span><b>${m.done ? m.pts + '/' + m.max + ' P' : (mockAnswered(s) ? 'devam ediyor' : '—')}</b></li>`; }).join('');
  const tot = ms.reduce((a, s) => a + mockPts(s).max, 0), got = ms.reduce((a, s) => a + mockPts(s).pts, 0), done = ms.every(s => mockPts(s).done);
  return `<div class="mockov"><div class="mk" lang="de">Probeprüfung heute · ${tot} Punkte</div><ul>${rows}</ul>${done ? `<p><b>Toplam: ${got}/${tot} P (${Math.round(100 * got / tot)}%)</b> · sınav eşiği %60</p>` : '<p class="hint">Sınav bölümlerinde süre geri sayar, cevaplar “Abgeben” deyince kontrol edilir.</p>'}</div>`;
}
function sideHTML(day) {
  const d = D();
  const done = day.sections.filter(secDone), planned = done.reduce((a, s) => a + s.min, 0), tot = minsOf(day, () => true);
  const spent = Object.values(d.time).reduce((a, b) => a + b, 0);
  const list = day.sections.map((s, i) => { const st = secStatus(s); return `<button class="sl ${st.st}${i === ui.step ? ' cur' : ''}" type="button" data-act="go" data-i="${i}"><span class="dm ${s.dom}"></span><span class="dot"></span><span class="rt">${esc(s.title)}</span><span class="rs">${esc(st.txt) || s.min + '′'}</span></button>`; }).join('');
  const wk = PLAN.weeks[day.week - 1], pdIdx = (day.no - 1) % 5, pd = wk.days[pdIdx], nx = wk.days[pdIdx + 1];
  return `<aside class="side" aria-label="Çalışma planı"><div class="panel"><h3>Günün akışı</h3><div class="meter"><i style="width:${Math.round(100 * planned / tot)}%"></i></div><div class="minfo"><span>${planned} / ${tot} dk planlı</span><span>Süren: ${fmtMin(spent)} dk</span></div><div>${list}</div></div>
    <div class="panel ctx"><h3>Çalışma planı</h3><p><b>Etap ${wk.w}: ${esc(wk.title)}</b></p><p class="k nocap">Tag ${day.no} · <span lang="de">${esc(pd.focus)}</span></p>
    <div class="sd"><span class="k">${esc(PLAN.labS || 'Sektör')}</span><p>${esc(pd.s)}</p></div><div class="gd"><span class="k">${esc(PLAN.labG || 'Genel C1')}</span><p>${esc(pd.g)}</p></div><p>${esc(pd.detail)}</p>
    ${nx ? `<p class="k nocap">Sonraki gün: <span lang="de">${esc(nx.focus)}</span></p>` : ''}<button class="btn sm" type="button" data-act="tab" data-view="plan">Tüm planı aç</button></div></aside>`;
}
function hudHTML(day) {
  const xi = xpInfo(), i = ui.step, sec = day.sections[i];
  return `<div class="hud"><button class="hb" type="button" data-act="start">← Defter</button><span class="hs"><b>Görev ${i + 1}/${day.sections.length}</b>${sec.mock ? ' <span class="bosstag">Boss</span>' : ''}</span><span class="hx">${xi.xp} XP · Level ${xi.lvl}</span><button class="hb" type="button" data-act="sheet">Görevler</button></div>`;
}
function barHTML(day) {
  if (ui.step < 0) return '';
  const i = ui.step, sec = day.sections[i], done = secDone(sec), last = i === day.sections.length - 1;
  const spent = Object.values(D().time).reduce((a, b) => a + b, 0);
  const p = Math.round(100 * (i + (done ? 1 : 0)) / day.sections.length);
  return `<div class="bar-fixed"><div class="bar-in"><button class="btn menu" type="button" data-act="sheet" aria-label="Adımlar">☰</button>
    <button class="btn ghost" type="button" data-act="prev" ${i === 0 ? '' : ''}>← <span class="lbl-t">Zurück</span></button>
    <div class="bar-mid"><div class="t"><b>Schritt ${i + 1}/${day.sections.length}</b> · ${esc(sec.exam)} · ${fmtMin(spent)} dk geçti</div><div class="meter"><i style="width:${p}%"></i></div></div>
    ${last ? `<button class="btn ${done ? 'primary' : ''}" type="button" data-act="next">${done ? 'Bitir' : 'Atla'} →</button>` : `<button class="btn ${done ? 'primary' : ''}" type="button" data-act="next"><span class="lbl-t">${done ? 'Weiter' : 'Überspringen'}</span> →</button>`}</div></div>`;
}
function sheetHTML(day) {
  if (!ui.sheet) return '';
  const list = day.sections.map((s, i) => { const st = secStatus(s); return `<button class="st ${st.st}" type="button" data-act="go" data-i="${i}"><span class="no">${st.st === 'done' ? '✓' : i + 1}</span><span><span class="ti">${esc(s.title)}</span><span class="sb">${esc(s.exam)}${hasSector(day) ? ' · ' + DOMLBL[s.dom] : ''}${s.mock ? ' · Probeprüfung' : ''}</span></span><span class="mn">${esc(st.txt) || s.min + ' dk'}</span></button>`; }).join('');
  return `<div class="sheet" data-act="closesheet"><div class="sheet-in" role="dialog" aria-label="Adımlar"><div class="sheet-h"><b>Günün adımları</b><button class="btn sm" type="button" data-act="closesheet">Kapat</button></div><button class="btn sm" type="button" data-act="start">Başlangıç sayfası</button>${list}</div></div>`;
}

function reportText(day) {
  const sm = summary(ui.day), d = D(), lines = [];
  lines.push('C1-Heft · Tag ' + day.no + ' · ' + day.title);
  lines.push('Toplam: ' + sm.total[0] + '/' + sm.total[1] + (sm.total[1] ? ' (' + Math.round(100 * sm.total[0] / sm.total[1]) + '%)' : '') + ' · süre ' + sm.minutes + ' dk');
  if (sm.byDom.S[1]) lines.push('Sektör: ' + sm.byDom.S[0] + '/' + sm.byDom.S[1] + ' · Genel C1: ' + sm.byDom.G[0] + '/' + sm.byDom.G[1]);
  const mk = Object.values(sm.mock || {}); if (mk.length) { lines.push('Probeprüfung:'); mk.forEach(m => lines.push('- ' + m.label + ': ' + (m.pts === null ? 'teslim edilmedi' : m.pts + '/' + m.max + ' P (' + m.ok + '/' + m.n + ')') + ' · ' + m.t + '/' + m.plan + ' dk')); }
  Object.entries(sm.byExam).forEach(([k, v]) => lines.push('- ' + k + ': ' + v[0] + '/' + v[1]));
  const tags = Object.entries(sm.tags).sort((a, b) => b[1] - a[1]);
  if (tags.length) { lines.push('Zayıf konular:'); tags.forEach(t => lines.push('- ' + tagLabel(day, t[0]) + ' (' + t[1] + ' yanlış)')); }
  if (sm.rev) lines.push('Tekrar (1-3-7-14): ' + sm.rev.know + '/' + sm.rev.due + ' bildin' + (sm.rev.again.length ? ' · tekrar gelecek: ' + sm.rev.again.join(', ') : ''));
  if (sm.vocabNew.length) lines.push('Yeni kelimeler: ' + sm.vocabNew.join(', '));
  if (sm.open && sm.open.length) lines.push('Bitmeyen adımlar: ' + sm.open.join(', '));
  if (sm.wrong.length) { lines.push('Yanlışlar:'); sm.wrong.forEach(w => lines.push('- [' + w.exam + ' · ' + w.id + '] ' + String(w.q).replace(/\s+/g, ' ').slice(0, 140) + ' → seçtiğin: ' + (w.chosen == null ? 'boş' : w.chosen) + ' · doğru: ' + w.correct)); }
  if ((d.write.text || '').trim()) lines.push('Schreiben (' + wordCount(d.write.text) + ' kelime):\n' + d.write.text.trim());
  if (d.speak && (d.speak.notes || d.speak.rating || d.speak.secs)) lines.push('Sprechen: ' + (d.speak.secs ? fmt(d.speak.secs) + ' · ' : '') + (d.speak.rating ? 'akıcılık ' + d.speak.rating + '/5 · ' : '') + (d.speak.notes || ''));
  (d.partner || []).forEach(x => lines.push('Sprechpartner: ' + x.teil + ' · ' + x.task + ' · ' + (x.mode === 'exam' ? 'Prüfung' : 'Training') + ' · ' + x.pct + '% (Not ' + x.grade + ') · ' + x.words + ' kelime' + (x.wpm ? ', ' + x.wpm + ' kelime/dk' : '') + (x.korrekturen && x.korrekturen.length ? '\n  Doğru hâlleri: ' + x.korrekturen.join(' | ') : '')));
  if (d.notes) lines.push('Öğretmene not: ' + d.notes);
  return lines.join('\n');
}
function mockCard(sm) {
  const mk = Object.values(sm.mock || {}); if (!mk.length) return '';
  const done = mk.filter(m => m.pts !== null), got = done.reduce((a, m) => a + m.pts, 0), max = done.reduce((a, m) => a + m.max, 0);
  const rows = mk.map(m => { const pp = m.pts === null ? 0 : Math.round(100 * m.pts / m.max); return `<div class="sk"><span class="nm" lang="de">${esc(m.label)}</span><div class="bar${barClass(pp)}"><i style="width:${pp}%"></i></div><span class="nr">${m.pts === null ? '—' : m.pts + '/' + m.max + ' P'}</span></div><p class="hint" style="margin:-4px 0 8px">${m.pts === null ? 'Henüz teslim edilmedi.' : m.ok + '/' + m.n + ' doğru · ' + m.t + ' / ' + m.plan + ' dk'}</p>`; }).join('');
  return `<div class="card"><h2>Probeprüfung</h2>${rows}${max ? `<p><b>Toplam: ${got}/${max} puan (${Math.round(100 * got / max)}%)</b>. Gerçek sınavda yazılı bölümün geçme eşiği %60.</p>` : ''}</div>`;
}
function reportHTML(day) {
  const d = D(), sm = summary(ui.day);
  const [ok, n] = sm.total, p = n ? Math.round(100 * ok / n) : 0;
  const verdict = !n ? 'Henüz kontrol edilmiş bölüm yok.' : p >= 85 ? 'Güçlü bir gün. Zayıf kalan birkaç konuyu yarın kısa bir tekrarla kapatırız.' : p >= 70 ? 'İyi bir gün. Aşağıdaki odak konuları yarının başında tekrar edeceğiz.' : p >= 55 ? 'Orta düzey. Yarın yeni konuya geçmeden önce aşağıdaki konulara zaman ayıralım.' : 'Bugünkü konular henüz oturmadı. Yarın aynı temayı farklı alıştırmalarla yeniden çalışacağız, bu normal.';
  const examRows = Object.entries(sm.byExam).map(([k, v]) => { const pp = Math.round(100 * v[0] / v[1]); return `<div class="sk"><span class="nm">${esc(k)}</span><div class="bar${barClass(pp)}"><i style="width:${pp}%"></i></div><span class="nr">${v[0]}/${v[1]}</span></div>`; }).join('');
  const domRows = ['S', 'G'].map(k => { const v = sm.byDom[k]; const pp = v[1] ? Math.round(100 * v[0] / v[1]) : 0; return `<div class="sk"><span class="nm">${DOMLBL[k]}</span><div class="bar${barClass(pp)}"><i style="width:${pp}%"></i></div><span class="nr">${v[1] ? v[0] + '/' + v[1] : '—'}</span></div>`; }).join('');
  const tags = Object.entries(sm.tags).sort((a, b) => b[1] - a[1]);
  const weak = tags.length ? `<ol class="weak">${tags.map(([t, c]) => `<li><b><span>${esc(tagLabel(day, t))}</span><span class="c">${c} yanlış</span></b><p>${esc((day.tags[t] && day.tags[t].adv) || '')}</p></li>`).join('')}</ol>` : (n ? '<p class="allok">Kontrol ettiğin bölümlerde yanlış yok.</p>' : '<div class="empty">Önce en az bir bölümü bitir.</div>');
  const wrongList = sm.wrong.length ? `<div class="review">${sm.wrong.map(w => `<div class="rv bad"><div class="rq pl" lang="de">${esc(w.q)}</div><div class="ra">Senin cevabın: <s>${esc(w.chosen == null ? 'boş' : w.chosen)}</s> · Doğru: <b>${esc(w.correct)}</b></div><div class="chips"><span class="chip" lang="de">${esc(w.exam)}</span><span class="chip tagc">${esc(tagLabel(day, w.tag))}</span></div></div>`).join('')}</div>` : '';
  const open = day.sections.filter(s => sm.open.includes(s.id)).map(s => esc(s.title));
  const wsec = day.sections.find(s => s.kind === 'write'), w = d.write;
  const writeInfo = wsec ? `<p>Schreiben: ${w.submitted ? 'tamamlandı' : 'henüz bitirilmedi'}${(w.text || '').trim() ? ' · ' + wordCount(w.text) + ' Wörter (hedef ' + wsec.minWords + '–' + wsec.maxWords + ')' : ''} · Selbstkontrolle ${Object.values(w.checks || {}).filter(Boolean).length}/${wsec.checks.length}</p>` : '';
  const sp = d.speak, ssec = day.sections.find(s => s.kind === 'speak'); const spInfo = ssec ? `<p>Sprechen: ${sp.done ? 'tamamlandı' : 'henüz bitirilmedi'}${sp.rating ? ' · akıcılık puanın ' + sp.rating + '/5' : ''}${sp.secs ? ' · süre ' + fmt(sp.secs) : ''}</p>` : '';
  const pInfo = (d.partner || []).length ? `<p>Sprechpartner: ${d.partner.map(x => esc(x.teil + ' ' + x.pct + '% (Not ' + x.grade + ')')).join(' · ')}</p>` : '';
  const timeRows = day.sections.map(s => `<div class="sk"><span class="nm">${esc(s.title)}</span><div class="bar${(d.time[s.id] || 0) / 60 > s.min * 1.4 ? ' low' : ''}"><i style="width:${Math.min(100, Math.round(100 * (d.time[s.id] || 0) / 60 / s.min))}%"></i></div><span class="nr">${fmtMin(d.time[s.id] || 0)} / ${s.min} dk</span></div>`).join('');
  const grade = !n ? null : p >= 92 ? 1 : p >= 81 ? 2 : p >= 67 ? 3 : p >= 50 ? 4 : p >= 30 ? 5 : 6;
  const mk = Object.values(sm.mock || {}).filter(m => m.pts !== null && m.pts !== undefined), mkMax = mk.reduce((a, m) => a + m.max, 0), mkPts = mk.reduce((a, m) => a + m.pts, 0), mkP = mkMax ? Math.round(100 * mkPts / mkMax) : null;
  return `<div class="stage rep"><div class="card zeugnis"><div class="z-head"><span class="z-t">Karne · Tag ${day.no}</span><h1>${esc(day.title)}</h1></div>
      <div class="z-body"><div class="z-grade"><span class="z-n">${grade === null ? '–' : grade}</span><span class="z-l">Not<br><small>1 = en iyi</small></span></div>
      <div class="z-facts"><div><b>${ok}/${n}</b><span>${n ? p + '% doğru' : 'henüz puan yok'}</span></div><div><b>${sm.minutes} dk</b><span>çalıştın (plan ${minsOf(day, () => true)})</span></div>${mkP !== null ? `<div><b>${mkPts}/${mkMax} P</b><span>deneme (${mkP}%)</span></div>` : ''}<div><b>+${dayXP(ui.day)} XP</b><span>bugün</span></div></div>
      ${mkP !== null ? `<div class="stamp ${mkP >= 60 ? 'ok' : 'no'}" aria-label="Deneme sonucu">${mkP >= 60 ? 'Bestanden' : 'Noch nicht'}</div>` : ''}</div>
      <p class="hw verdict">${esc(verdict)}</p>${open.length ? `<p class="hint">Henüz tamamlanmayan adımlar: ${open.join(', ')}.</p>` : ''}</div>
    ${mockCard(sm)}${sm.byDom.S[1] ? `<div class="card"><h2>Sektör ve genel C1</h2>${domRows}</div>` : ''}
    <div class="card"><h2>Sınav bölümlerine göre</h2>${examRows || '<div class="empty">Henüz puanlı bölüm yok.</div>'}${writeInfo}${spInfo}${pInfo}</div>
    <div class="card"><h2>Neleri çalışmalısın</h2>${weak}</div>
    ${sm.wrong.length ? `<div class="card"><h2>Yanlışların (${sm.wrong.length})</h2>${wrongList}</div>` : ''}
    ${sm.rev && sm.rev.due ? `<div class="card"><h2>Kelime tekrarı (1-3-7-14)</h2><div class="sk"><span class="nm">Bildiklerin</span><div class="bar${barClass(Math.round(100 * sm.rev.know / sm.rev.due))}"><i style="width:${Math.round(100 * sm.rev.know / sm.rev.due)}%"></i></div><span class="nr">${sm.rev.know}/${sm.rev.due}</span></div>${sm.rev.again.length ? `<p>Yarın yeniden gelecek: <span lang="de">${esc(sm.rev.again.join(', '))}</span></p>` : ''}</div>` : ''}
    ${sm.vocabNew.length ? `<div class="card"><h2>Yeni kelimelerin</h2><div class="chips">${sm.vocabNew.map(x => `<span class="chip tagc" lang="de" style="font-size:14px">${esc(x)}</span>`).join('')}</div><p class="hint">Bu kelimeler 1., 3., 7. ve 14. çalışma gününde “Wiederholung” adımında geri gelecek.</p></div>` : ''}
    <div class="card"><h2>Süre</h2>${timeRows}</div>
    <div class="card"><h2>Öğretmenine notlar</h2><textarea id="notes" class="sp-notes" style="min-height:110px">${esc(d.notes || '')}</textarea>
      <div class="callout"><b>Sonraki adım:</b> Sonuç dosyasını indir ve Claude'daki telc C1 Projesinde “${day.no}. günü bitirdim” mesajına ekle. Dosya ekleyemiyorsan raporu kopyalayıp mesaja yapıştır. Ayrıntılı değerlendirmeyi yazar, Tag ${day.no + 1}’i bu yanlışlara göre hazırlarım.</div>
      <div class="bkrow"><button class="btn primary" type="button" data-act="resdl">Sonuç dosyasını indir</button><button class="btn" type="button" data-act="copy">Raporu kopyala</button></div><div id="repOut"></div></div></div>`;
}
function progressHTML() {
  const ms = liveDays(); if (!ms.length) return '';
  const last = ms[ms.length - 1], st = srsStats(last.no), cur = MD(ui.day) ? MD(ui.day).no : 0;
  const weeks = [], W = PLAN.weeks, ph = PLAN.phases || [];
  for (let w = 1; w <= W.length; w++) {
    const p = ph.find(x => x.from === w);
    if (p) weeks.push(`<div class="mph"><span class="pn">Faz ${p.n}</span><b>${esc(p.t)}</b> <span lang="de">(${esc(p.de)})</span><span class="pd">${esc(p.dates)}</span></div>`);
    const cells = [];
    for (let k = 1; k <= 5; k++) {
      const n = (w - 1) * 5 + k, id = 'day' + n, d = state.days[id], m = LD(id), pd = (W[w - 1].days || [])[k - 1] || {};
      const bigD = !!pd.big, bil = !!pd.bil, boss = !bigD && !bil && (pd.boss !== undefined ? !!pd.boss : (n === 4 || (n >= 10 && n % 5 === 0) && !PLAN.phases));
      const cls = d && d.closed ? 'done' : n === cur ? 'cur' : m ? 'ready' : 'future';
      const sm = d ? (DAYS[id] ? summary(id) : d.sum) : null, sc = sm && sm.total && sm.total[1] ? Math.round(100 * sm.total[0] / sm.total[1]) + '%' : '';
      const tag = bigD ? '<span class="bz big">Deneme</span>' : bil ? '<span class="bz bil">Bilanz</span>' : boss ? '<span class="bz">Boss</span>' : '';
      const inner = `<span class="dn">${n}</span>${tag}${d && d.closed ? `<span class="ok">✓</span><span class="sc">${sc}</span>` : ''}`;
      const xc = (boss ? ' isboss' : '') + (bigD ? ' isbig' : '');
      cells.push(m ? `<button class="md ${cls}${xc}" type="button" data-act="openday" data-id="${id}" aria-label="Tag ${n} aç">${inner}</button>` : `<span class="md ${cls}${xc}" title="${esc(pd.focus || '')}">${inner}</span>`);
    }
    weeks.push(`<div class="mw"><span class="wl" title="${esc(W[w - 1].title)}${W[w - 1].dates ? ' · ' + esc(W[w - 1].dates) : ''}">Etap ${w}</span><div class="wc">${cells.join('')}</div></div>`);
  }
  const buf = PLAN.buffer ? `<p class="mbuf"><b>Tampon</b> ${esc(PLAN.buffer.dates)} · ${esc(PLAN.buffer.t)}</p>` : '';
  return `<div class="card map"><h2>Harita: ${TOTAL_DAYS} gün, sonunda sınav</h2><p class="hint">Hazır günlere dokunarak açabilirsin. Her etabın sonunda bir „Boss“; her fazın sonunda dört günlük büyük deneme sınavı.</p><div class="mws">${weeks.join('')}${buf}<div class="goal-flag">Prüfung${PLAN.examShort ? `<small>${esc(PLAN.examShort)}</small>` : ''}</div></div>
    <div class="srsrow"><span><b>${st.active}</b> kelime tekrar sırasında</span><span><b>${st.next}</b> kelime bir sonraki gün gelecek</span><span><b>${st.learned}</b> kelime öğrenildi (14. gün tekrarı geçti)</span></div></div>`;
}
function backupHTML() {
  return `<div class="card" id="backup"><h2>Kayıtlarım</h2><p>Cevapların bu cihazın tarayıcısında saklanır. Telefonla bilgisayar arasında geçmek için bu cihazda aktarma kodunu kopyala, diğer cihazda bu bölümü açıp kodu yapıştır. Tarayıcı verilerini silersen kayıtlar da silinir. iPhone’da siteyi ana ekrana ekle (Safari, uzun süre açılmayan sitelerin verilerini silebilir) ve haftada bir yedek dosyası indir.</p>
    <div class="bkrow"><button class="btn" type="button" data-act="bkcode">Aktarma kodunu kopyala</button><button class="btn" type="button" data-act="bkpaste">Kodu yapıştır</button><button class="btn" type="button" data-act="bkdl">Yedek dosyası indir</button><label class="btn">Yedek dosyası yükle<input type="file" id="bkfile" accept=".json,application/json" class="sr"></label></div><div id="bkOut" aria-live="polite"></div></div>`;
}
async function packState() {
  const json = JSON.stringify({ app: 'linie-c1', v: 1, days: state.days, log: state.log || {} });
  try {
    if (window.CompressionStream) {
      const buf = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      return 'C1Z:' + btoa(bin);
    }
  } catch (e) {}
  return 'C1J:' + btoa(unescape(encodeURIComponent(json)));
}
async function unpackState(code) {
  code = String(code || '').trim().replace(/\s+/g, '');
  if (code.startsWith('C1Z:')) { const bin = atob(code.slice(4)); const buf = Uint8Array.from(bin, c => c.charCodeAt(0)); return JSON.parse(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); }
  if (code.startsWith('C1J:')) return JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
  if (code.startsWith('{')) return JSON.parse(code);
  throw new Error('format');
}
function mergeState(imp) {
  if (!imp || typeof imp.days !== 'object') throw new Error('format');
  const got = [];
  Object.entries(imp.days).forEach(([id, v]) => { const l = state.days[id]; if (v && (!l || !l.updatedAt || (v.updatedAt && v.updatedAt > l.updatedAt))) { state.days[id] = v; got.push(id); } });
  state.log = state.log || {}; Object.entries(imp.log || {}).forEach(([k, v]) => { state.log[k] = Math.max(state.log[k] || 0, +v || 0); });
  state.seeded = true; saveLocal(); return got;
}
function importDone(got) {
  const out = $('#bkOut');
  const names = got.map(id => 'Tag ' + id.replace('day', '')).join(', ');
  if (out) out.innerHTML = got.length ? `<p class="allok">Kayıtlar yüklendi: ${esc(names)}.</p>` : '<p class="hint">Bu cihazdaki kayıtlar zaten daha yeni; bir şey değişmedi.</p>';
  Object.keys(DAYS).forEach(id => { try { D(id); migrateDay(id); } catch (e) {} });
  setTimeout(() => { const y = window.scrollY; render({ still: true }); window.scrollTo(0, y); const o = $('#bkOut'); if (o && got.length) o.innerHTML = `<p class="allok">Kayıtlar yüklendi: ${esc(names)}.</p>`; }, 50);
}
function downloadText(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
function planHTML() {
  const W = PLAN.weeks[ui.planWeek - 1];
  const skTot = PLAN.skeleton.reduce((a, s) => a + s.min, 0);
  const skBar = PLAN.skeleton.map(s => `<i style="width:${100 * s.min / skTot}%" title="${esc(s.t)}"></i>`).join('');
  const dayNo = i => (W.w - 1) * 5 + i + 1;
  const tagOf = i => { const id = 'day' + dayNo(i), dd = LD(id), d = state.days[id]; return dd ? `<button class="link" type="button" data-act="openday" data-id="${id}">${d && d.closed ? 'Bitti · aç' : 'Hazır · aç'}</button>` : (d && d.closed ? '<small class="donec">bitti</small>' : ''); };
  const date = i => W.dateList && W.dateList[i] ? ` <small>${esc(W.dateList[i])}</small>` : '';
  const rows = W.days.map((x, i) => `<tr class="${LD('day' + dayNo(i)) ? 'today' : ''}"><td class="dn">Tag ${dayNo(i)}${date(i)}${tagOf(i)}</td><td class="fo">${esc(x.focus)}</td><td class="cs">${esc(x.s)}</td><td class="cg">${esc(x.g)}</td><td>${esc(x.detail)}</td></tr>`).join('');
  const cards = W.days.map((x, i) => `<div class="dc${LD('day' + dayNo(i)) ? ' today' : ''}"><div class="h"><span>Tag ${dayNo(i)}${W.dateList && W.dateList[i] ? ' · ' + esc(W.dateList[i]) : ''}</span><span class="chip" lang="de">${esc(x.focus)}</span></div>${tagOf(i) ? `<div>${tagOf(i)}</div>` : ''}<div class="s"><span class="k">${esc(PLAN.labS || 'Sektör')}</span>${esc(x.s)}</div><div class="g"><span class="k">${esc(PLAN.labG || 'Genel C1')}</span>${esc(x.g)}</div><div><span class="k">Ne öğreneceğiz</span>${esc(x.detail)}</div></div>`).join('');
  const curW = MD(ui.day) ? MD(ui.day).week : 1;
  const phases = (PLAN.phases || []).map(p => `<li class="ph${curW >= p.from && curW <= p.to ? ' now' : ''}"><div class="ph-h"><span class="pn">Faz ${p.n}</span><b>${esc(p.t)}</b> <span lang="de">${esc(p.de)}</span></div><p class="pd">${esc(p.dates)} · <span class="nw">Etap ${p.from}–${p.to}</span></p><p>${esc(p.goal)}</p><p class="tg"><span>Hedef</span> ${esc(p.target)}</p></li>`).join('')
    + (PLAN.buffer ? `<li class="ph buf"><div class="ph-h"><b>${esc(PLAN.buffer.t)}</b></div><p class="pd">${esc(PLAN.buffer.dates)}</p><p>${esc(PLAN.buffer.d)}</p></li>` : '');
  const miles = (PLAN.milestones || []).map(m => `<li class="${m.exam ? 'ex' : m.reg ? 'rg' : m.big ? 'bg' : ''}"><span class="hw">${esc(m.d)}</span><span>${esc(m.t)}</span></li>`).join('');
  const road = PLAN.phases ? `<div class="card road"><h2>Haziran 2027’ye giden yol</h2><ol class="phases">${phases}</ol>${miles ? `<h3>Önemli duraklar</h3><ul class="miles">${miles}</ul>` : ''}</div>` : '';
  const phOf = w => (PLAN.phases || []).find(p => w >= p.from && w <= p.to);
  return `<div class="stage rep"><div class="card intro"><h1>${PLAN.examDate ? 'Haziran 2027’ye kadar çalışma planı' : 'Çalışma planı'}</h1><p>${esc(PLAN.intro)}</p></div>
    ${road}
    ${progressHTML()}
    ${backupHTML()}
    <div class="card"><h2>Çalışma kuralları</h2><ul class="rules">${PLAN.rules.map(r => `<li><b>${esc(r.t)}</b><span>${esc(r.d)}</span></li>`).join('')}</ul></div>
    <div class="card"><h2>Günlük iskelet (90 dakika)</h2><div class="skel" role="img" aria-label="Günlük süre dağılımı">${skBar}</div><ul class="skl">${PLAN.skeleton.map(s => `<li><span class="m">${s.min}′</span><span><b>${esc(s.t)}</b><br>${esc(s.d)}</span></li>`).join('')}</ul></div>
    <div class="card"><h2>Bir etabın ritmi (5 çalışma günü)</h2><div class="wd">${PLAN.weekdays.map(x => `<div><b>${esc(x.d)}</b><span class="f">${esc(x.f)}</span><span>${esc(x.n)}</span></div>`).join('')}<div><b>Boş günler</b><span class="f">Dinlenme</span><span>Haftada 4 gün çalış, gerisi dinlenme. Bir etap takvimde yaklaşık 1,5 hafta sürer (5 çalışma günü). Büyük deneme etaplarında ilk dört gün sınavın dört bölümüdür.</span></div></div></div>
    <div class="card"><h2>Telc Deutsch C1: sınav formatı ve bizim çalışma karşılığı</h2><div class="tw"><table class="exam"><thead><tr><th>Bölüm</th><th>Format</th><th>Puan</th><th>Süre</th><th>Bizde</th></tr></thead><tbody>${PLAN.exam.map(r => `<tr><td>${esc(r.part)}</td><td>${esc(r.fmt)}</td><td>${esc(r.pts)}</td><td>${esc(r.time)}</td><td>${esc(r.ours)}</td></tr>`).join('')}</tbody></table></div><p class="hint">${esc(PLAN.examNote)}</p></div>
    <div class="card"><h2>Etap etap: ne öğreneceğiz</h2><div class="pills" role="group" aria-label="Etap seç">${PLAN.weeks.map(w => `<button class="pill${w.days.some(x => x.big) ? ' pbig' : ''}" type="button" data-act="week" data-w="${w.w}" aria-pressed="${w.w === ui.planWeek}">Etap ${w.w}</button>`).join('')}</div>
      <div class="wk"><h3>Etap ${W.w}: ${esc(W.title)}${W.dates ? ` <small class="wdate">${esc(W.dates)}</small>` : ''}</h3>${phOf(W.w) ? `<p class="k nocap">Faz ${phOf(W.w).n} · ${esc(phOf(W.w).t)}</p>` : ''}${W.note ? `<p class="hint">${esc(W.note)}</p>` : ''}
      <div class="wk-top"><div class="s"><span class="k">${esc(PLAN.labWS || 'Sektör teması')}</span>${esc(W.sector)}</div><div class="g"><span class="k">${esc(PLAN.labWG || 'Genel C1 teması')}</span>${esc(W.general)}</div><div><span class="k">Dilbilgisi</span>${esc(W.grammar)}</div><div><span class="k" lang="de">Schreiben</span>${esc(W.writing)}</div><div><span class="k" lang="de">Sprechen</span>${esc(W.speaking)}</div></div>
      <div class="tw"><table class="dtab"><thead><tr><th>Gün</th><th>Odak (sınav bölümü)</th><th>${esc(PLAN.labS || 'Sektör')}</th><th>${esc(PLAN.labG || 'Genel C1')}</th><th>Ne öğreneceğiz (ayrıntı)</th></tr></thead><tbody>${rows}</tbody></table></div><div class="dcards">${cards}</div>
      <div><span class="collab">Etap sonunda yapabileceklerin</span><ul class="outc">${W.outcome.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div></div></div>
    <div class="card"><h2>Nasıl çalışıyoruz</h2><ol class="steps">${PLAN.method.map(m => `<li>${esc(m)}</li>`).join('')}</ol></div></div>`;
}
function topHTML() {
  const day = curDay();
  const tab = (v, label, c) => `<button class="tab t-${c}" type="button" data-act="tab" data-view="${v}" ${ui.view === v ? 'aria-current="page"' : ''}>${label}</button>`;
  const tabs = tab('day', 'Bugün', 'y') + tab('plan', 'Harita', 'g') + tab('report', 'Karne', 'p') + tab('glossary', 'Kelimeler', 'b');
  const planned = day.sections.filter(secDone).reduce((a, s) => a + s.min, 0), tot = minsOf(day, () => true);
  return `<header class="top"><div class="top-in"><button class="logo" type="button" data-act="tab" data-view="day" aria-label="C1-Heft, bugüne dön"><span class="l1">C1</span><span class="l2">Heft</span></button>
    <nav class="tabs" aria-label="Bölümler">${tabs}</nav>
    <div class="tools"><label class="daysel"><span class="sr">Gün seç</span><select id="daySel">${liveDays().map(m => `<option value="${m.id}" ${m.id === ui.day ? 'selected' : ''}>Tag ${m.no}: ${esc(m.short || m.title)}</option>`).join('')}</select></label>${ui.view === 'glossary' ? '' : `<label class="sw"><input type="checkbox" id="enSw" ${ui.en ? 'checked' : ''}><span>EN</span></label>`}<label class="sw"><input type="checkbox" id="trAll" ${ui.trAll ? 'checked' : ''}><span>TR</span></label><span class="savestate" id="savestate" aria-live="polite"></span></div></div><div class="topprog"><i id="topprog" style="width:${Math.round(100 * planned / tot)}%"></i></div></header>`;
}

/* ---------- glossary (English tab) ---------- */
const glNorm = s => String(s || '').replace(/İ/g, 'i').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/ı/g, 'i');
const glSpeak = t => String(t).replace(/\s*\/\s*/g, ', ').replace(/…/g, ', ').replace(/[()]/g, ', ').replace(/\s+/g, ' ').trim();
function glossaryGroups(dayId) {
  const day = DAYS[dayId], out = [];
  if (!day) return out;
  const mk = (id, title, titleEn, dom, src, items) => { if (items.length) out.push({ key: dayId + '_' + id, no: day.no, title, titleEn, dom, src, items }); };
  day.sections.forEach(sec => {
    if (sec.kind !== 'cards' || !sec.words) return;
    [['S', 'Tageswörter · Sektor', 'Words of the day · sector'], ['G', 'Tageswörter · Allgemein', 'Words of the day · general']].forEach(([dom, t, te]) => {
      mk('words_' + dom, t, te, dom, 'Kelime kartları', sec.words.filter(w => w.dom === dom).map(w => ({ de: w.de, en: w.en, tr: w.tr, ex: w.ex, exEn: w.exEn, exTr: w.exTr, info: w.info, dom })));
    });
  });
  (day.glossary || []).forEach(g => mk(g.id, g.title, g.titleEn, g.dom, g.src, g.items.map(i => Object.assign({ dom: g.dom }, i))));
  day.sections.forEach(sec => {
    if (!sec.helpers || !sec.helpers.length) return;
    const w = sec.kind === 'write', dom = sec.dom === 'S' ? 'S' : 'G';
    mk('help_' + sec.id, w ? 'Schreiben · Redemittel' : 'Sprechen · Redemittel', w ? 'Writing · useful phrases' : 'Speaking · useful phrases', dom, w ? 'Schreiben' : 'Sprechen', sec.helpers.map(h => ({ de: h.de, en: h.en, tr: h.tr, dom })));
  });
  return out;
}
function glDays() { return liveIds(); }
function glNeed() { if (ui.glDay !== 'all' && !liveIds().includes(ui.glDay)) ui.glDay = liveIds().includes(ui.day) ? ui.day : liveIds()[0]; return (ui.glDay === 'all' ? liveIds() : [ui.glDay]).filter(id => !DAYS[id]); }
function glSpk(t, lang) { return TTS ? `<button class="spk mini" type="button" data-act="spk" data-lang="${lang}" data-say="${sayIdx(glSpeak(t))}" aria-label="${lang === 'de-DE' ? 'Vorlesen' : 'Read aloud'}">▶</button>` : ''; }
function glEntry(it, key) {
  const q = glNorm([it.de, it.en, it.tr, it.ex, it.exEn, it.exTr, it.info].filter(Boolean).join(' '));
  const col = (side, lang, w, ex, info) => `<div class="gc ${side}" lang="${lang}"><button class="cvbtn" type="button" data-act="glrev" data-side="${side}" lang="tr" aria-label="${side === 'de' ? 'Almanca' : 'İngilizce'} metni göster">Göster</button><span class="gcl" aria-hidden="true">${side}</span><div class="cvr"><div class="gw"><span class="gt">${esc(w)}</span>${glSpk(w, lang === 'de' ? 'de-DE' : 'en-US')}</div>${info ? `<div class="gi">${esc(info)}</div>` : ''}${ex ? `<p class="gx">${esc(ex)}${glSpk(ex, lang === 'de' ? 'de-DE' : 'en-US')}</p>` : ''}</div></div>`;
  const trHtml = `<b>${esc(it.tr)}</b>` + (it.exTr ? `\n<em>${esc(it.exTr)}</em>` : '');
  return `<article class="ge" data-dom="${it.dom}" data-q="${esc(q)}"><div class="gcols">${col('de', 'de', it.de, it.ex, it.info)}${col('en', 'en', it.en, it.exEn, '')}</div>${trBox(trHtml, 'gl_' + key)}</article>`;
}
function glossaryHTML() {
  const ids = glDays();
  if (ui.glDay !== 'all' && !ids.includes(ui.glDay)) ui.glDay = ids.includes(ui.day) ? ui.day : ids[0];
  const sel = ui.glDay === 'all' ? ids : [ui.glDay];
  const groups = sel.flatMap(glossaryGroups), multi = ui.glDay === 'all';
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const dayPills = ids.map(id => `<button class="pill" type="button" data-act="glday" data-v="${id}" aria-pressed="${ui.glDay === id}">Gün ${MD(id) ? MD(id).no : id}</button>`).join('') + (ids.length > 1 ? `<button class="pill" type="button" data-act="glday" data-v="all" aria-pressed="${ui.glDay === 'all'}">Tüm günler</button>` : '');
  const pills = (act, cur, list) => list.map(([v, l]) => `<button class="pill" type="button" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('');
  const nav = groups.map(g => `<button class="glchip ${g.dom}" type="button" data-act="glgo" data-g="gg_${g.key}" title="${esc(g.title)}"><i></i><span lang="de">${esc(g.title.replace(/\s*\(.*\)\s*$/, ''))}</span><b>${g.items.length}</b></button>`).join('');
  const body = groups.map(g => `<section class="card gg" id="gg_${g.key}" data-n="${g.items.length}" data-dom="${g.dom}"><header class="gh"><div class="ghr"><h2 lang="de">${esc(g.title)}</h2></div><p class="ghe" lang="en">${esc(g.titleEn)}</p><div class="gmeta">${domChip(g.dom)}${multi ? `<span class="chip min">Gün ${g.no}</span>` : ''}<span class="chip min">${esc(g.src)}</span><span class="chip min gn">${g.items.length} madde</span></div></header><div class="gl-list">${g.items.map((it, i) => glEntry(it, g.key + '_' + i)).join('')}</div></section>`).join('');
  return `<div class="stage glv cv-${ui.glCover || 'none'}">
    <div class="card glhead"><div class="hero" style="border:0;padding:0;box-shadow:none"><div class="eyebrow" lang="en">English</div><h1>Çalışma sözlüğü: Deutsch ↔ English</h1></div>
      <p>Gün gün büyüyen sözlük. Her maddede Almanca ve İngilizce yan yana durur; altındaki “Türkçesi” düğmesine basınca Türkçe karşılığı ve örnek cümlenin çevirisi açılır. Puanlanmaz, rapora girmez.</p>
      <div class="glctl">
        <label class="glsearch"><span class="sr">Sözlükte ara</span><input id="glq" type="search" autocomplete="off" spellcheck="false" placeholder="Ara: Almanca, İngilizce veya Türkçe" value="${esc(ui.glQ)}"></label>
        <div class="glrow"><span class="gll">Gün</span><div class="pills" role="group" aria-label="Gün">${dayPills}</div></div>
        <div class="glrow"><span class="gll">Alan</span><div class="pills" role="group" aria-label="Alan">${pills('gldom', ui.glDom, [['', 'Hepsi'], ['S', 'Sektör'], ['G', 'Genel C1']])}</div></div>
        <div class="glrow"><span class="gll">Kendini dene</span><div class="pills" role="group" aria-label="Kapatma modu">${pills('glcover', ui.glCover, [['', 'İkisi açık'], ['de', 'Almanca kapalı'], ['en', 'İngilizce kapalı']])}</div></div>
      </div>
      <div class="glnav" role="group" aria-label="Gruplara git">${nav}</div>
      <p class="hint" id="glcount" aria-live="polite">${total} madde · ${groups.length} grup</p>
    </div>
    <p class="card glnone" hidden>Bu aramayla eşleşen madde yok. Başka bir kelime dene veya filtreleri “Hepsi” yap.</p>
    ${body}</div>`;
}
function applyGl() {
  const root = $('.glv'); if (!root) return;
  const toks = glNorm(ui.glQ).split(/\s+/).filter(Boolean);
  let shown = 0, total = 0, gs = 0;
  $$('.gg', root).forEach(g => {
    let n = 0;
    $$('.ge', g).forEach(e => { total++; const ok = (!ui.glDom || e.dataset.dom === ui.glDom) && toks.every(t => e.dataset.q.includes(t)); e.hidden = !ok; if (ok) n++; });
    g.hidden = n === 0; if (n) gs++; shown += n;
    const c = $('.gn', g); if (c) c.textContent = (n === +g.dataset.n ? n : n + ' / ' + g.dataset.n) + ' madde';
    const b = $('[data-g="' + g.id + '"]', root); if (b) { b.hidden = n === 0; const bn = $('b', b); if (bn) bn.textContent = n; }
  });
  const cnt = $('#glcount'); if (cnt) cnt.textContent = (shown === total ? total : shown + ' / ' + total) + ' madde · ' + gs + ' grup';
  const none = $('.glnone', root); if (none) none.hidden = shown > 0;
}
function glPress(act, cur) { $$('[data-act="' + act + '"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === cur))); }

/* ---------- render ---------- */
let renderedStep = null;
function render(opts) {
  opts = opts || {};
  stopSpeech(); SAY.length = 0; SCRIPTS.length = 0; HINS.length = 0;
  const day = curDay(), app = $('#app');
  if (!day || (ui.busy && ui.view === 'day')) { app.innerHTML = `<div class="boot">${day ? 'Gün yükleniyor…' : 'Yükleniyor…'}</div>`; return; }
  app.className = (ui.trAll ? 'tr-all' : '');
  let main, side = '', bar = '', cls = 'shell';
  if (ui.view === 'day') {
    cls += ' day';
    const sec = curSec();
    main = `<main class="stage${opts.still ? ' still' : ''}${sec ? ' stepv' : ''}" id="stage">${sec ? hudHTML(day) + `<article class="paper${sec.mock ? ' boss' : ''}">${stepHTML(day, sec, ui.step)}</article>` : startHTML(day)}</main>`;
    bar = barHTML(day);
  } else if (ui.view === 'report') main = `<main id="stage">${reportHTML(day)}</main>`;
  else if (ui.view === 'glossary') {
    const need = glNeed();
    if (need.length && !ui.glErr) { main = `<main id="stage"><div class="stage rep"><div class="card">Sözlük yükleniyor…</div></div></main>`; ensureDays(need).then(() => { if (ui.view === 'glossary') render(); }, () => { ui.glErr = true; if (ui.view === 'glossary') render(); }); }
    else main = `<main id="stage">${glossaryHTML()}</main>`;
  }
  else main = `<main id="stage">${planHTML()}</main>`;
  app.innerHTML = topHTML() + `<div class="${cls}">${main}${side}</div>` + bar + sheetHTML(day);
  setStatus(lastStatus);
  const rt = $('#route'); if (rt && rt.scrollWidth > rt.clientWidth) { const c = $('.stop.cur', rt); if (c) rt.scrollLeft = Math.max(0, c.offsetLeft - rt.clientWidth / 3); }
  if (ui.view === 'glossary') applyGl();
  renderedStep = ui.step;
}
function rerender() { const y = window.scrollY; render({ still: true }); window.scrollTo(0, y); }
function refreshChrome() {
  const day = curDay();
  const side = $('.side'); if (side) { const t = document.createElement('div'); t.innerHTML = sideHTML(day); side.replaceWith(t.firstElementChild); }
  const bar = $('.bar-fixed'); if (bar) { const t = document.createElement('div'); t.innerHTML = barHTML(day); bar.replaceWith(t.firstElementChild); }
  const planned = day.sections.filter(secDone).reduce((a, s) => a + s.min, 0), tp = $('#topprog'); if (tp) tp.style.width = Math.round(100 * planned / minsOf(day, () => true)) + '%';
}
function go(i) {
  stopSpeech(); const day = curDay();
  ui.step = Math.max(-1, Math.min(i, day.sections.length - 1)); ui.sheet = false; ui.tro = {}; ui.eno = {}; ui.flip = false; ui.trCard = false; ui.rpos = undefined; ui.view = 'day';
  const sec = curSec();
  if (sec && sec.kind === 'cards') { ui.order = null; }
  tSec = 0; clearInterval(tInt); tInt = null;
  render(); window.scrollTo(0, 0);
}
function nudge(sel) {
  const el = $(sel); if (!el) return;
  const r = el.getBoundingClientRect(), limit = window.innerHeight - 90;
  if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit + 14, behavior: reduceMotion() ? 'auto' : 'smooth' });
}
function afterAnswer(sel) { queueSave(); rerender(); if (sel) nudge(sel); }

/* ---------- actions ---------- */
function pick(id, i) {
  const sec = curSec(), d = D(); if (!sec || d.res[id]) return;
  const it = itemsOf(sec).find(x => x.id === id); if (!it) return;
  if (mockLive(sec)) { d.sel[id] = i; $$('[data-item="' + id + '"] .opt').forEach((el, k) => el.classList.toggle('chosen', k === i)); mockProg(); queueSave(); return; }
  d.sel[id] = i; d.res[id] = { c: i, ok: i === it.a ? 1 : 0 };
  finalizeSec(sec); afterAnswer(sec.mode === 'single' ? '[data-act="qnext"]' : '[data-item="' + id + '"] .fb');
}
function checkGaps(blk) {
  const sec = curSec(), d = D();
  const b = sec.blocks.find(x => sec.id + '_' + x.id === blk); if (!b) return;
  b.gaps.forEach((g, i) => { const id = sec.id + '_' + b.id + '_' + (i + 1); const s = d.sel[id]; d.res[id] = { c: s === undefined ? -1 : s, ok: s === g.a ? 1 : 0 }; });
  finalizeSec(sec); afterAnswer();
}
function markCard(m) {
  const sec = curSec(), d = D(), order = deckOrder(sec), pos = d.card, wi = order[pos];
  d.vocab[wi] = m; if (m === 'new') d.seenNew[wi] = 1; d.card = pos + 1; ui.flip = false; ui.trCard = false;
  queueSave(); rerender(); if (d.card >= order.length) window.scrollTo(0, 0);
}
let tInt = null, tSec = 0;
function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function tick() { tSec++; const el = $('#tm'); if (el) { const sec = curSec(); el.textContent = fmt(tSec); el.classList.toggle('over', sec && tSec >= sec.target); } }

/* time tracking: counts only while the tab is visible and there was activity in the last 90 s */
let lastAct = Date.now();
['click', 'keydown', 'input', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
setInterval(() => {
  if (ui.view !== 'day' || !curDay() || ui.step < 0 || document.visibilityState !== 'visible' || Date.now() - lastAct > 90000) return;
  const sec = curSec(), d = D(); d.time[sec.id] = (d.time[sec.id] || 0) + 5;
  state.log = state.log || {}; const lk = todayKey(); state.log[lk] = (state.log[lk] || 0) + 5;
  d.timeDirty = (d.timeDirty || 0) + 5;
  if (d.timeDirty >= 30) { d.timeDirty = 0; queueSave(); }
}, 5000);

/* mock exam clock: counts while the tab is visible and the mock section is open and not yet submitted */
setInterval(() => {
  if (ui.view !== 'day' || !curDay() || ui.step < 0 || document.visibilityState !== 'visible') return;
  const sec = curSec(); if (!mockLive(sec)) return;
  const d = D(); d.mockT[sec.id] = (d.mockT[sec.id] || 0) + 1;
  const el = $('#mockt'); if (el) { el.textContent = mockClock(sec); const over = d.mockT[sec.id] > sec.min * 60; el.classList.toggle('over', over); const o = $('#mockover'); if (o) o.hidden = !over; }
  if (d.mockT[sec.id] % 15 === 0) queueSave();
}, 1000);

/* ---------- events ---------- */
const app = $('#app');
app.addEventListener('click', e => {
  const t = e.target.closest('[data-act], .trbtn'); if (!t) return;
  if (t.classList.contains('sheet') && e.target !== t) return;
  const act = t.dataset.act;
  if (t.classList.contains('trbtn')) { const box = t.closest('.trbox'); const o = box.classList.toggle('open'); t.setAttribute('aria-expanded', o ? 'true' : 'false'); if (box.dataset.k) ui.tro[box.dataset.k] = o; return; }
  switch (act) {
    case 'tab': stopSpeech(); ui.sheet = false; ui.view = t.dataset.view; render(); window.scrollTo(0, 0); return;
    case 'go': go(+t.dataset.i); return;
    case 'start': ui.step = -1; ui.sheet = false; render(); window.scrollTo(0, 0); return;
    case 'prev': if (ui.step <= 0) { ui.step = -1; ui.sheet = false; render(); window.scrollTo(0, 0); } else go(ui.step - 1); return;
    case 'next': if (ui.step >= curDay().sections.length - 1) { ui.view = 'report'; render(); window.scrollTo(0, 0); } else go(ui.step + 1); return;
    case 'sheet': ui.sheet = true; rerender(); return;
    case 'closesheet': if (e.target === t || t.tagName === 'BUTTON') { ui.sheet = false; const s = $('.sheet'); if (s) s.remove(); } return;
    case 'pick': pick(t.dataset.id, +t.dataset.i); return;
    case 'qnext': { const sec = curSec(); const n = sec.blocks.filter(b => b.type === 'mc').length; const cur = ui.q[sec.id] === undefined ? firstOpen(sec) : ui.q[sec.id]; ui.q[sec.id] = Math.min(cur + 1, n); const nextUn = itemsOf(sec).findIndex((x, k) => k > cur && !D().res[x.id]); if (nextUn >= 0) ui.q[sec.id] = nextUn; else if (!D().secs[sec.id]) ui.q[sec.id] = Math.max(0, itemsOf(sec).findIndex(x => !D().res[x.id])); rerender(); if (ui.q[sec.id] >= n) { const r = $('#result'); if (r) r.scrollIntoView({ block: 'start' }); } return; }
    case 'qprev': { const sec = curSec(); const cur = ui.q[sec.id] === undefined ? firstOpen(sec) : ui.q[sec.id]; ui.q[sec.id] = Math.max(0, cur - 1); rerender(); return; }
    case 'qjump': { const sec = curSec(); ui.q[sec.id] = +t.dataset.i; rerender(); return; }
    case 'chkgaps': checkGaps(t.dataset.blk); return;
    case 'mocksub': mockSubmit(); return;
    case 'enbtn': { const key = t.dataset.key; ui.eno[key] = !ui.eno[key]; const bi = $('[data-bi="' + key + '"]'); if (bi) bi.classList.toggle('en-on', !!ui.eno[key] || (secDone(curSec()) && ui.en)); return; }
    case 'enitem': { const id = t.dataset.id, key = 'i_' + id; ui.eno[key] = !ui.eno[key]; const bi = $('[data-bi="' + key + '"]'); if (bi) bi.classList.toggle('en-on', !!ui.eno[key] || (!!D().res[id] && ui.en)); t.setAttribute('aria-pressed', ui.eno[key] ? 'true' : 'false'); return; }
    case 'spk': { const txt = SAY[+t.dataset.say]; if (txt) speakText(txt, 0.95, t.dataset.lang); return; }
    case 'lplay1': { const box = t.closest('.listen'); const sc = SCRIPTS[+box.dataset.script].filter(l => l.who === t.dataset.who); const slow = $('.lslow', box); if (!speakScript(sc, slow && slow.checked ? 0.75 : 0.95)) { $('.ltext', box).hidden = false; } return; }
    case 'lplayonce': { const sec = curSec(), d = D(); if (!sec || d.plays[sec.id]) return; const box = t.closest('.listen'); const sc = SCRIPTS[+box.dataset.script];
      if (!speakScript(sc, 0.95)) { $('.ltext', box).hidden = false; return; } d.plays[sec.id] = Date.now(); saveLocal(); t.disabled = true; t.textContent = '✓ Gehört'; return; }
    case 'lplay': { const box = t.closest('.listen'); const sc = SCRIPTS[+box.dataset.script]; const slow = $('.lslow', box).checked; if (!speakScript(sc, slow ? 0.75 : 0.95)) { $('.ltext', box).hidden = false; } return; }
    case 'lstop': stopSpeech(); return;
    case 'ltrans': { const box = t.closest('.listen'); const tx = $('.ltext', box); tx.hidden = !tx.hidden; if (!tx.hidden && ui.en) tx.classList.add('show-en'); t.setAttribute('aria-expanded', tx.hidden ? 'false' : 'true'); ui.eno[curSec().id + '_listen_t'] = !tx.hidden; return; }
    case 'flip': ui.flip = true; ui.trCard = false; rerender(); nudge('.marks'); return;
    case 'revtr': ui.trCard = true; rerender(); nudge('.marks'); return;
    case 'mark': markCard(t.dataset.m); return;
    case 'hins': { const ta = $('#wr_text'); if (!ta) return; const ph = HINS[+t.dataset.h] || ''; const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a; const pre = ta.value.slice(0, a), sep = pre && !/\s$/.test(pre) ? ' ' : ''; ta.value = pre + sep + ph + ' ' + ta.value.slice(b); const pos = (pre + sep + ph + ' ').length; ta.focus(); try { ta.setSelectionRange(pos, pos); } catch (er) {} ta.dispatchEvent(new Event('input', { bubbles: true })); return; }
    case 'rmark': markReview(t.dataset.m); return;
    case 'rgo': { const q = srsQueue(curDay().no); ui.rpos = Math.max(0, Math.min(+t.dataset.i, q.length)); ui.flip = false; ui.trCard = false; rerender(); return; }
    case 'rreset': { const d = D(); srsQueue(curDay().no).forEach(it => { delete d.rev[it.k]; }); ui.rpos = 0; ui.flip = false; queueSave(); rerender(); return; }
    case 'openday': openDay(t.dataset.id); return;
    case 'cprev': { const d = D(); d.card = Math.max(0, d.card - 1); ui.flip = false; ui.trCard = false; queueSave(); rerender(); return; }
    case 'cnext': { const d = D(), sec = curSec(); d.card = Math.min(deckOrder(sec).length, d.card + 1); ui.flip = false; ui.trCard = false; rerender(); return; }
    case 'cjump': { const d = D(); d.card = +t.dataset.i; ui.flip = false; ui.trCard = false; rerender(); return; }
    case 'revrow': { const td = t.closest('td'); const v = $('.trv', td); v.classList.add('on'); t.remove(); return; }
    case 'decknew': { const sec = curSec(), d = D(); ui.order = sec.words.map((w, i) => i).filter(i => d.vocab[i] === 'new'); ui.order.forEach(i => { delete d.vocab[i]; }); d.card = 0; ui.flip = false; queueSave(); rerender(); return; }
    case 'deckreset': { const d = D(); d.vocab = {}; d.seenNew = {}; d.card = 0; ui.order = null; ui.flip = false; queueSave(); rerender(); refreshChrome(); return; }
    case 'wsub': { const d = D(), ws = curSec(); if (!ui.wconfirm && wordCount(d.write.text || '') < Math.ceil((ws.minWords || 20) / 2)) { ui.wconfirm = true; rerender(); return; } ui.wconfirm = false; d.write.submitted = true; d.write.words = wordCount(d.write.text || ''); queueSave(); rerender(); const m = $('#model'); if (m) m.scrollIntoView({ block: 'start' }); return; }
    case 'tstart': if (!tInt) tInt = setInterval(tick, 1000); return;
    case 'tstop': clearInterval(tInt); tInt = null; { const sp = D().speak; sp.secs = tSec; queueSave(); } return;
    case 'treset': clearInterval(tInt); tInt = null; tSec = 0; { const el = $('#tm'); if (el) { el.textContent = '0:00'; el.classList.remove('over'); } } return;
    case 'sdone': { const d = D(); d.speak.done = !d.speak.done; if (tSec) d.speak.secs = tSec; queueSave(); rerender(); return; }
    case 'finish': { const d = D(), first = !d.closed; d.closed = true; queueSave(); ui.view = 'report'; render(); window.scrollTo(0, 0); if (first) celebrate('Tag ' + curDay().no + ' geschafft!', '+100 XP · Karne hazır'); return; }
    case 'week': ui.planWeek = +t.dataset.w; render(); return;
    case 'glday': ui.glDay = t.dataset.v; ui.glErr = false; stopSpeech(); render(); window.scrollTo(0, 0); return;
    case 'gldom': ui.glDom = t.dataset.v; glPress('gldom', ui.glDom); applyGl(); return;
    case 'glcover': ui.glCover = t.dataset.v; glPress('glcover', ui.glCover); { const r = $('.glv'); if (r) { r.className = 'stage glv cv-' + (ui.glCover || 'none'); $$('.ge', r).forEach(e => e.classList.remove('rv-de', 'rv-en')); } } return;
    case 'glrev': { const e = t.closest('.ge'); if (e) e.classList.add('rv-' + t.dataset.side); return; }
    case 'glgo': { const el = document.getElementById(t.dataset.g); if (el) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); return; }
    case 'reset': t.outerHTML = '<span>Emin misin? Bu günün tüm cevapları silinir. <button class="link" type="button" data-act="resetyes">Evet, sil</button> · <button class="link" type="button" data-act="resetno">Vazgeç</button></span>'; return;
    case 'resetno': render(); return;
    case 'resetyes': delete state.days[ui.day]; D(); migrateDay(ui.day); ui.q = {}; ui.rpos = undefined; ui.order = null; queueSave(); ui.step = -1; render(); window.scrollTo(0, 0); return;
    case 'resdl': { const id = ui.day; downloadText('c1-heft-tag' + DAYS[id].no + '-sonuc.json', JSON.stringify(buildDoc(id), null, 1)); return; }
    case 'bkdl': { const dt = new Date().toISOString().slice(0, 10); downloadText('c1-heft-yedek-' + dt + '.json', JSON.stringify({ app: 'linie-c1', v: 1, days: state.days, log: state.log || {} })); $('#bkOut').innerHTML = '<p class="allok">Yedek dosyası indirildi.</p>'; return; }
    case 'bkcode': { const out = $('#bkOut'); packState().then(code => { const showBox = () => { out.innerHTML = '<p class="hint">Kodu seçip kopyala:</p><textarea class="repbox" readonly aria-label="Aktarma kodu"></textarea>'; const ta = $('textarea', out); ta.value = code; ta.focus(); ta.select(); }; try { navigator.clipboard.writeText(code).then(() => { out.innerHTML = '<p class="allok">Aktarma kodu kopyalandı. Diğer cihazda Harita → Kayıtlarım → “Kodu yapıştır”.</p>'; }, showBox); } catch (err) { showBox(); } }); return; }
    case 'bkpaste': { $('#bkOut').innerHTML = '<label class="lbl" for="bkcodein">Aktarma kodunu buraya yapıştır</label><textarea id="bkcodein" class="repbox"></textarea><div class="bkrow"><button class="btn primary" type="button" data-act="bkapply">Kayıtları yükle</button></div>'; $('#bkcodein').focus(); return; }
    case 'bkapply': { const v = ($('#bkcodein') || {}).value; unpackState(v).then(imp => importDone(mergeState(imp))).catch(() => { $('#bkOut').insertAdjacentHTML('beforeend', '<p class="errc">Kod okunamadı. Kodun tamamını, başında C1 ile kopyaladığından emin ol.</p>'); }); return; }
    case 'copy': {
      const txt = reportText(curDay()), out = $('#repOut');
      const showBox = () => { out.innerHTML = '<textarea class="repbox" readonly aria-label="Rapor metni"></textarea>'; const ta = $('textarea', out); ta.value = txt; ta.focus(); ta.select(); };
      try { navigator.clipboard.writeText(txt).then(() => { out.innerHTML = '<p class="allok">Kopyalandı.</p>'; }, showBox); } catch (err) { showBox(); }
      return;
    }
  }
});
app.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'trAll') { ui.trAll = t.checked; app.className = ui.trAll ? 'tr-all' : ''; return; }
  if (t.id === 'enSw') { ui.en = t.checked; rerender(); return; }
  if (t.id === 'daySel') { openDay(t.value, ui.view === 'plan' ? 'day' : ui.view); return; }
  if (t.matches('select.gap')) {
    const id = t.dataset.id, d = D();
    if (t.value === '') delete d.sel[id]; else d.sel[id] = +t.value;
    t.classList.toggle('set', t.value !== '');
    const cl = t.closest('.cloze'), sec = curSec();
    const b = sec.blocks.find(x => cl && cl.contains($('[data-gapprog="' + sec.id + '_' + x.id + '"]')));
    if (b) {
      const ids = b.gaps.map((g, i) => sec.id + '_' + b.id + '_' + (i + 1)); const n = ids.filter(k => d.sel[k] !== undefined).length;
      const chk = $('[data-act="chkgaps"]', cl); if (chk) chk.disabled = n < ids.length;
      const pg = $('[data-gapprog]', cl); if (pg) pg.textContent = n + '/' + ids.length + ' seçildi';
      mockProg();
      const bank = $('.bank', cl); if (bank && b.sentences) { const used = ids.map(k => d.sel[k]).filter(v => v !== undefined); $$('.bs', bank).forEach((el, k) => el.classList.toggle('used', used.includes(k))); }
    }
    queueSave(); return;
  }
  if (t.id === 'bkfile' && t.files && t.files[0]) { t.files[0].text().then(txt => importDone(mergeState(JSON.parse(txt)))).catch(() => { $('#bkOut').innerHTML = '<p class="errc">Dosya okunamadı. Bu siteden indirilen bir yedek dosyası seç.</p>'; }); return; }
  if (t.classList.contains('wchk')) { const w = D().write; w.checks = w.checks || {}; w.checks[t.dataset.i] = t.checked; queueSave(); return; }
  if (t.classList.contains('schk')) { const s = D().speak; s.checks = s.checks || {}; s.checks[t.dataset.i] = t.checked; queueSave(); return; }
  if (t.id === 'sp_rate') { D().speak.rating = t.value ? +t.value : null; queueSave(); return; }
});
app.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'wr_text') {
    const w = D().write; w.text = t.value; const n = wordCount(t.value); const sec = curSec();
    const wc = $('#wc'); wc.textContent = n + ' Wörter'; wc.className = n >= sec.minWords && n <= sec.maxWords ? 'okc' : '';
    queueSave(); return;
  }
  if (t.id === 'sp_notes') { D().speak.notes = t.value; queueSave(); return; }
  if (t.id === 'notes') { D().notes = t.value; queueSave(); return; }
  if (t.id === 'glq') { ui.glQ = t.value; applyGl(); return; }
});
document.addEventListener('keydown', e => {
  if (ui.view !== 'day' || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target && e.target.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (!curDay()) return;
  const sec = curSec(); if (!sec) return;
  if (sec.kind === 'quiz' && sec.mode === 'single') {
    const k = LET.indexOf(e.key.toLowerCase());
    if (e.key.length === 1 && k >= 0 && k < 5) {
      const mcs = sec.blocks.filter(b => b.type === 'mc'); let qi = ui.q[sec.id] === undefined ? firstOpen(sec) : ui.q[sec.id];
      const b = mcs[qi]; if (b && b.opts[k] !== undefined) { pick(sec.id + '_' + b.id, k); e.preventDefault(); }
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') { const n = $('[data-act="qnext"]'); if (n) { n.click(); e.preventDefault(); } }
  }
  if (sec.kind === 'review') {
    if (e.key === ' ' || e.key === 'Enter') { const f = $('[data-act="flip"]'); if (f) { f.click(); e.preventDefault(); } }
    else if (e.key === 'ArrowLeft') { const k = $('[data-act="rmark"][data-m="know"]'); if (k) { k.click(); e.preventDefault(); } }
    else if (e.key === 'ArrowRight') { const n = $('[data-act="rmark"][data-m="again"]'); if (n) { n.click(); e.preventDefault(); } }
  }
  if (sec.kind === 'cards') {
    if (e.key === ' ' || e.key === 'Enter') { const f = $('[data-act="flip"]'); if (f) { f.click(); e.preventDefault(); } }
    else if (e.key === 'ArrowLeft') { const k = $('[data-m="know"]'); if (k) { k.click(); e.preventDefault(); } }
    else if (e.key === 'ArrowRight') { const n = $('[data-m="new"]'); if (n) { n.click(); e.preventDefault(); } }
  }
});

function mergePartner(raw) {
  try {
    const p = JSON.parse(raw || 'null'); if (!p || !p.days) return false; let ch = false;
    Object.entries(p.days).forEach(([id, v]) => {
      if (!v || !v.partner) return; const d = state.days[id] || (state.days[id] = {});
      if (JSON.stringify(d.partner || []) !== JSON.stringify(v.partner)) { d.partner = v.partner; ch = true; }
      if (v.speak && v.speak.done && !(d.speak && d.speak.done)) { d.speak = Object.assign({}, d.speak || {}, v.speak); ch = true; }
    });
    state.log = state.log || {};
    Object.entries(p.log || {}).forEach(([k, v]) => { if ((+v || 0) > (state.log[k] || 0)) { state.log[k] = +v; ch = true; } });
    return ch;
  } catch (e) { return false; }
}
window.addEventListener('storage', e => { if (e.key === KEY && mergePartner(e.newValue)) { try { render({ still: true }); } catch (x) {} } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {} if (mergePartner(raw)) { saveLocal(); try { render({ still: true }); } catch (x) {} } } });
/* ---------- start ---------- */
loadLocal();
if (window.SEED && !state.seeded) { Object.entries(window.SEED.days || {}).forEach(([id, v]) => { if (!state.days[id]) state.days[id] = JSON.parse(JSON.stringify(v)); }); state.seeded = true; saveLocal(); }
status('local');
try { if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
render();
loadScript('data/manifest.js', String(Date.now())).then(() => {
  const ids = liveIds(); if (!ids.length) throw new Error('manifest');
  ids.forEach(id => D(id));
  ui.day = pickStartDay(); ui.glDay = ui.day;
  const wk = MD(ui.day) && MD(ui.day).week; if (wk) ui.planWeek = wk;
  return Promise.all([loadScript('data/plan.js', MAN().planV || '1'), ensureDay(ui.day)]);
}).then(() => { if (!window.PLAN) throw new Error('plan'); if (PLAN.weeks && PLAN.weeks.length) TOTAL_DAYS = PLAN.weeks.length * 5; render(); }).catch(e => {
  $('#app').innerHTML = '<div class="boot err">Sayfa yüklenemedi. Lütfen sayfayı yenile. (' + esc(e && e.message || '') + ')</div>';
});
window.addEventListener('beforeunload', () => { stopSpeech(); saveLocal(); });
})();
