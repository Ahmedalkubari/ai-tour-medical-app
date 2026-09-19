// Global references + MedMCQA/MedQA-compatible ingestion notes (offline-safe, schema-validated)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REFERENCES = [
  { book: "Gray's Anatomy", outline: ['Upper/Lower limbs', 'Thorax', 'Abdomen/Pelvis', 'Head & Neck', 'Neuroanatomy'] },
  { book: 'Guyton & Hall Physiology', outline: ['Membrane/Nerve-Muscle', 'Heart/Circulation', 'Respiratory', 'Renal/Acid-base', 'Endocrine/Reproduction'] },
  { book: "Harrison's Internal Medicine", outline: ['Cardiology', 'Pulmonary', 'Nephrology', 'GI/Hepatology', 'Heme-Onc', 'ID', 'Endo', 'Neuro'] },
  { book: "Davidson's Medicine", outline: ['Clinical decision-making', 'Emergency presentations', 'Poisoning', 'Infectious diseases'] },
  { book: 'Nelson Pediatrics', outline: ['Neonatology', 'Growth/Nutrition', 'IMCI/Infections', 'Vaccination (EPI)', 'Genetics/Metabolic'] },
];
export const MEDMCQA_SCHEMA = { fields: ['id', 'question', 'opa', 'opb', 'opc', 'opd', 'cop', 'choice_type', 'exp', 'subject_name', 'topic_name'], note: 'Question_Bank stores options_json={A,B,C,D} + correct_answer + explanation + exam_source — MedMCQA-compatible.' };
export async function fetchRefs() {
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'global-references.json'), JSON.stringify({ references: REFERENCES, medmcqa: MEDMCQA_SCHEMA, fetched_at: new Date().toISOString() }, null, 2));
  console.log('global-references.json written');
}
if (process.argv[1]?.endsWith('references-fetcher.mjs')) fetchRefs();
