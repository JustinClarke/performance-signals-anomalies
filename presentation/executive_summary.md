# Study Smarter, Not Harder: executive summary
*MPBA G505 group project · working title · data: Cortez (2008), UCI Student Performance, CC BY 4.0*

**Question.** Does studying more pay off in final grades, and does that survive a fair comparison?
**Data.** 649 students in a Portuguese-language course at two schools (G3 = final grade, 0-20); the
maths file (395 students) is used as a replication. Models M1-M4 are nested OLS with HC3 robust SEs:
M1 study time only; M2 + academic/demographic; M3 + family/social (main model); M4 + earlier grades G1, G2.

**1. Effort shows up.** Mean G3 rises from 10.8 (<2 h/week) to 13.2
(5-10 h), a gap of 2.38 points (95% CI 1.40-3.37); ANOVA F(3, 645) = 15.88, p = 5.7e-10, eta² = 0.069.
Beyond 10 h there is no further gain (13.1, n = 35).

**2. History dominates.** The study-time coefficient falls +0.97 -> +0.45 -> +0.42 -> +0.05 from M1 to M4
while R² rises 0.06 -> 0.29 -> 0.34 -> 0.86. Most of the drop comes from failures, school, ambition and absences (M2).
Without the zero-grade cases the M3 linear term is significant (p = 0.009) but the
study-time dummies are only jointly borderline (p = 0.063).

**3. Ambition beats support.** Wanting higher education is the largest single difference
(+3.48 [+2.72, +4.23], d = 1.14; +1.81 in M3). Each past failure goes with
-1.42 points in M3. Family support shows no difference
(mean diff +0.39 [-0.14, +0.93], p = 0.15); extra school support is negative (-1.33),
which reflects who receives it (selection), not harm.

**4. The Perfect Attendance Paradox.** All 15 students with G3 = 0 have **zero recorded absences**
(vs 37.6% of all students), and all 38 in maths do too. We read them as apparent
dropouts; that is our interpretation, the dataset does not say. With them included, absences look harmless
(M3: -0.15, p = 0.23) or even helpful
(M4: +0.16, p = 0.02); without them the
log-absence effect is -0.45 (p < 0.001). Maths replicates it
(+0.98 with vs -0.55 without). The school concentration does
**not** replicate (Portuguese: 14 of 15 at MS; maths: 34 of 38 at GP,
in proportion to school size).

**5. Diagnostics.** No multicollinearity (max VIF 1.99). Removing the zero-grade
cases fixes heteroskedasticity in M3 (Breusch-Pagan p 3.5e-10 -> 0.24) but not in M4
(p = 0.012); HC3 SEs are used throughout. RESET still rejects (p = 3e-05), likely the bounded
0-20 scale. log(absences+1) is used because absences are highly skewed (skewness 2.0); with the zero-grade
cases a linear term fits best by AIC and the squared term is never significant.

**6. A profile predicts the average, not the person.** A (>10 h, 12 absences, 1 failure, no support) vs
B (2-5 h, 2 absences, no failures, school support): M3 predicts 12.6 (7.2-17.9) vs 12.2 (6.9-17.5).
A edges ahead only because of the school-support selection effect; with support equal, B leads by 0.93.

**Verdict.** Effort shows up, history dominates, and absences matter once you check your zeros.
**Limits.** Observational (study time is self-chosen and probably endogenous; no instrument); G1/G2 are partly outcomes
of studying, so M4 understates effort; two schools, 2005-06; self-reported 4-level study time.
