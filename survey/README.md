# Cohort survey: pipeline and analysis plan

Goal: collect anonymous data from MPBA G505 classmates in the same shape as the UCI student-por file, then test whether the UCI patterns appear in our cohort.

## Files

| File | Role |
|---|---|
| `questions.csv` | Single source of truth: question wording, dataset column, allowed answers, UCI equivalent |
| `build_form.py` → `survey_form.html` | Visual preview of the form, showing where each answer is stored |
| `pipeline.py` | Google Forms export → cleaned, UCI-shaped CSV plus QA report |
| `analysis.py` | Pre-registered hypotheses, models, bootstrap CIs, pooled test, power |
| `results/` | Output tables written by `analysis.py` |

## What we need from each respondent

27 questions in 5 sections (see the preview):

- **Consent** (1): must be "Yes", otherwise the row is dropped.
- **About you** (14): sex, age, home area, household size, parents' status, parents' education and jobs, commute, internet, family relations, health.
- **Study habits** (9): weekly study time (4 bands), failed courses, extra academic support, family help, paid tuition, activities, plans for a PhD, classes missed.
- **Social life** (4): free time, going out, workday and weekend alcohol use (1-5 scales).
- **Grades** (1): score in the respondent's most recent graded course, as a %. Any course or semester; CGPA or letter grades are converted to % first. Converted to 0-20: `G3 = round(pct / 5)`. Mid-semester score was dropped because the course results are not out yet.

No name, email or student ID is collected. The pipeline drops the timestamp and any email column.

## Run order

```bash
python survey/build_form.py                        # preview: survey/survey_form.html
# create the Google Form with the exact question text in questions.csv
# after collecting: Responses > Download CSV
python survey/pipeline.py path/to/export.csv       # -> data/processed/bits_survey_clean.csv
python survey/analysis.py                          # -> survey/results/
```

Requires pandas, numpy, scipy, statsmodels (the same as `requirements.txt`).

## Output dataset

Semicolon-separated, same column names as the UCI file where a match exists:
`sex; age; address; famsize; Pstatus; Medu; Fedu; Mjob; Fjob; traveltime; internet; famrel; health; studytime; failures; schoolsup; famsup; paid; activities; higher; absences; freetime; goout; Dalc; Walc; G3; log_abs; zero_grade; source`

`source` = `BITS_survey` on every row, so the two datasets stay distinguishable if they are ever pooled.

Not collected, so absent from the output: `school`, `reason`, `guardian`, `nursery`, `G1`. Comparisons use only the common variables.

## Hypotheses

Set after exploring the UCI data and before any BITS data exists. They are not pre-registered yet. Register them with a timestamp (e.g. OSF or a tagged commit) before the survey closes if the pre-registration claim is needed.

- **H1.** Study time is positively associated with final grade in the BITS cohort (Spearman ρ > 0, permutation test).
- **H2.** Past failures are negatively associated with final grade in the BITS cohort (M2 slope < 0, bootstrap CI excludes 0).
- **H3.** The UCI study-time slope (M1) lies inside the BITS bootstrap CI.
- **H4.** The populations do not differ on the common predictors (pooled Chow test, source interactions = 0).

## Models

- **M1:** `G3 ~ studytime`
- **M2:** `G3 ~ studytime + failures + log_abs + sex`

Each is fitted per source with HC3 SEs and percentile bootstrap CIs (5,000 resamples). The bootstrap is used because the BITS sample is small.

## Caveats to state in the presentation

- Convenience sample from one cohort. Not representative of BITS, and not comparable to UCI on age, programme, or grading scale.
- Self-reported study time, absences, failures and grades. Grades mix different courses, semesters and grading systems, so the outcome is noisier than UCI's single-subject G3. Confirm the % conversion before quoting numbers.
- `higher` means PhD intent here, but "higher education" in UCI, so it is excluded from the pooled comparison.
- Power is low. `analysis.py` reports the smallest studytime slope the BITS sample could detect at 80% power. Treat a non-significant result as "no evidence", not "no effect".
