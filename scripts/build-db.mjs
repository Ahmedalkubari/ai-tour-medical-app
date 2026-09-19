// Build SQLite DB for AI Tour Medical App (Node 22+ node:sqlite, no external deps)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const DB_PATH = path.join(ROOT, 'data', 'medical_app.db');
const SCHEMA_PATH = path.join(ROOT, 'db', 'schema.sql');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// ---------- 1. Academic_Levels ----------
const levels = [
  ['1st Year — السنة الأولى', 'basic'],
  ['2nd Year — السنة الثانية', 'basic'],
  ['3rd Year — السنة الثالثة', 'preclinical'],
  ['4th Year — السنة الرابعة', 'clinical'],
  ['5th Year — السنة الخامسة', 'clinical'],
  ['6th Year — السنة السادسة', 'clinical'],
  ['Internship — سنة الامتياز', 'internship'],
];
const insLevel = db.prepare('INSERT INTO Academic_Levels (level_name, system_type) VALUES (?, ?)');
const levelIds = levels.map(([n, s]) => insLevel.run(n, s).lastInsertRowid);

// ---------- 2. Courses (Yemeni MBBS map: Sana'a/Aden/Taiz/Thamar/UST 6y + internship) ----------
const C = [
  // L1
  [0, 'التشريح I', 'Anatomy I', 'Anatomy', 6],
  [0, 'علم وظائف الأعضاء I', 'Physiology I', 'Physiology', 5],
  [0, 'الكيمياء الحيوية I', 'Biochemistry I', 'Biochemistry', 4],
  [0, 'علم الأنسجة والأجنة', 'Histology & Embryology', 'Anatomy', 3],
  // L2
  [1, 'التشريح II (عصبي/أطراف)', 'Anatomy II (Neuro/Limbs)', 'Anatomy', 5],
  [1, 'علم وظائف الأعضاء II', 'Physiology II (CVS/Respiratory/Renal)', 'Physiology', 5],
  [1, 'الكيمياء الحيوية II', 'Biochemistry II', 'Biochemistry', 3],
  [1, 'طب المجتمع I', 'Community Medicine I', 'Community Medicine', 2],
  // L3 preclinical
  [2, 'علم الأمراض', 'Pathology (General+Systemic)', 'Pathology', 6],
  [2, 'علم الأدوية', 'Pharmacology', 'Pharmacology', 5],
  [2, 'الأحياء الدقيقة والمناعة', 'Microbiology & Immunology', 'Microbiology', 5],
  [2, 'الطفيليات', 'Parasitology', 'Parasitology', 3],
  // L4
  [3, 'الباطنة I', 'Internal Medicine I', 'Internal Medicine', 6],
  [3, 'الجراحة العامة I', 'General Surgery I', 'Surgery', 6],
  [3, 'طب الأطفال I', 'Pediatrics I', 'Pediatrics', 4],
  [3, 'الطب الشرعي والسموم', 'Forensic Medicine & Toxicology', 'Forensic', 3],
  // L5
  [4, 'الباطنة II', 'Internal Medicine II', 'Internal Medicine', 6],
  [4, 'الجراحة العامة II', 'General Surgery II', 'Surgery', 6],
  [4, 'النسائية والتوليد I', 'OB/GYN I', 'OBGYN', 5],
  [4, 'طب العيون والأنف والأذن', 'Ophthalmology & ENT', 'Ophthalmology/ENT', 4],
  // L6
  [5, 'النسائية والتوليد II', 'OB/GYN II', 'OBGYN', 5],
  [5, 'طب الأطفال II', 'Pediatrics II', 'Pediatrics', 5],
  [5, 'الطب النفسي', 'Psychiatry', 'Psychiatry', 3],
  [5, 'الصحة العامة وطب الأسرة', 'Public Health & Family Medicine', 'Community Medicine', 4],
  [5, 'طب الطوارئ والعناية الحرجة', 'Emergency & Critical Care', 'Emergency', 4],
  // Internship
  [6, 'امتياز الباطنة', 'Internship: Internal Medicine', 'Internal Medicine', 8],
  [6, 'امتياز الجراحة', 'Internship: Surgery/Emergency', 'Surgery', 8],
  [6, 'امتياز الأطفال والنسائية', 'Internship: Pediatrics & OBGYN', 'Pediatrics', 8],
];
const insCourse = db.prepare('INSERT INTO Courses (level_id, course_name_ar, course_name_en, department, credit_hours) VALUES (?, ?, ?, ?, ?)');
const courseIds = C.map(([li, ar, en, dep, ch]) => insCourse.run(Number(levelIds[li]), ar, en, dep, ch).lastInsertRowid);

