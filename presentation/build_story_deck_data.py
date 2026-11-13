"""Build the data block for presentation/Story_Deck.html.

Recomputes every number shown in the Story Deck from data/processed/*.csv (and data/raw/
for the Portuguese/maths overlap check), cross-checks each one against results/*.csv,
and writes the values as JSON between the /*DATA-START*/ and /*DATA-END*/ markers in
Story_Deck.html (if the deck exists) and to story_deck_data.json in the scratch folder
given by --json (optional).

Usage (from the repo root):
    python -I presentation/build_story_deck_data.py            # check + inject
    python -I presentation/build_story_deck_data.py --check    # check only, no write

Model specifications are identical to notebooks/03_regression_models.ipynb:
  M1 study time | M2 + failures, log(abs+1), sex, age, school, address, higher
  M3 + Medu, Fedu, goout, Dalc, Walc, freetime, health, internet, schoolsup, famsup, paid, romantic
  M4 + G1, G2.  OLS with HC3 standard errors throughout.
"""
import json
import re
import sys
import warnings
from math import comb
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import stats
from statsmodels.multivariate.manova import MANOVA
from statsmodels.stats.diagnostic import het_breuschpagan, linear_reset
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from statsmodels.stats.outliers_influence import variance_inflation_factor

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parent.parent
PROC, RAW, RES = ROOT / "data/processed", ROOT / "data/raw", ROOT / "results"
DECK = ROOT / "presentation/Story_Deck.html"

ACAD = "failures + log_abs + C(sex) + age + C(school) + C(address) + C(higher)"
FAMSOC = ("Medu + Fedu + goout + Dalc + Walc + freetime + health + C(internet) + C(schoolsup) + C(famsup)"
          " + C(paid) + C(romantic)")
CTRL = ACAD + " + " + FAMSOC
RUNGS = {"M1": "", "M2": " + " + ACAD, "M3": " + " + CTRL, "M4": " + " + CTRL + " + G1 + G2"}

por = pd.read_csv(PROC / "student-por_clean.csv")
mat = pd.read_csv(PROC / "student-mat_clean.csv")
for d in (por, mat):
    d["zero_grade"] = d["G3"] == 0
    d["log_abs"] = np.log1p(d["absences"])
pnz, mnz = por[~por.zero_grade], mat[~mat.zero_grade]

CHECKS = []   # (label, deck value, reference value, tolerance)


def check(label, value, ref, tol=5e-3, rel=False):
    """Pass if |value - ref| <= tol (absolute, scaled by |ref| when |ref| > 1), or relative when rel=True."""
    v, f = float(value), float(ref)
    ok = abs(v - f) <= (tol * abs(f) if rel else tol * max(1.0, abs(f)))
    CHECKS.append((label, float(value), float(ref), ok))
    return value


def r(x, k=6):
    """Store at >= 6 decimals; the deck formats for display (avoids double rounding such as 0.415 -> 0.41)."""
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), max(k, 6))


def fit(f, d):
    return smf.ols(f, d).fit(cov_type="HC3")


reg = pd.read_csv(RES / "regression_comparison.csv")
hyp = pd.read_csv(RES / "hypothesis_tests.csv")
zba = pd.read_csv(RES / "zero_grade_before_after.csv")
diag = pd.read_csv(RES / "diagnostics_scorecard.csv")


def ref_reg(section, model, sample, term, col="estimate"):
    q = reg[(reg.section == section) & (reg.model.str.startswith(model)) & (reg["sample"] == sample) & (reg.term == term)]
    assert len(q) == 1, (section, model, sample, term, len(q))
    return q.iloc[0][col]


def ref_hyp(test, sample, col="value"):
    q = hyp[(hyp.test == test) & (hyp["sample"] == sample)]
    assert len(q) == 1, (test, sample, len(q))
    return q.iloc[0][col]


D = {"meta": {"source": "Cortez (2008) UCI Student Performance, Portuguese course n = 649 unless stated",
              "built_by": "presentation/build_story_deck_data.py"}}

# ---------------------------------------------------------------- dataset card
D["card"] = dict(n_por=len(por), n_mat=len(mat), n_vars=33, n_gp=int((por.school == "GP").sum()),
                 n_ms=int((por.school == "MS").sum()), g3_mean=r(por.G3.mean(), 2), g3_sd=r(por.G3.std(), 2))

