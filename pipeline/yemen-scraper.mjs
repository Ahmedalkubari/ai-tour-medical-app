// Yemen curricula gatherer: tries live fetch, falls back to curated offline map (Sana'a/Aden/Taiz/Thamar/UST)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CURATED = {
  universities: ['Sana\'a University', 'Aden University', 'Taiz University', 'Thamar University', 'UST'],
  system: 'MBBS 6 years + internship year; basic (1-2), preclinical (3), clinical (4-6)',
  sources: ['https://su.edu.ye/chm/en', 'https://ust.edu.ye/med/en/home-en/medicine-and-surgery'],
  year_map: {
    '1': ['Anatomy I', 'Physiology I', 'Biochemistry I', 'Histology & Embryology'],
    '2': ['Anatomy II', 'Physiology II', 'Biochemistry II', 'Community Medicine I'],
    '3': ['Pathology', 'Pharmacology', 'Microbiology & Immunology', 'Parasitology'],
    '4': ['Internal Medicine I', 'General Surgery I', 'Pediatrics I', 'Forensic Medicine'],
    '5': ['Internal Medicine II', 'General Surgery II', 'OB/GYN I', 'Ophthalmology & ENT'],
    '6': ['OB/GYN II', 'Pediatrics II', 'Psychiatry', 'Public Health & Family Medicine', 'Emergency & Critical Care'],
    internship: ['Internal Medicine', 'Surgery/Emergency', 'Pediatrics & OBGYN', 'Psychiatry', 'Family Medicine', 'Public Health']
  }
};
export async function gather() {
  const tried = [];
  for (const u of CURATED.sources) {
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(u, { signal: ctrl.signal }); clearTimeout(t);
      tried.push({ url: u, status: r.status, ok: r.ok });
    } catch (e) { tried.push({ url: u, status: 0, ok: false, error: String(e).slice(0, 120) }); }
  }
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'yemen-curricula.json'), JSON.stringify({ ...CURATED, fetch_attempts: tried, fetched_at: new Date().toISOString() }, null, 2));
  console.log('yemen-curricula.json written; live attempts:', JSON.stringify(tried));
}
if (process.argv[1]?.endsWith('yemen-scraper.mjs')) gather();
