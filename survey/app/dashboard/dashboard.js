// Aggregate-only dashboard: BITS survey (browser-computed) vs UCI (uci_summary.json).
// No individual rows, names or emails are ever rendered.
import { firebaseConfig } from '../firebase-config.js';

const FB_BASE = 'https://www.gstatic.com/firebasejs/11.0.2/'; // same version as ../app.js
const MIN_CLASS_VIEW = 15;
const MIN_CELL = 5;
const BOOT_REPS = 1000;
const BOOT_SEED = 2026;

const params = new URLSearchParams(location.search);
const DEMO = params.get('source') === 'demo';
const COLLECTION = DEMO ? 'demo_responses' : 'responses';

const $ = id => document.getElementById(id);

// ---------- DOM helpers (textContent only, so nothing is interpreted as HTML) ----------
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined && text !== null) e.textContent = String(text);
  if (cls) e.className = cls;
  return e;
}

function table(headers, rows) {
  const t = el('table');
  const head = el('tr');
  headers.forEach(h => head.append(el('th', h)));
  t.append(head);
  rows.forEach(r => {
    const tr = el('tr');
    r.forEach(c => tr.append(el('td', c)));
    t.append(tr);
  });
  const wrap = el('div', null, 'tablewrap');
  wrap.append(t);
  return wrap;
}

// ---------- Statistics ----------
function meanSd(v) {
  const n = v.length;
  if (n === 0) return { n: 0, mean: null, sd: null };
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : null;
  return { n, mean, sd };
}

function olsSlope(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  return sxx === 0 ? null : sxy / sxx;
}

// Small seeded PRNG (mulberry32) so the bootstrap CI is reproducible.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slopeWithCi(xs, ys) {
  const n = xs.length;
  const est = n >= 3 ? olsSlope(xs, ys) : null;
  if (est === null) return { n, slope: null, lo: null, hi: null };
  const rng = makeRng(BOOT_SEED);
  const draws = [];
  while (draws.length < BOOT_REPS) {
    const bx = new Array(n), by = new Array(n);
    for (let i = 0; i < n; i++) { const k = Math.floor(rng() * n); bx[i] = xs[k]; by[i] = ys[k]; }
    const s = olsSlope(bx, by);
    if (s !== null) draws.push(s);
  }
  draws.sort((a, b) => a - b);
  return { n, slope: est, lo: draws[Math.floor(0.025 * BOOT_REPS)], hi: draws[Math.floor(0.975 * BOOT_REPS) - 1] };
}

// Turn Firestore documents into clean numeric records; drop rows missing G3 or studytime.
function toRecords(docs) {
  const out = [];
  docs.forEach(d => {
    const pct = Number(d.G3_pct);
    const study = Number(d.studytime);
    if (d.G3_pct === undefined || d.G3_pct === null || !Number.isFinite(pct)) return;
    if (!Number.isFinite(study)) return;
    out.push({
      G3: Math.round(pct / 5), // same 0-20 scale as UCI
      studytime: study,
      failures: Math.min(Number(d.failures), 3),
      sex: d.sex,
    });
  });
  return out;
}

function groupMeans(records, key, levels) {
  const res = {};
  levels.forEach(l => {
    const vals = records.filter(r => r[key] === l).map(r => r.G3);
    const s = meanSd(vals);
    res[String(l)] = { n: vals.length, mean: s.mean, sd: s.sd };
  });
  return res;
}

function summarise(records) {
  const g3 = records.map(r => r.G3);
  return {
    overall: meanSd(g3),
    studytime: groupMeans(records, 'studytime', [1, 2, 3, 4]),
    failures: groupMeans(records, 'failures', [0, 1, 2, 3]),
    sex: groupMeans(records, 'sex', ['F', 'M']),
    slope: slopeWithCi(records.map(r => r.studytime), g3),
  };
}

// ---------- Formatting (always show n; never show a number when n = 0) ----------
const f2 = x => x.toFixed(2);

function cell(c) {
  if (!c || c.n === 0) return 'no responses yet (n=0)';
  if (c.n < MIN_CELL) return `too small to show (n=${c.n})`;
  return `${f2(c.mean)} (n=${c.n})`;
}

