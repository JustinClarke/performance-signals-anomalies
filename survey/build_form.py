"""Render survey/questions.csv as a static HTML preview of the survey form.

Each question shows the dataset column its answer lands in, so the page doubles
as a map from questionnaire to data.

Usage:  python survey/build_form.py   ->  survey/survey_form.html
"""
import csv
import html
import pathlib

HERE = pathlib.Path(__file__).parent
OUT = HERE / "survey_form.html"


def parse_options(text):
    """'Label=code|Label2=code2' -> [(label, code)]; a bare item is its own code."""
    pairs = []
    for part in text.split("|"):
        if "=" in part:
            label, code = part.rsplit("=", 1)
        else:
            label = code = part
        pairs.append((label.strip(), code.strip()))
    return pairs


def load_rows():
    with open(HERE / "questions.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def render_input(row):
    col = html.escape(row["column"])
    kind = row["type"]
    if kind == "number":
        lo, hi = row["options"].split("-")
        return (f'<input class="num" type="number" name="{col}" min="{lo}" max="{hi}" '
                f'placeholder="{lo}-{hi}">')
    if kind == "scale":
        opts = parse_options(row["options"])
        items = "".join(
            f'<label class="chip"><input type="radio" name="{col}" value="{html.escape(code)}">'
            f'<span>{html.escape(label)}</span></label>'
            for label, code in opts)
        return f'<div class="scale">{items}</div>'
    opts = parse_options(row["options"])
    items = "".join(
        f'<label class="opt"><input type="radio" name="{col}" value="{html.escape(code)}">'
        f'<span>{html.escape(label)}</span></label>'
        for label, code in opts)
    return f'<div class="opts">{items}</div>'


def stored_as(row):
    if row["type"] == "number":
        return f"numeric, range {row['options']}"
    codes = [code for _, code in parse_options(row["options"])]
    return "codes: " + ", ".join(codes)


def build():
    rows = load_rows()
    sections = {}
    for r in rows:
        sections.setdefault(r["section"], []).append(r)

    body = []
    qnum = 0
    for sec, items in sections.items():
        body.append(f'<section><h2>{html.escape(sec)}</h2>')
        for r in items:
            qnum += 1
            req = '<span class="req">*</span>' if r["required"] == "yes" else ""
            body.append(
                '<div class="q">'
                f'<div class="qhead"><span class="qn">{qnum}</span>'
                f'<p>{html.escape(r["question"])}{req}</p></div>'
                f'{render_input(r)}'
                + ('' if r["column"] == "consent" else
                   f'<div class="map">→ column <code>{html.escape(r["column"])}</code> · '
                   f'{html.escape(stored_as(r))}'
                   + (f' · UCI equivalent: <code>{html.escape(r["uci_equivalent"])}</code>'
                      if r["uci_equivalent"] else ' · no UCI equivalent')
                   + (f'<br><em>{html.escape(r["notes"])}</em>' if r["notes"] else "")
                   + '</div>')
                + '</div>')
        body.append('</section>')

    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cohort Study Survey: Preview</title>
<style>
:root {{ --bg:#f6f6f4; --card:#fff; --ink:#1d1d1b; --muted:#6b6b66; --line:#dcdcd6; --accent:#2f6f5e; --tag:#eef3f1; }}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{ --bg:#161614; --card:#21211e; --ink:#eeeee9; --muted:#9a9a93; --line:#3a3a35; --accent:#7fc1ae; --tag:#27322f; }}
}}
:root[data-theme="dark"] {{ --bg:#161614; --card:#21211e; --ink:#eeeee9; --muted:#9a9a93; --line:#3a3a35; --accent:#7fc1ae; --tag:#27322f; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif; }}
main {{ max-width:720px; margin:0 auto; padding:24px 16px 64px; }}
h1 {{ font-size:1.6rem; margin:0 0 4px; }}
.lede {{ color:var(--muted); margin:0 0 16px; }}
.banner {{ background:var(--tag); border:1px solid var(--line); border-radius:10px; padding:10px 14px; font-size:.9rem; margin-bottom:20px; }}
section {{ margin-bottom:28px; }}
h2 {{ font-size:1.05rem; color:var(--accent); text-transform:uppercase; letter-spacing:.06em; margin:0 0 10px; }}
.q {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; margin-bottom:12px; }}
.qhead {{ display:flex; gap:10px; align-items:flex-start; }}
.qn {{ min-width:26px; height:26px; border-radius:50%; background:var(--tag); color:var(--accent); font-size:.8rem; display:flex; align-items:center; justify-content:center; font-weight:600; }}
.qhead p {{ margin:2px 0 10px; font-weight:500; }}
.req {{ color:#b5523b; margin-left:3px; }}
.opts, .scale {{ display:flex; flex-wrap:wrap; gap:8px; }}
.opt, .chip {{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--line); border-radius:999px; padding:6px 12px; cursor:pointer; font-size:.92rem; }}
.opt input, .chip input {{ accent-color:var(--accent); margin:0; }}
.num {{ width:140px; padding:8px 10px; border:1px solid var(--line); border-radius:8px; background:var(--bg); color:var(--ink); font:inherit; }}
.map {{ margin-top:10px; font-size:.8rem; color:var(--muted); border-top:1px dashed var(--line); padding-top:8px; }}
.map code {{ color:var(--accent); }}
footer {{ color:var(--muted); font-size:.85rem; margin-top:32px; }}
</style></head>
<body><main>
<h1>Cohort study survey</h1>
<p class="lede">MPBA G505 · anonymous · about 5 minutes</p>
<div class="banner"><strong>Preview only.</strong> Generated from <code>survey/questions.csv</code>.
Each card shows where the answer is stored in the dataset. Live version: paste these questions into Google Forms, keeping the wording exactly as written so the pipeline can match columns.</div>
{''.join(body)}
<footer>* required. Responses are anonymous: no name, email or student ID is collected.</footer>
</main></body></html>
"""
    OUT.write_text(page, encoding="utf-8")
    print(f"wrote {OUT} ({qnum} questions)")


if __name__ == "__main__":
    build()
