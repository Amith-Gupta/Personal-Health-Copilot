-- Personal Health Copilot - Seed Data
-- Fully aligned with database/schema.sql and supabase/migrations/20261012170000_health_copilot.sql

-- 1. Seed Demo Patient Profile
INSERT INTO patients (
    id,
    owner_id,
    name,
    relation,
    age,
    sex,
    abha_number,
    abha_address,
    abha_linked,
    is_sample,
    created_at
) VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '00000000-0000-0000-0000-000000000001',
    'Rajesh Kumar Sharma',
    'Self',
    '39 yrs',
    'M',
    '91-1234-5678-9012',
    'rajesh.sharma@abdm',
    TRUE,
    TRUE,
    '2026-03-01 10:00:00+05:30'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    abha_number = EXCLUDED.abha_number,
    abha_address = EXCLUDED.abha_address;

-- 2. Seed Record 1: Comprehensive Metabolic Panel (Diagnostic Report)
INSERT INTO health_records (
    id,
    owner_id,
    patient_id,
    document_type,
    record_date,
    title,
    extracted,
    extraction,
    name_check,
    source_filename,
    source_mime,
    fhir_bundle,
    is_sample,
    created_at
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '00000000-0000-0000-0000-000000000001',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'DiagnosticReport',
    '2026-03-28',
    'Comprehensive Blood & Diabetes Profile',
    '{
        "record_type": "DiagnosticReport",
        "record_date": "2026-03-28",
        "patient_name": "Rajesh Kumar Sharma",
        "summary": {
            "english": "Fasting blood sugar and HbA1c levels are significantly elevated indicating suboptimal glycemic control. Kidney and liver profiles remain within normal ranges.",
            "hindi": "उपवास रक्त शर्करा (Fasting Glucose) और HbA1c का स्तर काफी अधिक है, जो अनियंत्रित मधुमेह का संकेत देता है।",
            "telugu": "ఉపవాస రక్తంలో చక్కెర మరియు HbA1c స్థాయిలు ఎక్కువగా ఉన్నాయి, ఇది మధుమేహ నియంత్రణ లేకపోవడాన్ని సూచిస్తుంది."
        },
        "medications": [],
        "lab_observations": [
            {
                "test_name": "Fasting Blood Glucose",
                "observed_value": "185",
                "reference_range": "70 - 99",
                "unit": "mg/dL",
                "flag": "HIGH"
            },
            {
                "test_name": "HbA1c (Glycated Hemoglobin)",
                "observed_value": "8.4",
                "reference_range": "4.0 - 5.6",
                "unit": "%",
                "flag": "HIGH"
            },
            {
                "test_name": "Serum Creatinine",
                "observed_value": "0.9",
                "reference_range": "0.7 - 1.3",
                "unit": "mg/dL",
                "flag": "NORMAL"
            }
        ],
        "diagnoses": ["Type 2 Diabetes Mellitus", "Hyperglycemia"],
        "doctor_questions": {
            "english": ["Should we increase the Metformin dosage or add another agent like SGLT2 inhibitor?", "When should the repeat HbA1c test be scheduled?"],
            "hindi": ["क्या मेटफॉर्मिन की खुराक बढ़ानी चाहिए?", "अगला HbA1c परीक्षण कब कराया जाना चाहिए?"],
            "telugu": ["మెట్‌ఫార్మిన్ మోతాదు పెంచాలా?", "తదుపరి HbA1c పరీక్ష ఎప్పుడు షెడ్యూల్ చేయాలి?"]
        }
    }'::jsonb,
    '{
        "status": "success",
        "model_used": "deterministic-pipeline",
        "processing_time_ms": 420
    }'::jsonb,
    'match',
    'diagnostic_report_2026_03_28.pdf',
    'application/pdf',
    '{
        "resourceType": "Bundle",
        "type": "document",
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord"]
        },
        "entry": []
    }'::jsonb,
    TRUE,
    '2026-03-28 09:30:00+05:30'
) ON CONFLICT (id) DO NOTHING;

