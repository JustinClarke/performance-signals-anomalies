Build: `cd survey/app/snapshot && SNAPSHOT_PASSPHRASE=... node build_snapshot.mjs --responses <export.csv> --uci ../dashboard/uci_summary.json --out snapshot.html [--cutoff YYYY-MM-DD]` (or leave the variable unset to be prompted; Node only, no installs).
Pick a passphrase of 4 or more random words (dice or a password manager, not a sentence or a quote) and send it to the professors separately from the file.
Anyone who has the file can try guesses offline at their own speed, so the passphrase is the only protection.