function overallText(o) {
  if (!o || o.n === 0) return 'no responses yet (n=0)';
  const sd = o.sd === null ? 'SD not defined' : `SD ${f2(o.sd)}`;
  return `mean ${f2(o.mean)}, ${sd} (n=${o.n})`;
}

function slopeText(s) {
  if (!s || s.n === 0) return 'no responses yet (n=0)';
  if (s.n < MIN_CELL || s.slope === null) return `too small to show (n=${s.n})`;
  return `${f2(s.slope)} per band, 95% CI ${f2(s.lo)} to ${f2(s.hi)} (n=${s.n})`;
}

// ---------- Theme (light / dark) ----------
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function storedTheme() { try { return localStorage.getItem('dash-theme'); } catch (e) { return null; } }
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  const dark = currentIsDark();
  const b = $('theme-btn');
  if (b) {
    b.textContent = dark ? 'Light mode' : 'Dark mode';
    b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
}
function currentIsDark() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function initTheme() {
  applyTheme(storedTheme());
  $('theme-btn').addEventListener('click', () => {
    const next = currentIsDark() ? 'light' : 'dark';
    try { localStorage.setItem('dash-theme', next); } catch (e) { /* storage blocked, still works for this visit */ }
    applyTheme(next);
  });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (!storedTheme()) applyTheme(null); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }
}

// ---------- State ----------
const MARKS = { BITS: 'BITS', UCI: 'UCI' };
let view = 'both';   // 'both' | 'BITS' | 'UCI'
let band = 0;        // 0 = all study-time bands, 1..4 = one band (also set by clicking a dot)
let last = null;     // { docs, uci } so the slicers can redraw
const BAND_LABELS = { 1: 'Under 2 h', 2: '2-5 h', 3: '5-10 h', 4: 'Over 10 h' };

// ---------- SVG + tooltip helpers ----------
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, String(v));
  if (text != null) e.textContent = text;
  return e;
}
function svgRoot(w, h, label) {
  return sv('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet' });
}
const showSeries = name => view === 'both' || view === name;

const tipEl = () => $('tip');
function showTip(text, x, y) {
  const t = tipEl();
  t.textContent = text;
  t.classList.add('on');
  const w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - w - 8)) + 'px';
  t.style.top = Math.max(8, Math.min(y + 14, window.innerHeight - h - 8)) + 'px';
}
function hideTip() { tipEl().classList.remove('on'); }
function tipify(node, text, onClick) {
  node.classList.add('mk');
  node.setAttribute('tabindex', '0');
  node.setAttribute('aria-label', text);
  node.addEventListener('pointerenter', e => showTip(text, e.clientX, e.clientY));
  node.addEventListener('pointermove', e => showTip(text, e.clientX, e.clientY));
  node.addEventListener('pointerleave', hideTip);
  node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); showTip(text, r.left + r.width / 2, r.top); });
  node.addEventListener('blur', hideTip);
  if (onClick) {
    node.setAttribute('role', 'button');
    node.classList.add('click');
    node.addEventListener('click', onClick);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
  }
}

// ---------- Count-up ----------
function countUp(node, target, fmt) {
  if (node._raf) cancelAnimationFrame(node._raf);
  if (REDUCED) { node.textContent = fmt(target); return; }
  const t0 = performance.now(), dur = 900;
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    node.textContent = fmt(target * e);
    if (p < 1) node._raf = requestAnimationFrame(step); else node.textContent = fmt(target);
  };
  node._raf = requestAnimationFrame(step);
}

// ---------- KPI cards ----------
// spec: { label, series, num, fmt, text, sub }  (text replaces the number when suppressed)
function kpiCard(spec, idx) {
  const card = el('div', null, 'kpi s-' + spec.series + (showSeries(spec.series) ? '' : ' off'));
  card.style.setProperty('--d', (idx * 60) + 'ms');
  card.append(el('div', spec.label, 'kpi-l'));
  const v = el('div', null, 'kpi-v');
  if (spec.num !== undefined && spec.num !== null) countUp(v, spec.num, spec.fmt); else { v.textContent = spec.text; v.classList.add('small'); }
  card.append(v);
  card.append(el('div', spec.sub || '', 'kpi-s'));
  return card;
}

const TOO_SMALL = 'too small to show';

