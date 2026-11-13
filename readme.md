# Study Smarter, Not Harder

*(Working title. Final title to be decided by the team; options are listed in section 9. The twist section is called "The Perfect Attendance Paradox".)*

**Hook:** *Studying more goes with higher grades, but your grade history and your ambition explain far more, and the students who seemed to prove that skipping class is harmless had a final grade of 0 with zero recorded absences.*

MPBA G505 Statistics & Basic Econometrics · BITS Pilani Dubai · 10-minute group presentation · Python (pandas, scipy, statsmodels, seaborn)

**Headline:** *Effort shows up in the grades, but history dominates. Always check your zeros before you believe a regression.*

All numbers below are verified in notebooks 01-06 and saved in `results/`. The one-page summary is `presentation/executive_summary.md`; the "numbers to quote" table with sources is section 9 of notebook 06.

---

## 1. The story (case file in three mysteries)

The class already knows the methods, so we don't teach them. We show **how we got to each finding**: we suspected something, tested it, ruled out an explanation, and reached a verdict.

| Act | Mystery | What we did | Twist |
|---|---|---|---|
| 1 | Does studying pay? | Group means, ANOVA, Tukey, MANOVA | Yes: +2.38 points out of 20 from <2 h to 5-10 h a week, then a plateau |
| 2 | Does it still pay once we compare like with like? | Coefficient ladder M1-M4, ANCOVA | The effect falls +0.97, +0.45, +0.42, +0.05. History dominates; ambition beats support |
| 3 | Why does missing class barely seem to matter? | Residual plot, the zero-grade cases, before/after, maths replication | All 15 students with G3 = 0 have **zero recorded absences**. We read them as apparent dropouts. Remove them and the absence effect appears |

**Model numbering (used everywhere, defined in notebook 03).** All OLS with HC3 robust SEs:
**M1** study time only · **M2** + academic/demographic (failures, log(absences+1), sex, age, school, address, wants higher education) · **M3** + family/social/support (Medu, Fedu, goout, Dalc, Walc, freetime, health, internet, schoolsup, famsup, paid, romantic), *the main controls model* · **M4** + G1, G2.

**Terminology.** *Zero-grade cases* = the 15 students with G3 = 0 (methods, tables, code: column `zero_grade`). In the narrative we call them *apparent dropouts*; that is our interpretation of the pattern, since the dataset does not record why a final grade is 0. Every key result is reported with and without them.

### Slide-by-slide script (target 9:30)

