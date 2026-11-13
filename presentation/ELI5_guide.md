# Study Smarter, Not Harder: the ELI5 guide

*Written for: a classmate who wants to understand every step without the maths. Every number here was recomputed from `data/raw/student-por.csv`, or is copied from `results/`.*

---

## 0. The big picture in one picture

```
 RAW DATA (649 students)
    │
    ▼
 CLASSIFY each column  ──►  "is this a category, a count, a number, a yes/no?"
    │
    ▼
 TEST GROUPS            ──►  "do grades differ between study-time groups?"  (ANOVA, Tukey, ...)
    │
    ▼
 DRAW A LINE            ──►  "how much does each extra study bracket add?"  (regression, M1-M4)
    │
    ▼
 CHECK THE RULES        ──►  "did the line cheat?"  (VIF, Breusch-Pagan, RESET, Cook's D, ...)
    │
    ▼
 INVESTIGATE WEIRDNESS  ──►  "why do absences look good?"  → the 15 zeros
    │
    ▼
 VERDICT                ──►  "effort shows up, history dominates, check your zeros"
```

Think of it as a detective story. Every algorithm answers one small question about the same 649 students.

---

## 1. Step 0: Classify the data (what kind of thing is each column?)

Before you pick a test, you need to know what kind of number you're holding. Using the wrong test for a column is like measuring temperature with a ruler.

```
COLUMN TYPE           EXAMPLE COLUMN          WHAT IT LOOKS LIKE          HOW WE USE IT
──────────────────    ────────────────────    ─────────────────────────   ──────────────────────────────
Number (grade)        G3 (final grade)        0, 7, 12, 19 …              The thing we explain (outcome)
Ordered category      studytime               1 = <2h, 2 = 2-5h,          Number of steps; gaps may
                                              3 = 5-10h, 4 = >10h         not be equal
Count (skewed)        absences                0, 0, 2, 5, 32 …            Log-transform (see §9)
Named category        school (GP / MS)        "GP", "MS"                  Dummy: 0 or 1
Yes / no              higher (wants uni?)     "yes", "no"                 Dummy: 0 or 1
```

**Key trap:** `studytime` is a box the student ticked, **not hours**. So "one bracket = +0.42 points" is an assumption that the steps are evenly spaced.

**What is a dummy variable?** A 0/1 switch. "Is this student a girl?" becomes `sex_F = 1` for girls and `0` for boys. A 4-level category needs 3 switches, with one level as the baseline.

```
studytime  → dummy switches (baseline = <2h)
  <2h      →  0  0  0
  2-5h     →  1  0  0
  5-10h    →  0  1  0
  >10h     →  0  0  1
```

---

## 2. Step 1: Two derived columns the analysis creates

```
zero_grade  = 1 if G3 == 0, else 0      →  15 students (the "zeros")
log_abs     = log(absences + 1)         →  turns  0 1 2 5 10 32
                                              into  0.00 0.69 1.10 1.79 2.40 3.50
```

**Why +1?** `log(0)` is undefined, and 244 students have zero absences. Adding 1 keeps them in.

**Why log?** Absences are skewed: most students have a few, a handful have 20+. A log squashes the long tail so one student with 32 absences doesn't drag the line around.

```
absences:   0   1   2   3   5   10   20   32
             ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
                       ↓ log(x+1)
log_abs:    0  0.69 1.10 1.39 1.79 2.40 3.04 3.50
            ▌  ▌  ▌  ▌  ▌  ▌  ▌  ▌     (evenly spread, long tail squashed)
```

---

## 3. Algorithm A: The average (mean) and the confidence interval

**Question:** what is a typical grade for each study group?

**What it does:** add up the grades in a group, divide by the count.

```
Group <2h   grades: 10, 11, 12, … (212 students)
                    sum ÷ 212  =  10.84
```

**Confidence interval (the wiggle room):** "we're fairly sure the true average is in here."

```
           10.84
  ├───────────●───────────┤
 ~10.2                  ~11.5    ← 95% CI: the plausible range for the true mean
```

Narrower bar = more students = more certainty. The 35-student top group has a wide bar for this reason.

---

## 4. Algorithm B: ANOVA (are the group averages really different?)

**Question:** are the four study-group averages (10.84, 12.09, 13.23, 13.06) different, or is it just random shuffling?

**Core idea:** split the total wobble in grades into two piles.

