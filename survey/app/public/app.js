// G505 class survey. Vanilla JS, one question per screen.
// Question columns, types and option codes mirror ../questions.csv and must not change.
import { firebaseConfig } from './firebase-config.js';

const FB_VERSION = '11.0.2';
const FB_BASE = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
const MIN_COHORT = 15;
const CONFIGURED = Object.values(firebaseConfig).every(v => !String(v).includes('REPLACE_ME'));
const DEMO = !CONFIGURED && new URLSearchParams(location.search).has('demo');

// ---- Question data (columns/codes from questions.csv) ----
const Q = [{"col": "consent", "type": "single", "opts": [{"l": "Yes", "v": "yes"}, {"l": "No", "v": "no"}]}, {"col": "sex", "type": "single", "opts": [{"l": "Female", "v": "F"}, {"l": "Male", "v": "M"}]}, {"col": "age", "type": "number", "min": 18, "max": 70}, {"col": "address", "type": "single", "opts": [{"l": "Urban", "v": "U"}, {"l": "Rural", "v": "R"}]}, {"col": "famsize", "type": "single", "opts": [{"l": "3 or fewer", "v": "LE3"}, {"l": "More than 3", "v": "GT3"}]}, {"col": "Pstatus", "type": "single", "opts": [{"l": "Together", "v": "T"}, {"l": "Apart", "v": "A"}]}, {"col": "Medu", "type": "single", "opts": [{"l": "No schooling", "v": 0}, {"l": "Primary (up to class 5)", "v": 1}, {"l": "Middle school (class 6-8)", "v": 2}, {"l": "Secondary / high school", "v": 3}, {"l": "Graduate or above", "v": 4}]}, {"col": "Fedu", "type": "single", "opts": [{"l": "No schooling", "v": 0}, {"l": "Primary (up to class 5)", "v": 1}, {"l": "Middle school (class 6-8)", "v": 2}, {"l": "Secondary / high school", "v": 3}, {"l": "Graduate or above", "v": 4}]}, {"col": "Mjob", "type": "single", "opts": [{"l": "At home", "v": "at_home"}, {"l": "Health", "v": "health"}, {"l": "Services", "v": "services"}, {"l": "Teacher", "v": "teacher"}, {"l": "Other", "v": "other"}]}, {"col": "Fjob", "type": "single", "opts": [{"l": "At home", "v": "at_home"}, {"l": "Health", "v": "health"}, {"l": "Services", "v": "services"}, {"l": "Teacher", "v": "teacher"}, {"l": "Other", "v": "other"}]}, {"col": "traveltime", "type": "single", "opts": [{"l": "Under 15 min", "v": 1}, {"l": "15-30 min", "v": 2}, {"l": "30-60 min", "v": 3}, {"l": "Over 60 min", "v": 4}]}, {"col": "internet", "type": "single", "opts": [{"l": "Yes", "v": "yes"}, {"l": "No", "v": "no"}]}, {"col": "famrel", "type": "scale", "opts": [{"l": "Very bad", "v": 1}, {"l": "2", "v": 2}, {"l": "3", "v": 3}, {"l": "4", "v": 4}, {"l": "Excellent", "v": 5}]}, {"col": "health", "type": "scale", "opts": [{"l": "Very bad", "v": 1}, {"l": "2", "v": 2}, {"l": "3", "v": 3}, {"l": "4", "v": 4}, {"l": "Very good", "v": 5}]}, {"col": "studytime", "type": "single", "opts": [{"l": "Under 2 h", "v": 1}, {"l": "2-5 h", "v": 2}, {"l": "5-10 h", "v": 3}, {"l": "More than 10 h", "v": 4}]}, {"col": "failures", "type": "single", "opts": [{"l": "0", "v": 0}, {"l": "1", "v": 1}, {"l": "2", "v": 2}, {"l": "3 or more", "v": 3}]}, {"col": "schoolsup", "type": "single", "opts": [{"l": "Yes", "v": "yes"}, {"l": "No", "v": "no"}]}, {"col": "famsup", "type": "single", "opts": [{"l": "Yes", "v": "yes"}, {"l": "No", "v": "no"}]}, {"col": "paid", "type": "single", "opts": [{"l": "Yes", "v": "yes"}, {"l": "No", "v": "no"}]}, {"col": "activities", "type": "single", "opts": [{"l": "Yes", "v": "yes"}, {"l": "No", "v": "no"}]}, {"col": "higher", "type": "single", "opts": [{"l": "Yes", "v": "yes"}, {"l": "No", "v": "no"}]}, {"col": "absences", "type": "number", "min": 0, "max": 93}, {"col": "freetime", "type": "scale", "opts": [{"l": "Very low", "v": 1}, {"l": "2", "v": 2}, {"l": "3", "v": 3}, {"l": "4", "v": 4}, {"l": "Very high", "v": 5}]}, {"col": "goout", "type": "scale", "opts": [{"l": "Very low", "v": 1}, {"l": "2", "v": 2}, {"l": "3", "v": 3}, {"l": "4", "v": 4}, {"l": "Very high", "v": 5}]}, {"col": "Dalc", "type": "scale", "opts": [{"l": "Very low", "v": 1}, {"l": "2", "v": 2}, {"l": "3", "v": 3}, {"l": "4", "v": 4}, {"l": "Very high", "v": 5}]}, {"col": "Walc", "type": "scale", "opts": [{"l": "Very low", "v": 1}, {"l": "2", "v": 2}, {"l": "3", "v": 3}, {"l": "4", "v": 4}, {"l": "Very high", "v": 5}]}, {"col": "G3_pct", "type": "number", "min": 0, "max": 100}];
const BYCOL = Object.fromEntries(Q.map(q => [q.col, q]));

