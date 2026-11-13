// Writes 60 FAKE survey responses to demo_responses. Fabricated data, for preview only.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config.js';

// mulberry32, fixed seed
let a = 20240611;
const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const yn = (p = 0.5) => (rnd() < p ? 'yes' : 'no');
const jobs = ['at_home', 'health', 'services', 'teacher', 'other'];
const ID = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rid = () => Array.from({ length: 16 }, () => ID[int(0, 35)]).join('');

function make() {
  const studytime = int(1, 4);
  const failures = rnd() < 0.7 ? 0 : int(1, 3);
  const raw = 45 + 8 * studytime - 10 * failures + (rnd() + rnd() + rnd() - 1.5) * 18;
  const G3_pct = Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
  return {
    consent: 'yes', sex: pick(['F', 'M']), age: int(18, 25), address: pick(['U', 'R']),
    famsize: pick(['LE3', 'GT3']), Pstatus: pick(['T', 'T', 'T', 'A']),
    Medu: int(0, 4), Fedu: int(0, 4), Mjob: pick(jobs), Fjob: pick(jobs),
    traveltime: int(1, 4), internet: yn(0.85), famrel: int(1, 5), health: int(1, 5),
    studytime, failures, schoolsup: yn(0.15), famsup: yn(0.6), paid: yn(0.4),
    activities: yn(0.5), higher: yn(0.9), absences: Math.min(93, Math.round(-Math.log(1 - rnd()) * 5)),
    freetime: int(1, 5), goout: int(1, 5), Dalc: int(1, 3), Walc: int(1, 5),
    G3_pct, submittedAt: serverTimestamp(),
  };
}

const db = getFirestore(initializeApp(firebaseConfig));
let n = 0;
for (let i = 0; i < 60; i++) {
  await setDoc(doc(db, 'demo_responses', 'FAKE_' + rid()), make());
  n++;
}
console.log(`Wrote ${n} FAKE documents to demo_responses`);
process.exit(0);