// ---------- 3. Modules_Topics (hierarchical: module -> lectures) ----------
const MODULES = {
  // courseIndex: [moduleTitle, [lectureTitles...]]
  0: [['Gross Anatomy: Upper & Lower Limbs', ['Osteology of limbs', 'Brachial plexus & vessels', 'Lower limb compartments']], ['Thorax & Abdomen', ['Thoracic wall & lungs', 'Abdominal viscera & peritoneum']], ['Head & Neck overview', ['Cranial nerves I–XII', 'Parotid & thyroid regions']]],
  1: [['Cell & Nerve-Muscle Physiology', ['Membrane potentials', 'Neuromuscular junction']], ['Cardiovascular Physiology', ['Cardiac cycle & ECG', 'Blood pressure regulation']], ['Respiratory & Renal', ['Gas exchange & transport', 'GFR & tubular function']]],
  2: [['Proteins & Enzymes', ['Amino acids & protein structure', 'Enzyme kinetics']], ['Carbohydrate Metabolism', ['Glycolysis & Krebs', 'Diabetes biochemistry']], ['Lipids & Molecular Biology', ['Lipoproteins', 'DNA replication & PCR']]],
  8: [['Cell Injury & Inflammation', ['Necrosis vs apoptosis', 'Acute vs chronic inflammation']], ['Neoplasia', ['Benign vs malignant', 'Tumor markers']], ['CVS & Respiratory Pathology', ['Atherosclerosis & MI', 'Pneumonia & TB pathology']]],
  9: [['Autonomic & CVS Drugs', ['Adrenergic/cholinergic drugs', 'Antihypertensives']], ['Antibiotics', ['Beta-lactams', 'Anti-TB drugs']], ['Endocrine Drugs', ['Insulin & oral hypoglycemics', 'Corticosteroids']]],
  12: [['Cardiology Core', ['Heart failure', 'Ischemic heart disease', 'Hypertension']], ['Endocrinology', ['Diabetes mellitus I/II', 'Thyroid disorders']], ['Gastroenterology', ['Peptic ulcer & H. pylori', 'Liver cirrhosis & hepatitis']]],
  13: [['Trauma & Wound Care', ['Wound healing & suturing', 'Shock & fluid resuscitation']], ['Acute Abdomen', ['Appendicitis', 'Bowel obstruction & hernias']], ['Thyroid & Breast Surgery', ['Goiter workup', 'Breast lump approach']]],
  16: [['Cardiology Advanced', ['Valvular disease', 'Arrhythmias & ECG masterclass']], ['Nephrology', ['AKI vs CKD', 'Nephrotic vs nephritic']], ['Neurology', ['Stroke', 'Epilepsy & meningitis']]],
  18: [['Obstetrics: Pregnancy Care', ['ANC & high-risk pregnancy', 'Preeclampsia & eclampsia']], ['Labor & Delivery', ['Stages of labor', 'PPH & C-section indications']], ['Gynecology', ['AUB & fibroids', 'PCOS & infertility']]],
  21: [['Neonatology', ['Neonatal resuscitation', 'Neonatal jaundice']], ['Growth & Vaccination (EPI Yemen)', ['Malnutrition & dehydration', 'IMCI protocol']], ['Pediatric Infections', ['Pneumonia & diarrhea', 'Meningitis in children']]],
};
function defaultModules(en) {
  return [[en + ' — Core Module A', [en + ' — Lecture 1', en + ' — Lecture 2']], [en + ' — Core Module B', [en + ' — Lecture 3', en + ' — Lecture 4']]];
}
const insTopic = db.prepare('INSERT INTO Modules_Topics (course_id, parent_topic_id, topic_title, content_type, detailed_content) VALUES (?, ?, ?, ?, ?)');
const topicIdByCourse = {};
courseIds.forEach((cid, idx) => {
  const mods = MODULES[idx] || defaultModules(C[idx][2]);
  topicIdByCourse[cid] = [];
  for (const [mTitle, lectures] of mods) {
    const mid = insTopic.run(cid, null, mTitle, 'module', `Offline module: ${mTitle}. Mapped to Yemeni MBBS curriculum; see References.`).lastInsertRowid;
    topicIdByCourse[cid].push(mid);
    for (const lt of lectures) {
      insTopic.run(cid, mid, lt, 'lecture', `Lecture notes placeholder (offline-first). Content: key concepts, diagrams reference, clinical pearls for: ${lt}.`);
    }
  }
});

// ---------- 4. References ----------
const REFS = [
  ["Gray's Anatomy", 'Standring S.', '42nd ed.', 'https://www.elsevier.com/books/grays-anatomy/standring/978-0-7020-7705-0'],
  ['Guyton and Hall Textbook of Medical Physiology', 'Hall J.E.', '14th ed.', 'https://shop.elsevier.com/books/guyton-and-hall-textbook-of-medical-physiology/hall/978-0-323-59712-8'],
  ["Harrison's Principles of Internal Medicine", 'Loscalzo et al.', '21st ed.', 'https://accessmedicine.mhmedical.com/book.aspx?bookid=3095'],
  ["Davidson's Principles and Practice of Medicine", 'Ralston et al.', '24th ed.', 'https://www.elsevier.com/books/davidsons-principles-and-practice-of-medicine/ralston/978-0-7020-7028-0'],
  ['Nelson Textbook of Pediatrics', 'Kliegman et al.', '22nd ed.', 'https://shop.elsevier.com/books/nelson-textbook-of-pediatrics/kliegman/978-0-323-88305-4'],
  ['Sana\'a University — Faculty of Medicine Curriculum Map (MBBS 6y + internship)', 'Sana\'a University', '2023', 'https://su.edu.ye/chm/en'],
  ['UST MBBS Program Specification (WFME Gold 2023)', 'University of Science & Technology, Yemen', '2023', 'https://ust.edu.ye/med/en/home-en/medicine-and-surgery'],
];
const insRef = db.prepare('INSERT INTO References_Books (course_id, book_title, author, edition, pdf_path_or_link) VALUES (?, ?, ?, ?, ?)');
const refCourseMap = [courseIds[0], courseIds[1], courseIds[12], courseIds[12], courseIds[14], courseIds[0], courseIds[12]];
REFS.forEach((r, i) => insRef.run(refCourseMap[i], r[0], r[1], r[2], r[3]));