| # | Time | Slide | Visual | What is said (core lines) |
|---|---|---|---|---|
| 1 | 0:40 | **The bet** | Two silhouettes: "<2 h/week" vs "5-10 h/week" | "Out of 20, how many points apart are these two students? Shout a number." **(audience, ≤30 s)** Write 3 guesses on the board. |
| 2 | 0:40 | **The case file** | Dataset card: 649 students, 2 Portuguese schools, 33 variables, G1 → G2 → G3 | "Portuguese-language course, Cortez 2008. Grades 0-20. Study time is a 4-level scale, not hours." |
| 3 | 1:10 | **Clue 1: effort shows up** | `presentation/fig1_study_time_gradient.png` (10.8, 12.1, 13.2, 13.1) | "Your guesses vs reality: 2.4 points (Tukey 95% CI 1.40-3.37). ANOVA F = 15.9, p < 0.001, eta² = 0.07. Levene p = 0.38, Kruskal-Wallis agrees. MANOVA on G1, G2, G3: Pillai = 0.085, p < 0.001. Note the plateau: >10 h is no better than 5-10 h (n = 35)." |
| 4 | 1:20 | **Twist 1: the shrinking coefficient** | `fig2_coefficient_ladder.png` (+0.97, +0.45, +0.42, +0.05; R² 0.06, 0.29, 0.34, 0.86) | "Add failures, school, ambition and absences and the effect halves; family and social factors barely move it; add earlier grades and it disappears. ANCOVA with G1: study time p = 0.097, partial eta² = 0.01. History dominates." One line: "G1 is partly *caused* by studying, so M4 understates effort." |
| 5 | 1:00 | **The suspect line-up** | `fig4_what_predicts_grades.png` | "The biggest single difference is ambition: students who want higher education score 3.48 points higher (d = 1.14), still +1.81 in M3. Each past failure: -1.42. Family support: no difference (p = 0.15). Extra school support is *negative* (-1.33), because struggling students are the ones who get it." Endogeneity line: "Causality can run both ways: struggling students may study more, or give up. That is a simultaneity problem we can name but cannot solve without an instrument." |
| 6 | 1:45 | **Twist 2: The Perfect Attendance Paradox** | `fig3_perfect_attendance_paradox.png` | "Absences barely mattered: -0.15, not significant, and once we added G1/G2 absences even looked *good* (+0.16, p = 0.02). Then we spotted the zeros. All 15 students with a final grade of 0 have exactly 0 recorded absences, against 38% of all students, and their G2 averaged 3.8. Perfect attendance, zero grade: they look like dropouts, though the data never says so. Remove them and the log-absence effect is -0.45 (p < 0.001). The maths file shows the same thing: all 38 zeros have 0 absences, and the effect flips from +0.98 to -0.55." |
| 7 | 1:00 | **Audience vote: Student A or B?** | Two profile cards, then `figures/10_profile_predictions.png` | A: >10 h, 12 absences, 1 failure, no extra support. B: 2-5 h, 2 absences, no failures, gets school support. "Hands up: who scores higher?" Reveal: "M3 says A 12.6, B 12.2. The hard worker with a failure wins, but only because school support carries -1.33, a selection effect. Hold support equal and B leads by 0.93. And the 95% prediction intervals run from about 7 to 18: a model predicts the average, not the person." |
| 8 | 1:00 | **Did we break any rules?** | Diagnostics scorecard (traffic lights, notebook 06 section 6) | "Max VIF 2.0, so no multicollinearity. Removing the zero-grade cases fixes heteroskedasticity in the controls model (Breusch-Pagan p from 3.5e-10 to 0.24), but not in the G1/G2 model (p = 0.012), so we use HC3 robust SEs throughout. Absences enter as log(abs+1) because they are highly skewed; linear and quadratic give the same answer, and the squared term is never significant. RESET still rejects (p = 3e-5), which we report openly; the bounded 0-20 scale is a likely cause. Autocorrelation doesn't apply to cross-sectional data." |
| 9 | 0:45 | **The verdict** | One sentence, big type, 3 icons: effort, history, check your zeros | "Effort shows up, history dominates, and absences matter once you check your zeros. For you: the best predictor of your next grade is your last one, so the time to change course is early." |
| 10 | 0:30 | **What we can't claim + thanks** | 3 limitation bullets + citation | "Observational, two schools, self-reported study time. Associations, not causes. Questions?" |
| | **9:30** | | | |

**Backup slides (only if asked):**
1. **Maths replication** (`figures/24_maths_replication.png`): 38 of 395 maths students have G3 = 0, all 38 with 0 absences (vs 29.1% of maths students). Log-absence effect in M3: **+0.98 with the zero-grade cases vs -0.55 without** (p = 0.001). The school pattern does **not** replicate: 34 of 38 are at GP, in proportion to school size (GP is 349 of 395 students; Fisher p = 1.0). So the headline is the zero absences, not the school.
2. Full regression table M1-M4 and the study-time dummies (notebook 06 section 3).
3. MANCOVA (+ failures): Pillai = 0.065, p < 0.001.
4. Interaction study time × failures (M3 controls): -0.22 (p = 0.46) on all, -0.53 (p = 0.015) on G3 > 0. Fragile: it depends on the zero-grade cases.
5. Interaction study time × sex (two-way ANOVA): p = 0.083 on all, p = 0.025 on G3 > 0. Also fragile.

---

## 2. Research questions and hypotheses

| | Question | H0 | Test | Result |
|---|---|---|---|---|
| RQ1 | Do mean final grades differ across study-time groups? | μ1 = μ2 = μ3 = μ4 | One-way ANOVA (+ Levene, Kruskal-Wallis, Tukey) | Reject (F = 15.88, p = 5.7e-10) |
| RQ2 | Does the study-time association survive controls? | β_studytime = 0 | OLS M1-M4, HC3 SEs | Survives M3 (+0.42, p = 0.001); gone in M4 (+0.05, p = 0.31) |
| RQ3 | Does study time add anything beyond earlier grades? | No study-time effect given G1 | ANCOVA; MANOVA on (G1, G2, G3) | ANCOVA p = 0.097 (all), 0.031 (G3 > 0); MANOVA rejects |
| RQ4 | Are absences associated with lower grades, and does that depend on the zero-grade cases? | β_log(abs) = 0 | OLS with and without G3 = 0; BP test | Only without them: -0.45 (p = 2e-5) vs -0.15 (p = 0.23) |
| RQ5 | Are the zero-grade cases different? | Zero grades independent of school / absences | Fisher's exact | Zero absences: yes in both files. School: yes in Portuguese (OR = 27.9, p = 3e-6), no in maths (p = 1.0) |

