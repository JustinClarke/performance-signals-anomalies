#!/usr/bin/env python3
"""Build the public cohort aggregates document from an exported responses CSV.

Usage:  python3 aggregate.py responses.csv [-o aggregates_cohort.json]

Input: CSV with the questions.csv column names (extra columns such as the
Firestore timestamp or document id are ignored). Rows with consent != "yes"
are dropped. Output: counts per answer code, with any cell under 5 replaced by
null (and, where that single suppression could be recovered by subtraction,
the next smallest cell in the same variable is hidden too). Nothing is
written if fewer than 15 valid responses exist.
"""
import argparse, csv, json, sys
from datetime import date

MIN_N = 15
MIN_CELL = 5

# variable -> allowed codes (as strings). Must match COMPARE in app.js.
VARS = {
    "studytime": ["1", "2", "3", "4"],
    "freetime": ["1", "2", "3", "4", "5"],
    "goout": ["1", "2", "3", "4", "5"],
    "traveltime": ["1", "2", "3", "4"],
    "activities": ["yes", "no"],
    "paid": ["yes", "no"],
    "schoolsup": ["yes", "no"],
    "higher": ["yes", "no"],
}


def norm(v):
    v = (v or "").strip()
    try:  # "2.0" -> "2"
        f = float(v)
        if f == int(f):
            return str(int(f))
    except ValueError:
        pass
    return v.lower() if v.lower() in ("yes", "no") else v


def suppress(counts):
    """Replace cells < MIN_CELL by None; add complementary suppression."""
    out = {k: (None if 0 < v < MIN_CELL else v) for k, v in counts.items()}
    # zero cells are published as 0 (no person to protect)
    hidden = [k for k, v in out.items() if v is None]
    if len(hidden) == 1:
        rest = [(v, k) for k, v in out.items() if v is not None and v > 0]
        if rest:
            out[min(rest)[1]] = None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path")
    ap.add_argument("-o", "--out", default="aggregates_cohort.json")
    args = ap.parse_args()

    with open(args.csv_path, newline="", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if norm(r.get("consent")) == "yes"]
    missing = [c for c in VARS if rows and c not in rows[0]]
    if missing:
        sys.exit(f"CSV is missing columns: {missing}")

    n = len(rows)
    if n < MIN_N:
        sys.exit(f"Only {n} consenting responses; need at least {MIN_N}. Nothing written.")

    counts = {c: {k: 0 for k in codes} for c, codes in VARS.items()}
    for r in rows:
        for c in VARS:
            v = norm(r[c])
            if v in counts[c]:
                counts[c][v] += 1
    gt5 = counts["studytime"]["3"] + counts["studytime"]["4"]
    pct = None
    if MIN_CELL <= gt5 <= n - MIN_CELL:  # both sides of the split must be >= 5
        pct = round(100 * gt5 / n, 1)

    doc = {
        "n": n,
        "updated": date.today().isoformat(),
        "min_cell": MIN_CELL,
        "pct_study_gt5": pct,
        "vars": {c: suppress(v) for c, v in counts.items()},
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)
    print(f"Wrote {args.out} (n={n}). Upload it to Firestore document aggregates/cohort.")


if __name__ == "__main__":
    main()