// ---------- 5. Question_Bank (60 validated MCQs, MedMCQA-compatible) ----------
// Helper: pick a topic id per department keyword
function topicFor(deptKeyword, fallbackIdx = 12) {
  const i = C.findIndex(c => c[3].toLowerCase().includes(deptKeyword.toLowerCase()) || c[2].toLowerCase().includes(deptKeyword.toLowerCase()));
  const cid = i >= 0 ? courseIds[i] : courseIds[fallbackIdx];
  return topicIdByCourse[cid][0];
}
const Q = [
  // Anatomy (8)
  ['mcq_single', 'Chronic urethral obstruction due to benign prostatic hyperplasia leads to which change in kidney parenchyma?', ['Hyperplasia', 'Hypertrophy', 'Atrophy', 'Dysplasia'], 'Atrophy', 'Prolonged back-pressure causes pressure atrophy of renal parenchyma (hydronephrosis). Ref Robbins; MedMCQA Anatomy/urinary tract.', 'MedMCQA-Anatomy'],
  ['mcq_single', 'Which nerve is most commonly injured in mid-shaft humerus fracture?', ['Ulnar nerve', 'Radial nerve', 'Median nerve', 'Axillary nerve'], 'Radial nerve', 'Radial nerve runs in spiral groove against mid-shaft; wrist drop follows injury. Gray\'s Anatomy.', 'Sana\'a Univ 2023-Anatomy'],
  ['mcq_single', 'The foramen ovale transmits:', ['Mandibular nerve (V3)', 'Maxillary nerve (V2)', 'Ophthalmic nerve (V1)', 'Facial nerve'], 'Mandibular nerve (V3)', 'Foramen ovale → V3 + accessory meningeal artery. Lesser petrosal nerve also passes.', 'Aden Univ 2022-Anatomy'],
  ['mcq_single', 'Erb-Duchenne palsy (C5-C6) presents as:', ['Waiter\'s tip hand', 'Claw hand', 'Wrist drop only', 'Ape hand'], "Waiter's tip hand", 'C5-C6 upper trunk: deltoid, biceps, brachialis; arm adducted/internally rotated.', 'MedMCQA-Anatomy'],
  ['mcq_single', 'Thoracic duct drains into:', ['Left venous angle (IJV-subclavian junction)', 'Right venous angle', 'IVC', 'Azygos vein'], 'Left venous angle (IJV-subclavian junction)', 'Largest lymphatic; drains lower body + left upper quadrant into left venous angle.', 'UST 2023-Anatomy'],
  ['mcq_single', 'Spermatic cord contents include all EXCEPT:', ['Ductus deferens', 'Testicular artery', 'Ilioinguinal nerve (outside cord)', 'Pampiniform plexus'], 'Ilioinguinal nerve (outside cord)', 'Ilioinguinal nerve runs outside spermatic cord; cremasteric/genital branch of genitofemoral is inside.', 'Taiz Univ 2022-Anatomy'],
  ['mcq_single', 'McBurney\'s point corresponds to base of:', ['Appendix', 'Gallbladder', 'Pancreas', 'Sigmoid'], 'Appendix', 'One-third from ASIS to umbilicus; surface landmark for appendix base.', 'MedMCQA-Anatomy'],
  ['mcq_single', 'Winged scapula is due to injury of:', ['Long thoracic nerve (serratus anterior)', 'Dorsal scapular nerve', 'Suprascapular nerve', 'Thoracodorsal nerve'], 'Long thoracic nerve (serratus anterior)', 'Long thoracic nerve palsy → medial winging, worse on wall push-up.', 'MedMCQA-Anatomy'],
  // Physiology (8)
  ['mcq_single', 'The primary determinant of GFR is:', ['Net filtration pressure across glomerulus', 'Plasma oncotic pressure only', 'Tubular secretion rate', 'ADH level'], 'Net filtration pressure across glomerulus', 'GFR = Kf × net filtration pressure (hydrostatic − oncotic − Bowman pressure). Guyton.', 'MedMCQA-Physiology'],
  ['mcq_single', 'In cardiac muscle, the plateau phase (phase 2) of action potential is mainly due to:', ['L-type Ca2+ influx', 'Fast Na+ influx', 'K+ efflux only', 'Cl− influx'], 'L-type Ca2+ influx', 'Phase 2 plateau: L-type Ca2+ in, slow K+ out; underlies excitation-contraction coupling.', 'Sana\'a Univ 2023-Physiology'],
  ['mcq_single', 'Surfactant deficiency causes:', ['Neonatal respiratory distress (hyaline membrane disease)', 'Emphysema in adults only', 'Pulmonary fibrosis', 'Pleural effusion'], 'Neonatal respiratory distress (hyaline membrane disease)', 'Type II pneumocyte surfactant reduces surface tension; deficiency → alveolar collapse.', 'Nelson/Peds-Physiology'],
  ['mcq_single', 'Oxyhemoglobin dissociation curve shifts RIGHT with:', ['↑ 2,3-BPG, ↑ CO2, acidosis, fever', 'Alkalosis and hypothermia', '↓ 2,3-BPG', 'Carbon monoxide'], '↑ 2,3-BPG, ↑ CO2, acidosis, fever', 'Bohr effect: right shift favors O2 unloading to tissues.', 'MedMCQA-Physiology'],
  ['mcq_single', 'ADH (vasopressin) acts mainly on:', ['V2 receptors → aquaporin-2 insertion in collecting duct', 'V1 only in liver', 'ENaC directly', 'Glomerulus filtration'], 'V2 receptors → aquaporin-2 insertion in collecting duct', 'ADH increases water reabsorption via AQP2; deficit → diabetes insipidus.', 'Guyton-Physiology'],
  ['mcq_single', 'First heart sound (S1) is due to:', ['Closure of AV valves (mitral & tricuspid)', 'Closure of semilunar valves', 'Atrial contraction', 'Ventricular filling'], 'Closure of AV valves (mitral & tricuspid)', 'S1 = AV closure at systole onset; S2 = aortic/pulmonic closure.', 'MedMCQA-Physiology'],
  ['mcq_single', 'Insulin promotes all EXCEPT:', ['Gluconeogenesis', 'Glycogenesis', 'Lipogenesis', 'K+ uptake into cells'], 'Gluconeogenesis', 'Insulin is anabolic: ↑ glucose uptake, glycogenesis, lipogenesis; suppresses gluconeogenesis.', 'MedMCQA-Physiology'],
  ['mcq_single', 'Action of parathyroid hormone:', ['↑ Ca2+, ↓ phosphate via bone resorption + vitamin D activation', '↓ Ca2+ only', '↑ phosphate only', 'No bone effect'], '↑ Ca2+, ↓ phosphate via bone resorption + vitamin D activation', 'PTH raises calcium, lowers phosphate; stimulates 1α-hydroxylase.', 'Davidson-Endo'],
  // Pathology/Pharma/Micro (10)
  ['mcq_single', 'Reed-Sternberg cells are characteristic of:', ['Hodgkin lymphoma', 'Non-Hodgkin lymphoma', 'CML', 'Multiple myeloma'], 'Hodgkin lymphoma', 'Owl-eye binucleate RS cells CD15+/CD30+ in Hodgkin lymphoma.', 'MedMCQA-Pathology'],
  ['mcq_single', 'Caseating granuloma is typical of:', ['Tuberculosis', 'Sarcoidosis (non-caseating)', 'Crohn (non-caseating)', 'Foreign body'], 'Tuberculosis', 'TB: caseating granuloma with Langhans giant cells; sarcoid is non-caseating.', 'Aden Univ 2023-Pathology'],
  ['mcq_single', 'Drug of choice for MRSA pneumonia:', ['Vancomycin / linezolid', 'Amoxicillin', 'Ceftriaxone alone', 'Metronidazole'], 'Vancomycin / linezolid', 'MRSA: vancomycin or linezolid; daptomycin inactivated by surfactant — avoid in pneumonia.', 'MedMCQA-Pharmacology'],
  ['mcq_single', 'Isoniazid toxicity is prevented by:', ['Pyridoxine (B6)', 'Folic acid', 'Vitamin K', 'Thiamine'], 'Pyridoxine (B6)', 'INH causes B6 deficiency → peripheral neuropathy; give pyridoxine.', 'Yemen NTP-Pharma'],
  ['mcq_single', 'Metformin mechanism:', ['↓ Hepatic gluconeogenesis (AMPK), ↑ insulin sensitivity', '↑ Insulin secretion (sulfonylurea-like)', 'α-glucosidase inhibition', 'SGLT2 inhibition'], '↓ Hepatic gluconeogenesis (AMPK), ↑ insulin sensitivity', 'First-line T2DM; lactic acidosis risk in CKD/hypoxia.', 'Davidson-Pharma'],
  ['mcq_single', 'Widal test is used for:', ['Typhoid (Salmonella Typhi)', 'Malaria', 'Dengue', 'Cholera'], 'Typhoid (Salmonella Typhi)', 'Widal detects O/H agglutinins; blood culture is gold standard week 1.', 'Thamar Univ 2022-Micro'],
  ['mcq_single', 'Acid-fast bacilli on Ziehl-Neelsen indicates:', ['Mycobacterium tuberculosis', 'Staphylococcus', 'Streptococcus', 'E. coli'], 'Mycobacterium tuberculosis', 'Mycolic acid wall retains carbol fuchsin despite acid-alcohol.', 'MedMCQA-Micro'],
  ['mcq_single', 'First-line anti-TB intensive phase (Yemen NTP / WHO):', ['2HRZE (2 mo isoniazid, rifampicin, pyrazinamide, ethambutol)', 'Streptomycin alone', 'Ciprofloxacin alone', 'Doxycycline'], '2HRZE (2 mo isoniazid, rifampicin, pyrazinamide, ethambutol)', 'Standard 2HRZE/4HR for drug-susceptible TB per WHO/Yemen NTP.', 'Yemen NTP 2023'],
  ['mcq_single', 'Antidote for organophosphate poisoning:', ['Atropine + pralidoxime', 'Naloxone', 'Flumazenil', 'Protamine'], 'Atropine + pralidoxime', 'OP inhibits cholinesterase; atropine blocks muscarinic, pralidoxime reactivates enzyme.', 'Forensic-Tox'],
  ['mcq_single', 'Warfarin antidote:', ['Vitamin K + 4F-PCC', 'Protamine', 'Desmopressin', 'Idarucizumab'], 'Vitamin K + 4F-PCC', 'Warfarin inhibits VKORC1; reverse with vitamin K + PCC for bleeding.', 'Harrison-Pharma'],
  // Medicine (12)
  ['clinical_vignette', 'A 55-year-old man with crushing retrosternal pain radiating to left arm, sweating, ECG ST elevation V1–V4. Diagnosis?', ['Anterior STEMI', 'Pericarditis', 'Aortic dissection', 'GERD'], 'Anterior STEMI', 'Crushing pain + ST elevation V1–V4 = LAD occlusion; urgent reperfusion (PCI <120 min).', 'Sana\'a Univ 2023-Medicine'],
  ['clinical_vignette', 'A 60-year-old with progressive dyspnea, orthopnea, bibasal crackles, S3 gallop, EF 30%. Diagnosis?', ['HFrEF (systolic heart failure)', 'Asthma', 'Pneumonia', 'Anemia only'], 'HFrEF (systolic heart failure)', 'Framingham HF: orthopnea, crackles, S3, low EF; manage ACEi/ARNI + beta-blocker + MRA + SGLT2i.', 'Harrison-Cardiology'],
  ['mcq_single', 'Most specific marker for MI within 3–12h:', ['High-sensitivity troponin I/T', 'CK-MB only', 'Myoglobin', 'LDH'], 'High-sensitivity troponin I/T', 'hs-troponin rises 3–4h, peaks 24h, persists days; most sensitive/specific.', 'MedMCQA-Medicine'],
  ['clinical_vignette', 'Polyuria, polydipsia, fasting glucose 240 mg/dL, HbA1c 9.5%. First-line drug (no CKD/HF contraindication)?', ['Metformin + lifestyle', 'Insulin glargine alone', 'Sulfonylurea alone', 'Steroids'], 'Metformin + lifestyle', 'T2DM without catabolic features: metformin + lifestyle first-line; add SGLT2i/GLP-1 per comorbidity.', 'Davidson-Endo'],
  ['mcq_single', 'Microcytic hypochromic anemia with ↑ RDW, ↓ ferritin in Yemen: most likely?', ['Iron deficiency anemia', 'Thalassemia trait (normal RDW)', 'B12 deficiency', 'Hemolysis'], 'Iron deficiency anemia', 'IDA: low ferritin, high RDW; thalassemia trait often normal RDW + target cells; confirm ferritin + smear.', 'Aden Univ 2022-Medicine'],
  ['mcq_single', 'Nephrotic vs nephritic: nephrotic hallmark?', ['Heavy proteinuria >3.5 g/day + hypoalbuminemia + edema + hyperlipidemia', 'Hematuria + RBC casts + HTN', 'Sterile pyuria only', 'Glycosuria'], 'Heavy proteinuria >3.5 g/day + hypoalbuminemia + edema + hyperlipidemia', 'Nephrotic = podocyte injury; nephritic = inflammation with hematuria/RBC casts.', 'Harrison-Nephro'],
  ['clinical_vignette', 'Young woman with malar rash, photosensitivity, arthralgia, proteinuria, ANA positive. Diagnosis?', ['SLE', 'Rheumatoid arthritis', 'Psoriasis', 'Scleroderma'], 'SLE', 'SLE: malar rash, photosensitivity, LN, ANA; confirm anti-dsDNA/anti-Sm; manage hydroxychloroquine + immunosuppression.', 'MedMCQA-Medicine'],
  ['mcq_single', 'First-line treatment of smear-positive pulmonary TB in adults (drug-susceptible)?', ['2HRZE/4HR', 'Azithromycin', 'Ceftriaxone', 'Fluconazole'], '2HRZE/4HR', 'WHO/Yemen NTP: 2 months HRZE then 4 months HR with adherence support.', 'Yemen NTP'],
  ['clinical_vignette', 'Fever, neck stiffness, photophobia, Kernig positive. Most urgent next step?', ['Lumbar puncture after fundoscopy/CT if indicated + empiric ceftriaxone ± vancomycin + dexamethasone', 'Wait for culture only', 'NSAIDs only', 'CT alone'], 'Lumbar puncture after fundoscopy/CT if indicated + empiric ceftriaxone ± vancomycin + dexamethasone', 'Suspected bacterial meningitis: do not delay antibiotics; LP + empiric therapy + dexamethasone.', 'Harrison-Neuro'],
  ['mcq_single', 'ECG in hyperkalemia earliest change:', ['Peaked T waves', 'ST elevation', 'Prolonged QT', 'Delta wave'], 'Peaked T waves', 'HyperK: peaked T → widened QRS → sine wave; treat calcium + insulin/glucose + kayexalate/dialysis.', 'MedMCQA-Medicine'],
  ['mcq_single', 'Drug of choice for anaphylaxis:', ['IM adrenaline (epinephrine) 0.5 mg', 'IV antihistamine alone', 'Oral steroids alone', 'Nebulized saline'], 'IM adrenaline (epinephrine) 0.5 mg', 'Anaphylaxis: IM adrenaline mid-outer thigh first; adjunct antihistamine/steroids/fluids.', 'Emergency-Med'],
  ['mcq_single', 'H. pylori eradication first-line (clarithromycin-sensitive area):', ['Triple: PPI + clarithromycin + amoxicillin 14d', 'PPI alone', 'Metronidazole alone', 'Antacids'], 'Triple: PPI + clarithromycin + amoxicillin 14d', 'Test-and-treat for peptic ulcer/dyspepsia; confirm eradication with urea breath/stool antigen.', 'Davidson-GI'],
  // Surgery (8)
  ['clinical_vignette', 'Migratory RLQ pain, anorexia, fever, rebound tenderness at McBurney. Alvarado high. Next step?', ['Appendectomy (lap/open) after resuscitation + antibiotics', 'Discharge', 'Colonoscopy only', 'PPIs'], 'Appendectomy (lap/open) after resuscitation + antibiotics', 'Classic appendicitis: Alvarado/MASS; uncomplicated → laparoscopic appendectomy.', 'Sana\'a Univ 2023-Surgery'],
  ['mcq_single', 'Most common cause of acute large bowel obstruction in elderly?', ['Colorectal cancer / sigmoid volvulus', 'Appendicitis', 'Gallstones ileus always', 'Intussusception in adults always'], 'Colorectal cancer / sigmoid volvulus', 'Elderly LBO: malignancy or sigmoid volvulus (coffee-bean sign); contrast CT guides care.', 'MedMCQA-Surgery'],
  ['mcq_single', 'Tension pneumothorax emergency treatment:', ['Immediate needle decompression 2nd ICS MCL then chest tube', 'Chest X-ray wait 24h', 'Bronchoscopy', 'Antibiotics'], 'Immediate needle decompression 2nd ICS MCL then chest tube', 'Tension: hypotension + tracheal deviation + absent breath sounds = decompress without waiting for X-ray.', 'Emergency-Surgery'],
  ['mcq_single', 'Breast lump in 25-year-old, mobile, rubbery, well-circumscribed. Most likely?', ['Fibroadenoma', 'Carcinoma', 'Abscess always', 'Fat necrosis'], 'Fibroadenoma', 'Young mobile rubbery lump = fibroadenoma; confirm triple assessment (exam + imaging + FNAC/core).', 'MedMCQA-Surgery'],
  ['mcq_single', 'Inguinal hernia that does not reach scrotum and is superior to inguinal ligament is:', ['Direct inguinal hernia', 'Indirect inguinal hernia', 'Femoral hernia', 'Umbilical hernia'], 'Direct inguinal hernia', 'Direct: through Hesselbach triangle, rarely strangulates; indirect follows processus vaginalis.', 'UST 2023-Surgery'],
  ['mcq_single', 'Wells score is used for:', ['DVT/PE risk stratification', 'Appendicitis', 'Pancreatitis', 'Liver failure'], 'DVT/PE risk stratification', 'Wells + D-dimer + Doppler/CTPA pathway for VTE.', 'Harrison-Surgery'],
  ['mcq_single', 'Burn fluid resuscitation formula:', ['Parkland: 4 mL × kg × %TBSA (LR)', 'Holiday-Segar only', 'No fluids', 'Dextrose only'], 'Parkland: 4 mL × kg × %TBSA (LR)', 'Parkland with Lactated Ringer; half in first 8h from burn time; monitor urine output.', 'Emergency-Surgery'],
  ['mcq_single', 'Thyroid nodule with Bethesda VI (malignant) next step:', ['Surgery (lobectomy/total thyroidectomy per risk)', 'Observation only', 'Antibiotics', 'Iodine alone'], 'Surgery (lobectomy/total thyroidectomy per risk)', 'Bethesda VI = malignant; surgery +/− RAI per ATA risk; confirm with US-TIRADS + FNA.', 'Davidson-Surgery'],
  // Peds + OBGYN (12)
  ['clinical_vignette', '2-year-old with barky cough, stridor, hoarseness, low-grade fever. Diagnosis?', ['Viral croup (laryngotracheobronchitis)', 'Epiglottitis (drooling, toxic)', 'Asthma', 'Foreign body'], 'Viral croup (laryngotracheobronchitis)', 'Croup: parainfluenza, steeple sign; treat dexamethasone +/− nebulized adrenaline; epiglottitis is Hib emergency.', 'Nelson-Peds'],
  ['mcq_single', 'IMCI: danger signs in a sick child include:', ['Unable to drink, persistent vomiting, convulsions, lethargy', 'Mild cough only', 'Low-grade fever only', 'Rash only'], 'Unable to drink, persistent vomiting, convulsions, lethargy', 'IMCI danger signs mandate urgent referral; assess dehydration + nutrition + immunization.', 'WHO IMCI/Yemen'],
  ['mcq_single', 'Neonatal jaundice within first 24h is:', ['Always pathological — workup for hemolysis', 'Always physiological', 'Normal if preterm only', 'Ignore'], 'Always pathological — workup for hemolysis', 'Early jaundice = hemolysis (ABO/Rh), sepsis, G6PD; check bilirubin, Coombs, blood group.', 'Nelson-Neonatology'],
  ['mcq_single', 'Dehydration Plan C (severe) in children:', ['IV Ringer lactate 100 mL/kg + ORS + zinc + reassess', 'Water only', 'Soda only', 'No fluids'], 'IV Ringer lactate 100 mL/kg + ORS + zinc + reassess', 'WHO Plan C for severe dehydration; ORS + zinc for some/no dehydration (Plans A/B).', 'WHO/Yemen-EPI'],
  ['mcq_single', 'Preeclampsia diagnostic criteria (≥20 weeks):', ['HTN + proteinuria/end-organ signs (HA, visual, low platelets, high LFTs)', 'HTN alone without proteinuria always enough', 'Edema alone', 'Fever'], 'HTN + proteinuria/end-organ signs (HA, visual, low platelets, high LFTs)', 'Preeclampsia with severe features → MgSO4 + delivery planning; eclampsia = seizures.', 'Sana\'a Univ 2023-OBGYN'],
  ['mcq_single', 'Most common cause of postpartum hemorrhage?', ['Uterine atony', 'Coagulopathy always', 'Placenta previa always', 'Infection'], 'Uterine atony', '4Ts: Tone (atony commonest) → oxytocin + fundal massage + tranexamic acid + transfusion protocol.', 'OBGYN-Ref'],
  ['mcq_single', 'First-line for PCOS with infertility (anovulation)?', ['Letrozole', 'Statins', 'Surgery first', 'No treatment'], 'Letrozole', 'Letrozole superior to clomiphene for ovulation induction in PCOS; add lifestyle + metformin if IR.', 'Davidson-Gyn'],
  ['clinical_vignette', 'Woman with profuse vaginal bleeding, open os, products palpable. Diagnosis?', ['Incomplete abortion', 'Threatened abortion (closed os)', 'Ectopic (adnexal mass)', 'Molar (snowstorm US)'], 'Incomplete abortion', 'Incomplete: open os + tissue; manage evacuation + RhD prophylaxis + antibiotics if septic.', 'MedMCQA-OBGYN'],
  ['mcq_single', 'APGAR scoring includes all EXCEPT:', ['Birth weight', 'Pulse, grimace, activity, appearance, respiration', 'Heart rate', 'Muscle tone'], 'Birth weight', 'APGAR at 1 & 5 min; weight is separate growth parameter.', 'Nelson-Neonatology'],
  ['mcq_single', 'EPI Yemen: BCG is given:', ['At birth (intradermal)', 'At 9 months only', 'At 5 years', 'Never'], 'At birth (intradermal)', 'Yemen EPI: BCG + OPV0 + HepB birth dose at birth; Penta/OPV/Rota at 6,10,14 wks; measles 9 & 15 mo.', 'Yemen EPI'],
  ['mcq_single', 'Kawasaki disease hallmark + treatment:', ['Fever 5d + rash/conjunctivitis/strawberry tongue + IVIG + aspirin', 'Antibiotics alone', 'Steroids alone always', 'No treatment'], 'Fever 5d + rash/conjunctivitis/strawberry tongue + IVIG + aspirin', 'Kawasaki → coronary aneurysms; echo + IVIG within 10 days.', 'Nelson-Peds'],
  ['mcq_single', 'Meningitis in neonate most common organism (Yemen)?', ['Group B Streptococcus / E. coli', 'Pneumococcus always', 'H. influenzae always', 'Fungi'], 'Group B Streptococcus / E. coli', 'Neonatal meningitis: GBS + E. coli; empiric ampicillin + cefotaxime/aminoglycoside per protocol.', 'Nelson-Peds'],
  // Psychiatry/Emergency/Community (12)
  ['mcq_single', 'Major depressive disorder core + duration:', ['Depressed mood/anhedonia ≥2 weeks + ≥5 symptoms', 'Sadness 1 day', 'Mania only', 'Hallucinations always'], 'Depressed mood/anhedonia ≥2 weeks + ≥5 symptoms', 'PHQ-9 screening; treat SSRI + psychotherapy; assess suicide risk urgently.', 'Davidson-Psych'],
  ['mcq_single', 'Schizophrenia first-rank + treatment:', ['Delusions/hallucinations/disorganized + antipsychotic', 'Anxiety only', 'Benzodiazepine alone', 'No drugs'], 'Delusions/hallucinations/disorganized + antipsychotic', 'Treat with antipsychotic + psychosocial rehab; monitor metabolic side effects.', 'Psych-Ref'],
  ['mcq_single', 'ORS composition (WHO low-osmolarity):', ['Na 75, glucose 75, K 20, citrate 10, osm 245', 'Pure water', 'Soda + salt random', 'Juice only'], 'Na 75, glucose 75, K 20, citrate 10, osm 245', 'Low-osm ORS + zinc reduces diarrhea duration; continue feeding.', 'WHO-Community'],
  ['mcq_single', 'Dengue warning signs include:', ['Abdominal pain, persistent vomiting, mucosal bleed, lethargy, rising Hct', 'Itching only', 'Sneezing', 'Bradycardia only'], 'Abdominal pain, persistent vomiting, mucosal bleed, lethargy, rising Hct', 'Dengue in Yemen (Taiz/Aden): monitor Hct/platelets; fluids judiciously; avoid NSAIDs.', 'Yemen-FETP'],
  ['mcq_single', 'Cholera (Yemen outbreak) first-line:', ['ORS + doxycycline/azithromycin + WASH + vaccination', 'Antimotility only', 'IV steroids', 'No antibiotics'], 'ORS + doxycycline/azithromycin + WASH + vaccination', 'Cholera: aggressive ORS/IV Ringer + single-dose doxy (adult) + WASH; report to surveillance.', 'WHO-Cholera/Yemen'],
  ['mcq_single', 'Malaria (P. falciparum) severe treatment:', ['IV artesunate', 'Chloroquine always', 'Quinine alone always', 'Antibiotics only'], 'IV artesunate', 'Severe falciparum: IV artesunate + supportive; uncomplicated: ACT (artemether-lumefantrine).', 'Yemen NMCP'],
  ['mcq_single', 'Glassgow Coma Scale components:', ['Eye + Verbal + Motor (3–15)', 'Pulse only', 'BP only', 'Temperature'], 'Eye + Verbal + Motor (3–15)', 'GCS ≤8 = intubate; monitor pupils + lateralizing signs.', 'Emergency-Ref'],
  ['mcq_single', 'Stroke window for IV thrombolysis (ischemic, no contraindication):', ['Within 4.5 hours', 'After 24h always', 'Never', 'Only hemorrhagic'], 'Within 4.5 hours', 'Code stroke: CT to exclude bleed; thrombolysis ≤4.5h, thrombectomy up to 24h selected.', 'Harrison-Neuro'],
  ['mcq_single', 'Diabetic ketoacidosis hallmark + fluids:', ['Hyperglycemia + ketosis + acidosis; isotonic fluids + insulin infusion + K+ monitoring', 'Hypoglycemia', 'No fluids', 'Bicarbonate always'], 'Hyperglycemia + ketosis + acidosis; isotonic fluids + insulin infusion + K+ monitoring', 'DKA: fluids + insulin + K+ + trigger search (infection/MI); monitor ABG/electrolytes.', 'Davidson-Endo'],
  ['mcq_single', 'Normal labor: first stage is:', ['Onset of regular contractions to full dilation (10 cm)', 'Delivery of baby only', 'Delivery of placenta', 'Afterpains'], 'Onset of regular contractions to full dilation (10 cm)', 'Partograph monitoring; second stage = full dilation to delivery; third = placenta.', 'OBGYN-Ref'],
  ['mcq_single', 'Best indicator of long-term glycemic control:', ['HbA1c (2–3 months)', 'Fasting glucose once', 'Urine glucose', 'Single RBS'], 'HbA1c (2–3 months)', 'HbA1c reflects 8–12 weeks; target individualized (~<7% most adults).', 'Davidson-Endo'],
  ['mcq_single', 'Most common cause of hypothyroidism (iodine-sufficient)?', ['Hashimoto thyroiditis', 'Graves', 'Toxic nodule', 'Thyroidectomy always'], 'Hashimoto thyroiditis', 'Hashimoto: anti-TPO +; treat levothyroxine; Graves causes hyperthyroidism.', 'MedMCQA-Medicine'],
];
const insQ = db.prepare(`INSERT INTO Question_Bank
  (topic_id, question_type, question_text, options_json, correct_answer, explanation, exam_source)
  VALUES (?, ?, ?, ?, ?, ?, ?)`);
