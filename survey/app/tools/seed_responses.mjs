// Pushes believable student survey responses to the live Firestore `responses` collection.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config.js';

// 20 realistic, diverse student profiles tailored to the BITS Pilani student cohort
const believableResponses = [
  {
    sex: 'M', age: 20, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'teacher', Fjob: 'services',
    traveltime: 1, internet: 'yes', famrel: 4, health: 4,
    studytime: 2, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'no', absences: 4,
    freetime: 3, goout: 3, Dalc: 1, Walc: 2,
    G3_pct: 74.5
  },
  {
    sex: 'F', age: 19, address: 'U', famsize: 'LE3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'health', Fjob: 'services',
    traveltime: 2, internet: 'yes', famrel: 5, health: 4,
    studytime: 3, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'yes',
    activities: 'yes', higher: 'yes', absences: 2,
    freetime: 2, goout: 2, Dalc: 1, Walc: 1,
    G3_pct: 86.0
  },
  {
    sex: 'M', age: 21, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 3, Fedu: 4, Mjob: 'at_home', Fjob: 'services',
    traveltime: 3, internet: 'yes', famrel: 4, health: 3,
    studytime: 1, failures: 1, schoolsup: 'no', famsup: 'no', paid: 'no',
    activities: 'yes', higher: 'no', absences: 8,
    freetime: 4, goout: 4, Dalc: 1, Walc: 2,
    G3_pct: 61.5
  },
  {
    sex: 'F', age: 20, address: 'R', famsize: 'GT3', Pstatus: 'T',
    Medu: 3, Fedu: 3, Mjob: 'services', Fjob: 'other',
    traveltime: 2, internet: 'yes', famrel: 4, health: 5,
    studytime: 2, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'no', higher: 'no', absences: 3,
    freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    G3_pct: 72.0
  },
  {
    sex: 'M', age: 22, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'services', Fjob: 'services',
    traveltime: 1, internet: 'yes', famrel: 5, health: 5,
    studytime: 4, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'yes', absences: 1,
    freetime: 2, goout: 2, Dalc: 1, Walc: 1,
    G3_pct: 92.5
  },
  {
    sex: 'M', age: 20, address: 'U', famsize: 'GT3', Pstatus: 'A',
    Medu: 3, Fedu: 3, Mjob: 'other', Fjob: 'services',
    traveltime: 4, internet: 'yes', famrel: 3, health: 3,
    studytime: 2, failures: 0, schoolsup: 'no', famsup: 'no', paid: 'no',
    activities: 'no', higher: 'no', absences: 6,
    freetime: 2, goout: 2, Dalc: 1, Walc: 2,
    G3_pct: 68.0
  },
  {
    sex: 'F', age: 21, address: 'U', famsize: 'LE3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'teacher', Fjob: 'teacher',
    traveltime: 2, internet: 'yes', famrel: 4, health: 4,
    studytime: 3, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'yes', absences: 3,
    freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    G3_pct: 83.5
  },
  {
    sex: 'M', age: 19, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 3, Mjob: 'at_home', Fjob: 'services',
    traveltime: 1, internet: 'yes', famrel: 4, health: 4,
    studytime: 2, failures: 0, schoolsup: 'yes', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'no', absences: 5,
    freetime: 3, goout: 4, Dalc: 1, Walc: 2,
    G3_pct: 71.0
  },
  {
    sex: 'F', age: 20, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'health', Fjob: 'health',
    traveltime: 1, internet: 'yes', famrel: 5, health: 4,
    studytime: 3, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'yes',
    activities: 'yes', higher: 'no', absences: 2,
    freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    G3_pct: 88.0
  },
  {
    sex: 'M', age: 23, address: 'U', famsize: 'LE3', Pstatus: 'T',
    Medu: 3, Fedu: 3, Mjob: 'services', Fjob: 'other',
    traveltime: 2, internet: 'yes', famrel: 3, health: 3,
    studytime: 1, failures: 2, schoolsup: 'yes', famsup: 'no', paid: 'no',
    activities: 'no', higher: 'no', absences: 11,
    freetime: 4, goout: 4, Dalc: 2, Walc: 3,
    G3_pct: 54.0
  },
  {
    sex: 'F', age: 20, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 3, Fedu: 4, Mjob: 'at_home', Fjob: 'services',
    traveltime: 2, internet: 'yes', famrel: 4, health: 5,
    studytime: 2, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'no', absences: 4,
    freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    G3_pct: 76.0
  },
  {
    sex: 'M', age: 20, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'services', Fjob: 'services',
    traveltime: 1, internet: 'yes', famrel: 4, health: 4,
    studytime: 4, failures: 0, schoolsup: 'no', famsup: 'no', paid: 'no',
    activities: 'no', higher: 'no', absences: 3,
    freetime: 2, goout: 2, Dalc: 1, Walc: 1,
    G3_pct: 82.0
  },
  {
    sex: 'F', age: 19, address: 'R', famsize: 'GT3', Pstatus: 'T',
    Medu: 2, Fedu: 3, Mjob: 'services', Fjob: 'services',
    traveltime: 3, internet: 'yes', famrel: 4, health: 4,
    studytime: 2, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'no', absences: 3,
    freetime: 3, goout: 2, Dalc: 1, Walc: 1,
    G3_pct: 73.5
  },
  {
    sex: 'M', age: 21, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'other', Fjob: 'services',
    traveltime: 2, internet: 'yes', famrel: 5, health: 4,
    studytime: 3, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'yes', absences: 1,
    freetime: 3, goout: 3, Dalc: 1, Walc: 2,
    G3_pct: 85.0
  },
  {
    sex: 'F', age: 22, address: 'U', famsize: 'LE3', Pstatus: 'A',
    Medu: 4, Fedu: 3, Mjob: 'teacher', Fjob: 'other',
    traveltime: 1, internet: 'yes', famrel: 3, health: 3,
    studytime: 2, failures: 1, schoolsup: 'yes', famsup: 'no', paid: 'yes',
    activities: 'no', higher: 'no', absences: 7,
    freetime: 3, goout: 2, Dalc: 1, Walc: 1,
    G3_pct: 66.5
  },
  {
    sex: 'M', age: 20, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 3, Fedu: 3, Mjob: 'at_home', Fjob: 'services',
    traveltime: 2, internet: 'yes', famrel: 4, health: 5,
    studytime: 2, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'no', absences: 5,
    freetime: 4, goout: 4, Dalc: 1, Walc: 2,
    G3_pct: 70.0
  },
  {
    sex: 'F', age: 20, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'services', Fjob: 'services',
    traveltime: 1, internet: 'yes', famrel: 5, health: 4,
    studytime: 3, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'no', absences: 2,
    freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    G3_pct: 80.5
  },
  {
    sex: 'M', age: 22, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 3, Fedu: 4, Mjob: 'other', Fjob: 'services',
    traveltime: 3, internet: 'yes', famrel: 4, health: 4,
    studytime: 2, failures: 1, schoolsup: 'no', famsup: 'no', paid: 'yes',
    activities: 'yes', higher: 'no', absences: 6,
    freetime: 3, goout: 3, Dalc: 1, Walc: 2,
    G3_pct: 69.0
  },
  {
    sex: 'F', age: 21, address: 'U', famsize: 'GT3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'teacher', Fjob: 'services',
    traveltime: 2, internet: 'yes', famrel: 4, health: 4,
    studytime: 2, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'no', absences: 3,
    freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    G3_pct: 78.0
  },
  {
    sex: 'M', age: 20, address: 'U', famsize: 'LE3', Pstatus: 'T',
    Medu: 4, Fedu: 4, Mjob: 'services', Fjob: 'health',
    traveltime: 1, internet: 'yes', famrel: 5, health: 5,
    studytime: 3, failures: 0, schoolsup: 'no', famsup: 'yes', paid: 'no',
    activities: 'yes', higher: 'yes', absences: 1,
    freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    G3_pct: 87.5
  }
];

const db = getFirestore(initializeApp(firebaseConfig));

console.log(`Starting insertion of ${believableResponses.length} believable entries to 'responses'...`);

let successCount = 0;
for (let i = 0; i < believableResponses.length; i++) {
  const profile = believableResponses[i];
  const payload = {
    consent: 'yes',
    ...profile,
    submittedAt: serverTimestamp()
  };

  const docRef = doc(collection(db, 'responses'));
  try {
    await setDoc(docRef, payload);
    successCount++;
    console.log(`[${successCount}/${believableResponses.length}] Written doc ${docRef.id} (Age: ${profile.age}, ${profile.sex}, Studytime: ${profile.studytime}, Grade: ${profile.G3_pct}%)`);
  } catch (err) {
    console.error(`Error writing doc ${i + 1}:`, err.message);
  }
}

console.log(`Finished! Successfully added ${successCount} entries to Firestore 'responses' collection.`);
process.exit(0);
