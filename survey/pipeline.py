"""Clean a Google Forms export into a dataset shaped like the UCI student-por file.

Steps
  1. read the export; match each column to a question by its exact text (questions.csv)
  2. drop non-consenting rows, identifiers (timestamp, email), and exact duplicates
  3. map answer labels to UCI-style codes; coerce numbers; flag out-of-range values
  4. convert the % score to the 0-20 scale: G3 = round(G3_pct / 5)
  5. add derived columns (zero_grade, log_abs) and source = BITS_survey
  6. write a semicolon-separated CSV and print a QA report

Usage
  python survey/pipeline.py <forms_export.csv> [--out data/processed/bits_survey_clean.csv]
"""
import argparse
import csv
import pathlib
import sys

import numpy as np
import pandas as pd

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
DEFAULT_OUT = ROOT / "data" / "processed" / "bits_survey_clean.csv"


def parse_options(text):
    pairs = []
    for part in text.split("|"):
        if "=" in part:
            label, code = part.rsplit("=", 1)
        else:
            label = code = part
        pairs.append((label.strip(), code.strip()))
    return pairs


def load_codebook():
    with open(HERE / "questions.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def norm(s):
    return " ".join(str(s).split()).strip().lower()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("export", help="CSV downloaded from Google Forms (Responses > Download .csv)")
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    args = ap.parse_args()

    book = load_codebook()
    raw = pd.read_csv(args.export, dtype=str, keep_default_na=False)
    report = [f"Export: {args.export}", f"Responses received: {len(raw)}"]

    # 1. match questions to export columns by exact (normalised) text
    header_map = {norm(c): c for c in raw.columns}
    df = pd.DataFrame(index=raw.index)
    missing_required = []
    for q in book:
        key = norm(q["question"])
        if key in header_map:
            df[q["column"]] = raw[header_map[key]]
        elif q["required"] == "yes":
            missing_required.append(q["question"][:70])
        else:
            df[q["column"]] = ""
            report.append(f"optional question not in export (left blank): {q['column']}")
    if missing_required:
        sys.exit("Missing required questions in export:\n  - " + "\n  - ".join(missing_required))

    unmatched = [c for c in raw.columns
                 if norm(c) not in {norm(q["question"]) for q in book}]
    report.append(f"Columns ignored (not in codebook): {unmatched}")

    # 2. consent, duplicates
    before = len(df)
    df = df[df["consent"].str.strip().str.lower().eq("yes")]
    report.append(f"Dropped (no consent): {before - len(df)}")
    df = df.drop(columns=["consent"])
    dup = df.duplicated().sum()
    df = df.drop_duplicates()
    report.append(f"Dropped (exact duplicate answers): {dup}")

    # 3. categorical labels -> codes; numbers -> numeric, with range checks
    for q in book:
        col = q["column"]
        if col not in df.columns or q["type"] == "consent":
            continue
        cell = df[col].str.strip()
        if q["type"] == "number":
            lo, hi = (float(x) for x in q["options"].split("-"))
            val = pd.to_numeric(cell.replace("", np.nan), errors="coerce")
            bad = val.notna() & ~val.between(lo, hi)
            if bad.any():
                report.append(f"{col}: {int(bad.sum())} values outside {lo:g}-{hi:g} set to missing")
            df[col] = val.where(~bad)
        else:
            mapping = {norm(label): code for label, code in parse_options(q["options"])}
            mapping.update({norm(code): code for _, code in parse_options(q["options"])})
            coded = cell.map(lambda v: mapping.get(norm(v)) if v else None)
            unknown = cell[(cell != "") & coded.isna()].unique().tolist()
            if unknown:
                report.append(f"{col}: unrecognised answers {unknown} set to missing")
            df[col] = coded

    # 4. percentages -> 0-20 scale (UCI grade range)
    for pct, grade in [("G3_pct", "G3")]:
        if pct in df.columns:
            p = pd.to_numeric(df[pct].replace("", np.nan), errors="coerce")
            df[grade] = (p / 5).round()
            df = df.drop(columns=[pct])

    # 5. derived columns and source flag
    df["absences"] = pd.to_numeric(df["absences"], errors="coerce")
    df["log_abs"] = np.log1p(df["absences"])
    df["zero_grade"] = df["G3"] == 0
    df["source"] = "BITS_survey"

    # 6. QA summary and write
    report.append(f"Clean rows: {len(df)}")
    missing = df.isna().sum()
    missing = missing[missing > 0]
    if len(missing):
        report.append("Missing values after cleaning:\n" + missing.to_string())
    if len(df) < 20:
        report.append("WARNING: fewer than 20 usable rows; inference will be unreliable.")

    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, sep=";", index=False)
    report.append(f"Wrote {out}")
    print("\n".join(report))


if __name__ == "__main__":
    main()