```
TOTAL WOBBLE  = BETWEEN-GROUP wobble + WITHIN-GROUP wobble
(all grades)    (are the group averages far apart?)   (how scattered are students inside each group?)

REAL NUMBERS (649 students):
  Grand average        = 11.91
  Between-group pile   SSB = 465.1      ← "how far are group averages from 11.91?"
  Within-group pile    SSW = 6298.2     ← "how scattered are grades inside each group?"
```

**The F-ratio:** compare "between per group" to "within per student".

```
F = (SSB / df_between) / (SSW / df_within)
  = (465.1 / 3) / (6298.2 / 645)
  = 155.0 / 9.76
  = 15.9                ← big F means group differences stand out from noise
```

**How big is the effect?** `eta² = SSB / (SSB + SSW) = 465 / 6763 = 0.069`. So study time explains about **7%** of the grade variation. The other 93% is everything else.

**Visual:**

```
Within-group noise (large) ──────────────────────────────────────────
  <2h    ●●●●●●●●●●  ─ 10.84
  2-5h   ●●●●●●●●●●  ─ 12.09   ← group averages sit apart
  5-10h  ●●●●●●●●●●  ─ 13.23      relative to the spread inside groups
  >10h   ●●●●●●●●●●  ─ 13.06
```

If the gaps between the dash marks were small compared with the spread of the dots, F would be small.

---

## 5. Algorithm C: Levene's test (are the spreads equal?)

**Why it's needed:** ANOVA assumes each group has roughly the same scatter.

**How it works:** for each student, measure the distance from their group's centre. Then run ANOVA on those distances. If the distances are similar across groups, the spreads are similar.

**Result:** p = 0.38. Large p = no evidence the spreads differ, so ANOVA is fine.

---

## 6. Algorithm D: Kruskal-Wallis (the "no-maths" backup)

**Question:** same as ANOVA, but without assuming a bell curve.

**How it works:** replace every grade by its **rank** (1st lowest … 649th highest). Then compare the average rank per group.

```
Grades:   7   10   12   14   18   19
Ranks:    1    2    3    4    5    6   ← only the order matters now
```

**Result:** H = 50.3, p < 0.001. Same conclusion as ANOVA, so the answer doesn't depend on the bell-curve assumption.

---

## 7. Algorithm E: Tukey HSD (which pairs actually differ?)

**Problem:** ANOVA says "somewhere, groups differ". To find which pair, you'd compare all 6 pairs. Each comparison risks a false alarm, so the bar must be higher.

**How it works:** for each pair, compute the difference in averages, then compare it to a bar that is widened to allow for all 6 comparisons.

```
PAIR                    DIFFERENCE    95% CI             VERDICT
<2h vs 2-5h             +1.25         [0.53, 1.97]        differ
<2h vs 5-10h            +2.38         [1.40, 3.37]        differ  ← the headline
<2h vs >10h             +2.21         [0.74, 3.68]        differ
2-5h vs 5-10h           +1.14         [0.20, 2.07]        differ
2-5h vs >10h            +0.97         [-0.47, 2.40]       not sure
5-10h vs >10h           -0.17         [-1.76, 1.42]       no difference (p = 0.99)
```

**Read the CI:** if the interval doesn't cross zero, the difference is real.

**The plateau:** 5-10h and >10h are the same. That's why the story says "more study stops helping after about 5-10 hours".

---

## 8. Algorithm F: ANCOVA (compare groups *after* holding a covariate fixed)

**Question:** after you account for the **first-period grade (G1)**, does study time still matter?

**Idea:** first let G1 explain as much of G3 as it can. Then look at whatever is left over and ask whether study group explains it.

```
Step 1:  G3 ≈ a + b × G1          ← G1 explains a lot (corr 0.83)
Step 2:  leftovers = G3 − predicted from G1
Step 3:  do study groups explain the leftovers?
            → F = 2.11, p = 0.097  (not quite significant)
            → partial eta² = 0.010  (tiny)
```

**Takeaway:** past grades carry most of the information. Study time adds little on top.

---

## 9. Algorithm G: MANOVA (three grades at once)

**Question:** do study groups differ across **all three grades together** (G1, G2, G3)?

**Idea:** instead of testing one grade at a time, treat each student as a point in 3-D (G1, G2, G3) and ask whether the group clouds sit in different places. (The maths uses matrices and eigenvalues. You only need the summary number.)

**Result:** Pillai's trace = 0.085, p < 0.001.
- Pillai's trace runs from 0 to 1. Near 0 = groups look alike, near 1 = very different.
- 0.085 is a small effect, but with 649 students it's still clearly not chance.