# G3 histogram
D["hist"] = {int(k): int(v) for k, v in por.G3.value_counts().sort_index().items()}

# ---------------------------------------------------------------- Act 1: gradient
LAB = {1: "<2 h", 2: "2-5 h", 3: "5-10 h", 4: ">10 h"}
grp = []
for s, g in por.groupby("studytime"):
    m, sd, n = g.G3.mean(), g.G3.std(), len(g)
    h = stats.t.ppf(0.975, n - 1) * sd / np.sqrt(n)
    grp.append(dict(level=int(s), label=LAB[s], n=n, mean=r(m, 3), lo=r(m - h, 3), hi=r(m + h, 3)))
D["gradient"] = grp
for g, ref in zip(grp, [10.84, 12.09, 13.23, 13.06]):
    check(f"mean G3 studytime {g['label']}", round(g["mean"], 2), ref, 0.006)

F, p = stats.f_oneway(*[g.G3 for _, g in por.groupby("studytime")])
ss_b = sum(len(g) * (g.G3.mean() - por.G3.mean()) ** 2 for _, g in por.groupby("studytime"))
eta2 = ss_b / ((por.G3 - por.G3.mean()) ** 2).sum()
lev = stats.levene(*[g.G3 for _, g in por.groupby("studytime")])
kw = stats.kruskal(*[g.G3 for _, g in por.groupby("studytime")])
tk = pairwise_tukeyhsd(por.G3, por.studytime)
tkd = pd.DataFrame(tk._results_table.data[1:], columns=tk._results_table.data[0])
row13 = tkd[(tkd.group1 == 1) & (tkd.group2 == 3)].iloc[0]
row34 = tkd[(tkd.group1 == 3) & (tkd.group2 == 4)].iloc[0]
mv = MANOVA.from_formula("G1 + G2 + G3 ~ C(studytime)", por).mv_test().results["C(studytime)"]["stat"]
mc = MANOVA.from_formula("G1 + G2 + G3 ~ C(studytime) + failures", por).mv_test().results["C(studytime)"]["stat"]
D["anova"] = dict(F=r(F, 2), p=float(p), eta2=r(eta2, 3), levene_p=r(lev.pvalue, 2), kw_H=r(kw.statistic, 1),
                  kw_p=float(kw.pvalue), tukey13=r(row13.meandiff, 2), tukey13_lo=r(row13.lower, 2),
                  tukey13_hi=r(row13.upper, 2), tukey34=r(row34.meandiff, 2), tukey34_p=r(row34["p-adj"], 2),
                  pillai=r(mv.loc["Pillai's trace", "Value"], 3), pillai_p=float(mv.loc["Pillai's trace", "Pr > F"]),
                  mancova_pillai=r(mc.loc["Pillai's trace", "Value"], 3),
                  mancova_p=float(mc.loc["Pillai's trace", "Pr > F"]))
check("ANOVA p", p, 5.7057e-10, 0.01, rel=True)
check("ANOVA F", F, ref_hyp("One-way ANOVA G3 ~ studytime", "all"))
check("eta2", eta2, ref_hyp("One-way ANOVA G3 ~ studytime", "all", "effect"))
check("Levene p", lev.pvalue, ref_hyp("Levene equal variances (G3 by studytime)", "all", "p_value"))
check("Kruskal H", kw.statistic, ref_hyp("Kruskal-Wallis G3 ~ studytime", "all"))
check("Tukey <2h vs 5-10h", row13.meandiff, ref_hyp("Tukey HSD <2 h vs 5-10 h", "all"))
check("Tukey CI lo", row13.lower, ref_hyp("Tukey HSD <2 h vs 5-10 h", "all", "effect_ci_lo"), 0.01)
check("Tukey CI hi", row13.upper, ref_hyp("Tukey HSD <2 h vs 5-10 h", "all", "effect_ci_hi"), 0.01)
check("Pillai", D["anova"]["pillai"], ref_hyp("MANOVA (G1,G2,G3) ~ studytime", "all", "effect"), 0.002)
check("MANCOVA Pillai", D["anova"]["mancova_pillai"],
      ref_hyp("MANCOVA (+failures) (G1,G2,G3) ~ studytime", "all", "effect"), 0.002)

