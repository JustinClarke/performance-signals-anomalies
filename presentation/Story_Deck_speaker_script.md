# Story Deck: speaker script (9:30)

Deck: `presentation/Story_Deck.html`. Open it in Chrome, Edge or Safari and press **F** for fullscreen. Press **N** to show these notes under the slide (a clock starts at the first click; click the clock to reset it). Every number on the slides is computed by `presentation/build_story_deck_data.py` and cross-checked against `results/*.csv` (69 checks).

**Keys:** → / Space / PgDn next · ← / PgUp back · **N** notes · **O** overview · **F** fullscreen · **T** light/dark (use light in a bright room) · **B** backups (Esc returns) · **[ ]** set the class guess on slide 1 · click a student card on slide 11 to count a hand · **?** key hints. Clicking the left 28% of the screen goes back; clicking anywhere else goes forward.

**Speakers:** 1 = slides 1-4 (2:20) · 2 = slides 5-6 (1:55) · 3 = slides 7-10 (2:55) · 4 = slides 11-14 (2:20). Rebalance once the real team is known; slide 8 is the peak and should go to the strongest speaker.

**Arc:** a curiosity gap (the bet) → Act 1, effort shows up → a suspicious detail → Act 2, the shrinking coefficient → Act 3, the Perfect Attendance Paradox (peak) → audit and limits → verdict (end).

| # | Time | Cum. | Slide (assertion) | Clicks | Concept link |
|---|---|---|---|---|---|
| 1 | 0:35 | 0:35 | The bet: how many points apart? | 0 | Curiosity gap; prediction |
| 2 | 0:25 | 1:00 | 649 students, three grades, one self-reported bracket | 0 | Data types; observational design |
| 3 | 0:50 | 1:50 | Effort shows up: +2.38 points | 2 | ANOVA, Tukey HSD, Levene, Kruskal-Wallis, MANOVA |
| 4 | 0:30 | 2:20 | The students who study more were already different | 1 | Confounding, omitted-variable bias |
| 5 | 1:10 | 3:30 | Fair comparisons shrink the effect, +0.97 to +0.05 | 3 | Multiple OLS, HC3, ANCOVA, bad controls |
| 6 | 0:45 | 4:15 | Ambition and failures outweigh an extra bracket | 1 | Dummy variables, endogeneity, simultaneity |
| 7 | 0:30 | 4:45 | Missing class looks almost harmless | 1 | Functional form; implausible signs as a diagnostic |
| 8 | 0:55 | 5:40 | **All 15 zero-grade students had zero absences** | 3 | Influential subgroup |
| 9 | 0:40 | 6:20 | They were fading; "zero" likely means not recorded | 1 | Measurement / data-generating process |
| 10 | 0:50 | 7:10 | Set the zeros aside and the absence effect appears | 2 | Robustness, conditioning on the outcome, BP test |
| 11 | 0:50 | 8:00 | Student A vs B: 12.6 vs 12.2, either 7 to 18 | 3 | Prediction intervals, selection bias |
| 12 | 0:35 | 8:35 | Mostly passes; one red flag reported | 0 | VIF, BP, HC3, RESET, Cook's D, autocorrelation |
| 13 | 0:25 | 9:00 | Associations from two schools, story chosen after looking | 0 | Validity, multiple testing |
| 14 | 0:30 | 9:30 | Verdict: before you believe a regression, look at its zeros | 1 | Peak-end |

---

## 1 · The bet (0:35) · Speaker 1

*Cue:* walk to the front and pause for two seconds before speaking. The slide shows only the 0-20 scale with the class average (11.9) and ±1 SD, so the class has a sense of scale but no anchor for the answer.

> "Two students. One studies less than two hours a week. The other studies five to ten. Grades are out of twenty. On average, how many points apart are they? Shout a number."