---

## 10. Algorithm H: OLS regression (the line-drawer)

This is the heart of the project. Everything from M1 to M4 is OLS.

**Question:** what straight line best predicts G3 from study time?

**How it works (the picture):**

```
  G3
  20 ┤                                   each dot = one student
     │         ·     ·
  15 ┤     ·  ·  ·  ·  ·  ·             OLS draws the line that makes
     │  ·  · ·   ·  ·                    the sum of squared vertical gaps
  10 ┤ ·  ·   ·   ·                      (the "residuals") as small as possible
     │ ·  ·                  
   5 ┤
     └────────────────────────── studytime (1 → 4)
          1      2     3     4

  Residual = actual G3 − predicted G3   (the vertical gap)
  OLS minimises:  Σ (residual)²
```

**Why squared?** So positives and negatives don't cancel out, and big misses count more than small ones.

**The answer, in one formula:**

```
slope β = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²
```

**A toy example you can do by hand** (the four group averages as points, unweighted):

```
x (study group):  1      2      3      4
y (mean G3):     10.84  12.09  13.23  13.06

x̄ = 2.5,  ȳ = 12.55
Σ(x−x̄)(y−ȳ) = 3.90      Σ(x−x̄)² = 5.00
slope = 3.90 / 5.00 = 0.78   ← each bracket adds about 0.78 points
intercept = 12.55 − 0.78 × 2.5 = 10.60
```

On all 649 students (not the four averages), the same calculation gives **+0.97** for M1. The difference is because the individual-student calculation weights bigger groups more.

**Reading the output:**
- **Coefficient** = the slope for that variable, holding the others fixed.
- **p-value** = how surprising the slope would be if the true slope were zero.
- **95% CI** = plausible range for the slope.
- **R²** = share of grade variation the line explains.

---

## 11. The model ladder M1 → M4 (what happens when you add controls)

Each rung adds variables. Watch the study-time slope.

```
RUNG   ADDED VARIABLES                                              STUDY SLOPE   R²
────   ───────────────────────────────────────────────────────     ───────────   ────
M1     study time only                                              +0.97       0.06
M2     + failures, log(absences), sex, age, school, address,       +0.45       0.29
       wants higher ed                                  ← biggest drop
M3     + 12 family/social variables  (MAIN MODEL)                  +0.42       0.34
M4     + G1, G2 (earlier grades)                                   +0.05       0.86
```

**The picture of what's happening (omitted-variable bias):**

```
 Study time looks powerful in M1 because it's tangled up with other things:
 
   Who studies?  ─┬─►  more girls, fewer failures, more ambition
                  │
                  └─►  higher grades (for reasons other than studying)

 M1 credits ALL of that to study time.  Each rung hands back what really belonged to something else.

 M4 gets close to zero because G1 and G2 are partly CAUSED by studying.
 Controlling for them removes the very effect we want ("bad control").
```

**Which rung do we trust?** M3. It controls for who studies without swallowing the effect via earlier grades.

---

## 12. Algorithm I: Dummy variables inside the regression

Categories (school, sex, yes/no answers) are fed in as 0/1 switches. The coefficient reads as "the change when the switch is on".

```
Ambition (wants higher ed) → coefficient +1.81 (M3)
   meaning: students who want uni score 1.81 points higher,
            holding everything else in M3 fixed.

Past failures → coefficient -1.42 per failure
   meaning: each past failure is linked to 1.42 fewer points.
```

**Why school support is negative (-1.33):** weak students are the ones who get extra help. The model sees "has help → lower grade" but the real story is "struggling → gets help". That's **selection**.

---

## 13. Algorithm J: HC3 robust standard errors (the honest wiggle room)

**Problem:** OLS's usual "wiggle room" (standard error) assumes every student's wobble is equally big. Here it isn't (students with extreme study patterns wobble more).

**What HC3 does:** instead of one average wobble, it measures each student's own squared residual, and corrects for how much that student pulls the line (leverage).

```
Usual SE:      assumes  every student's wobble = same
HC3 robust SE: uses     each student's own wobble
               divided by (1 − leverage)²        ← the correction
               so high-leverage students aren't unfairly trusted
```

**Why we use it everywhere:** it's safe whether or not the wobble is equal. Our HC3 SEs differ from the usual ones by 0.90-1.12x, so significance rarely changes.

---