# who studies (confounding)
who = por.groupby("studytime").agg(female=("sex", lambda s: (s == "F").mean()), failures=("failures", "mean"),
                                   higher=("higher", lambda s: (s == "yes").mean()), walc=("Walc", "mean"))
D["who"] = [dict(level=int(i), female=r(x.female, 3), failures=r(x.failures, 3), higher=r(x.higher, 3),
                 walc=r(x.walc, 2)) for i, x in who.iterrows()]

# ---------------------------------------------------------------- Act 2: ladder
lad = {}
for sample, d in [("all", por), ("nz", pnz)]:
    lad[sample] = []
    for k, rhs in RUNGS.items():
        m = fit("G3 ~ studytime" + rhs, d)
        lo, hi = m.conf_int().loc["studytime"]
        lad[sample].append(dict(model=k, b=r(m.params.studytime, 3), lo=r(lo, 3), hi=r(hi, 3),
                                p=float(m.pvalues.studytime), r2=r(m.rsquared, 3), n=int(m.nobs)))
        check(f"ladder {k} {sample}", m.params.studytime,
              ref_reg("ladder (numeric studytime)", k, "all" if sample == "all" else "G3>0", "studytime"))
        check(f"ladder R2 {k} {sample}", m.rsquared,
              ref_reg("ladder (numeric studytime)", k, "all" if sample == "all" else "G3>0", "studytime", "r2"))
D["ladder"] = lad

# dummies joint test in M3 (fragile result)
for sample, d in [("all", por), ("nz", pnz)]:
    m = fit("G3 ~ C(studytime) + " + CTRL, d)
    w = m.wald_test("C(studytime)[T.2] = C(studytime)[T.3] = C(studytime)[T.4] = 0", use_f=False, scalar=True)  # chi2 Wald, as in notebook 03
    D.setdefault("dummies_joint_p", {})[sample] = r(w.pvalue, 3)
check("dummies joint p (G3>0)", D["dummies_joint_p"]["nz"], 0.063, 0.0015)
check("dummies joint p (all)", D["dummies_joint_p"]["all"], 0.005, 0.0015)

# ANCOVA
for sample, d in [("all", por), ("nz", pnz)]:
    a = sm.stats.anova_lm(smf.ols("G3 ~ C(studytime) + G1", d).fit(), typ=2)
    pe2 = a.loc["C(studytime)", "sum_sq"] / (a.loc["C(studytime)", "sum_sq"] + a.loc["Residual", "sum_sq"])
    D.setdefault("ancova", {})[sample] = dict(F=r(a.loc["C(studytime)", "F"], 2), p=r(a.loc["C(studytime)", "PR(>F)"], 3),
                                              pe2=r(pe2, 3))
# values shown on backup B3 that come straight from results/hypothesis_tests.csv
D["b3"] = dict(slopes_all=r(ref_hyp("ANCOVA homogeneity of slopes", "all", "p_value")),
               slopes_nz=r(ref_hyp("ANCOVA homogeneity of slopes", "G3>0", "p_value")),
               pillai_nz=r(ref_hyp("MANOVA (G1,G2,G3) ~ studytime", "G3>0", "effect")),
               pillai_nz_p=float(ref_hyp("MANOVA (G1,G2,G3) ~ studytime", "G3>0", "p_value")),
               mancova_nz=r(ref_hyp("MANCOVA (+failures) (G1,G2,G3) ~ studytime", "G3>0", "effect")),
               mancova_nz_p=float(ref_hyp("MANCOVA (+failures) (G1,G2,G3) ~ studytime", "G3>0", "p_value")),
               fisher_or=r(ref_hyp("Fisher exact zero-grade x school", "all"), 1))
check("ANCOVA p all", D["ancova"]["all"]["p"], ref_hyp("ANCOVA G3 ~ C(studytime) + G1: studytime", "all", "p_value"), 0.001)
D["corr"] = dict(G1G3=r(por[["G1", "G3"]].corr().iloc[0, 1], 3), G2G3=r(por[["G2", "G3"]].corr().iloc[0, 1], 3))

# ---------------------------------------------------------------- suspects (M3 coefficients, all)
m3 = fit("G3 ~ studytime + " + CTRL, por)
m3nz = fit("G3 ~ studytime + " + CTRL, pnz)


