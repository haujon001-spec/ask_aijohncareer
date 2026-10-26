# DOCX → PDF conversion (`--docx-to-pdf`) — 26 Oct 2026

`scripts/jd_scorecard_resume_v2.py` can convert **existing** `.docx` outputs (scorecard, resume, cover letter) to PDF. No LLM call, no JD file needed.

## Usage

```powershell
# one file
python scripts/jd_scorecard_resume_v2.py "--docx-to-pdf=data_processed/MTR/resume/docx/<file>.docx"

# a whole folder (recursive: every .docx under it, e.g. all of one employer)
python scripts/jd_scorecard_resume_v2.py --docx-to-pdf=data_processed/MTR
```

Quote the whole argument when it contains spaces. Paths may be absolute or relative to the repo root.

## `--pdf` — PDFs during a normal run

```powershell
python scripts/jd_scorecard_resume_v2.py <jd.json> --resume-only --pdf --llm=deepseek
```

After each `.docx` is written, the same engine writes the matching PDF. Ignored with `--no-docx`. A PDF failure only prints a warning; the txt/docx are unaffected (so on the Linux VPS, where Word does not exist, `--pdf` makes no PDF but nothing breaks).

## Behaviour

- Output goes to the sibling `pdf/` folder of the docx's `docx/` folder:
  `data_processed/<Employer>/<Type>/docx/X.docx` → `data_processed/<Employer>/<Type>/pdf/X.pdf`.
- An existing PDF with the same name is overwritten (PDFs are derived artefacts; the docx is the source).
- Engine: Microsoft Word via COM (PowerShell), so the PDF matches the docx exactly. Falls back to LibreOffice (`soffice`) if Word automation fails.
- `~$*.docx` Word lock files are skipped. Exit code is 1 if any file failed.

## Gotchas found while building it

- Windows PowerShell 5.1 flattens single-element arrays and passes a JSON array through `ConvertFrom-Json` as one object. Jobs are therefore passed as JSON in an env var and read with `ConvertFrom-Json -InputObject`.
- Close the docx in Word first if conversion fails on that file.

## Verified

26 Oct 2026: single file and whole-folder runs on `data_processed/MTR` produced 3 valid PDFs (`%PDF-` header, 219–321 KB); bad path exits 1 with a clear error.