## 14. Algorithm K: R² (how much does the line explain?)

```
R² = 1 − (leftover scatter after the line) / (total scatter around the mean)

M1: R² = 0.06   → study time alone explains 6% of grade variation
M3: R² = 0.34   → controls explain 34%
M4: R² = 0.86   → earlier grades explain 86% (G3 ≈ G2 almost by definition)
```

**Caution:** R² goes up when you add anything, even noise. That's why we compare with AIC (§17), not R² alone.

---

## 15. Diagnostic algorithms: did the line cheat?

Each test asks: "is the line's maths trustworthy?"

### 15a. VIF (variance inflation factor): is one predictor a copy of another?

```
For predictor j:  regress it on all the OTHER predictors → get R²_j
                  VIF_j = 1 / (1 − R²_j)

Example: R²_j = 0.50  →  VIF = 1 / 0.50 = 2.0
Rule of thumb: VIF > 5 (or 10) = trouble.
Our max = 1.99 (weekend alcohol). Pass.
```

### 15b. Breusch-Pagan: does the wobble get bigger for some students?

```
Step 1: fit the model, get residuals e
Step 2: square them, e²
Step 3: regress e² on the predictors
Step 4: LM = n × R²(step 3)   → compare to a chi-square table

Result on all 649: LM = 86.1, p = 3.5e-10  → wobble depends on predictors → FAIL
Result without zeros: LM = 24.2, p = 0.24  → no evidence → PASS
```

**Lesson:** the 15 zeros were making the wobble look uneven. Remove them and the problem disappears in M3.

### 15c. RESET: is the shape of the line wrong?

```
Step 1: fit the model, get predicted values ŷ
Step 2: add ŷ² and ŷ³ as extra predictors
Step 3: does the extra stuff improve the fit? (F-test)

Result: F = 17.7, p = 3e-5  → the straight line is not quite the right shape → FLAG
Likely cause: grades are capped at 0 and 20, so a straight line can't be exact.
```

### 15d. Cook's distance: does one student drive the whole result?

```
For each student i:  D_i = how much ALL predictions move if student i is removed

Rule:  D_i > 4/n  → worth a look
       D_i > 1    → serious

Max D (without zeros) = 0.037  → nobody drives the result. PASS.
```

### 15e. Jarque-Bera: are the leftovers bell-shaped?

```
JB = (n/6) × [ skew² + (kurtosis − 3)² / 4 ]

Without zeros: skew 0.05, kurtosis 3.46
JB = (634/6) × [0.05² + (0.46)²/4] = 105.7 × 0.0554 = 5.85  → p = 0.054 → PASS (borderline)

With zeros: skew −0.90 → the long left tail is the 15 zeros.
```

### 15f. Autocorrelation: not applicable

Autocorrelation checks whether one row's leftover predicts the next row's. That only makes sense for data with a time order. These students are a snapshot, so the test doesn't apply.

---

## 16. Algorithm L: AIC (which functional form fits best?)

**Question:** should absences enter as log, linear, or quadratic?

**How it works:**

```
AIC = 2k − 2 × ln(likelihood)
  k = number of parameters     (penalises extra variables)
  Lower AIC = better trade-off between fit and complexity
```

**Our numbers (M3, all students):**

```
linear:     3136.2   ← best
log:        3137.5
quadratic:  3138.2
```

The gaps are about one point, so there's no real preference. Without the zeros, log wins by 4.8. So: all three forms give the same story, and log is chosen for the skew, not because it's clearly better.

---

## 17. Algorithm M: Fisher's exact test (the hypergeometric draw)

**Question:** is it a fluke that all 15 zero-grade students have zero absences?

**The picture:** imagine a jar with 649 students. 244 have "zero absences" (the white balls) and 405 don't (the black balls). Draw 15 at random without putting any back. What's the chance all 15 are white?

```
P = C(244, 15) / C(649, 15)
  = (ways to pick 15 from the 244 white) / (ways to pick 15 from all 649)
  = 3.2 × 10⁻⁷
  ≈ 3 in 10 million
```

**Interpretation:** it would be extremely unlikely to see this by chance, so the zeros and absences are linked in the data.

---

## 18. Algorithm N: Log and the "cost of 10 absences"

The simple fit says the slope on log(absences + 1) is −0.246 for all students and −0.594 for students who passed (G3 > 0).