def term(m, t, scale=1.0):
    lo, hi = m.conf_int().loc[t]
    return dict(b=r(m.params[t] * scale, 3), lo=r(lo * scale, 3), hi=r(hi * scale, 3), p=float(m.pvalues[t]))


abs10 = np.log(11)  # log(10+1) - log(0+1): 0 -> 10 absences
SUS = [("Wants higher education", "C(higher)[T.yes]", 1), ("Study time: <2 h to 5-10 h", "studytime", 2),
       ("Family support", "C(famsup)[T.yes]", 1), ("Absences: 0 to 10", "log_abs", abs10),
       ("School MS (vs GP)", "C(school)[T.MS]", 1), ("Extra school support", "C(schoolsup)[T.yes]", 1),
       ("One past failure", "failures", 1)]
D["suspects"] = [dict(label=l, all=term(m3, t, s), nz=term(m3nz, t, s)) for l, t, s in SUS]
check("M3 higher", m3.params["C(higher)[T.yes]"], ref_reg("M3 full coefficients", "M3", "all", "C(higher)[T.yes]"))
check("M3 failures", m3.params["failures"], ref_reg("M3 full coefficients", "M3", "all", "failures"))
check("M3 schoolsup", m3.params["C(schoolsup)[T.yes]"], ref_reg("M3 full coefficients", "M3", "all", "C(schoolsup)[T.yes]"))
check("M3 school MS", m3.params["C(school)[T.MS]"], ref_reg("M3 full coefficients", "M3", "all", "C(school)[T.MS]"))
check("M3 famsup p", m3.pvalues["C(famsup)[T.yes]"], ref_reg("M3 full coefficients", "M3", "all", "C(famsup)[T.yes]", "p_value"))
check("abs 0->10 nz", m3nz.params.log_abs * abs10,
      ref_reg("standardised / predicted difference", "M3", "G3>0", "log_abs: absences 0 -> 10"))
hi_y, hi_n = por[por.higher == "yes"].G3, por[por.higher == "no"].G3
sp = np.sqrt(((len(hi_y) - 1) * hi_y.var() + (len(hi_n) - 1) * hi_n.var()) / (len(hi_y) + len(hi_n) - 2))
D["higher_raw"] = dict(diff=r(hi_y.mean() - hi_n.mean(), 2), d=r((hi_y.mean() - hi_n.mean()) / sp, 2),
                       n_no=len(hi_n))
check("higher raw diff", hi_y.mean() - hi_n.mean(), 3.48, 0.006)
check("higher d", D["higher_raw"]["d"], ref_hyp("Welch t G3 by higher (yes - no)", "all", "effect"), 0.006)

# ---------------------------------------------------------------- Act 3: the paradox
z = por[por.zero_grade]
share0_all = (por.absences == 0).mean()
n0 = int((por.absences == 0).sum())
p_chance = comb(n0, len(z)) / comb(len(por), len(z))    # hypergeometric: all 15 from the zero-absence pool
D["zeros_p_binom"] = float(share0_all ** len(z))
D["zeros"] = dict(n=len(z), n_zero_abs=int((z.absences == 0).sum()), share0_all=r(share0_all, 3),
                  share0_rest=r((pnz.absences == 0).mean(), 3), n0_rest=int((pnz.absences == 0).sum()),
                  p_chance=float(p_chance), G1=r(z.G1.mean(), 2), G2=r(z.G2.mean(), 2),
                  n_G2_zero=int((z.G2 == 0).sum()), n_G2_zero_others=int((pnz.G2 == 0).sum()),
                  n_ms=int((z.school == "MS").sum()))
check("zero n", len(z), 15, 0)
check("share zero abs all", share0_all, 0.376, 0.0006)
# readme quotes 4.2e-7 = 0.376**15 (binomial, with replacement); the exact hypergeometric value is 3.2e-7
check("p chance (binomial approx, as readme)", share0_all ** len(z), 4.2e-7, 0.02, rel=True)
check("p chance (exact hypergeometric)", p_chance, 3.2e-7, 0.02, rel=True)
check("zero G2 mean", z.G2.mean(), 3.8, 0.006)
check("zero G1 mean", z.G1.mean(), 7.1, 0.006)
# trajectories
D["traj"] = dict(zero=[[int(a), int(b), int(c)] for a, b, c in z[["G1", "G2", "G3"]].values],
                 rest_median=[r(pnz[c].median(), 1) for c in ["G1", "G2", "G3"]],
                 rest_q10=[r(pnz[c].quantile(.1), 1) for c in ["G1", "G2", "G3"]],
                 rest_q90=[r(pnz[c].quantile(.9), 1) for c in ["G1", "G2", "G3"]])