Central hypothesis: *study time is positively associated with G3, but much of the raw gap reflects who studies (prior achievement, aspiration, school), not studying itself.* Supported.

---

## 3. Syllabus coverage map (light touch)

| Course topic | Where it appears |
|---|---|
| Probability & distributions | G3 distribution (spike at 0 = a separate group); Q-Q plots (notebooks 01, 05) |
| Estimation & inference | 95% CIs on every coefficient; Welch t-tests; Fisher's exact test |
| ANOVA / ANCOVA | Slide 3 (ANOVA), slide 4 (ANCOVA with G1) |
| MANOVA / MANCOVA | Slide 3 (Pillai's trace); MANCOVA with `failures` (backup) |
| Simple & multiple regression | Slide 4 ladder M1-M4, slide 5 coefficient plot |
| Dummy variables | Study time as `C(studytime)`, sex, school, higher, support variables |
| Functional forms | log(absences+1) vs linear vs quadratic; RESET (slide 8) |
| Multicollinearity | VIF (slide 8) |
| Heteroskedasticity | Breusch-Pagan, White, HC3 (slides 6, 8) |
| Autocorrelation | One sentence: not applicable to cross-sectional data (slide 8) |
| Simultaneous equations | One spoken line: study time ⇄ grades, no instrument (slide 5) |

---

## 4. Project structure (seven notebooks)

```text
study-smarter-not-harder/
├── readme.md
├── pilot_analysis.py                    # quick checks used to pick the story
├── data/raw/                            # student-por.csv, student-mat.csv (read-only, SHA-256 checked)
├── data/processed/                      # cleaned copies (+ zero_grade, log_abs) and data_dictionary.csv
├── notebooks/
│   ├── 00_data_acquisition.ipynb        # download record, hashes, ranges, data dictionary, zero_grade flag
│   ├── 01_exploratory_analysis.ipynb    # distributions, group means, who studies, zero-grade profile
│   ├── 02_hypothesis_testing.ipynb      # ANOVA, Tukey, Kruskal, ANCOVA, MANOVA/MANCOVA, t, Fisher
│   ├── 03_regression_models.ipynb       # ladder M1-M4, dummies, functional form, interaction, profiles
│   ├── 04_zero_grades_and_absences.ipynb  # The Perfect Attendance Paradox, maths replication, robustness
│   ├── 05_diagnostics.ipynb             # VIF, BP/White, HC3, residuals, Cook's D, RESET, endogeneity
│   └── 06_final_results.ipynb           # assembles results/ into tables, slide figures, executive summary
├── results/        # hypothesis_tests, regression_comparison, diagnostics_scorecard, zero_grade_before_after, zero_grade_robustness (.csv)
├── figures/        # analysis figures from notebooks 01-05
└── presentation/   # fig1-fig4 slide figures, executive_summary.md
```

Setup: `pip install -r requirements.txt`. Run the notebooks in order from `notebooks/` (`python -m jupyter nbconvert --to notebook --execute --inplace <nb>`); each later notebook reads the outputs of the earlier ones.

**Core code (the paradox in a few lines)**
```python
import numpy as np, pandas as pd, statsmodels.formula.api as smf
from statsmodels.stats.diagnostic import het_breuschpagan

df = pd.read_csv("data/processed/student-por_clean.csv")      # has zero_grade and log_abs
nz = df[~df.zero_grade]
CTRL = ("failures + log_abs + C(sex) + age + C(school) + C(address) + C(higher)"           # M2 block
        " + Medu + Fedu + goout + Dalc + Walc + freetime + health + C(internet)"          # M3 block
        " + C(schoolsup) + C(famsup) + C(paid) + C(romantic)")
for label, d in [("all", df), ("G3>0", nz)]:
    m = smf.ols("G3 ~ studytime + " + CTRL, d).fit()                                     # M3
    r = smf.ols("G3 ~ studytime + " + CTRL, d).fit(cov_type="HC3")
    print(label, round(r.params["log_abs"], 3), round(r.pvalues["log_abs"], 4),
          "BP p", het_breuschpagan(m.resid, m.model.exog)[1])
```

---

## 5. Verified findings (Portuguese course, n = 649; HC3 SEs)

**Raw gradient.** Mean G3 by study time: <2 h **10.84** (n = 212), 2-5 h **12.09** (305), 5-10 h **13.23** (97), >10 h **13.06** (35). ANOVA F(3, 645) = 15.88, p = 5.7e-10, eta² = 0.069; Levene p = 0.38; Kruskal-Wallis H = 50.3, p = 7e-11. Tukey <2 h vs 5-10 h: +2.38 [1.40, 3.37]; 5-10 h vs >10 h: -0.17 (p = 0.99). MANOVA (G1, G2, G3): Pillai = 0.085, p = 1e-8; MANCOVA (+ failures): Pillai = 0.065, p = 3e-6. Girls vs boys: +0.85 [0.34, 1.36], p = 0.001.

**The coefficient ladder (study time, linear, per category step):**

| Model | All (n = 649) | R² | G3 > 0 (n = 634) | R² |
|---|---|---|---|---|
| M1 study time | **+0.97** [0.69, 1.25] | 0.06 | +0.80 [0.54, 1.05] | 0.06 |
| M2 + academic/demographic | **+0.45** [0.20, 0.70], p < 0.001 | 0.29 | +0.33 [0.10, 0.57], p = 0.005 | 0.30 |
| M3 + family/social | **+0.42** [0.17, 0.66], p = 0.001 | 0.34 | +0.31 [0.08, 0.54], p = 0.009 | 0.37 |
| M4 + G1, G2 | **+0.05** [-0.05, 0.16], p = 0.31 | 0.86 | +0.01 [-0.07, 0.10], p = 0.75 | 0.89 |

Most of the shrinkage happens at M2. **Coding caveat:** with study time as three dummies, M3 is jointly significant on all students (p = 0.005) but only **borderline without the zero-grade cases (p = 0.063)**, while the linear term is significant there (p = 0.009). Say "study time still matters after controls, but the evidence is modest".

**What else matters (slide 5).** Wanting higher education is the **largest effect**: raw gap +3.48 [2.72, 4.23], Cohen's d = 1.14; in M3 +1.81 (all) / +1.73 (G3 > 0). Past failures -1.42 per failure (M3, all). School MS -1.31. Extra school support -1.33 (selection: weak students get support). **Family support has no effect** (raw +0.39 [-0.14, 0.93], p = 0.15; M3 p = 0.89). Sex -0.48 (p = 0.06) in M3. Alcohol, going out and internet are not significant once controls are in.

**Who studies (confounding).** Share female by study-time group: 42%, 65%, 77%, 60%. Mean failures: 0.33, 0.20, 0.10, 0.06. Weekend alcohol: 2.68, 2.18, 1.85, 1.97. Wants higher education: 79%, 94%, 96%, 94%.

**ANCOVA (G3 ~ C(studytime) + G1):** study time F = 2.11, p = 0.097, partial eta² = **0.010** (all); F = 2.98, p = 0.031, partial eta² = 0.014 (G3 > 0). Corr(G1, G3) = 0.83, corr(G2, G3) = 0.92.

**The Perfect Attendance Paradox.** 15 of 649 students have G3 = 0 and **all 15 have 0 recorded absences** (vs 37.6% of all students; chance under a random draw 4e-7). Their mean G1 = 7.1, G2 = 3.8 (7 already had G2 = 0; no other student has G2 = 0). In Portuguese 14 of 15 are at MS (Fisher OR = 27.9, p = 3e-6), **but this does not replicate in maths** (34 of 38 at GP, in proportion to school size, p = 1.0), so the school is not the headline: the zero absences are. We read them as apparent dropouts; the dataset does not say what happened.

| | All (n = 649) | G3 > 0 (n = 634) |
|---|---|---|
| Pearson r(absences, G3) | -0.09 (p = 0.02) | **-0.20** (p < 1e-6) |
| log(abs+1) in M3 | -0.15 (p = 0.23) | **-0.45** (p = 2e-5) |
| log(abs+1) in M4 (+G1, G2) | **+0.16 (p = 0.02)**, a misleading sign | -0.01 (p = 0.88) |
| Breusch-Pagan on M3 | LM = 86.1, **p = 3.5e-10** | LM = 24.2, **p = 0.24** |
| Breusch-Pagan on M4 | LM = 55.0, p = 1e-4 | LM = 39.7, **p = 0.012 (still fails)** |
| Maths: log(abs+1) in M3 | **+0.98** (p = 1e-4) | **-0.55** (p = 0.001) |

Robustness: a zero-grade dummy gives -0.47 (p < 1e-4) for log absences in M3, restricting to G2 > 0 gives -0.28 (p = 0.02); the study-time ladder is unchanged under all treatments.

**Functional form of absences.** We use log(abs+1) because absences are highly skewed (skewness 2.0, long right tail). The data do not strongly prefer it: with the zero-grade cases a **linear term fits best by AIC** (M3: 3136.2 linear vs 3137.5 log vs 3138.2 quadratic); without them log fits best (ΔAIC 4.8 vs linear). The squared term is never significant (M3 p = 0.92 all, 0.10 G3 > 0), so do not call the effect "concave". All three forms give the same substantive answer.

**Diagnostics (M3, G3 > 0; full sample in brackets).** VIF max 1.99 (Walc): green. Breusch-Pagan p = 0.24: green [red]; full White p = 0.045: amber. Jarque-Bera p = 0.054: green [amber, the left tail is the zero-grade cases]. Cook's D max 0.037, dropping the 35 points above 4/n changes nothing: green. RESET (power 2) F = 17.7, p = 3e-5: amber, report openly. M4 heteroskedasticity: amber/red, HC3 handles it. Autocorrelation: not applicable.

**Student A vs Student B (slide 7).** M3 prediction, all students: A (>10 h, 12 absences, 1 failure, no support) **12.6**, B (2-5 h, 2 absences, no failures, school support) **12.2**; 95% prediction intervals 7.2-17.9 and 6.9-17.5. A's lead comes from the school-support dummy (-1.33, selection). With support held equal, **B leads by 0.93** (1.34 without the zero-grade cases). Message: a profile predicts the average, not the person.

---

## 6. Limitations

- **Observational, not causal:** study time is self-chosen and likely endogenous (reverse causality and omitted motivation), and the data contain no instrument.
- **G1/G2 are "bad controls" for effort:** they are partly outcomes of studying, so M4 understates the total effect of study time.
- **The dropout reading is inferred:** "apparent dropouts" is our interpretation of the zero-grade pattern; the dataset documentation doesn't say what happened. We report results with and without them.
- **Measurement:** study time is a coarse self-reported 4-level scale; the bounded 0-20 outcome may explain the RESET rejection.
- **Fragile results kept in backup:** the study-time dummies without zero-grade cases (p = 0.063), the study time × failures and study time × sex interactions.
- **External validity:** two Portuguese secondary schools (2005-06), one subject as the main sample, n = 35 in the top study-time group.

---

## 7. Team split and checklist

| Member | Owns | Presents |
|---|---|---|
| A: Data detective | Notebooks 00, 01, 04: zero-grade cases, Fisher tests, maths replication | Slides 1, 2, 6 |
| B: Tester | Notebook 02: ANOVA, Tukey, ANCOVA, MANOVA/MANCOVA, Welch t-tests | Slide 3 |
| C: Modeller | Notebook 03: ladder M1-M4, dummies, functional form, profiles | Slides 4, 5, 7 |
| D: Auditor + designer | Notebooks 05, 06: diagnostics, final figures, deck consistency | Slides 8, 9, 10 |

Everyone must be able to explain the ladder (slide 4) and The Perfect Attendance Paradox (slide 6) in their own words.

- [x] Download UCI zip, place CSVs in `data/raw/`, record download date and hashes (notebook 00)
- [x] Reproduce every pilot number in notebooks 01-05 (all matched)
- [x] Notebooks 00-06 built and executed; results/ and figures/ populated
- [x] Slide figures in `presentation/` (fig1-fig4); executive summary written
- [ ] Choose the final title (section 9)
- [ ] Build the deck from `presentation/` figures and the notebook 06 "numbers to quote" table only
- [ ] Prepare the backup slides (maths replication, full table, MANCOVA, interactions)
- [ ] Write the autocorrelation sentence and the simultaneity line into the speaker notes
- [ ] Two timed rehearsals at ≤ 9:30, including the opening bet and the A/B vote
- [ ] Add the dataset citation to the final slide and the report

---

## 8. Citation

Cortez, P. (2008). *Student Performance* [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T. Licensed CC BY 4.0.

Original study: Cortez, P., & Silva, A. (2008). Using data mining to predict secondary school student performance. In *Proceedings of the 5th Future Business Technology Conference (FUBUTEC 2008)*, pp. 5-12. EUROSIS.

---

## 9. Final title options (grounded in the verified results)

1. **Study Smarter, Not Harder: What Really Predicts Your Final Grade** (keeps the working title; the plateau above 5-10 h and the shrinking coefficient support it).
2. **History Dominates: Effort, Ambition and The Perfect Attendance Paradox** (ladder +0.97 → +0.05; higher-education ambition d = 1.14; zero-grade cases with zero absences).
3. **Check Your Zeros: How 15 Students Hid the Cost of Missing Class** (log-absence effect -0.15 n.s. → -0.45, replicated in maths +0.98 → -0.55).