```
Cost of going from 0 to 10 absences = slope × log(10 + 1)
                                    = slope × log(11)
                                    = slope × 2.40

All students:       −0.246 × 2.40 = −0.59   ≈ 0.6 points
Without the zeros:  −0.594 × 2.40 = −1.42   ≈ 1.4 points
```

This is why the deck says the cost "goes from 0.6 to 1.4 points" when the 15 are removed.

---

## 19. Algorithm O: Prediction interval (the Student A vs B reveal)

**Question:** what score should we predict for one specific student?

**Two sources of uncertainty:**
1. How uncertain is the **average** line? (narrow)
2. How much do **individual** students scatter around the line? (wide)

```
Prediction interval ≈ predicted value ± t × √( scatter² + uncertainty-of-line² )
```

**Result:** A predicted 12.6, B predicted 12.2, with 95% intervals of about **7 to 18**. The model predicts the average student well. It's bad at predicting one person.

---

## 20. How the whole pipeline produces the slide numbers

```
data/raw/student-por.csv  (read-only, checked by SHA-256)
   │
   ▼  notebook 00: classify columns, add zero_grade and log_abs
data/processed/student-por_clean.csv
   │
   ▼  notebook 01: look at distributions, group means
   ▼  notebook 02: ANOVA, Kruskal, Tukey, ANCOVA, MANOVA, t-tests
   ▼  notebook 03: OLS ladder M1-M4, dummies, interactions, profiles
   ▼  notebook 04: zeros, absences, maths replication
   ▼  notebook 05: VIF, Breusch-Pagan, RESET, Cook's D, Jarque-Bera
   ▼  notebook 06: collect everything into results/*.csv
   │
   ▼
results/*.csv  (single source of truth)
   │
   ▼  build_story_deck_data.py  (69 cross-checks against results/)
   ▼
presentation/Story_Deck.html  (every slide number)
```

**Rule of the project:** a slide number must trace back to a CSV row. If it doesn't, it's wrong.

---

## 21. Cheat sheet: one line per algorithm

| Algorithm | Question it answers | One-line how | Key number |
|---|---|---|---|
| Mean + CI | What's typical? | Average, plus wiggle room | 10.84 for <2h |
| ANOVA | Do group averages differ? | Between-pile ÷ within-pile | F = 15.9 |
| Levene | Are spreads equal? | ANOVA on distances from group centre | p = 0.38 |
| Kruskal-Wallis | Same, no bell curve needed | ANOVA on ranks | H = 50.3 |
| Tukey HSD | Which pairs differ? | Pairwise differences with a wider bar | +2.38 [1.40, 3.37] |
| ANCOVA | Study time after G1? | Remove G1 effect, test leftovers | p = 0.097 |
| MANOVA | Groups differ on all 3 grades? | Test on 3-D clouds (Pillai) | 0.085 |
| OLS | Best straight line? | Minimise squared gaps | +0.97 → +0.42 |
| Dummies | How do categories enter? | 0/1 switches | +1.81 higher ed |
| HC3 | Honest wiggle room? | Each student's own wobble, corrected | SE ratio 0.90-1.12 |
| R² | How much explained? | 1 − leftover ÷ total | 0.06 → 0.34 |
| VIF | Predictors copying each other? | 1 ÷ (1 − R²) | max 1.99 |
| Breusch-Pagan | Uneven wobble? | Regress e² on predictors | p 3.5e-10 → 0.24 |
| RESET | Wrong shape? | Add ŷ², ŷ³, F-test | p = 3e-5 (flag) |
| Cook's D | One student drives it? | Remove each student, see the move | max 0.037 |
| Jarque-Bera | Bell-shaped leftovers? | Skew and kurtosis | p = 0.054 |
| AIC | Which form fits best? | Fit minus complexity penalty | 3136 vs 3137 |
| Fisher / hypergeometric | Is this a fluke? | Draw without replacement | p = 3.2e-7 |
| Prediction interval | Range for one student | Line wiggle + person wiggle | 7 to 18 |

---

## 22. Five sentences to say out loud

1. The averages are different, and ANOVA says it's not chance. Study time explains about 7% of the spread.
2. Tukey says the real gap is 2.4 points between the lowest and the 5-10h group, and there's no extra gain beyond 5-10h.
3. Regression draws the best line through the students and shows the study-time slope shrinks once we control for who studies.
4. The diagnostics say the line is mostly trustworthy, except that the straight-line shape is slightly off and that's reported.
5. The 15 zero-grade students have zero absences, which is a 3-in-10-million fluke. Remove them and the absence effect becomes clear.