function buildKpis(bitsF, uciF, bitsAll, uci, filteredRecords) {
  const out = [];
  const bn = bitsF.overall.n, un = uciF.n;
  out.push({ label: 'BITS n', series: 'BITS', num: bn, fmt: x => String(Math.round(x)), sub: band ? BAND_LABELS[band] : 'usable responses' });
  out.push({ label: 'UCI n', series: 'UCI', num: un, fmt: x => String(Math.round(x)), sub: band ? BAND_LABELS[band] : 'Portuguese course' });

  out.push(bn === 0 ? { label: 'BITS mean grade', series: 'BITS', text: 'no responses yet (n=0)', sub: 'out of 20' }
    : bn < MIN_CELL ? { label: 'BITS mean grade', series: 'BITS', text: TOO_SMALL, sub: `n=${bn}` }
    : { label: 'BITS mean grade', series: 'BITS', num: bitsF.overall.mean, fmt: x => x.toFixed(2), sub: 'out of 20' });
  out.push(un === 0 ? { label: 'UCI mean grade', series: 'UCI', text: 'no data (n=0)', sub: 'out of 20' }
    : un < MIN_CELL ? { label: 'UCI mean grade', series: 'UCI', text: TOO_SMALL, sub: `n=${un}` }
    : { label: 'UCI mean grade', series: 'UCI', num: uciF.mean, fmt: x => x.toFixed(2), sub: 'out of 20' });

  const sl = (name, s) => (!s || s.n === 0) ? { label: name + ' study-time slope', series: name, text: 'no responses yet (n=0)', sub: 'grade points per band' }
    : (s.n < MIN_CELL || s.slope === null) ? { label: name + ' study-time slope', series: name, text: TOO_SMALL, sub: `n=${s.n}` }
    : { label: name + ' study-time slope', series: name, num: s.slope, fmt: x => (x >= 0 ? '+' : '') + x.toFixed(2), sub: `95% CI ${f2(s.lo)} to ${f2(s.hi)}${band ? ' (all bands)' : ''}` };
  out.push(sl('BITS', bitsAll.slope));
  out.push(sl('UCI', uci.slope));

  const pct = x => x.toFixed(1) + '%';
  if (bn === 0) out.push({ label: 'BITS at or above 10/20', series: 'BITS', text: 'no responses yet (n=0)', sub: 'share of students' });
  else if (bn < MIN_CELL) out.push({ label: 'BITS at or above 10/20', series: 'BITS', text: TOO_SMALL, sub: `n=${bn}` });
  else out.push({ label: 'BITS at or above 10/20', series: 'BITS', num: 100 * filteredRecords.filter(r => r.G3 >= 10).length / bn, fmt: pct, sub: 'share of students' });

  if (band) out.push({ label: 'UCI at or above 10/20', series: 'UCI', text: 'not split by band', sub: 'share of students' });
  else {
    const counts = uci.g3_counts || {};
    let tot = 0, ok = 0;
    for (let g = 0; g <= 20; g++) { const c = Number(counts[String(g)] || 0); tot += c; if (g >= 10) ok += c; }
    out.push(tot === 0 ? { label: 'UCI at or above 10/20', series: 'UCI', text: 'no data (n=0)', sub: 'share of students' }
      : { label: 'UCI at or above 10/20', series: 'UCI', num: 100 * ok / tot, fmt: pct, sub: 'share of students' });
  }
  return out;
}