// Wording and microcopy (tunable). Columns and codes above are not.
const COPY = {
  consent:{ q:"I'm okay with my anonymous answers being used in our class statistics project. I can stop any time." },
  sex:{ q:"What's your gender?" },
  age:{ q:'How old are you?', hint:'Whole years.', unit:'years' },
  address:{ q:"Where's home, mainly?", hint:'Your permanent home, not where you stay now.' },
  famsize:{ q:'How many people live in your home, including you?' },
  Pstatus:{ q:'Do your parents live together?', hint:'Closest fit is fine.' },
  Medu:{ q:"What's the highest level of education your mother completed?", hint:'Closest fit is fine.' },
  Fedu:{ q:"What's the highest level of education your father completed?", hint:'Closest fit is fine.' },
  Mjob:{ q:'What does your mother mainly do for work?', hint:'Closest fit, or Other.' },
  Fjob:{ q:'What does your father mainly do for work?', hint:'Closest fit, or Other.' },
  traveltime:{ q:'How long does it take you to get to campus?' },
  internet:{ q:'Do you have internet at home?' },
  famrel:{ q:'How would you rate things with your family?' },
  health:{ q:"How's your health right now?", hint:'Go with your gut.' },
  studytime:{ q:'In a normal week, how long do you study outside class?', hint:'Pick a range.' },
  failures:{ q:'How many courses have you failed before?', hint:'Plenty of people have a number here. Only group totals are used.' },
  schoolsup:{ q:'Do you get extra help with your studies outside regular classes?', hint:'Tutorials, a mentor, a senior, a study group.' },
  famsup:{ q:'Does anyone at home help with your coursework?' },
  paid:{ q:'Do you go to paid coaching or private tuition for any subject?' },
  activities:{ q:'Are you in any clubs, sports or other activities?' },
  higher:{ q:'Do you plan to do a PhD?' },
  absences:{ q:'About how many classes did you miss this semester?', hint:'A rough guess is fine. Zero is a normal answer.', unit:'classes' },
  freetime:{ q:'How much free time do you get after classes?' },
  goout:{ q:'How often do you go out with friends?' },
  Dalc:{ q:'How much alcohol do you usually drink on a workday?', hint:'"Very low" includes none. Only group totals are used.' },
  Walc:{ q:'How much alcohol do you usually drink on a weekend day?', hint:'"Very low" includes none. Only group totals are used.' },
  G3_pct:{ q:'What did you score in your most recent graded course, as a percentage?', hint:'Any course or semester. If you have a CGPA or letter grade, convert it to a percentage first. Rough is fine.', unit:'%', decimals:true },
};

const CHAPTERS = [
  { id:'you',   name:'You',        em:'👋', intro:'Three easy ones to start.',            cols:['sex','age','health'] },
  { id:'home',  name:'Home',       em:'🏠', intro:'Some questions about home. If nothing fits exactly, pick the closest.',  cols:['address','famsize','Pstatus','Medu','Fedu','Mjob','Fjob','traveltime','internet','famrel'] },
  { id:'study', name:'Study',      em:'📚', intro:'Halfway. Now how you study. There\'s no wrong style.',                      cols:['studytime','failures','schoolsup','famsup','paid','activities','higher','absences'] },
  { id:'life',  name:'Life',       em:'🌆', intro:'Life outside class. Only four, and honest answers help us most.',                   cols:['freetime','goout','Dalc','Walc'] },
  { id:'num',   name:'The number', em:'🎯', intro:'Last one. Then your card is ready.',                                 cols:['G3_pct'] }
];
const SCALE_ENDS = {
  famrel:['Very bad','Excellent'], health:['Very bad','Very good'],
  freetime:['Very low','Very high'], goout:['Very low','Very high'], Dalc:['Very low (includes none)','Very high'], Walc:['Very low (includes none)','Very high']
};

// Steps: chapter card, optional guess, then questions.
const STEPS = [];
CHAPTERS.forEach((ch, ci) => {
  STEPS.push({ kind:'chapter', ci });
  if (ch.id === 'study') STEPS.push({ kind:'guess', ci });
  ch.cols.forEach(col => STEPS.push({ kind:'q', col, ci }));
});
const NQ = STEPS.filter(s => s.kind === 'q').length; // 27 after consent

