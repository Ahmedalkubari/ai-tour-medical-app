# AI Tour Medical App — Yemeni Medical Students (Offline-First)

Minimalist AR/EN (RTL/LTR) educational system: Tour Map + AI Companion + Knowledge Vault + local SQLite.

Palette: `#0B0F19` midnight • `#1E293B` slate • `#10B981` emerald • `#EF4444` crimson.

## Run (no build needed — Node 22+ only for DB)
```
cd ai-tour-medical-app
node pipeline/run-all.mjs
node scripts/build-db.mjs
node scripts/expand-max.mjs
node pipeline/validate.mjs
node scripts/serve.mjs
# → http://localhost:8080
```

## Structure
- `index.html / styles.css / app.js / manifest.json / sw.js` — Phase 1 UI (PWA offline)
- `db/schema.sql` — 7 tables + FK + indexes (`References_Books` avoids reserved word `References`)
- `db/migration_v2.sql` — OSCE_Stations + Medical_Images + Textbook_Chapters
- `scripts/build-db.mjs` — base seed: 7 levels, 28 courses (Sana'a/Aden/Taiz/Thamar/UST MBBS 6y+internship), 200 topics, 7 refs, 70 MCQs, 8 cases
- `scripts/expand-max.mjs` — MAX expansion: 3270 Qs (MedMCQA/MedQA-compatible + Yemen Boards archive), 128 cases, 32 OSCE, 50 SVG diagrams, 50 textbook chapter maps (outlines/objectives only — copyright-safe, no verbatim text)
- `pipeline/` — `yemen-scraper.mjs` (live fetch su.edu.ye + ust.edu.ye, fallback curated), `references-fetcher.mjs` (Gray's/Guyton/Harrison/Davidson/Nelson + MedMCQA schema), `parser.mjs` (unstructured→JSON), `validate.mjs`, `run-all.mjs`
- `data/medical_app.db` + `audit.json` + `yemen-curricula.json` + `global-references.json`
- `INGESTION_AUDIT.md` — final counts

## DB Schema
Academic_Levels → Courses → Modules_Topics (self-FK) → Question_Bank; References_Books; Clinical_Cases; Student_Progress. All Question_Bank rows enforce `options_json {A,B,C,D}` + explanation + exam_source (MedMCQA-compatible).

## Validation
`PRAGMA foreign_key_check = 0`, non-null QA = 0, bad options = 0. See `INGESTION_AUDIT.md`.
