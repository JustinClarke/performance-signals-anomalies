"""Inference: does the UCI pattern appear in the BITS cohort, and does it differ?

Hypotheses (set after exploring the UCI data, before any BITS data exists; NOT pre-registered.
Register them with a timestamp before the survey closes if a pre-registration claim is needed):
  H1  BITS: study time is positively associated with final grade (Spearman rho > 0)
  H2  BITS: past failures are negatively associated with final grade (slope < 0)
  H3  The study-time slope in BITS is consistent with UCI (UCI estimate inside BITS 95% bootstrap CI)
  H4  The populations differ (pooled Chow test: source x predictors interactions = 0)

Models (all on the common variable set only):
  M1  G3 ~ studytime
  M2  G3 ~ studytime + failures + log_abs + sex
Per source (UCI, BITS) we report OLS estimates, HC3 SEs and percentile bootstrap CIs
(bootstrap because the BITS sample is small and HC3 is unreliable at small n).

Usage
  python survey/analysis.py [--bits data/processed/bits_survey_clean.csv] [--uci data/raw/student-por.csv]
"""
import argparse
import pathlib

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy import stats

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
B = 5000
SEED = 2026


def load(path, source):
    df = pd.read_csv(path, sep=";")
    df["source"] = source
    df["log_abs"] = np.log1p(df["absences"])
    df["zero_grade"] = df["G3"] == 0
    return df


def fit_table(df, label, rng):
    """OLS (HC3) plus one bootstrap distribution per model, reused for every term."""
    rows = []
    specs = {
        "M1": "G3 ~ studytime",
        "M2": "G3 ~ studytime + failures + log_abs + C(sex)",
    }
    for name, f in specs.items():
        m = smf.ols(f, df).fit(cov_type="HC3")
        X = np.asarray(m.model.exog)
        y = np.asarray(m.model.endog)
        names = list(m.model.exog_names)
        boots = np.empty((B, X.shape[1]))
        n = len(y)
        for b in range(B):
            idx = rng.integers(0, n, n)
            boots[b] = np.linalg.lstsq(X[idx], y[idx], rcond=None)[0]
        ci = np.percentile(boots, [2.5, 97.5], axis=0)
        ci_lo = dict(zip(names, ci[0]))
        ci_hi = dict(zip(names, ci[1]))
        for term in names:
            if term == "Intercept":
                continue
            lo, hi = m.conf_int().loc[term]
            rows.append({
                "source": label, "model": name, "term": term,
                "coef": round(m.params[term], 3), "hc3_lo": round(lo, 3), "hc3_hi": round(hi, 3),
                "boot_lo": round(ci_lo[term], 3), "boot_hi": round(ci_hi[term], 3),
                "p": round(m.pvalues[term], 4), "n": int(m.nobs), "R2": round(m.rsquared, 3),
            })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bits", default=str(ROOT / "data/processed/bits_survey_clean.csv"))
    ap.add_argument("--uci", default=str(ROOT / "data/raw/student-por.csv"))
    args = ap.parse_args()
    rng = np.random.default_rng(SEED)

    uci = load(args.uci, "UCI_PT")
    bits = load(args.bits, "BITS_survey").dropna(subset=["G3", "studytime", "failures", "log_abs", "sex"])
    out = HERE / "results"
    out.mkdir(exist_ok=True)

    print(f"UCI n={len(uci)}   BITS n={len(bits)}")
    if len(bits) < 20:
        print("Too few BITS rows for inference (need at least 20). Collect more responses and rerun.")
        return

    # H1: Spearman with permutation p-value
    rho, p_asym = stats.spearmanr(bits["studytime"], bits["G3"])
    perm = np.array([stats.spearmanr(bits["studytime"], rng.permutation(bits["G3"]))[0] for _ in range(B)])
    p_perm = (np.sum(np.abs(perm) >= abs(rho)) + 1) / (B + 1)
    print(f"\nH1 BITS Spearman rho(studytime, G3) = {rho:+.3f}, permutation p = {p_perm:.4f}")

    # Per-source models
    rows = fit_table(uci, "UCI_PT", rng) + fit_table(bits, "BITS_survey", rng)
    res = pd.DataFrame(rows)
    res.to_csv(out / "bits_vs_uci_models.csv", index=False)
    print("\nPer-source estimates (M1 studytime; M2 controls):")
    print(res[res.term.isin(["studytime", "failures", "log_abs"])].to_string(index=False))

    # H2 / H3
    b_fail = res[(res.source == "BITS_survey") & (res.model == "M2") & (res.term == "failures")].iloc[0]
    u_study = res[(res.source == "UCI_PT") & (res.model == "M1") & (res.term == "studytime")].iloc[0]
    b_study = res[(res.source == "BITS_survey") & (res.model == "M1") & (res.term == "studytime")].iloc[0]
    print(f"\nH2 BITS failures slope (M2) = {b_fail.coef:+.2f}, bootstrap CI [{b_fail.boot_lo}, {b_fail.boot_hi}]")
    inside = b_study.boot_lo <= u_study.coef <= b_study.boot_hi
    print(f"H3 UCI studytime slope {u_study.coef:+.2f} inside BITS bootstrap CI "
          f"[{b_study.boot_lo}, {b_study.boot_hi}]: {inside}")

    # H4: pooled Chow-type test on common predictors
    common = pd.concat([uci, bits], ignore_index=True)
    restricted = smf.ols("G3 ~ studytime + failures + log_abs + C(sex) + C(source)", common).fit()
    full = smf.ols("G3 ~ (studytime + failures + log_abs + C(sex)) * C(source)", common).fit()
    f_stat, p_chow, df_diff = full.compare_f_test(restricted)
    print(f"\nH4 Chow test, source interactions: F = {f_stat:.2f}, df = {int(df_diff)}, p = {p_chow:.4f}")
    print("   (classical SEs; a small-sample check, not a substitute for the bootstrap CIs above)")

    # Power: smallest studytime slope this BITS sample could detect at 80% power
    fit = smf.ols("G3 ~ studytime", bits).fit()
    se = fit.bse["studytime"]
    df_res = fit.df_resid
    mde = (stats.t.ppf(0.975, df_res) + stats.t.ppf(0.80, df_res)) * se
    power_note = (f"Minimum detectable studytime slope with BITS n={len(bits)} at 80% power, alpha 0.05: "
                  f"{mde:.2f} grade points per category (UCI estimate: {u_study.coef:+.2f}).")
    print("\nPower: " + power_note)
    (out / "bits_power.txt").write_text(power_note + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