// ---- Archetypes: built only from studytime, activities, freetime, goout ----
const ARCH = {
  diver:{ em:'🤿', name:'The Deep Diver', tag:'Long study sessions and a quiet social life.', bullets:['Goes deep when a topic hooks you','Protects quiet time'], c:['#234e9c','#1b7a8c'] },
  navigator:{ em:'🧭', name:'The Balanced Navigator', tag:'Plenty of study time, and time for people too.', bullets:['Keeps a few things going at once','Knows when to switch off'], c:['#1b6b53','#2f7a8f'] },
  spark:{ em:'✨', name:'The Social Spark', tag:'Short study bursts and a busy social life.', bullets:['Studies better with people around','Keeps the group lively'], c:['#a8325e','#c0502b'] },
  builder:{ em:'🤝', name:'The Community Builder', tag:'Always in something, with study fitted around it.', bullets:['Says yes to clubs and teams','Makes the hours count'], c:['#6a37a8','#4f4fc4'] },
  explorer:{ em:'🪁', name:'The Free Spirit Explorer', tag:'Lots of open hours, spent on whatever looks interesting.', bullets:['Follows what interests you','Plenty of room to roam'], c:['#a3560a','#9a3a3a'] },
  sprinter:{ em:'⚡', name:'The Quiet Sprinter', tag:'Short study blocks and slow evenings.', bullets:['Gets in, gets it done, gets out','Protects downtime'], c:['#2c5f7c','#3d4f9c'] }
};
function archetype(a) {
  if (a.studytime >= 3) return a.goout >= 3 ? 'navigator' : 'diver';
  if (a.activities === 'yes' && a.goout >= 3) return 'builder';
  if (a.goout >= 4) return 'spark';
  if (a.freetime >= 4) return 'explorer';
  return 'sprinter';
}

// ---- Tiny DOM helper ----
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
  return el;
}

// ---- Local-only storage (guess) ----
const GUESS_KEY = 'g505_guess';
function saveGuess(v) { try { localStorage.setItem(GUESS_KEY, String(v)); } catch (e) {} }
function loadGuess() { try { const v = localStorage.getItem(GUESS_KEY); return v == null ? null : Number(v); } catch (e) { return null; } }

// ---- Tap feedback: a short haptic pulse where the device supports it ----
function tick() {
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
}
function confetti() {
  if (REDUCED) return;
  const box = h('div', { class:'confetti', 'aria-hidden':'true' });
  const cols = ['#e8685a','#f2b441','#4fb286','#5b8def','#a56bd8','#ffffff'];
  for (let n = 0; n < 48; n++) {
    const p = h('b', {});
    p.style.left = Math.random() * 100 + '%'; p.style.background = cols[n % cols.length];
    p.style.setProperty('--x', (Math.random() * 160 - 80) + 'px'); p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    p.style.setProperty('--d', (2.2 + Math.random() * 1.6) + 's'); p.style.setProperty('--dl', (Math.random() * 0.6) + 's');
    box.append(p);
  }
  document.body.append(box); setTimeout(() => box.remove(), 4500);
}

// ---- State ----
const app = document.getElementById('app');
const top = document.getElementById('top');
const barEl = document.getElementById('bar');
const barWrap = document.getElementById('barwrap');
const chapEl = document.getElementById('chapters');
const riderEl = document.getElementById('rider');
const statusEl = document.getElementById('status');
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { dir:'fwd', i:-1, a:{}, guess:loadGuess(), agg:null, aggTried:false, docRef:null, saved:false };
CHAPTERS.forEach(c => chapEl.append(h('li', { text:c.name })));

