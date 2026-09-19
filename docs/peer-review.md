# Peer-review workflow (physicians)
1. Author adds/edits content → `Review_Flags(target_kind,target_id,reviewer,status='pending',note)`.
2. Reviewer (Yemeni board physician) checks: accuracy, guideline alignment (WHO/Yemen NTP), Arabic clarity, no PII.
3. Status → `approved` or `needs_fix` with note; `needs_fix` blocks export to Releases.
4. Monthly audit: `% approved` per department; target ≥95% for Medicine/Surgery/Peds/OBGYN.
SQL: `SELECT department... JOIN Review_Flags` per release checklist.
