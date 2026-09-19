// Gap-fill pack: neonatal jaundice & hyperbilirubinemia (12 high-yield Qs)
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
const db = new DatabaseSync(path.resolve('data', 'medical_app.db'));
const tid = db.prepare(`SELECT topic_id FROM Modules_Topics WHERE topic_title LIKE '%Neonat%' OR topic_title LIKE '%Pediatrics%' ORDER BY topic_id LIMIT 1`).get().topic_id;
const Q = [
  ['Jaundice <24h action?', ['Observe', 'Urgent hemolysis workup (Coombs, blood group, bilirubin)', 'Sunlight only', 'Discharge'], 'Urgent hemolysis workup (Coombs, blood group, bilirubin)', 'First-day jaundice is always pathological (ABO/Rh, G6PD, sepsis).', 'Nelson-Neonatology'],
  ['Kramer zones progression?', ['Head→toe with rising bilirubin', 'Toe→head', 'Random', 'Palms first'], 'Head→toe with rising bilirubin', 'Cephalocaudal progression estimates severity; confirm with TSB.', 'Nelson-Neonatology'],
  ['Phototherapy threshold basis?', ['Age-in-hours nomogram (Bhutani) + risk factors', 'Weight only', 'Fixed 15 mg/dL always', 'Clinical look only'], 'Age-in-hours nomogram (Bhutani) + risk factors', 'AAP: plot TSB on hour-specific nomogram with neurotoxicity risks.', 'AAP-Neonatal'],
  ['Exchange transfusion red flag?', ['TSB at exchange level / encephalopathy signs', 'Mild jaundice day 3', 'Feeding well', 'Weight gain'], 'TSB at exchange level / encephalopathy signs', 'Acute bilirubin encephalopathy: hypotonia→hypertonia, opisthotonus, high-pitched cry.', 'Nelson-Neonatology'],
  ['Breast-milk vs breastfeeding-failure jaundice?', ['Failure: poor intake early; breast-milk: prolonged unconjugated', 'Same entity', 'Both conjugated', 'Both need exchange'], 'Failure: poor intake early; breast-milk: prolonged unconjugated', 'Failure day 2–4 (dehydration); breast-milk week 1–2 (β-glucuronidase).', 'Nelson-Peds'],
  ['Direct (conjugated) jaundice >2mg/dL means?', ['Always physiologic', 'Pathologic: biliary atresia workup (stool color, US, HIDA)', 'Ignore', 'Phototherapy only'], 'Pathologic: biliary atresia workup (stool color, US, HIDA)', 'Pale stools + dark urine + hepatomegaly → Kasai window <60 days.', 'Nelson-GI'],
  ['G6PD + jaundice trigger?', ['Oxidants (infection, naphthalene, fava)', 'Antibiotics never', 'No triggers', 'Cold only'], 'Oxidants (infection, naphthalene, fava)', 'Heinz bodies, bite cells; avoid triggers; common in Yemen/Mediterranean.', 'Harrison-Heme'],
  ['Crigler-Najjar vs Gilbert?', ['CN: severe UGT1A1 deficiency; Gilbert: mild benign', 'Both severe', 'Both need transplant', 'No genetics'], 'CN: severe UGT1A1 deficiency; Gilbert: mild benign', 'Gilbert fasting↑ unconjugated, harmless; CN-I needs aggressive therapy.', 'Davidson-Genetics'],
  ['Phototherapy side effect to monitor?', ['Dehydration/insensible loss + eye protection + temperature', 'No monitoring', 'Bleeding only', 'Rash only'], 'Dehydration/insensible loss + eye protection + temperature', 'Increase fluids, shield eyes, monitor temp + TSB q4–6h.', 'AAP-Neonatal'],
  ['ABO incompatibility (O mother, A/B baby)?', ['DAT may be weakly +; spherocytes; early jaundice', 'Never causes jaundice', 'Always severe hydrops', 'Only Rh matters'], 'DAT may be weakly +; spherocytes; early jaundice', 'Most common hemolytic cause; usually mild–moderate; phototherapy suffices.', 'Nelson-Neonatology'],
  ['Yemen EPI-relevant: sepsis + jaundice neonate?', ['Sepsis workup + empiric ampicillin + cefotaxime', 'Vitamins only', 'Herbs', 'Wait'], 'Sepsis workup + empiric ampicillin + cefotaxime', 'Neonatal sepsis mimics metabolic causes; LP if indicated.', 'Yemen-IMCI'],
  ['Stop phototherapy when?', ['TSB 2–3 mg/dL below threshold + rebound check in 24h', 'Skin looks better only', 'After fixed 48h', 'Never stop'], 'TSB 2–3 mg/dL below threshold + rebound check in 24h', 'Rebound common (hemolysis); follow-up TSB within a day.', 'AAP-Neonatal'],
];
const ins = db.prepare('INSERT INTO Question_Bank (topic_id, question_type, question_text, options_json, correct_answer, explanation, exam_source) VALUES (?,?,?,?,?,?,?)');
db.exec('BEGIN');
for (const [stem, opts, ans, exp, src] of Q) ins.run(tid, 'mcq_single', `[Neonatal Jaundice] ${stem}`, JSON.stringify({ A: opts[0], B: opts[1], C: opts[2], D: opts[3] }), ans, exp, src);
db.exec('COMMIT');
console.log('jaundice pack added:', Q.length);