function setProgress(stepIndex) {
  if (stepIndex < 0) { top.hidden = true; return; }
  if (stepIndex >= STEPS.length) return;
  top.hidden = false;
  const step = STEPS[stepIndex];
  const done = STEPS.slice(0, stepIndex).filter(s => s.kind === 'q').length;
  const pct = Math.round((done / NQ) * 100);
  barEl.style.width = pct + '%';
  barWrap.setAttribute('aria-valuenow', pct);
  riderEl.style.left = `clamp(12px, ${pct}%, calc(100% - 12px))`;
  const left = NQ - done, mins = Math.max(1, Math.ceil(left * 8 / 60));
  statusEl.textContent = step.kind === 'q' ? `Question ${done + 1} of ${NQ} · about ${mins} min left` : `${left} questions to go · about ${mins} min`;
  [...chapEl.children].forEach((li, n) => {
    li.className = n < step.ci ? 'done' : n === step.ci ? 'on' : '';
    if (n === step.ci) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
}
let keyHandler = null;
document.addEventListener('keydown', e => { if (keyHandler && !e.ctrlKey && !e.metaKey && !e.altKey) keyHandler(e); });
function show(node, focusSel) {
  keyHandler = null;
  node.classList.add(state.dir === 'bck' ? 'bck' : 'fwd');
  app.replaceChildren(node);
  const f = node.querySelector(focusSel || '[data-focus]');
  if (f) f.focus({ preventScroll:true });
  window.scrollTo(0, 0);
}
function footer() {
  return h('div', { class:'foot' },
    h('span', { text:'Anonymous: no names, emails or IDs.' }),
    h('button', { class:'link', type:'button', onclick:stopNow, text:'Stop without saving' }));
}
function stopNow() {
  state.a = {}; state.i = -1; setProgress(-1);
  show(thanks('No problem. Nothing was saved.', 'Thanks for stopping by. Reload the page if you change your mind.'));
}
function thanks(title, body) {
  return h('section', { class:'screen' },
    h('h1', { tabindex:'-1', 'data-focus':true, text:title }),
    h('p', { class:'lede', text:body }));
}

// ---- Screens ----
function intro() {
  setProgress(-1); state.dir = 'bck';
  const kids = [
    h('p', { class:'kicker', text:'MPBA G505 · Statistics' }),
    h('h1', { tabindex:'-1', 'data-focus':true, text:'Hey, got 4 minutes?' }),
    h('p', { class:'lede', text:"We're a group in G505 and we'd rather study our own class than a dataset from Portugal. Mostly taps, a few numbers. At the end you get a study profile card." }),
    h('ul', { class:'pills' }, ['About 4 minutes', '27 questions', 'Anonymous'].map(t => h('li', { text:t }))),
    h('div', { class:'box' }, h('ul', {},
      h('li', { text:'We don\'t ask for your name, email or student ID.' }),
      h('li', { text:'No IP address or device details are stored with your answers.' }),
      h('li', { text:'Only group totals are shown. Groups under 5 stay hidden.' }))),
    h('div', { class:'nav' }, h('button', { class:'btn grow', type:'button', onclick:() => { state.dir = 'fwd'; state.i = -1; consentScreen(); }, text:"Let's go" })),
  ];
  if (loadGuess() != null) kids.push(h('p', {}, h('button', { class:'link', type:'button', onclick:() => cohortView(), text:'Already answered? See the class view' })));
  kids.push(h('div', { class:'foot' }, h('span', { text:'You can go back and change any answer.' })));
  show(h('section', { class:'screen' }, kids));
}

function consentScreen() {
  setProgress(-1);
  const q = BYCOL.consent;
  const sel = state.a.consent;
  const form = h('section', { class:'screen' },
    h('p', { class:'kicker', text:'First thing' }),
    h('h2', { class:'q', tabindex:'-1', 'data-focus':true, text:COPY.consent.q }),
    h('p', { class:'hint', text:'Saying no is fine. Nothing gets saved.' }));
  const chips = chipGroup(q, 'col', sel, (v, e) => {
    if (v === 'no') { state.a = {}; show(thanks('No worries, thanks anyway.', 'Nothing was recorded. Good luck with the semester.')); return; }
    state.a.consent = 'yes';
    if (e && e.detail > 0) setTimeout(() => goto(0), 200);
    else form.querySelector('.btn.grow').removeAttribute('aria-disabled');
  }, 'Consent');
  form.append(chips, h('div', { class:'nav' },
    h('button', { class:'btn ghost', type:'button', onclick:intro, text:'Back' }),
    h('button', { class:'btn grow', type:'button', 'aria-disabled':sel ? false : 'true', onclick:ev => { if (state.a.consent === 'yes') goto(0); }, text:'Continue' })));
  form.append(footer());
  show(form);
}

function chipGroup(q, layout, selected, onPick, legend) {
  const fs = h('fieldset', {}, h('legend', { class:'sr', text:legend }));
  const wrap = h('div', { class:'chips ' + layout });
  const name = 'q_' + q.col;
  q.opts.forEach((o, n) => {
    const inp = h('input', { type:'radio', name, value:String(n) });
    if (selected !== undefined && selected === o.v) inp.checked = true;
    inp.addEventListener('click', e => {
      const lab = inp.closest('.chip'); lab.classList.remove('pulse'); void lab.offsetWidth; lab.classList.add('pulse');
      tick(); onPick(o.v, e);
    });
    wrap.append(h('label', { class:'chip' }, inp, h('span', { text:o.l })));
  });
  fs.append(wrap);
  return fs;
}

function layoutFor(q) {
  if (q.type === 'scale') return 'scale';
  return q.opts.every(o => o.l.length <= 16) ? 'grid' : 'col';
}

function goto(i) {
  state.dir = i < state.i ? 'bck' : 'fwd';
  state.i = i;
  if (i >= STEPS.length) return submit();
  setProgress(i);
  const s = STEPS[i];
  if (s.kind === 'chapter') return chapterCard(i, s);
  if (s.kind === 'guess') return guessScreen(i);
  return questionScreen(i, s);
}
const next = () => goto(state.i + 1);
const back = () => goto(Math.max(0, state.i - 1));

function chapterCard(i, s) {
  const ch = CHAPTERS[s.ci];
  show(h('section', { class:'screen' },
    h('p', { class:'kicker', text:`Chapter ${s.ci + 1} of ${CHAPTERS.length}` }),
    h('div', { class:'cemoji', 'aria-hidden':'true', text:ch.em }),
    h('h1', { tabindex:'-1', 'data-focus':true, text:ch.name }),
    h('p', { class:'lede', text:ch.intro }),
    h('p', { class:'hint', text:`${ch.cols.length} quick ${ch.cols.length === 1 ? 'one' : 'ones'}.` }),
    h('div', { class:'nav' },
      h('button', { class:'btn ghost', type:'button', onclick:() => (i === 0 ? consentScreen() : back()), text:'Back' }),
      h('button', { class:'btn grow', type:'button', onclick:next, text:'Continue' })),
    footer()));
}

function guessScreen(i) {
  let val = state.guess != null ? state.guess : 50;
  const out = h('p', { class:'big', 'aria-hidden':'true', text:val + '%' });
  const sl = h('input', { class:'slider', type:'range', min:'0', max:'100', step:'5', value:String(val), 'aria-label':'Your guess in percent' });
  sl.addEventListener('input', () => { val = Number(sl.value); out.textContent = val + '%'; sl.setAttribute('aria-valuetext', val + ' percent'); });
  const lock = () => { state.guess = val; saveGuess(val); next(); };
  show(h('section', { class:'screen' },
    h('p', { class:'kicker', text:'Quick guess' }),
    h('h2', { class:'q', tabindex:'-1', 'data-focus':true, text:'What share of our class studies more than 5 hours a week outside class?' }),
    h('p', { class:'hint', text:'Just for fun. Your guess stays on this device and is never sent anywhere. At the end you\'ll see it next to the real number.' }),
    out, sl,
    h('div', { class:'ends' }, h('span', { text:'0%' }), h('span', { text:'100%' })),
    h('div', { class:'nav' },
      h('button', { class:'btn ghost', type:'button', onclick:back, text:'Back' }),
      h('button', { class:'btn grow', type:'button', onclick:lock, text:'Lock in my guess' })),
    h('p', {}, h('button', { class:'link', type:'button', onclick:next, text:'Skip this' })),
    footer()));
}

function questionScreen(i, s) {
  const q = BYCOL[s.col], cp = COPY[s.col] || {};
  const last = i === STEPS.length - 1;
  const sec = h('section', { class:'screen' },
    h('p', { class:'kicker', text:CHAPTERS[s.ci].name }),
    h('h2', { class:'q', tabindex:'-1', 'data-focus':true, id:'qh', text:cp.q }),
    cp.hint ? h('p', { class:'hint', text:cp.hint }) : null);
  let kh = null;
  if (q.type === 'number') {
    numberInput(sec, q, cp, i);
  } else {
    const nextBtn = h('button', { class:'btn grow', type:'button', 'aria-disabled':state.a[q.col] === undefined ? 'true' : false, text:last ? 'Finish' : 'Next',
      onclick:() => { if (state.a[q.col] !== undefined) next(); } });
    const pick = (v, e) => {
      state.a[q.col] = v;
      nextBtn.removeAttribute('aria-disabled');
      if (e && e.detail > 0) { const at = state.i; setTimeout(() => { if (state.i === at) next(); }, 220); }
    };
    sec.append(chipGroup(q, layoutFor(q), state.a[q.col], pick, cp.q));
    if (q.type === 'scale' && SCALE_ENDS[q.col]) sec.append(h('div', { class:'ends' }, h('span', { text:'1 = ' + SCALE_ENDS[q.col][0] }), h('span', { text:'5 = ' + SCALE_ENDS[q.col][1] })));
    sec.append(h('div', { class:'nav' }, h('button', { class:'btn ghost', type:'button', onclick:back, text:'Back' }), nextBtn));
    sec.append(h('p', { class:'kbdhint', text:'Tip: press a number key to pick, Enter for next.' }));
    kh = e => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.opts.length && !(e.target && e.target.tagName === 'INPUT' && e.target.type !== 'radio')) sec.querySelectorAll('input[type=radio]')[n - 1].click();
    };
    sec.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.type === 'radio' && state.a[q.col] !== undefined) { e.preventDefault(); next(); } });
  }
  sec.append(footer());
  show(sec);
  keyHandler = kh;
}

