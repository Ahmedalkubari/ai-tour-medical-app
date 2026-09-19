# Exam import (real past papers)
1. Convert PDF → text: `pdftotext exam.pdf exam.txt` (poppler) or upload `.txt`/`.json` directly.
2. Format blocks separated by blank lines:
```
Q: stem... | A) .. B) .. C) .. D) ..
Answer: B | Explain: ... | Source: Sanaa 2023
```
3. POST to `/api/import-exam` {filename, source, raw_text} — parsed rows go to Question_Bank and are flagged `imported-pending-review` in Exam_Imports; approve in Review Board before release.
4. Binary PDFs are NOT parsed server-side (no heavy deps by design); conversion step keeps the pipeline auditable.