# scatter: counts per (absences, G3) cell, flagged zero-grade
cells = por.groupby(["absences", "G3"]).size().reset_index(name="n")
D["scatter"] = [[int(a), int(g), int(n)] for a, g, n in cells.values]
# simple fitted log lines (used for drawing)
for sample, d in [("all", por), ("nz", pnz)]:
    m = fit("G3 ~ log_abs", d)
    D.setdefault("simple_fit", {})[sample] = dict(a=r(m.params.Intercept, 4), b=r(m.params.log_abs, 4),
                                                  p=float(m.pvalues.log_abs))
# Pearson r
D["pearson"] = {s: dict(r=r(stats.pearsonr(d.absences, d.G3)[0], 3), p=float(stats.pearsonr(d.absences, d.G3)[1]))
                for s, d in [("all", por), ("nz", pnz)]}

# before/after table (M3 and M4, both courses)
ba = []
for course, d_all, d_nz in [("Portuguese", por, pnz), ("Maths", mat, mnz)]:
    for mk in ["M3", "M4"]:
        f = "G3 ~ studytime" + RUNGS[mk]
        row = dict(course=course, model=mk)
        for s, d in [("all", d_all), ("nz", d_nz)]:
            m = fit(f, d)
            lo, hi = m.conf_int().loc["log_abs"]
            row[s] = dict(b=r(m.params.log_abs, 3), lo=r(lo, 3), hi=r(hi, 3), p=float(m.pvalues.log_abs))
        ba.append(row)
        zr = zba[zba["sample"] == f"{course}, all"].iloc[0]
        zn = zba[zba["sample"] == f"{course}, G3 > 0"].iloc[0]
        check(f"{course} {mk} logabs all", row["all"]["b"], zr[f"{mk}_logabs"], 0.002)
        check(f"{course} {mk} logabs nz", row["nz"]["b"], zn[f"{mk}_logabs"], 0.002)
D["before_after"] = ba

# robustness: zero-grade dummy and G2 > 0 (M3)
m = fit("G3 ~ studytime + zero_grade + " + CTRL, por)
D["robust"] = dict(dummy=r(m.params.log_abs, 3), dummy_p=float(m.pvalues.log_abs), dummy_st=r(m.params.studytime))
m = fit("G3 ~ studytime + " + CTRL, por[por.G2 > 0])
D["robust"].update(g2pos=r(m.params.log_abs, 3), g2pos_p=float(m.pvalues.log_abs), g2pos_n=int(m.nobs),
                   g2pos_st=r(m.params.studytime))
check("robust dummy studytime", D["robust"]["dummy_st"], 0.314606, 0.002)
check("robust G2>0 studytime", D["robust"]["g2pos_st"], 0.396051, 0.002)
check("robust dummy", D["robust"]["dummy"], -0.465213, 0.002)
check("robust G2>0", D["robust"]["g2pos"], -0.279633, 0.002)

# maths zeros
mz = mat[mat.zero_grade]
D["maths"] = dict(n=len(mat), n_zero=len(mz), n_zero_abs0=int((mz.absences == 0).sum()),
                  share0_all=r((mat.absences == 0).mean(), 3), n_zero_gp=int((mz.school == "GP").sum()),
                  n_gp=int((mat.school == "GP").sum()))

# ---------------------------------------------------------------- overlap of the two files (raw data)
KEY = ["school", "sex", "age", "address", "famsize", "Pstatus", "Medu", "Fedu", "Mjob", "Fjob", "reason",
       "nursery", "internet"]
rp = pd.read_csv(RAW / "student-por.csv", sep=";")
rm = pd.read_csv(RAW / "student-mat.csv", sep=";")
merged = rm.merge(rp, on=KEY, suffixes=("_m", "_p"))
mat_matched = rm.merge(rp[KEY].drop_duplicates(), on=KEY).shape[0]
up = rp[~rp.duplicated(KEY, keep=False)]
um = rm[~rm.duplicated(KEY, keep=False)]
pairs = um.merge(up, on=KEY, suffixes=("_m", "_p"))
same_other = float(np.mean([(pairs[c + "_m"] == pairs[c + "_p"]).mean() for c in
                            ["guardian", "traveltime", "studytime", "famrel", "freetime", "goout", "Dalc", "Walc",
                             "health", "higher", "romantic", "schoolsup", "famsup", "activities"]]))