function numberInput(sec, q, cp, i) {
  const last = i === STEPS.length - 1;
  const inp = h('input', { class:'num', id:'numin', type:'number', inputmode:cp.decimals ? 'decimal' : 'numeric', min:String(q.min), max:String(q.max), step:cp.decimals ? 'any' : '1', 'aria-label':cp.q, 'aria-describedby':'numerr', autocomplete:'off' });
  if (state.a[q.col] !== undefined) inp.value = String(state.a[q.col]);
  const err = h('p', { class:'err', id:'numerr', role:'alert' });
  const go = () => {
    const raw = inp.value.trim();
    const n = Number(raw);
    const ok = raw !== '' && Number.isFinite(n) && n >= q.min && n <= q.max && (cp.decimals || Number.isInteger(n));
    if (!ok) { err.textContent = `Enter ${cp.decimals ? 'a number' : 'a whole number'} between ${q.min} and ${q.max}.`; inp.focus(); return; }
    state.a[q.col] = cp.decimals ? Math.round(n * 10) / 10 : n;
    next();
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  inp.addEventListener('input', () => { err.textContent = ''; });
  if (q.col === 'G3_pct') sec.append(cgpaHelper(inp));
  sec.append(inp, err, h('div', { class:'nav' },
    h('button', { class:'btn ghost', type:'button', onclick:back, text:'Back' }),
    h('button', { class:'btn grow', type:'button', onclick:go, text:last ? 'Finish' : 'Next' })));
}

function cgpaHelper(target) {
  const c = h('input', { type:'number', min:'0', max:'10', step:'0.01', inputmode:'decimal', id:'cg', 'aria-label':'CGPA out of 10' });
  const res = h('span', { 'aria-live':'polite' });
  const use = h('button', { type:'button', hidden:true, text:'Use this' });
  let pct = null;
  c.addEventListener('input', () => {
    const v = Number(c.value);
    if (c.value !== '' && v >= 0 && v <= 10) { pct = Math.round(v * 9.5 * 10) / 10; res.textContent = '≈ ' + pct + '%'; use.hidden = false; }
    else { pct = null; res.textContent = ''; use.hidden = true; }
  });
  use.addEventListener('click', () => { if (pct != null) { target.value = String(pct); target.focus(); } });
  return h('div', { class:'conv' },
    h('label', { for:'cg', text:'CGPA to percentage' }),
    h('p', { class:'hint', style:'margin:0 0 8px', text:'On a 10-point scale, a rough rule is CGPA × 9.5, so 8.0 is about 76%. If your university has its own formula, use that.' }),
    h('div', { class:'row' }, c, res, use));
}

// ---- Submit ----
function buildDoc() {
  const doc = {};
  Q.forEach(q => { doc[q.col] = state.a[q.col]; });
  return doc;
}
async function getFirebase() {
  const [appMod, fs] = await Promise.all([import(FB_BASE + 'firebase-app.js'), import(FB_BASE + 'firebase-firestore.js')]);
  const fbApp = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  return { fs, db:fs.getFirestore(fbApp) };
}
let fbPromise = null;
const fb = () => (fbPromise = fbPromise || getFirebase());

async function submit() {
  top.hidden = false;
  barEl.style.width = '100%';
  barWrap.setAttribute('aria-valuenow', 100);
  show(h('section', { class:'screen' }, h('h1', { tabindex:'-1', 'data-focus':true, text:'Sending...' }), h('p', { class:'lede', text:'One moment.' })));
  if (state.a.consent !== 'yes') return consentScreen();
  const doc = buildDoc();
  try {
    if (CONFIGURED) {
      const { fs, db } = await fb();
      if (!state.docRef) state.docRef = fs.doc(fs.collection(db, 'responses')); // same ref on retry, so no duplicates
      await Promise.race([
        fs.setDoc(state.docRef, { ...doc, submittedAt:fs.serverTimestamp() }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))
      ]);
    } else {
      console.info('Preview mode (Firebase not configured). Nothing was written. Document would be:', doc);
    }
    state.saved = true;
    emailStep(result);
  } catch (err) {
    console.warn(err);
    show(h('section', { class:'screen' },
      h('h1', { tabindex:'-1', 'data-focus':true, text:"That didn't go through" }),
      h('p', { class:'lede', text:'Your answers are still on this page. Check your connection and try again.' }),
      h('div', { class:'nav' },
        h('button', { class:'btn ghost', type:'button', onclick:() => goto(STEPS.length - 1), text:'Back' }),
        h('button', { class:'btn grow', type:'button', onclick:submit, text:'Try again' }))));
  }
}

