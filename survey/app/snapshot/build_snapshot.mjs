#!/usr/bin/env node
// Build a password-encrypted, self-contained HTML snapshot (aggregates only).
// Usage: node build_snapshot.mjs --responses export.csv --uci ../dashboard/uci_summary.json --out snapshot.html [--cutoff 2026-11-30]
// Passphrase: env SNAPSHOT_PASSPHRASE, or prompted (hidden). Never a command-line argument, never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';

const MIN_CELL = 5;
const BOOT_REPS = 1000;
const BOOT_SEED = 2026;
const PBKDF2_ITER = 600000;

// ---------- args ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument: ${a}`);
    const key = a.slice(2);
    if (!['responses', 'uci', 'out', 'cutoff'].includes(key)) throw new Error(`Unknown option --${key}`);
    const v = argv[++i];
    if (v === undefined || v.startsWith('--')) throw new Error(`Option --${key} needs a value`);
    out[key] = v;
  }
  if (!out.responses || !out.uci || !out.out) throw new Error('Required: --responses <csv> --uci <json> --out <html>');
  return out;
}

// ---------- CSV (quoted fields, escaped quotes, CRLF, BOM, newlines inside quotes) ----------
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; }
    else if (c === ',') { row.push(field); field = ''; i++; }
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = []; i++;
    } else { field += c; i++; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter(r => !(r.length === 1 && r[0] === ''));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].map(h => h.trim());
  return nonEmpty.slice(1).map(r => {
    const o = {};
    header.forEach((h, k) => { o[h] = r[k] === undefined ? '' : r[k]; });
    return o;
  });
}

// ---------- statistics (same definitions as survey/app/dashboard/dashboard.js) ----------
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
function toRecords(docs) {
  const out = [];
  docs.forEach(d => {
    const raw = d.G3_pct;
    if (raw === undefined || raw === null || String(raw).trim() === '') return;
    const pct = Number(raw);
    const study = String(d.studytime).trim() === '' ? NaN : Number(d.studytime);
    if (!Number.isFinite(pct) || !Number.isFinite(study)) return;
    out.push({
      G3: Math.round(pct / 5),
      studytime: study,
      failures: Math.min(Number(d.failures), 3),
      sex: String(d.sex).trim(),
    });
  });
  return out;
}
function groupMeans(records, key, levels) {
  const res = {};
  levels.forEach(l => {
    const vals = records.filter(r => r[key] === l).map(r => r.G3);
    res[String(l)] = { n: vals.length, mean: meanSd(vals).mean };
  });
  return res;
}

// Suppression is applied at build time: a hidden cell carries only its n, never its mean.
const supCell = c => (c.n < MIN_CELL ? { n: c.n, mean: null, suppressed: c.n > 0 } : { n: c.n, mean: c.mean, suppressed: false });
function supGroups(g) { const o = {}; for (const k of Object.keys(g)) o[k] = supCell(g[k]); return o; }

function summarise(records) {
  const g3 = records.map(r => r.G3);
  const ov = meanSd(g3);
  const sl = slopeWithCi(records.map(r => r.studytime), g3);
  const tooSmall = ov.n < MIN_CELL;
  return {
    overall: tooSmall ? { n: ov.n, mean: null, sd: null, suppressed: ov.n > 0 } : { n: ov.n, mean: ov.mean, sd: ov.sd, suppressed: false },
    studytime: supGroups(groupMeans(records, 'studytime', [1, 2, 3, 4])),
    failures: supGroups(groupMeans(records, 'failures', [0, 1, 2, 3])),
    sex: supGroups(groupMeans(records, 'sex', ['F', 'M'])),
    slope: (sl.n < MIN_CELL || sl.slope === null)
      ? { n: sl.n, slope: null, lo: null, hi: null, suppressed: sl.n > 0 }
      : { ...sl, suppressed: false },
  };
}

// ---------- passphrase ----------
async function getPassphrase() {
  const env = process.env.SNAPSHOT_PASSPHRASE;
  if (env) return env;
  const stdin = process.stdin;
  if (!stdin.isTTY) throw new Error('Set SNAPSHOT_PASSPHRASE or run in a terminal to be prompted.');
  const ask = label => new Promise((resolve, reject) => {
    process.stderr.write(label);
    let buf = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const done = () => { stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', onData); process.stderr.write('\n'); };
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') { done(); resolve(buf); return; }
        if (ch === '\u0003') { done(); reject(new Error('Cancelled')); return; }
        if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1);
        else buf += ch;
      }
    };
    stdin.on('data', onData);
  });
  const p1 = await ask('Passphrase (hidden): ');
  const p2 = await ask('Repeat passphrase: ');
  if (p1 !== p2) throw new Error('Passphrases did not match.');
  return p1;
}