zp = pairs[pairs.G3_m == 0]
D["overlap"] = dict(merged_rows=len(merged), mat_rows_matched=int(mat_matched), mat_share=r(mat_matched / len(rm), 3),
                    unique_pairs=len(pairs), other_attr_agreement=r(same_other, 3),
                    mat_zero_pairs=len(zp), mat_zero_pairs_por_zero=int((zp.G3_p == 0).sum()),
                    mat_zero_pairs_por_abs_pos=int((zp.absences_p > 0).sum()),
                    mat_zero_pairs_por_pass=int((zp.G3_p >= 10).sum()), mat_zero_pairs_por_G3=r(zp.G3_p.mean(), 1),
                    por_rows_matched=int(rp.merge(rm[KEY].drop_duplicates(), on=KEY).shape[0]),
                    mat_zero_any_match=int(rm[rm.G3 == 0].merge(rp[KEY].drop_duplicates(), on=KEY).shape[0]),
                    por_zero_any_match=int(rp[rp.G3 == 0].merge(rm[KEY].drop_duplicates(), on=KEY).shape[0]),
                    both_zero=int((pairs[(pairs.G3_m == 0)].G3_p == 0).sum()))
check("overlap merged rows (UCI doc says 382)", len(merged), 382, 0)

# ---------------------------------------------------------------- Student A vs B (M3, dummies, all)
typical = {}
for col in CTRL.replace("C(", "").replace(")", "").replace(" ", "").split("+"):
    col = "absences" if col == "log_abs" else col
    typical[col] = por[col].mode()[0] if por[col].dtype == object else por[col].median()
prof = pd.DataFrame({"A": dict(typical, studytime=4, absences=12, failures=1, schoolsup="no"),
                     "B": dict(typical, studytime=2, absences=2, failures=0, schoolsup="yes")}).T
prof["log_abs"] = np.log1p(prof.absences.astype(float))
for c in prof.columns:
    if c not in ["school", "sex", "address", "higher", "internet", "schoolsup", "famsup", "paid", "romantic"]:
        prof[c] = prof[c].astype(float)
md = smf.ols("G3 ~ C(studytime) + " + CTRL, por).fit(cov_type="HC3")
sf = md.get_prediction(prof).summary_frame(alpha=0.05)
p2 = prof.copy(); p2["schoolsup"] = "no"
g2 = md.predict(p2)
D["ab"] = dict(A=r(sf["mean"].iloc[0], 2), B=r(sf["mean"].iloc[1], 2), A_pi=[r(sf.obs_ci_lower.iloc[0], 1), r(sf.obs_ci_upper.iloc[0], 1)],
               B_pi=[r(sf.obs_ci_lower.iloc[1], 1), r(sf.obs_ci_upper.iloc[1], 1)],
               schoolsup=r(md.params["C(schoolsup)[T.yes]"], 2), B_lead_equal_support=r(g2.iloc[1] - g2.iloc[0], 2),
               contrib=dict(study=r(md.params["C(studytime)[T.4]"] - md.params["C(studytime)[T.2]"], 2),
                            absences=r(md.params.log_abs * (np.log(13) - np.log(3)), 2),
                            failures=r(md.params.failures, 2), support=r(-md.params["C(schoolsup)[T.yes]"], 2)))
check("A pred", D["ab"]["A"], ref_reg("profile prediction", "M3", "all", "Student A"), 0.002)
check("B pred", D["ab"]["B"], ref_reg("profile prediction", "M3", "all", "Student B"), 0.002)
check("B lead", D["ab"]["B_lead_equal_support"], 0.93, 0.006)

