# Showcase figures (notebook 07)

16:9 slides, 3200 x 1800 px PNG + SVG (light theme). Dark-theme PNGs with the same names are in `dark/`. Every number is recomputed from `data/processed/` or read from `results/*.csv` (asserted in `notebooks/07_visual_showcase.ipynb`). Colours: blue = students / corrected estimate, orange = zero-grade cases, grey = uncorrected "all students" estimate.

| File | What it shows | Takeaway | Ready for slides? |
|---|---|---|---|
| `01_effort_pays_then_plateaus` | Mean G3 by study-time group, 95% CIs, n per group, Tukey brackets | +2.38 points from <2 h to 5-10 h (CI 1.40-3.37), then a plateau (-0.17, p = 0.99) | **9/10.** Axis zoomed to 9-15; the zoom is stated in the footer, but say it out loud |
| `02_coefficient_ladder_melts` | Study-time coefficient M1-M4 as bars inside a dashed M1 outline, with an R² strip below | The effect melts +0.97 to +0.05 while R² rises 0.06 to 0.86 | **9/10.** The model labels are small-ish (16 pt) |
| `03_spike_at_zero` | Histogram of G3 with the 0 bar highlighted | 15 students scored 0, all with zero recorded absences (vs 229 of the other 634) | **8/10.** A simple, strong opener for the paradox |
| `04_perfect_attendance_paradox` | Absences vs G3 scatter (zero-grade cases in orange, fitted lines with and without them) plus a 100% vs 36% share bar | Every zero grade had zero absences; removing them makes 10 absences cost -1.4 instead of -0.6 points | **8/10.** Busy for a projector; the scatter is jittered (stated) |
| `05_zero_grade_trajectories` | G1 to G2 to G3 lines for the 15 cases against the median and 50%/80% bands of everyone else, with fact column | They were fading before the final: mean G1 7.1, G2 3.8, 7 of 15 already at G2 = 0 (no one else) | **9/10.** Lines at G2 = 0 overlap into a thick band (that is the point) |
| `06_absence_effect_before_after` | Dumbbell: log-absence coefficient with vs without zero-grade cases, Portuguese and maths, M3 and M4, HC3 CIs | Every "absences help" result (+0.16, +0.98, +0.63) vanishes once the zeros are removed | **9/10.** The clearest single "flip" picture |
| `07_maths_replication` | Small multiples: the scatter + two fitted lines for Portuguese and maths | In maths the fitted line literally flips: +1.7 points for 10 absences with the 38 zeros, -1.9 without | **8/10.** Good backup slide; maths x-axis runs to 75 absences |
| `08_what_predicts_grades` | Forest plot in comparable units (G3 points for a realistic contrast), M3, all vs zeros removed, with value columns | Ambition (+1.81) and one past failure (-1.42) outweigh a two-bracket study-time jump (+0.83); school support is negative by selection | **9/10** |
| `09_student_a_vs_b` | Predicted G3 for A and B with CI and 95% prediction ranges, plus a waterfall of the A-B gap | A's 0.37 lead comes from B's school-support dummy (+1.30); hold support equal and B leads by 0.93; ranges overlap 7.2-17.5 | **8/10.** Two ideas on one slide; could split for the audience-vote reveal |
| `10_diagnostics_scorecard` | Pass/Watch/Fail table (status colour + word) for all vs zeros removed, with the action taken | Dropping the zero-grade cases turns most red lights green or amber; HC3 everywhere; RESET reported openly | **9/10.** Reads well; text-heavy by design |
| `11_hero_summary` | Three-column infographic: +2.4 / 0.97 to 0.05 / 15 of 15, each with a mini chart | Effort shows up, history dominates, check your zeros | **8/10.** Strong verdict slide; mini charts have no axes, so keep them as illustrations |

Dropped: a "school MS vs GP" concentration chart. The Portuguese pattern (14 of 15 at MS) does not replicate in maths (34 of 38 at GP, in proportion to school size), so it would mislead as a headline.