**Interaction (≤ 30 s):** take three guesses and type the middle one with **]** / **[** (or the on-screen + / −). It reappears on slides 3 and 14.

> "Hold on to that number. By the end you'll know the real gap, why it shrinks, and why fifteen students almost fooled us."

## 2 · The case file (0:25) · Speaker 1

> "649 students in a Portuguese-language course at two schools, each with three grades out of twenty: period one, period two, and the final, G3."
>
> "Study time isn't hours. It's a box the student ticked: under 2, 2 to 5, 5 to 10, over 10. Self-reported, four levels, and nobody was assigned to study, so everything today is an association, not a cause."

## 3 · Effort shows up (0:50) · Speaker 1

> "Your guess was [X]. The real gap is 2.38 points, with a Tukey interval from 1.4 to 3.4."

*Click 1 (plateau):*
> "Over ten hours is no better than five to ten: minus 0.17, p = 0.99. Only 35 students are up there."

*Click 2 (why Tukey):*
> "ANOVA says the four means aren't all equal: F = 15.9, eta-squared 0.07, so study time accounts for about 7% of the spread. Tukey tells us which pairs differ while holding the false-positive rate at 5% across six comparisons. Levene says the variances are similar; Kruskal-Wallis agrees without assuming normality; MANOVA on all three grades agrees too."

> "Case closed? Not quite. Who are the students who study more?"

## 4 · Who studies (0:30) · Speaker 1

> "The 5-10 hour group is 77% girls, against 42% in the lowest group. They have a third as many past failures, and 96% want to go to university. So part of that 2.4 points is about *who* studies. Leave those factors out and the regression credits them to study time. That's omitted-variable bias, so next we compare like with like."

*Hand over to Speaker 2.*

## 5 · The shrinking coefficient (1:10) · Speaker 2

> "Alone, each study bracket is worth about one point: +0.97."

*Click 1 (M2):* "Add past failures, absences, sex, age, school, address and ambition. It halves to +0.45. Most of the shrinkage happens here."

*Click 2 (M3):* "Add twelve family and social variables and it barely moves: +0.42, still significant at p = 0.001. This is our main model."

*Click 3 (M4):* "Add earlier grades and it vanishes: +0.05, with R-squared at 0.86. But careful: G1 and G2 are partly *caused* by studying, and G3 correlates 0.92 with G2. So M4 doesn't say effort is useless. It says effort works through the earlier grades. They are bad controls for the total effect."

*If time:* "HC3 robust errors throughout, because the residual variance isn't constant; slide 12 shows the test. ANCOVA with G1 as the covariate tells the same story: p = 0.097."

## 6 · The suspect line-up (0:45) · Speaker 2

> "Same model, every factor in grade points. Wanting to go to university: +1.8. One past failure: minus 1.4. Going from under 2 to 5-10 hours: +0.8. Family support: nothing."
>
> "Notice absences: missing ten classes costs a third of a point and isn't significant. Hold that thought."

*Click:*
> "Extra school support is *negative*, minus 1.3. That's not help hurting; schools give support to students who are struggling. The same reverse arrow applies to study time: struggling students may study more, or give up. That's simultaneity. We can name it, but without an instrument we can't fix it."

*Hand over to Speaker 3.*

## 7 · Act 3 opens (0:30) · Speaker 3

> "Absences. You'd expect missing class to hurt. In our main model it barely registers: minus 0.15, not significant."

*Click:* "Add earlier grades and it turns *positive* and significant. Skipping class helps? When a result makes no sense, the data is usually trying to tell you something. What would you check?"

*Pause for one or two answers.*

## 8 · The Perfect Attendance Paradox (0:55) · Speaker 3 · PEAK

*Click 1 (the dot lights up; the other dots dim):*
> "Look at the bottom-left corner. Fifteen students scored zero on the final. Every one of them has zero recorded absences. Perfect attendance, zero grade."

*Click 2:*
> "Among everyone else, about a third have zero absences. Among the fifteen, all of them do. If you picked fifteen students at random, the chance of that is about three in ten million."

*Click 3:*
> "And they sit exactly where they flatten the line. Take them out, and the cost of ten absences goes from 0.6 points to 1.4."

*Pause and let it land.*

## 9 · Who were the fifteen? (0:40) · Speaker 3

> "Here they are, period by period. They were already sliding: about 7 in period one, under 4 in period two. Seven of them already had a zero in period two. No other student did."

*Click (cross-check):*
> "Many of them are also in the maths file. Of the maths zero-grade students we can match one-to-one to their Portuguese record, 22 of 31 have absences recorded in Portuguese, and 26 passed it. So 'zero absences' doesn't mean they never missed class. More likely, nothing was recorded once they stopped turning up."
>
> "To be clear, the data never says they dropped out. That's our reading."

## 10 · The verdict on absences (0:50) · Speaker 3

> "Grey is all students, amber is without the fifteen. In our main model the absence effect triples, from minus 0.15 to minus 0.45, and becomes strongly significant. The odd positive sign in M4 disappears. Maths shows the same thing more dramatically: plus 0.98 becomes minus 0.55."

*Click 1:*
> "We don't just delete them. Dropping zero grades means selecting on the outcome, so minus 0.45 describes students who completed the course. A dummy for them gives minus 0.47; keeping only students with a period-two grade gives minus 0.28. Same direction."

*Click 2:*
> "One honest caveat: maths isn't an independent sample. 370 of its 395 records match a Portuguese student. But its zero-grade students are mostly different people, only two are zero in both, so it's a consistency check, not proof."

*Hand over to Speaker 4.*

## 11 · Student A vs Student B (0:50) · Speaker 4

> "A studies over ten hours but has 12 absences, a past failure and no extra support. B studies 2 to 5 hours, rarely misses class, has no failures, and gets school support. Hands up for A... hands up for B."

**Interaction:** click a card once per raised hand, or estimate.

*Click 1:* "The model says A, barely: 12.6 versus 12.2. And look at the lines: either student could plausibly score anywhere from 7 to 18. A model predicts the average, not the person."

*Click 2:* "Where does A's lead come from? Studying adds 0.7, absences cost 0.2, the failure costs 1.4, and the biggest push is B's school-support dummy, minus 1.3: the selection effect from slide 6."

*Click 3:* "Give them the same support, and B leads by 0.93."

## 12 · The audit (0:35) · Speaker 4

> "Did we break the rules? VIF tops out at 2, so no multicollinearity problem. Heteroskedasticity was real, and the fifteen caused most of it: Breusch-Pagan goes from p of ten to the minus ten to 0.24. The model with earlier grades still fails, so we use HC3 throughout. We logged absences because they're heavily skewed, not because the data demand it; all three forms give the same answer. RESET rejects, and we report that; a grade capped at 0 and 20 is a likely reason. No single student drives anything. Autocorrelation doesn't apply to a cross-section."

## 13 · What we can't claim (0:25) · Speaker 4

> "Before the verdict, what we can't claim. These are associations; study time is self-reported and probably endogenous. Earlier grades are bad controls. The dropout reading is ours. Maths overlaps with the Portuguese students. And we picked this story after exploring, with many tests and no correction, so anything near 0.05 stays in the backup slides."

## 14 · The verdict (0:30) · Speaker 4 · END

> "So, the verdict. Effort shows up, modestly: about four-tenths of a point per bracket once we compare like with like. Your guess was the raw gap; the fair gap for the same two students is 0.83, about a third of it. History weighs more: one past failure costs more than two extra study brackets gain."

*Click:*
> "And the lesson we didn't expect: fifteen students with perfect attendance and a zero grade were hiding the cost of missing class. Before you believe a regression, look at its zeros. Thank you."

*Stop. Wait for questions. Press **B** for backups.*

---

## Backup slides (press B; Esc returns)

| | Use when asked... | Core line |
|---|---|---|
| B1 | "Is the maths result an independent replication?" | "No. 370 of 395 maths records match a Portuguese student. The zero-grade students are mostly different (2 in both), and the school pattern doesn't replicate (34 of 38 maths zeros at GP, in proportion to size)." |
| B2 | "Show the full ladder" / "What about dummy coding?" | "Same shape with and without the zeros. With three dummies, M3 is jointly significant on all students (p = 0.005) but borderline without the zeros (p = 0.063). The evidence for study time after controls is modest." |
| B3 | "Did you run ANCOVA / MANCOVA?" | "ANCOVA with G1: p = 0.097, partial eta-squared 0.01; slopes are homogeneous (p = 0.49). MANOVA Pillai 0.085, MANCOVA with failures 0.065, both p < 0.001." |
| B4 | "Any interactions?" | "Study time × failures and study time × sex become significant only without the 15 zero-grade students, near 0.05, after many tests. We call them fragile and don't build on them." |
| B5 | "Isn't dropping the zeros cherry-picking?" | "We report both. The dummy keeps all 649 and gives −0.47; G2 > 0 gives −0.28. We restrict the claim to course completers. AIC doesn't strongly prefer the log form." |

## Likely questions from the professor

- **"Why HC3 rather than HC1?"** HC3 is the more conservative small-sample correction and down-weights high-leverage points; it changes the standard errors by at most about 12% here and flips significance for at most one of seven key terms.
- **"Why log(absences + 1)?"** Absences are a count with skewness 2.0 and many zeros; the +1 keeps the zeros. AIC slightly prefers linear with the zero-grade cases and log without them; the squared term is never significant. All three forms give the same sign.
- **"Is the RESET failure fatal?"** It flags misspecification. The outcome is bounded at 0-20 and lumpy, so a linear mean can't be exactly right. The key conclusions hold across forms and samples. An ordered or fractional model would be a natural next step.
- **"Why is study time linear in M1-M4?"** It's ordinal with four levels; the linear term is one degree of freedom and matches the dummy pattern up to the plateau. B2 shows the dummy results, including the fragile p = 0.063.
- **"Can you claim studying causes better grades?"** No. Study time is self-chosen and likely endogenous (reverse causality, omitted motivation), and there's no instrument. We claim associations conditional on the controls.
- **"How did you get 3 in 10 million?"** Exact hypergeometric probability that 15 students drawn without replacement from 649 all come from the 244 with zero absences: 3.2 × 10⁻⁷. The binomial approximation 0.376¹⁵ gives 4.2 × 10⁻⁷, the figure in the readme.
- **"How do you know the maths and Portuguese students are the same people?"** We matched on the 13 attributes the UCI documentation lists. The merge gives 382 rows, the number the documentation states, and in the 358 pairs unique in both files the other shared attributes agree 100%.