// ---------- Charts ----------
// Dot-and-whisker: mean with 95% CI (mean +/- 1.96 SE). Cells with n < MIN_CELL are not drawn.
// series: [{ name, cells }]  groups: [{ key, label }]
function dotChart(title, groups, series, opts) {
  const yMin = 4, yMax = 18;
  const W = 420, H = 250, pad = { l: 34, r: 10, t: 12, b: 38 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const x = i => pad.l + (i + 0.5) * plotW / groups.length;
  const y = v => pad.t + (yMax - v) / (yMax - yMin) * plotH;
  const s = svgRoot(W, H, title);
  for (let v = yMin; v <= yMax; v += 2) {
    s.append(sv('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'grid' }));
    s.append(sv('text', { x: pad.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' }, String(v)));
  }
  groups.forEach((g, i) => {
    if (opts && opts.selected && String(opts.selected) === g.key) {
      s.append(sv('rect', { x: x(i) - plotW / groups.length / 2 + 2, y: pad.t, width: plotW / groups.length - 4, height: plotH, class: 'sel', rx: 6 }));
    }
    s.append(sv('text', { x: x(i), y: H - pad.b + 18, 'text-anchor': 'middle', class: 'tick' }, g.label));
  });
  const off = series.length > 1 ? 12 : 0;
  let k = 0;
  series.forEach((sr, si) => {
    groups.forEach((g, i) => {
      const c = sr.cells && sr.cells[g.key];
      if (!c || c.n < MIN_CELL || c.mean == null) return; // suppressed, same rule as the table
      const dx = x(i) + (series.length > 1 ? (si === 0 ? -off : off) : 0);
      const se = c.sd != null && c.n > 1 ? c.sd / Math.sqrt(c.n) : 0;
      const lo = Math.max(yMin, c.mean - 1.96 * se), hi = Math.min(yMax, c.mean + 1.96 * se);
      const grp = sv('g', { class: 'pt s-' + sr.name });
      grp.style.setProperty('--d', (120 + k++ * 45) + 'ms');
      grp.append(sv('line', { x1: dx, x2: dx, y1: y(lo), y2: y(hi), class: 'wh' }));
      grp.append(sv('line', { x1: dx - 4, x2: dx + 4, y1: y(lo), y2: y(lo), class: 'wh cap' }));
      grp.append(sv('line', { x1: dx - 4, x2: dx + 4, y1: y(hi), y2: y(hi), class: 'wh cap' }));
      grp.append(sv('circle', { cx: dx, cy: y(c.mean), r: 6, class: 'dot' }));
      const text = `${sr.name}, ${g.label}: mean ${c.mean.toFixed(2)}, 95% CI ${lo.toFixed(2)} to ${hi.toFixed(2)}, n=${c.n}`;
      tipify(grp, text, opts && opts.onPick ? () => opts.onPick(g.key) : null);
      s.append(grp);
    });
  });
  return s;
}

// Grade distribution: share of respondents at each grade 0-20, one bar per dataset.
function histChart(sets) {
  const W = 420, H = 250, pad = { l: 34, r: 8, t: 12, b: 38 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const shares = sets.map(sr => {
    const total = sr.counts.reduce((a, b) => a + b, 0) || 1;
    return { name: sr.name, n: sr.n, counts: sr.counts, shares: sr.counts.map(c => c / total) };
  });
  const maxShare = Math.max(0.05, ...shares.flatMap(s => s.shares));
  const s = svgRoot(W, H, 'Grade distribution');
  const slot = plotW / 21;
  const bw = slot * (shares.length > 1 ? 0.44 : 0.78);
  const y = v => pad.t + (1 - v / maxShare) * plotH;
  const top = Math.ceil(maxShare * 20) / 20;
  for (let v = 0; v <= top + 1e-9; v += top / 2 || 0.05) {
    s.append(sv('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'grid' }));
    s.append(sv('text', { x: pad.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' }, Math.round(v * 100) + '%'));
  }
  for (let g = 0; g <= 20; g += 5) s.append(sv('text', { x: pad.l + g * slot + slot / 2, y: H - pad.b + 18, 'text-anchor': 'middle', class: 'tick' }, String(g)));
  s.append(sv('text', { x: W / 2, y: H - 4, 'text-anchor': 'middle', class: 'tick' }, 'grade out of 20'));
  shares.forEach((sr, si) => {
    sr.shares.forEach((v, g) => {
      if (sr.counts[g] === 0) return;
      const x0 = pad.l + g * slot + (slot - bw * shares.length) / 2 + si * bw;
      const bar = sv('rect', { x: x0, y: y(v), width: Math.max(1, bw - 1), height: Math.max(0, y(0) - y(v)), class: 'bar s-' + sr.name, rx: 2 });
      bar.style.setProperty('--d', (g * 22) + 'ms');
      tipify(bar, `${sr.name}, grade ${g}: ${(v * 100).toFixed(1)}% of respondents`);
      s.append(bar);
    });
  });
  return s;
}

// Slope comparison: each dataset's study-time slope with its 95% CI.
function slopeChart(sets) {
  const W = 420, H = 250, pad = { l: 52, r: 18, t: 16, b: 44 };
  const plotW = W - pad.l - pad.r;
  const s = svgRoot(W, H, 'Study-time slope with 95% CI');
  const ser = sets.filter(sr => sr.slope && sr.slope.slope != null && sr.slope.n >= MIN_CELL);
  if (ser.length === 0) { s.append(sv('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'tick' }, 'Not enough data for a slope yet')); return s; }
  const vals = ser.flatMap(sr => [sr.slope.lo, sr.slope.hi, sr.slope.slope]);
  const lo = Math.min(0, ...vals) - 0.2, hi = Math.max(0, ...vals) + 0.2;
  const x = v => pad.l + (v - lo) / (hi - lo) * plotW;
  s.append(sv('line', { x1: x(0), x2: x(0), y1: pad.t, y2: H - pad.b, class: 'zero' }));
  ser.forEach((sr, i) => {
    const yy = pad.t + 50 + i * 70;
    const g = sv('g', { class: 'pt s-' + sr.name });
    g.style.setProperty('--d', (150 + i * 120) + 'ms');
    g.append(sv('text', { x: pad.l - 8, y: yy + 4, 'text-anchor': 'end', class: 'tick strong' }, sr.name));
    g.append(sv('line', { x1: x(sr.slope.lo), x2: x(sr.slope.hi), y1: yy, y2: yy, class: 'wh wide' }));
    g.append(sv('circle', { cx: x(sr.slope.slope), cy: yy, r: 8, class: 'dot' }));
    g.append(sv('text', { x: x(sr.slope.slope), y: yy - 16, 'text-anchor': 'middle', class: 'tick strong' }, (sr.slope.slope >= 0 ? '+' : '') + sr.slope.slope.toFixed(2)));
    tipify(g, `${sr.name} slope ${sr.slope.slope.toFixed(2)}, 95% CI ${sr.slope.lo.toFixed(2)} to ${sr.slope.hi.toFixed(2)}, n=${sr.slope.n}`);
    s.append(g);
  });
  s.append(sv('text', { x: x(0), y: H - 22, 'text-anchor': 'middle', class: 'tick' }, '0 = no link'));
  s.append(sv('text', { x: W / 2, y: H - 6, 'text-anchor': 'middle', class: 'tick' }, 'grade points per study-time band'));
  return s;
}

function visualCard(title, sub, node, extraClass) {
  const card = el('section', null, 'vis ' + (extraClass || ''));
  const head = el('div', null, 'vis-h');
  head.append(el('h3', title));
  if (sub) head.append(el('span', sub, 'vis-s'));
  card.append(head);
  const body = el('div', null, 'vis-b');
  body.append(node);
  card.append(body);
  return card;
}

function countsTable(bitsAll, uci, nBits) {
  const cellN = n => (n === 0 ? '0' : n < MIN_CELL ? TOO_SMALL : String(n));
  const rows = [1, 2, 3, 4].map(b => [BAND_LABELS[b], cellN(bitsAll.studytime[String(b)].n), cellN((uci.studytime[String(b)] || { n: 0 }).n)]);
  rows.push(['All', String(nBits), String(uci.overall.n)]);
  const wrap = el('div', null, 'tablewrap');
  const t = el('table');
  const head = el('tr');
  ['Study time', 'BITS n', 'UCI n'].forEach(h => head.append(el('th', h)));
  t.append(head);
  rows.forEach((r, i) => {
    const tr = el('tr');
    if (i < 4) {
      tr.className = 'click' + (band === i + 1 ? ' on' : '');
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('role', 'button');
      const pick = () => setBand(band === i + 1 ? 0 : i + 1);
      tr.addEventListener('click', pick);
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    } else tr.className = 'total';
    r.forEach((c, j) => tr.append(el(j === 0 ? 'th' : 'td', c)));
    t.append(tr);
  });
  wrap.append(t);
  return wrap;
}

// ---------- Slicers ----------
function chipGroup(label, items, current, onPick) {
  const g = el('div', null, 'slicer');
  g.append(el('span', label, 'slicer-l'));
  const bar = el('div', null, 'chips');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', label);
  items.forEach(([v, text]) => {
    const b = el('button', text, 'chip');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(current === v));
    b.addEventListener('click', () => onPick(v));
    bar.append(b);
  });
  g.append(bar);
  return g;
}
function setView(v) { view = v; if (last) render(last.docs, last.uci); }
function setBand(b) { band = b; if (last) render(last.docs, last.uci); }

function renderSlicers() {
  const bar = $('slicers');
  bar.replaceChildren();
  bar.append(chipGroup('Dataset', [['both', 'Both'], ['BITS', 'BITS'], ['UCI', 'UCI']], view, setView));
  bar.append(chipGroup('Study time', [[0, 'All'], [1, 'Under 2 h'], [2, '2-5 h'], [3, '5-10 h'], [4, 'Over 10 h']], band, setBand));
  const lg = el('div', null, 'legend');
  ['BITS', 'UCI'].forEach(n => { const i = el('span', null, 'lg s-' + n + (showSeries(n) ? '' : ' off')); i.append(el('i'), document.createTextNode(n)); lg.append(i); });
  bar.append(lg);
}

// ---------- Page ----------
function render(docs, uci) {
  last = { docs, uci };
  hideTip();
  const records = toRecords(docs);
  const bitsAll = summarise(records);
  const filtered = band ? records.filter(r => r.studytime === band) : records;
  const bitsF = band ? summarise(filtered) : bitsAll;
  // UCI only publishes per-band means (no rows), so a band filter uses that band's cell.
  const uciBand = band ? (uci.studytime[String(band)] || { n: 0, mean: null, sd: null }) : null;
  const uciF = band ? uciBand : uci.overall;

  $('n-chip').textContent = `n = ${docs.length}`;
  renderSlicers();

  const kp = $('kpis');
  kp.replaceChildren();
  buildKpis(bitsF, uciF, bitsAll, uci, filtered).forEach((spec, i) => kp.append(kpiCard(spec, i)));

  const pickBand = key => setBand(band === Number(key) ? 0 : Number(key));
  const sers = (key, onlyBits) => ['BITS', 'UCI'].filter(showSeries).map(n => ({
    name: n,
    cells: n === 'BITS' ? (onlyBits ? bitsF[key] : bitsAll[key]) : (band && onlyBits ? null : uci[key]),
  }));

  const bandGroups = [1, 2, 3, 4].map(b => ({ key: String(b), label: BAND_LABELS[b] }));
  const g = $('grid');
  g.replaceChildren();
  g.append(visualCard('Grade by study time', 'click a dot to filter', dotChart('Mean grade by study time', bandGroups, sers('studytime', false), { selected: band, onPick: pickBand }), 'v1'));
  g.append(visualCard('Grade by past failures', band ? BAND_LABELS[band] + (view !== 'BITS' ? ', BITS only' : '') : null,
    dotChart('Mean grade by past failures', [{ key: '0', label: '0' }, { key: '1', label: '1' }, { key: '2', label: '2' }, { key: '3', label: '3+' }], sers('failures', true)), 'v2'));
  g.append(visualCard('Grade by sex', band ? BAND_LABELS[band] + (view !== 'BITS' ? ', BITS only' : '') : null,
    dotChart('Mean grade by sex', [{ key: 'F', label: 'Female' }, { key: 'M', label: 'Male' }], sers('sex', true)), 'v3'));

  const bitsCounts = Array.from({ length: 21 }, (_, k) => filtered.filter(r => r.G3 === k).length);
  const uciCounts = Array.from({ length: 21 }, (_, k) => Number((uci.g3_counts || {})[String(k)] || 0));
  const hs = [];
  if (showSeries('BITS')) hs.push({ name: 'BITS', counts: bitsCounts, n: filtered.length });
  if (showSeries('UCI') && !band) hs.push({ name: 'UCI', counts: uciCounts, n: uci.overall.n });
  g.append(visualCard('Grade distribution', band ? BAND_LABELS[band] + ', BITS only' : 'share at each grade', histChart(hs), 'v4'));
  g.append(visualCard('Slope comparison', band ? 'all bands' : 'with 95% interval',
    slopeChart(['BITS', 'UCI'].filter(showSeries).map(n => ({ name: n, slope: n === 'BITS' ? bitsAll.slope : uci.slope }))), 'v5'));
  g.append(visualCard('Counts', 'click a row to filter', countsTable(bitsAll, uci, records.length), 'v6'));

  const need = MIN_CLASS_VIEW - docs.length;
  $('foot').textContent =
    `Descriptive, not a formal test: differences can come from chance, especially with a small BITS sample. The formal tests live in survey/analysis.py. ` +
    `Grades are on a 0-20 scale (BITS grade = round(G3_pct / 5)); BITS rows used: ${records.length} of ${docs.length}. ` +
    `Cells with n under ${MIN_CELL} are hidden as ${TOO_SMALL}. Dots are means, lines are 95% intervals (mean ± 1.96 standard errors). ` +
    `Slope CI: percentile interval from ${BOOT_REPS} bootstrap resamples, seed ${BOOT_SEED}. ` +
    (need > 0 ? `The class view needs ${MIN_CLASS_VIEW} responses; ${need} more needed.` : `The class-view threshold of ${MIN_CLASS_VIEW} is reached.`);
}

// ---------- Firebase ----------
let fb = null; // { auth, db, authMod, fs }

async function initFirebase() {
  if (fb) return fb;
  const [appMod, authMod, fs] = await Promise.all([
    import(FB_BASE + 'firebase-app.js'),
    import(FB_BASE + 'firebase-auth.js'),
    import(FB_BASE + 'firebase-firestore.js'),
  ]);
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  fb = { auth: authMod.getAuth(app), db: fs.getFirestore(app), authMod, fs };
  return fb;
}

function authMessage(err) {
  const code = err && err.code ? err.code : '';
  if (['auth/wrong-password', 'auth/invalid-credential', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) {
    return 'Wrong email or password. Try again.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a few minutes and try again.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.';
  return 'Could not sign in. Try again.';
}

async function loadDashboard() {
  $('load-error').textContent = '';
  clearPage();
  $('source-label').textContent = DEMO ? 'Source: demo_responses' : 'Source: responses';
  try {
    const [uciRes, { db, fs }] = await Promise.all([fetch('uci_summary.json'), initFirebase()]);
    if (!uciRes.ok) throw new Error('uci_summary.json missing');
    const uci = await uciRes.json();
    const snap = await fs.getDocs(fs.collection(db, COLLECTION));
    render(snap.docs.map(d => d.data()), uci);
  } catch (err) {
    if (err && err.code === 'permission-denied') {
      $('load-error').textContent = 'Not the owner account. This signed-in account is not allowed to read the survey data.';
    } else if (err && err.message === 'uci_summary.json missing') {
      $('load-error').textContent = 'uci_summary.json is missing. Run build_uci_summary.py and redeploy.';
    } else {
      $('load-error').textContent = 'Could not load the data. Check your connection and reload.';
    }
  }
}

function clearPage() {
  last = null;
  ['kpis', 'grid', 'slicers'].forEach(id => $(id).replaceChildren());
  $('foot').textContent = '';
  $('n-chip').textContent = 'n = 0';
}

function showSignedIn(on) {
  $('signout').classList.toggle('hidden', !on);
  $('signin').classList.toggle('hidden', on);
  $('app').classList.toggle('hidden', !on);
}

async function main() {
  initTheme();
  if (DEMO) $('banner').classList.remove('hidden');
  const { auth, authMod } = await initFirebase();

  $('signin-btn').addEventListener('click', async () => {
    $('signin-error').textContent = '';
    $('signin-btn').disabled = true;
    try {
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' }); // always let the owner pick the account
      await authMod.signInWithPopup(auth, provider);
    } catch (err) {
      if (err && err.code === 'auth/popup-closed-by-user') return; // user cancelled, nothing to show
      $('signin-error').textContent = authMessage(err);
    } finally {
      $('signin-btn').disabled = false;
    }
  });

  $('signout').addEventListener('click', () => authMod.signOut(auth));

  authMod.onAuthStateChanged(auth, user => {
    showSignedIn(!!user);
    if (user) loadDashboard();
    else clearPage();
  });
}

main().catch(() => {
  $('signin-error').textContent = 'Could not start. Check your connection and reload.';
});