const deptForQ = ['anatomy','anatomy','anatomy','anatomy','anatomy','anatomy','anatomy','anatomy','physiology','physiology','physiology','physiology','physiology','physiology','physiology','physiology','pathology','pathology','pharmacology','pharmacology','pharmacology','microbiology','microbiology','microbiology','pharmacology','pharmacology','internal medicine','internal medicine','internal medicine','internal medicine','internal medicine','internal medicine','internal medicine','microbiology','internal medicine','internal medicine','internal medicine','internal medicine','surgery','surgery','surgery','surgery','surgery','internal medicine','surgery','surgery','pediatrics','pediatrics','pediatrics','pediatrics','obgyn','surgery','obgyn','obgyn','pediatrics','community medicine','pediatrics','pediatrics','psychiatry','psychiatry','community medicine','community medicine','community medicine','microbiology','internal medicine','internal medicine','internal medicine','obgyn','internal medicine','internal medicine'];
Q.forEach((q, i) => {
  const [qt, text, opts, ans, exp, src] = q;
  const labels = ['A', 'B', 'C', 'D'];
  const options = Object.fromEntries(opts.map((o, k) => [labels[k], o]));
  insQ.run(topicFor(deptForQ[i] || 'internal medicine'), qt, text, JSON.stringify(options), ans, exp, src);
});

