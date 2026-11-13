"""Pilot analysis - UCI Student Performance (Cortez 2008, DOI 10.24432/C5TG7T).

Quick, preliminary checks used to choose the story for the presentation.
Every number here must be re-verified in the notebooks.

Usage:
    python pilot_analysis.py path/to/folder_with_student-por.csv
(the folder must contain student-por.csv and student-mat.csv, ';'-separated,
 from https://archive.ics.uci.edu/dataset/320/student-performance)
"""
import sys
import warnings

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import stats
from statsmodels.multivariate.manova import MANOVA
from statsmodels.stats.diagnostic import het_breuschpagan, linear_reset
from statsmodels.stats.outliers_influence import variance_inflation_factor

warnings.filterwarnings("ignore")
DATA = sys.argv[1] if len(sys.argv) > 1 else "data/raw"

por = pd.read_csv(f"{DATA}/student-por.csv", sep=";")
mat = pd.read_csv(f"{DATA}/student-mat.csv", sep=";")
por["log_abs"] = np.log1p(por["absences"])
por["zero"] = por["G3"] == 0
nz = por[~por["zero"]].copy()

CONTROLS = ("failures + log_abs + C(sex) + C(school) + C(higher) + age + Medu + Fedu"
            " + goout + Dalc + Walc + freetime + health + C(internet) + C(schoolsup)"
            " + C(famsup) + C(paid) + C(romantic) + C(address)")


def coef(m, k):
    lo, hi = m.conf_int().loc[k]
    return f"{m.params[k]:+.3f} [{lo:+.2f}, {hi:+.2f}] p={m.pvalues[k]:.4f}"


def section(t):
    print(f"\n=== {t} ===")


# 1. Zero-grade cases: G3 == 0
section("1. Zero final grades")
for name, df in [("por", por), ("mat", mat)]:
    z = df[df["G3"] == 0]
    print(f"{name}: n={len(df)}, G3==0: {len(z)}, of which absences==0: {(z['absences'] == 0).sum()}, "
          f"mean G1={z['G1'].mean():.1f}, mean G2={z['G2'].mean():.1f}")
print("por zeros by school:", por[por.zero].school.value_counts().to_dict(),
      "| school sizes:", por.school.value_counts().to_dict())
print("por share with absences==0 (all students):", round((por.absences == 0).mean(), 3))
print("Fisher exact, zeros by school:", stats.fisher_exact(pd.crosstab(por.school, por.zero)))
print("Welch t, G3 girls vs boys:", stats.ttest_ind(por[por.sex == "F"].G3, por[por.sex == "M"].G3, equal_var=False))

# 2. Raw study-time gradient + tests
section("2. Study time vs G3 (raw)")
print(por.groupby("studytime")["G3"].agg(["count", "mean", "std"]).round(2))
groups = [g["G3"] for _, g in por.groupby("studytime")]
print("one-way ANOVA:", stats.f_oneway(*groups))
print("Levene:", stats.levene(*groups))
print("Kruskal-Wallis:", stats.kruskal(*groups))

# 3. The shrinking coefficient (HC3 robust SEs), with and without zeros
section("3. Study-time coefficient across specifications (HC3)")
for label, d in [("all n=649", por), ("G3>0 n=634", nz)]:
    m1 = smf.ols("G3 ~ studytime", d).fit(cov_type="HC3")
    m2 = smf.ols("G3 ~ studytime + " + CONTROLS, d).fit(cov_type="HC3")
    m3 = smf.ols("G3 ~ studytime + " + CONTROLS + " + G1 + G2", d).fit(cov_type="HC3")
    print(label)
    print(f"  M1 raw          studytime {coef(m1, 'studytime')}  R2={m1.rsquared:.3f}")
    print(f"  M2 +controls    studytime {coef(m2, 'studytime')}  R2={m2.rsquared:.3f}")
    print(f"  M3 +G1,G2       studytime {coef(m3, 'studytime')}  R2={m3.rsquared:.3f}")
    print(f"  M2 failures {coef(m2, 'failures')} | log_abs {coef(m2, 'log_abs')}")
    print(f"  M2 higher=yes {coef(m2, 'C(higher)[T.yes]')} | school=MS {coef(m2, 'C(school)[T.MS]')}")
    print(f"  M3 log_abs {coef(m3, 'log_abs')}")

# 4. Absences: the effect the zeros were hiding
section("4. Absences vs G3")
for label, d in [("all", por), ("G3>0", nz)]:
    print(label, "pearson", stats.pearsonr(d.absences, d.G3), "spearman", stats.spearmanr(d.absences, d.G3))
    print("   log(abs+1) slope", coef(smf.ols("G3 ~ log_abs", d).fit(cov_type="HC3"), "log_abs"))

# 5. ANCOVA and MANOVA
section("5. ANCOVA G3 ~ C(studytime) + G1  and  MANOVA (G1,G2,G3) ~ C(studytime)")
for label, d in [("all", por), ("G3>0", nz)]:
    a = sm.stats.anova_lm(smf.ols("G3 ~ C(studytime) + G1", d).fit(), typ=2)
    pe2 = a.loc["C(studytime)", "sum_sq"] / (a.loc["C(studytime)", "sum_sq"] + a.loc["Residual", "sum_sq"])
    print(f"{label}: studytime F={a.loc['C(studytime)', 'F']:.2f} p={a.loc['C(studytime)', 'PR(>F)']:.4f} "
          f"partial eta2={pe2:.3f}; G1 F={a.loc['G1', 'F']:.0f}")
    mv = MANOVA.from_formula("G1 + G2 + G3 ~ C(studytime)", d).mv_test().results["C(studytime)"]["stat"]
    print("   Pillai:", mv.loc["Pillai's trace"].to_dict())
    mc = MANOVA.from_formula("G1 + G2 + G3 ~ C(studytime) + failures", d).mv_test().results["C(studytime)"]["stat"]
    print("   MANCOVA (+failures) Pillai:", mc.loc["Pillai's trace"].to_dict())

# 6. Diagnostics on M2
section("6. Diagnostics on M2 (OLS)")
for label, d in [("all", por), ("G3>0", nz)]:
    m = smf.ols("G3 ~ studytime + " + CONTROLS, d).fit()
    bp = het_breuschpagan(m.resid, m.model.exog)
    X, names = m.model.exog, m.model.exog_names
    vifs = sorted(((names[i], variance_inflation_factor(X, i)) for i in range(1, X.shape[1])), key=lambda t: -t[1])
    print(f"{label}: BP LM={bp[0]:.1f} p={bp[1]:.2e} | RESET {linear_reset(m, power=2, use_f=True)} | "
          f"max VIF {vifs[0][0]}={vifs[0][1]:.2f}")

# 7. Who studies? (confounding / Simpson check)
section("7. Who studies more?")
print(por.groupby("studytime").agg(share_female=("sex", lambda s: (s == "F").mean()),
                                   failures=("failures", "mean"), Walc=("Walc", "mean"),
                                   absences=("absences", "mean")).round(2))
print(por.groupby(["sex", "studytime"])["G3"].agg(["count", "mean"]).round(2))

# 8. Interactions (fragile, exploratory)
section("8. Interactions (exploratory)")
for label, d in [("all", por), ("G3>0", nz)]:
    m = smf.ols("G3 ~ studytime * failures + log_abs + C(sex) + C(school)", d).fit(cov_type="HC3")
    print(f"{label}: studytime:failures {coef(m, 'studytime:failures')}")

# 9. Maths file, quick look only
section("9. Maths file (context only)")
print(mat.groupby("studytime")["G3"].agg(["count", "mean"]).round(2))