// ---- Optional email for early access (separate collection, never stored with answers) ----
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
function emailStep(next) {
  const inp = h('input', { class:'num', type:'email', autocomplete:'email', placeholder:'you@example.com', 'aria-label':'Email address', maxlength:'254' });
  const err = h('p', { class:'err', role:'alert' });
  const saveAndContinue = async () => {
    const email = inp.value.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) { err.textContent = 'Enter a valid email address, or skip this step.'; inp.focus(); return; }
    try {
      if (CONFIGURED) {
        const { fs, db } = await fb();
        await Promise.race([
          fs.addDoc(fs.collection(db, 'access_requests'), { email, source:'survey', submittedAt:fs.serverTimestamp() }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))
        ]);
      } else {
        console.info('Preview mode. Email would be saved to access_requests (not sent).');
      }
      next();
    } catch (e) {
      console.warn(e);
      err.textContent = "That didn't save. Check your connection and try again, or skip.";
    }
  };
  const section = h('section', { class:'screen fwd' },
    h('h1', { tabindex:'-1', 'data-focus':true, text:'One optional extra' }),
    h('p', { class:'lede', text:'Want early access to the job application AI agent we release next week? Leave your email below. It is stored separately from your answers, so it cannot be linked to them. Skip if you are not interested.' }),
    inp, err,
    h('div', { class:'nav' },
      h('button', { class:'btn ghost', type:'button', onclick:() => next(), text:'Skip' }),
      h('button', { class:'btn grow', type:'button', onclick:saveAndContinue, text:'Save my email' })));
  show(section);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveAndContinue(); } });
}

