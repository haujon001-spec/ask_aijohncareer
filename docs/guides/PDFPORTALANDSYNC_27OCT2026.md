# Portal PDF feature, `**` markdown fix, and Laptop ⇄ VPS Sync — 27 Oct 2026

**Requested:** (1) add PDF to the web portal, (2) stray `**` showing in PDFs, (3) the one-button two-way sync from `docs/todolist/next-session.md`.

**Status:** built and verified locally. **Not deployed to the VPS** (see "Deploying" below).

---

## 1. The `**` bug (root cause + fix)

PDFs are made from the `.docx`, so the problem was in the docx writer. Findings from scanning real outputs:

- **ScoreCards** are written by the LLM as full Markdown (`#` headings, `**bold**`, tables, bullets, numbered lists, `---`), but the old writer treated every `.txt` as plain text → literal `**`, `##`, `---` and raw `|` tables in the docx/PDF (36 of 36 scorecards affected).
- **Headings** like `**1. ROLE & COMPANY SUMMARY**` passed the old `isupper()` heading test and were written *with* the asterisks.
- **Cover letters / resumes**: a line containing `" — "` had its left half written as plain bold text, so `**…**` on that side leaked.

**Fix** — new module `scripts/docx_render.py` (the docx code was moved out of `jd_scorecard_resume_v2.py`, which now imports it):