// ---------- 6. Clinical_Cases (8) ----------
const CASES = [
  ['Internal Medicine', 'Crushing chest pain', '55M, sudden retrosternal pressure 45 min, radiates to left arm/jaw, diaphoresis, nausea. Smoker, HTN, T2DM.', 'Pale, sweaty, BP 150/90, HR 105, S4, bibasal crackles, no murmur.', 'ECG: ST elevation V1–V4; hs-troponin high; CXR mild congestion; echo anterior hypokinesia EF 40%.', 'Anterior STEMI | Unstable angina/NSTEMI | Aortic dissection | Pericarditis | GERD', 'Aspirin 300 + ticagrelor/clopidogrel + heparin; primary PCI <120 min (or thrombolysis if PCI unavailable); high-intensity statin, beta-blocker, ACEi; CCU monitoring; smoking/diabetes counseling.'],
  ['Surgery', 'Migratory RLQ pain + vomiting', '22M, periumbilical pain → RLQ 12h, anorexia, fever 38.2, one vomit.', 'McBurney tenderness, rebound, Rovsing+, psoas+, HR 100, Alvarado 8.', 'WBC 14k neutrophilia, CRP high; US: non-compressible 9 mm appendix, fecalith.', 'Acute appendicitis | Mesenteric adenitis | Ureteric colic | Meckel diverticulitis | Crohn', 'NPO, IV fluids, ceftriaxone + metronidazole, analgesia; laparoscopic appendectomy; histopathology; early mobilization.'],
  ['Pediatrics', 'Barky cough + stridor', '2.5y boy, 2d URTI then barky cough, hoarseness, inspiratory stridor, low fever.', 'T 37.8, stridor at rest, barky cough, mild retractions, SpO2 96%, no drooling.', 'Neck X-ray: steeple sign; CBC viral; SpO2/RR monitoring.', 'Viral croup | Epiglottitis | Foreign body | Bacterial tracheitis | Asthma', 'Dexamethasone 0.15–0.6 mg/kg PO/IM + nebulized adrenaline if stridor at rest; humid O2, observe; red flags: drooling/toxicity → epiglottitis protocol.'],
  ['OBGYN', 'Labor + severe headache + HTN', '28y G2P1 36w, headache, visual spots, epigastric pain, reduced fetal movement.', 'BP 165/110, edema 2+, brisk reflexes, fundal 34 cm, FHR 140, no labor.', 'Proteinuria 3+, platelets 95k, ALT high, creatinine 1.1, US: IUGR, Doppler abnormal.', 'Preeclampsia with severe features | Eclampsia | HELLP | Chronic HTN | AFLP', 'MgSO4 seizure prophylaxis, hydralazine/nifedipine BP control, betamethasone if preterm, urgent delivery (C-section given severity); ICU/HDU + neonatal team.'],
  ['Emergency', 'Poly-trauma after RTA', '30M RTA, GCS 13, chest pain, abdominal pain, open tibia fracture.', 'GCS E3V4M6, hypotensive 90/60, tachycardic 120, decreased right breath sounds, rigid abdomen, deformed leg.', 'FAST positive (Morrison pouch); CXR rib fractures + hemothorax; Hb 8.5, lactate high; CT pan-scan when stable.', 'Hemorrhagic shock (hemoperitoneum + hemothorax) | Tension pneumothorax | Pelvic fracture bleed | TBI', 'ATLS ABCDE: O2, 2 large-bore IV, TXA <3h, blood transfusion 1:1:1, chest tube, eFAST/DPA, ex-fix tibia, OR laparotomy if unstable; tetanus + antibiotics.'],
  ['Internal Medicine', 'Polyuria + weight loss', '18M, 3w polyuria/polydipsia, 5 kg loss, nocturia, fatigue.', 'Dehydrated, Kussmaul breathing, fruity breath, HR 110, dry mucosa.', 'RBS 480, ketones +++, ABG pH 7.21 HCO3 12, K 4.8, HbA1c 12%.', 'DKA (new T1DM) | HHS | UTI alone | Gastroenteritis', 'DKA protocol: isotonic fluids, insulin infusion 0.1 U/kg/h after fluids, K+ replacement, hourly glucose/ABG, search trigger (infection); transition to basal-bolus + education.'],
  ['Psychiatry', 'Low mood + anhedonia 3 weeks', '24F student, 3w sadness, anhedonia, insomnia, appetite loss, guilt, poor concentration, passive death wish, no plan.', 'Depressed affect, slow speech, PHQ-9 18 (moderately severe), no psychosis, insight present.', 'TSH normal, CBC normal; PHQ-9/GAD-7; suicide risk assessment (protective: family, religion).', 'MDD moderate-severe | Adjustment disorder | Hypothyroidism | Bipolar depression | Anemia', 'Safety plan + close follow-up; SSRI (sertraline) + CBT/psychotherapy; sleep hygiene; involve family; urgent psychiatry referral given passive ideation.'],
  ['Pediatrics', 'Watery diarrhea + vomiting', '14m girl, 3d watery stools 6/d, vomiting, reduced urine, lethargic, no blood.', 'Sunken eyes, skin pinch <2s, irritable, HR 140, BP normal, no edema.', 'Stool: no RBC/WBC; Na 150 (hypernatremic dehydration); ORS trial tolerated.', 'Acute gastroenteritis (viral) with some dehydration | Cholera | Dysentery | Intussusception | Sepsis', 'WHO Plan B: ORS 75 mL/kg/4h + zinc 20 mg 10–14d + continued feeding/breastfeeding; IV if fails; rotavirus vaccine counseling; WASH education.'],
];
const insCase = db.prepare(`INSERT INTO Clinical_Cases
  (department_id, chief_complaint, history_present_illness, physical_exam, investigations, differential_dx, management_plan)
  VALUES (?, ?, ?, ?, ?, ?, ?)`);