// ---- Aggregates ----
async function loadAgg() {
  if (state.aggTried) return state.agg;
  state.aggTried = true;
  try {
    if (DEMO) { state.agg = demoAgg(); return state.agg; }
    if (!CONFIGURED) return null;
    const { fs, db } = await fb();
    const snap = await fs.getDoc(fs.doc(db, 'aggregates', 'cohort'));
    if (snap.exists()) {
      const d = snap.data();
      if (d && Number.isFinite(d.n) && d.n >= MIN_COHORT && d.vars) state.agg = d;
    }
  } catch (e) { console.warn('aggregates unavailable', e); }
  return state.agg;
}
function demoAgg() { // fabricated numbers, for layout testing only (?demo=1 with placeholder config)
  return { n:40, pct_study_gt5:45, demo:true, vars:{
    studytime:{ 1:8, 2:14, 3:12, 4:6 }, freetime:{ 1:null, 2:9, 3:15, 4:10, 5:null }, goout:{ 1:6, 2:10, 3:14, 4:7, 5:3 },
    traveltime:{ 1:10, 2:17, 3:9, 4:4 }, activities:{ yes:22, no:18 }, paid:{ yes:11, no:29 }, schoolsup:{ yes:9, no:31 }, higher:{ yes:16, no:24 } } };
}

// ---- Result ----
async function result() {
  setProgress(-1); state.dir = 'fwd';
  barEl.style.width = '100%';
  const key = archetype(state.a), A = ARCH[key];
  const stage = h('div', {});
  const sec = h('section', { class:'screen' },
    DEMO || !CONFIGURED ? h('div', { class:'banner', text:'Preview mode: Firebase is not configured, so nothing was saved.' }) : null,
    h('div', { class:'cemoji', 'aria-hidden':'true', text:'🎉' }),
    h('h1', { tabindex:'-1', 'data-focus':true, text:'Done. Thank you.' }),
    h('p', { class:'lede', text:"Your answers are in. Want to see your study profile?" }),
    stage);
  const revealBtn = h('button', { class:'btn grow', type:'button', text:'Show my study profile' });
  stage.append(h('div', { class:'nav' }, revealBtn));
  show(sec);
  confetti();
  revealBtn.focus();
  revealBtn.addEventListener('click', async () => {
    tick();
    const card = archCard(A, true); card.classList.add('reveal'); card.setAttribute('tabindex', '-1');
    const slot = h('div', { 'aria-live':'polite' });
    stage.replaceChildren(card,
      h('div', { class:'nav fadein' }, h('button', { class:'btn grow', type:'button', onclick:() => shareCard(key), text:'Save or share my card' })),
      h('p', { class:'hint', style:'margin-top:12px', text:'The image has only the profile name and tagline. None of your answers are in it.' }),
      slot);
    card.focus({ preventScroll:true }); confetti();
    slot.append(h('p', { class:'hint', text:'Checking the class numbers...' }));
    const agg = await loadAgg();
    await new Promise(r => setTimeout(r, REDUCED ? 0 : 900));
    slot.replaceChildren(...compareTeaser(agg));
    animateVs(slot);
  });
}
function animateVs(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('.trk i').forEach(i => { i.style.width = i.dataset.w + '%'; });
    root.querySelectorAll('[data-count]').forEach(el => {
      const to = Number(el.dataset.count);
      if (REDUCED) { el.textContent = to + '%'; return; }
      const t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + '%'; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }));
}
function archCard(A, long) {
  return h('div', { class:'card', style:`background:linear-gradient(135deg,${A.c[0]},${A.c[1]})` },
    h('div', { class:'em', 'aria-hidden':'true', text:A.em }),
    h('h2', { text:A.name }),
    h('p', { text:A.tag }),
    h('ul', {}, A.bullets.map(b => h('li', { text:b }))),
    long ? h('small', { text:'This uses only study time, activities, free time and going out. It says nothing about grades.' }) : null);
}
function compareTeaser(agg) {
  const out = [];
  const g = state.guess;
  if (agg && agg.pct_study_gt5 != null) {
    const real = Math.round(agg.pct_study_gt5);
    const bar = (cls, label, v) => h('div', {}, h('div', { class:'lab' }, h('span', { text:label }), h('span', { 'data-count':String(v), text:'0%' })),
      h('div', { class:'trk ' + cls, 'aria-hidden':'true' }, h('i', { 'data-w':String(v) })));
    out.push(h('div', { class:'panel fadein' }, h('h3', { text:'Your guess vs the class' }),
      h('p', { class:'hint', text:'Share of the class studying more than 5 hours a week.' }),
      h('div', { class:'vs' },
        g != null ? bar('g', 'You guessed', g) : null,
        bar('r', 'The class', real)),
      h('p', { class:'sr', text: g != null ? `You guessed ${g} percent. The real figure is ${real} percent.` : `${real} percent of the class.` }),
      h('p', { class:'hint', text:g != null ? 'Almost nobody nails this one. Guessing for a whole group is hard, which is why we asked.' : '' })));
    out.push(h('div', { class:'nav fadein' }, h('button', { class:'btn grow ghost', type:'button', onclick:() => cohortView(), text:'See how the whole class looks' })));
  } else {
    out.push(h('div', { class:'panel fadein' }, h('h3', { text:'The class view isn\'t open yet' }),
      h('p', { text:`It opens once at least ${MIN_COHORT} classmates have answered and we publish the numbers.` }),
      g != null ? h('p', { text:`Your guess (${g}%) is saved on this device only. Open this page again later to see the real number.` }) : null));
  }
  return out;
}