# ---------------------------------------------------------------- diagnostics (M3)
dg = {}
for sample, d in [("all", por), ("nz", pnz)]:
    mo = smf.ols("G3 ~ studytime + " + CTRL, d).fit()
    X, names = mo.model.exog, mo.model.exog_names
    vif = max(variance_inflation_factor(X, i) for i in range(1, X.shape[1]))
    bp = het_breuschpagan(mo.resid, X)
    reset = linear_reset(mo, power=2, use_f=True)
    cd = mo.get_influence().cooks_distance[0]
    m4 = smf.ols("G3 ~ studytime" + RUNGS["M4"], d).fit()
    bp4 = het_breuschpagan(m4.resid, m4.model.exog)
    jb = stats.jarque_bera(mo.resid)
    dg[sample] = dict(vif=r(vif, 2), bp_lm=r(bp[0], 1), bp_p=float(bp[1]), bp4_p=float(bp4[1]), reset_F=r(reset.fvalue, 1),
                      reset_p=float(reset.pvalue), cook_max=r(cd.max(), 3), cook_n=int((cd > 4 / len(d)).sum()),
                      jb_p=float(jb.pvalue))
D["diag"] = dg
# Cook's distance: refit M3 (G3 > 0) without the points above 4/n
mo = smf.ols("G3 ~ studytime + " + CTRL, pnz).fit()
cd = mo.get_influence().cooks_distance[0]
keep = pnz[cd <= 4 / len(pnz)]
mk = fit("G3 ~ studytime + " + CTRL, keep)
D["cook_refit"] = dict(n_dropped=int((cd > 4 / len(pnz)).sum()), studytime=r(mk.params.studytime), studytime_p=float(mk.pvalues.studytime),
                       log_abs=r(mk.params.log_abs), log_abs_p=float(mk.pvalues.log_abs))
check("VIF max nz", dg["nz"]["vif"], 1.989, 0.006)
check("BP p all", dg["all"]["bp_p"], 3.51e-10, 0.01, rel=True)
check("BP p nz", dg["nz"]["bp_p"], 0.2356, 0.001)
check("BP M4 p nz", dg["nz"]["bp4_p"], 0.01183, 0.01, rel=True)
check("RESET F nz", dg["nz"]["reset_F"], 17.71, 0.006)
check("Cook max nz", dg["nz"]["cook_max"], 0.0368, 0.001)

# functional form AIC (M3)
base = "G3 ~ studytime + " + CTRL.replace("log_abs + ", "")
aic = {}
for s, d in [("all", por), ("nz", pnz)]:
    aic[s] = {k: r(fit(base + " + " + t, d).aic, 1) for k, t in
              [("linear", "absences"), ("log", "log_abs"), ("quadratic", "absences + I(absences ** 2)")]}
    aic[s]["sq_p"] = r(fit(base + " + absences + I(absences ** 2)", d).pvalues["I(absences ** 2)"], 2)
D["aic"] = aic
D["abs_skew"] = r(stats.skew(por.absences), 2)

# fragile interactions (backup)
D["fragile"] = {}
for s, d in [("all", por), ("nz", pnz)]:
    m = fit("G3 ~ studytime * failures + " + CTRL.replace("failures + ", ""), d)
    a2 = sm.stats.anova_lm(smf.ols("G3 ~ C(studytime) * C(sex)", d).fit(), typ=2)
    D["fragile"][s] = dict(int_b=r(m.params["studytime:failures"], 2), int_p=r(m.pvalues["studytime:failures"], 3),
                           sex_int_p=r(a2.loc["C(studytime):C(sex)", "PR(>F)"], 3))
D["n_boys_top"] = int(((por.studytime == 4) & (por.sex == "M")).sum())

# ---------------------------------------------------------------- report and inject
bad = [c for c in CHECKS if not c[3]]
print(f"{len(CHECKS)} cross-checks against results/ and readme: {len(CHECKS) - len(bad)} pass, {len(bad)} fail")
for c in bad:
    print("  MISMATCH", c)
print("overlap:", D["overlap"])

blob = json.dumps(D, separators=(",", ":"))
if "--check" not in sys.argv and DECK.exists():
    html = DECK.read_text(encoding="utf-8")
    new, k = re.subn(r"/\*DATA-START\*/.*?/\*DATA-END\*/", lambda _: "/*DATA-START*/" + blob + "/*DATA-END*/",
                     html, flags=re.S)
    assert k == 1, "data markers not found in Story_Deck.html"
    DECK.write_text(new, encoding="utf-8")
    print("injected", len(blob), "bytes into", DECK.name)
if "--json" in sys.argv:
    Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(D, indent=1))
sys.exit(1 if bad else 0)
