"""Build uci_summary.json: the UCI numbers the dashboard shows next to BITS.

Run from anywhere (needs pandas):  python3 survey/app/dashboard/build_uci_summary.py
Reads  data/processed/student-por_clean.csv  (G3 already on 0-20)
Writes survey/app/dashboard/uci_summary.json

Definitions mirror dashboard.js: sample SD uses n-1; slope is OLS of G3 on
studytime; the 95% CI is the percentile interval of 1000 case-resampling
bootstrap reps with a fixed seed.
"""
import json
import math
import pathlib
import random

import pandas as pd

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]  # dashboard -> app -> survey -> repo root
CSV = ROOT / "data" / "processed" / "student-por_clean.csv"
OUT = HERE / "uci_summary.json"
SEED = 2026
REPS = 1000


def mean_sd(values):
    n = len(values)
    if n == 0:
        return {"n": 0, "mean": None, "sd": None}
    m = sum(values) / n
    sd = math.sqrt(sum((v - m) ** 2 for v in values) / (n - 1)) if n > 1 else None
    return {"n": n, "mean": m, "sd": sd}


def slope(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx


def slope_with_ci(xs, ys):
    n = len(xs)
    est = slope(xs, ys) if n >= 3 else None
    if est is None:
        return {"n": n, "slope": None, "lo": None, "hi": None, "reps": REPS, "seed": SEED}
    rng = random.Random(SEED)
    draws = []
    while len(draws) < REPS:
        idx = [rng.randrange(n) for _ in range(n)]
        s = slope([xs[i] for i in idx], [ys[i] for i in idx])
        if s is not None:
            draws.append(s)
    draws.sort()
    lo = draws[int(0.025 * REPS)]
    hi = draws[int(0.975 * REPS) - 1]
    return {"n": n, "slope": est, "lo": lo, "hi": hi, "reps": REPS, "seed": SEED}


def group_table(df, keyfunc, keys):
    out = {}
    for k in keys:
        vals = [float(g) for g, key in zip(df["G3"], keyfunc(df)) if key == k]
        s = mean_sd(vals)
        out[str(k)] = {"n": len(vals), "mean": s["mean"], "sd": s["sd"]}
    return out


def main():
    df = pd.read_csv(CSV, sep=None, engine="python")  # cleaned file is comma-separated; auto-detect
    overall = mean_sd([float(v) for v in df["G3"]])
    summary = {
        "source": "UCI student-por (G3 on 0-20)",
        "overall": overall,
        "studytime": group_table(df, lambda d: list(d["studytime"]), [1, 2, 3, 4]),
        "failures": group_table(df, lambda d: [min(int(f), 3) for f in d["failures"]], [0, 1, 2, 3]),
        "sex": group_table(df, lambda d: list(d["sex"]), ["F", "M"]),
        "slope": slope_with_ci([float(v) for v in df["studytime"]], [float(v) for v in df["G3"]]),
        "g3_counts": {str(g): int(sum(1 for v in df["G3"] if int(v) == g)) for g in range(21)},
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(f"wrote {OUT} (n={overall['n']})")


if __name__ == "__main__":
    main()