// ---- Cohort view ----
const COMPARE = [
  ['studytime', 'Weekly study time'], ['freetime', 'Free time after classes'], ['goout', 'Going out with friends'],
  ['traveltime', 'Journey to campus'], ['activities', 'Clubs, sport and activities'], ['paid', 'Paid coaching or tuition'],
  ['schoolsup', 'Extra academic help'], ['higher', 'Plans for PhD study']
];
async function cohortView() {
  setProgress(-1);
  const sec = h('section', { class:'screen' }, h('p', { class:'kicker', text:'The class' }),
    h('h1', { tabindex:'-1', 'data-focus':true, text:'How we look together' }));
  const body = h('div', {}, h('p', { class:'hint', text:'Loading...' }));
  sec.append(body);
  show(sec);
  const agg = await loadAgg();
  const kids = [];
  if (!agg) {
    kids.push(h('div', { class:'panel' }, h('h3', { text:'Not open yet' }),
      h('p', { text:`This opens once at least ${MIN_COHORT} classmates have answered and we publish the numbers. Check back later.` })));
  } else {
    if (agg.demo) kids.push(h('div', { class:'banner', text:'Made-up demo data, just to test the layout.' }));
    kids.push(h('p', { class:'hint', text:`Based on ${agg.n} classmates. Groups under 5 are hidden.` }));
    if (agg.pct_study_gt5 != null) {
      kids.push(h('div', { class:'panel' }, h('h3', { text:'Studying more than 5 hours a week' }),
        h('p', { class:'big', text:Math.round(agg.pct_study_gt5) + '%' }),
        state.guess != null ? h('p', { text:`You guessed ${state.guess}%.` }) : null));
    }
    COMPARE.forEach(([col, title]) => {
      const cells = agg.vars[col];
      if (!cells) return;
      const q = BYCOL[col];
      const rows = q.opts.map(o => {
        const c = cells[String(o.v)];
        const mine = state.a[col] !== undefined && state.a[col] === o.v;
        if (c == null) return h('div', { class:'row2' + (mine ? ' me' : '') }, h('span', { text:o.l }), h('span', { class:'hid', text:'hidden (fewer than 5)' }));
        const p = Math.round((c / agg.n) * 100);
        return h('div', { class:'row2' + (mine ? ' me' : '') },
          h('span', {}, o.l, mine ? h('span', { class:'tag', text:'you' }) : null),
          h('span', { class:'t', 'aria-hidden':'true' }, h('i', { style:`width:${p}%` })),
          h('span', { class:'v', text:p + '%' }));
      });
      kids.push(h('div', { class:'cmp panel' }, h('h3', { text:title }), rows));
    });
  }
  kids.push(h('div', { class:'nav' }, h('button', { class:'btn ghost grow', type:'button', onclick:() => (state.saved ? result() : intro()), text:'Back' })));
  body.replaceChildren(...kids);
}

// ---- Share image (archetype only, no answers) ----
function rr(x, px, py, w, hh, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + hh, r); x.arcTo(px + w, py + hh, px, py + hh, r); x.arcTo(px, py + hh, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }
async function shareCard(key) {
  const A = ARCH[key], W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, A.c[0]); g.addColorStop(1, A.c[1]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // dot grid + soft blobs
  x.fillStyle = 'rgba(255,255,255,.10)';
  for (let px = 40; px < W; px += 60) for (let py = 40; py < H; py += 60) { x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(255,255,255,.10)'; x.beginPath(); x.arc(W - 90, 140, 300, 0, 7); x.fill();
  x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.arc(60, H - 40, 340, 0, 7); x.fill();
  // glass panel
  x.save(); x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 50; x.shadowOffsetY = 20;
  x.fillStyle = 'rgba(255,255,255,.16)'; rr(x, 80, 190, W - 160, 930, 56); x.fill(); x.restore();
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; rr(x, 80, 190, W - 160, 930, 56); x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = `700 36px ${sans}`; x.globalAlpha = .9; x.fillText('MY STUDY PROFILE', W / 2, 135); x.globalAlpha = 1;
  x.font = `250px ${sans}`; x.fillText(A.em, W / 2, 470);
  x.font = `800 84px ${sans}`; wrap(x, A.name, W / 2, 620, W - 260, 94);
  x.font = `500 46px ${sans}`; x.globalAlpha = .95; wrap(x, A.tag, W / 2, 800, W - 290, 60); x.globalAlpha = 1;
  // trait pills
  x.font = `600 34px ${sans}`;
  let py = 960;
  A.bullets.forEach(t => { const w = x.measureText(t).width + 70; x.fillStyle = 'rgba(255,255,255,.22)'; rr(x, W / 2 - w / 2, py - 44, w, 70, 35); x.fill(); x.fillStyle = '#fff'; x.fillText(t, W / 2, py + 3); py += 90; });
  x.font = `600 32px ${sans}`; x.globalAlpha = .85; x.fillText('MPBA G505 · class survey', W / 2, H - 80); x.globalAlpha = 1;
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'my-study-profile.png', { type:'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files:[file] })) { await navigator.share({ files:[file], title:'My study profile' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-study-profile.png';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function wrap(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, cx, y); line = w; y += lh; } else line = t;
  }
  ctx.fillText(line, cx, y);
}

intro();