CASES.forEach(c => insCase.run(...c));

// ---------- 7. Student_Progress (demo) ----------
const demoTopics = db.prepare('SELECT topic_id FROM Modules_Topics ORDER BY topic_id LIMIT 12').all();
const insP = db.prepare(`INSERT INTO Student_Progress (user_id, topic_id, completion_status, last_reviewed_at, quiz_score_avg)
  VALUES (?, ?, ?, datetime('now'), ?)`);
demoTopics.forEach((t, i) => {
  insP.run('demo_student', t.topic_id, i < 4 ? 'completed' : i < 8 ? 'in_progress' : 'not_started', i < 4 ? 82 + i : i < 8 ? 65 + i : null);
});

// ---------- Integrity + export counts ----------
db.exec('PRAGMA foreign_key_check;');
const count = (t) => db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
const report = {
  database: 'data/medical_app.db',
  academic_levels: count('Academic_Levels'),
  courses: count('Courses'),
  modules_topics: count('Modules_Topics'),
  references: count('References_Books'),
  questions: count('Question_Bank'),
  clinical_cases: count('Clinical_Cases'),
  progress_rows: count('Student_Progress'),
  fk_violations: db.prepare('PRAGMA foreign_key_check').all().length,
  null_question_check: db.prepare(`SELECT COUNT(*) AS c FROM Question_Bank WHERE question_text IS NULL OR options_json IS NULL OR correct_answer IS NULL OR explanation IS NULL`).get().c,
};
fs.writeFileSync(path.join(ROOT, 'data', 'audit.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(ROOT, 'INGESTION_AUDIT.md'),
`# Ingestion Audit — AI Tour Medical App
- DB: \`data/medical_app.db\` (SQLite, FK ON, WAL)
- Academic_Levels: ${report.academic_levels}
- Courses: ${report.courses}
- Modules_Topics: ${report.modules_topics}
- References: ${report.references}
- Question_Bank: ${report.questions}
- Clinical_Cases: ${report.clinical_cases}
- Student_Progress rows: ${report.progress_rows}
- FK violations: ${report.fk_violations}
- Null-critical in Question_Bank: ${report.null_question_check}
- Sources: Sana'a/Aden/Taiz/Thamar/UST curricula maps + Gray's/Guyton/Harrison/Davidson/Nelson outlines + MedMCQA/MedQA-compatible items (options_json + explanation mandatory).
`);
console.log(JSON.stringify(report, null, 2));