- ScoreCards go through a real Markdown renderer: headings, **bold**/*italic*, bullet + numbered lists, tables (shaded header row), quotes; `---` rules dropped.
- Resumes / cover letters keep their original layout code, but no literal `**` can reach the document any more.
- Verified on real outputs: 0 asterisks / `##` / `---` in the docx **and** in the Word-made PDF text, and the scorecard PDF was inspected visually.

### Cleaning up OLD outputs
Existing `.docx` files made before today still contain the markers. They are **not** touched automatically. To rebuild from the `.txt` (previous docx is copied to `archive/docx_rebuild_<YYYYMMDD>/` first):

```powershell
.venv\Scripts\python.exe scripts\docx_render.py data_processed\MTR            # one employer
.venv\Scripts\python.exe scripts\docx_render.py data_processed                # everything
.venv\Scripts\python.exe scripts\jd_scorecard_resume_v2.py --docx-to-pdf=data_processed\MTR   # then re-make PDFs
```
Caution: this regenerates the docx from the txt, so **any manual edits you made inside a docx are lost** (the archive copy keeps them).

---

## 2. PDF in the portal

| Where | What |
|---|---|
| **JD Run step** | New checkbox **Also generate PDF** (adds `--pdf` to the command preview and run). Greyed out with an explanation on a server without a PDF engine. |
| **Reports step & History** | Next to each `.docx`: a **PDF** link if the PDF exists, otherwise a **Convert to PDF** button. |

Backend: `GET /api/pdf/capabilities`, `POST /api/pdf/convert {path}` (path-guarded to `data_processed/**/docx/*.docx`, one conversion at a time, refuses while a JD run is active), `jd_run` accepts `generatePdf`, History returns a `pdf` path per document. The result is only reported as success if the PDF file exists and is fresh on disk.

**Engine:** Microsoft Word on the laptop (PDF matches the docx exactly), LibreOffice as fallback. The production `jd-api` image (alpine) has neither, so on the VPS the convert buttons are hidden and PDFs arrive via **Sync** instead (decision: laptop-made PDFs + Sync, rather than adding LibreOffice to the image; revisit if font fidelity or on-VPS conversion is wanted).

Scope note: only the v2 portal (`/portal`) is wired. `/portal2` (v3 script) is unchanged.

---

## 3. Sync (laptop ⇄ VPS) — laptop portal only

New **Sync** tab in `/portal` (only appears when the backend runs on the laptop; the container reports `enabled:false`).

1. Pick a direction: **Both ways** / Push only (laptop → VPS) / Pull only (VPS → laptop).
2. **Check differences** — dry run. Compares both sides by sha256 and lists, per company: files only on the laptop, only on the VPS, and files that differ.
3. Untick companies you don't want. For a company with differing files choose **per company**: Skip (default) / Laptop version / VPS version.
4. **Sync N files**. The result shows what was copied and how many were verified identical by re-hashing both sides afterwards.

**Design decisions (user, 27 Oct 2026):** conflicts resolved *per company*; everything syncs (txt + docx + pdf); laptop portal only; JD json files sync like other inputs; scope = generated outputs + JD inputs (`data_raw/jd/txt/JD_*.txt`, `src/data/jd/JD_*.json`).

**Guard-rails (enforced server-side by an allow-list, `isSyncable()` in `backend/lib/syncEngine.js`):**
- Only `data_processed/<Employer>/{ScoreCard,resume,CoverLetter}/{txt,docx,pdf}/*`, `JD_*.txt`, `JD_*.json` can ever move. `secrets/`, `.env*`, `john_profile.json`, `.trash`, `*.bak`, `~$*` can never match.
- `ZZModelTest`, `MatinaFung`, `AlexRivera` are excluded (the "does non-John data ship to production" decision stays open). Edit `DENY_FOLDERS` to change.
- Nothing is ever deleted. A conflicting company with no choice is skipped, never overwritten.
- Overwritten files are backed up first: laptop → `backup/sync/<timestamp>/…`, VPS → `/opt/john-career-copilot/backup/sync_<timestamp>/…`.
- The server re-computes the plan at run time; the browser never supplies file paths.
- Transport is `tar` over the laptop's own `ssh` key (BatchMode). No key or password is stored in the portal. After a push the touched files/folders are `chown`'d to the container user `1001:1001` so `jd-api` can write into new employer folders.
- Every run appends a JSON line to `logs/sync_<date>.log`.

Config (optional env): `SYNC_SSH_TARGET` (default `root@152.42.214.111`), `SYNC_REMOTE_ROOT` (default `/opt/john-career-copilot`), `JD_SYNC_DISABLED=1`.

### How it was tested (real, not simulated)
- Allow-list: 18/18 cases (secrets, profiles, traversal, other-person folders, `.trash`, `.bak`, `~$` all rejected).
- Read-only dry-run against the live VPS: 3.3 s; found the real drift (≈153 laptop-only, 41 VPS-only, 5 differing).
- Round-trip against production using a throwaway `ZZSyncTest` company only: push (txt/docx/pdf) + pull, conflicts **skipped** when unresolved, **laptop-wins** and **VPS-wins** both worked with backups present, new files owned by `1001:1001`, all hash-verified, `secrets/` byte-identical before/after. Test folders and test backups were then removed from both sides.
- Browser (Playwright, auth-stubbed harness on the real routers): PDF checkbox + `--pdf` in preview, **Convert to PDF** → **PDF** link, Sync tab preview.
- **Real pipeline run** through the backend's own `runJdPipeline` (Haiku 5.5, mode `all`, `generatePdf:true`, throwaway JD `JD_ZZPdfRun_Test`): exit 0 in 723 s; scorecard, resume and cover letter each produced docx + PDF, all three found by `discoverOutputs` (`pdf` paths returned). Text extracted from the three PDFs: 0 asterisks, 0 `##`, 0 `---`. Throwaway outputs, JD and blueprint deleted afterwards.
- Not tested: a login-gated click-through on the real `:3010` server (auth was stubbed in the harness so your real credentials stayed untouched). Auth wiring is one `requireAuth` line per router in `jd_api_server.js`; a quick manual check after restarting the dev server is worthwhile.

**No real data has been synced yet.** The ~200 differing files are still waiting for you to press **Sync**.

---

## Deploying (not done)

- `Dockerfile.jd-api` now also copies `scripts/docx_render.py`. **This is required**: v2 imports it, and the old image only shipped `jd_scorecard_resume_v2.py`.
- Rebuild/redeploy both `app` (new frontend) and `jd-api` (new routes + scripts) with the usual scp pattern. Sync and PDF-convert will simply be hidden on the VPS.
- Gotcha for later: the Sync tab hides itself on the VPS via the `/.dockerenv` check — do **not** put an ssh key in the container.

## Files
New: `scripts/docx_render.py`, `backend/lib/pdfConvert.js`, `backend/lib/syncEngine.js`, `backend/api/pdf.js`, `backend/api/sync.js`, `src/components/JDPortal/PdfControl.jsx`, `src/components/JDPortal/SyncPanel.jsx`.
Changed: `scripts/jd_scorecard_resume_v2.py`, `backend/lib/pythonRunner.js`, `backend/api/jd_run.js`, `backend/api/history.js`, `backend/jd_api_server.js`, `src/utils/jdApi.js`, `JDRunStep.jsx`, `JDReportsStep.jsx`, `JDHistoryList.jsx`, `JDPortal.jsx`, `JDPortal.css`, `Dockerfile.jd-api`. Backups of every changed file: `archive/*.20261027_V1.bak`.
