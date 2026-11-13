# G505 class survey app

Anonymous one-question-per-screen survey. Static files plus Firestore. No accounts, no email, no auth.

Files: `index.html` + `app.js` (the app), `firebase-config.js` (placeholders), `firestore.rules`, `aggregate.py`.
Question columns and answer codes mirror `../questions.csv`. Do not change them; the analysis depends on them.

## Set up Firebase

1. Create a Firebase project and add a Web app. Paste its config into both `firebase-config.js` and `public/firebase-config.js` (replace every `REPLACE_ME`). The checked-in files are placeholders and do not target a live project.
2. Create a Firestore database in Native mode. **The region is permanent and must be chosen at creation.**
   Suggested: `asia-south1` (Mumbai), pending the group's decision.
3. Deploy the rules: `firebase deploy --only firestore:rules` (or paste `firestore.rules` in the console, Rules tab).
4. Host the folder (Firebase Hosting, GitHub Pages, anything static). Consider enabling App Check to limit spam writes.

Each submission is one `responses` document: the 28 answer fields (column names, codes from `questions.csv`, gender F/M, consent `yes`) plus `submittedAt` (server time). Clients cannot read, update or delete responses.

## Aggregates and the cohort view

1. In the console, export `responses` to CSV (or use any export tool). Column names must match `questions.csv`; extra columns are ignored.
2. `python3 aggregate.py responses.csv -o aggregates_cohort.json`
   - needs at least 15 consenting rows, else writes nothing
   - counts under 5 become `null` (plus complementary suppression)
3. Create/overwrite the Firestore document `aggregates/cohort` with that JSON (console "Add document", or Admin SDK). Rules make it public-read, client-write-denied.

The client reads only `aggregates/cohort`, and shows the class view only if `n >= 15`.

## Test locally

ES modules need http, not `file://`:

```
cd survey/app && python3 -m http.server 8000
```

Open http://localhost:8000. With placeholder config the app runs in preview mode: nothing is sent, and the submit step just logs the document to the console. Add `?demo=1` to see the class view with made-up numbers. Test the rules with the Firebase emulator (`firebase emulators:start --only firestore`) before going live.

The "what share study more than 5 hours" guess is kept in `localStorage` only and is never sent.

Feel: slide transitions, a progress bar with a small rider and a time-left estimate, haptic pulse on tap where supported (`navigator.vibrate`), optional tap sound (off by default, toggle in the footer), confetti and an animated reveal at the end. Reduced-motion users get none of the animation. Keyboard: number keys pick an answer, Enter moves on.