-- 3. Seed Derived Lab Observations for Record 1
INSERT INTO lab_observations (
    owner_id,
    patient_id,
    record_id,
    test_name,
    value_text,
    value_numeric,
    unit,
    reference_range,
    reference_low,
    reference_high,
    flag,
    observed_on
) VALUES
('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Fasting Blood Glucose', '185', 185.0, 'mg/dL', '70 - 99', 70.0, 99.0, 'HIGH', '2026-03-28'),
('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'HbA1c (Glycated Hemoglobin)', '8.4', 8.4, '%', '4.0 - 5.6', 4.0, 5.6, 'HIGH', '2026-03-28'),
('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Serum Creatinine', '0.9', 0.9, 'mg/dL', '0.7 - 1.3', 0.7, 1.3, 'NORMAL', '2026-03-28')
ON CONFLICT DO NOTHING;

-- 4. Seed Record 2: Prescription Record
INSERT INTO health_records (
    id,
    owner_id,
    patient_id,
    document_type,
    record_date,
    title,
    extracted,
    extraction,
    name_check,
    source_filename,
    source_mime,
    fhir_bundle,
    is_sample,
    created_at
) VALUES (
    'e7b23f81-2c94-4361-b512-8f9d0e1a2b3c',
    '00000000-0000-0000-0000-000000000001',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Prescription',
    '2026-03-29',
    'Endocrinology Consultation & Prescription',
    '{
        "record_type": "Prescription",
        "record_date": "2026-03-29",
        "patient_name": "Rajesh Kumar Sharma",
        "summary": {
            "english": "Endocrinologist adjusted glycemic therapy following elevated fasting glucose. Added SGLT2 inhibitor to existing Metformin regimen.",
            "hindi": "एंडोक्रिनोलॉजिस्ट ने बढ़े हुए फास्टिंग ग्लूकोज के बाद दवा की खुराक समायोजित की।",
            "telugu": "ఎండోక్రినాలజిస్ట్ మెట్‌ఫార్మిన్‌తో పాటు SGLT2 ఇన్హిబిటర్‌ను సూచించారు."
        },
        "medications": [
            {
                "name": "Metformin Hydrochloride",
                "dosage": "500 mg",
                "frequency": "1-0-1",
                "timing": "After meals",
                "duration": "90 days"
            },
            {
                "name": "Dapagliflozin",
                "dosage": "10 mg",
                "frequency": "1-0-0",
                "timing": "Morning before breakfast",
                "duration": "90 days"
            }
        ],
        "lab_observations": [],
        "diagnoses": ["Type 2 Diabetes Mellitus"],
        "doctor_questions": {
            "english": ["Check renal panel after 4 weeks of starting Dapagliflozin."],
            "hindi": ["डैपाग्लिफ्लोज़िन शुरू करने के 4 सप्ताह बाद किडनी फंक्शन टेस्ट कराएं।"],
            "telugu": ["డాపాగ్లిఫ్లోజిన్ ప్రారంభించిన 4 వారాల తర్వాత మూత్రపిండాల పనితీరు పరీక్ష చేయించండి."]
        }
    }'::jsonb,
    '{
        "status": "success",
        "model_used": "deterministic-pipeline",
        "processing_time_ms": 380
    }'::jsonb,
    'match',
    'prescription_dr_verma_2026_03_29.png',
    'image/png',
    '{
        "resourceType": "Bundle",
        "type": "document",
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord"]
        },
        "entry": []
    }'::jsonb,
    TRUE,
    '2026-03-29 11:15:00+05:30'
) ON CONFLICT (id) DO NOTHING;

-- 5. Seed Derived Medications for Record 2
INSERT INTO medications (
    owner_id,
    patient_id,
    record_id,
    name,
    form,
    dosage,
    frequency,
    timing,
    duration,
    prescribed_on
) VALUES
('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'e7b23f81-2c94-4361-b512-8f9d0e1a2b3c', 'Metformin Hydrochloride', 'Tablet', '500 mg', '1-0-1', 'After meals', '90 days', '2026-03-29'),
('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'e7b23f81-2c94-4361-b512-8f9d0e1a2b3c', 'Dapagliflozin', 'Tablet', '10 mg', '1-0-0', 'Morning before breakfast', '90 days', '2026-03-29')
ON CONFLICT DO NOTHING;