// ---------- encryption ----------
function encrypt(plaintext, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(Buffer.from(passphrase, 'utf8'), salt, PBKDF2_ITER, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // WebCrypto expects ciphertext || tag
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ct: Buffer.concat([ct, tag]).toString('base64'),
  };
}

// ---------- HTML template ----------
const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>BITS vs UCI snapshot</title>
<style>
:root { color-scheme: light dark; --bg:#fafaf7; --fg:#1d1d1b; --muted:#5f5f5a; --card:#fff; --line:#d9d9d2; --accent:#1f5fbf; --err:#b00020; }
@media (prefers-color-scheme: dark) { :root { --bg:#16171a; --fg:#ececea; --muted:#a3a39d; --card:#212226; --line:#3a3b40; --accent:#7fb0ff; --err:#ff8a80; } }
* { box-sizing: border-box; }
html, body { margin: 0; overflow-x: hidden; }
body { background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; padding: 24px 16px 48px; }
main { max-width: 760px; margin: 0 auto; }
h1 { font-size: 1.5rem; margin: 0 0 8px; }
h2 { font-size: 1.15rem; margin: 20px 0 8px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; margin: 16px 0; }
.muted { color: var(--muted); font-size: .9rem; }
.hidden { display: none; }
.error { color: var(--err); min-height: 1.5em; }
label { display: block; margin-bottom: 6px; }
input[type=password] { width: 100%; font: inherit; padding: 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg); }
button { font: inherit; margin-top: 12px; padding: 10px 16px; border: 0; border-radius: 6px; background: var(--accent); color: #fff; cursor: pointer; }
@media (prefers-color-scheme: dark) { button { color: #0b1020; } }
button:disabled { opacity: .6; cursor: wait; }
.tablewrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: .95rem; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
</style>
</head>
<body>
<main>
<h1>BITS vs UCI snapshot</h1>
<section class="card" id="lock">
  <form id="form" autocomplete="off">
    <label for="pass">Passphrase</label>
    <input id="pass" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required>
    <button id="btn" type="submit">Open snapshot</button>
    <p class="error" id="err" role="alert"></p>
  </form>
  <p class="muted">The data in this file is encrypted. It is decrypted in your browser only; nothing is sent anywhere.</p>
</section>
<div id="content"></div>
</main>
<script>
(function () {
  'use strict';
  var BLOB = {"salt":"__SALT__","iv":"__IV__","ct":"__CT__"};
  var ITER = 600000;
  var $ = function (id) { return document.getElementById(id); };

  function b64(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }

  async function decrypt(pass) {
    var enc = new TextEncoder();
    var base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: b64(BLOB.salt), iterations: ITER },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    var buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(BLOB.iv) }, key, b64(BLOB.ct));
    return JSON.parse(new TextDecoder().decode(buf));
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined && text !== null) e.textContent = String(text);
    if (cls) e.className = cls;
    return e;
  }
  function table(headers, rows) {
    var t = el('table'), head = el('tr');
    headers.forEach(function (h) { head.append(el('th', h)); });
    t.append(head);
    rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.append(el('td', c)); }); t.append(tr); });
    var w = el('div', null, 'tablewrap'); w.append(t); return w;
  }
  var f2 = function (x) { return x.toFixed(2); };

  function cell(c) {
    if (!c || c.n === 0) return 'no responses yet (n=0)';
    if (c.n < 5 || c.mean === null) return 'too small to show (n=' + c.n + ')';
    return f2(c.mean) + ' (n=' + c.n + ')';
  }
  function overallText(o) {
    if (!o || o.n === 0) return 'no responses yet (n=0)';
    if (o.n < 5 || o.mean === null) return 'too small to show (n=' + o.n + ')';
    var sd = o.sd === null ? 'SD not defined' : 'SD ' + f2(o.sd);
    return 'mean ' + f2(o.mean) + ', ' + sd + ' (n=' + o.n + ')';
  }
  function slopeText(s) {
    if (!s || s.n === 0) return 'no responses yet (n=0)';
    if (s.n < 5 || s.slope === null) return 'too small to show (n=' + s.n + ')';
    return f2(s.slope) + ' per band, 95% CI ' + f2(s.lo) + ' to ' + f2(s.hi) + ' (n=' + s.n + ')';
  }

  function render(p) {
    var root = $('content');
    root.replaceChildren();
    var head = el('section', null, 'card');
    head.append(el('p', 'Snapshot date: ' + p.generated_at));
    head.append(el('p', 'Data cutoff: ' + (p.cutoff ? p.cutoff : 'not stated')));
    head.append(el('p', 'BITS responses: n = ' + p.n_responses + ' (' + p.n + ' usable)'));
    head.append(el('p', p.note, 'muted'));
    root.append(head);

    var bits = p.bits, uci = p.uci;
    var card = el('section', null, 'card');
    card.append(el('h2', 'BITS vs UCI'));
    card.append(el('p', 'BITS rows used: ' + p.n + ' of ' + p.n_responses + ' responses (rows need a valid grade and study time). Grades are on a 0-20 scale. BITS grade = round(G3_pct / 5).', 'muted'));
    card.append(table(['', 'BITS', 'UCI'], [
      ['Sample size', p.n_responses === 0 ? 'no responses yet (n=0)' : 'n=' + bits.overall.n, 'n=' + uci.overall.n],
      ['Mean G3, overall', overallText(bits.overall), overallText(uci.overall)],
      ['Study-time slope (OLS of G3 on studytime)', slopeText(bits.slope), slopeText(uci.slope)]
    ]));
    card.append(el('p', 'Slope CI: percentile interval from ' + p.boot.reps + ' bootstrap resamples, seed ' + p.boot.seed + '.', 'muted'));
    function block(title, key, levels, label) {
      card.append(el('h2', title));
      card.append(table(['Group', 'BITS mean G3', 'UCI mean G3'], levels.map(function (l) {
        return [label(l), cell(bits[key][String(l)]), cell(uci[key][String(l)])];
      })));
    }
    block('Mean G3 by study time', 'studytime', [1, 2, 3, 4], function (l) { return { 1: '1: under 2 h', 2: '2: 2-5 h', 3: '3: 5-10 h', 4: '4: over 10 h' }[l]; });
    block('Mean G3 by past failures', 'failures', [0, 1, 2, 3], function (l) { return l === 3 ? '3 or more' : String(l); });
    block('Mean G3 by sex', 'sex', ['F', 'M'], function (l) { return l; });
    card.append(el('p', 'Cells with n under 5 are hidden as too small to show.', 'muted'));
    var note = el('div', null, 'muted');
    note.append(el('strong', 'How to read this'));
    note.append(el('p', 'This is descriptive, not a formal test. Differences here can come from chance, especially with a small BITS sample. The formal hypothesis tests live in survey/analysis.py and are run once after the survey closes.'));
    card.append(note);
    root.append(card);
  }

  $('form').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var input = $('pass'), btn = $('btn');
    $('err').textContent = '';
    btn.disabled = true;
    var pass = input.value;
    input.value = '';
    try {
      var payload = await decrypt(pass);
      pass = null;
      render(payload);
      $('lock').classList.add('hidden');
    } catch (e) {
      pass = null;
      $('err').textContent = 'That passphrase did not open the snapshot.';
    } finally {
      btn.disabled = false;
    }
  });
})();
</script>
</body>
</html>
`;

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const docs = parseCsv(readFileSync(args.responses, 'utf8'));
  const uci = JSON.parse(readFileSync(args.uci, 'utf8'));
  const records = toRecords(docs);
  const bits = summarise(records);

  const payload = {
    generated_at: new Date().toISOString().slice(0, 10),
    cutoff: args.cutoff || null,
    n_responses: docs.length,
    n: records.length,
    note: 'This is a snapshot taken on the date shown, not live data. It contains aggregates only. Any cell with fewer than 5 responses is shown as "too small to show", with no number.',
    boot: { reps: BOOT_REPS, seed: BOOT_SEED },
    bits,
    uci: { overall: uci.overall, studytime: uci.studytime, failures: uci.failures, sex: uci.sex, slope: uci.slope, source: uci.source },
  };

  const passphrase = await getPassphrase();
  if (passphrase.length < 12) throw new Error('Passphrase is too short (minimum 12 characters). Use 4+ random words.');
  const blob = encrypt(JSON.stringify(payload), passphrase);
  const html = TEMPLATE.replace('__SALT__', blob.salt).replace('__IV__', blob.iv).replace('__CT__', blob.ct);
  writeFileSync(args.out, html);
  console.log(`Wrote ${args.out} (${records.length} usable of ${docs.length} rows).`);
}

main().catch(e => { console.error('Error: ' + e.message); process.exit(1); });
