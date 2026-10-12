-- Seed Mock Profile (Connected ABHA Account)
INSERT INTO profiles (id, full_name, abha_id, phone_number, gender, date_of_birth)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Rajesh Kumar Sharma',
    '91-1234-5678-9012',
    '+91-9876543210',
    'male',
    '1985-06-15'
) ON CONFLICT (abha_id) DO NOTHING;

-- Seed Record 1: Comprehensive Metabolic Panel (Diagnostic Report with abnormal glucose & HbA1c)
INSERT INTO health_records (
    id,
    user_id,
    document_type,
    record_date,
    title,
    summary_en,
    summary_regional,
    regional_language,
    extracted_data,
    fhir_bundle,
    status
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'DiagnosticReport',
    '2026-03-28 09:30:00+05:30',
    'Comprehensive Blood & Diabetes Profile',
    'Fasting blood sugar and HbA1c levels are significantly elevated indicating suboptimal glycemic control. Kidney and liver profiles remain within normal ranges.',
    'उपवास रक्त शर्करा (Fasting Glucose) और HbA1c का स्तर काफी अधिक है, जो अनियंत्रित मधुमेह का संकेत देता है।',
    'hi',
    '{
        "record_type": "DiagnosticReport",
        "record_date": "2026-03-28",
        "patient_name": "Rajesh Kumar Sharma",
        "summary": {
            "english": "Fasting blood sugar and HbA1c levels are significantly elevated indicating suboptimal glycemic control. Kidney and liver profiles remain within normal ranges.",
            "hindi": "उपवास रक्त शर्करा और HbA1c का स्तर सामान्य से अधिक पाया गया है, जो मधुमेह के असंतुलन का संकेत देता है।",
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
            },
            {
                "test_name": "Total Cholesterol",
                "observed_value": "210",
                "reference_range": "125 - 200",
                "unit": "mg/dL",
                "flag": "HIGH"
            }
        ]
    }'::jsonb,
    '{
        "resourceType": "Bundle",
        "id": "bundle-diagnostic-report-01",
        "meta": {
            "versionId": "1",
            "lastUpdated": "2026-03-28T09:30:00Z",
            "profile": [
                "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord"
            ]
        },
        "type": "document",
        "timestamp": "2026-03-28T09:30:00Z",
        "entry": [
            {
                "fullUrl": "urn:uuid:patient-01",
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-01",
                    "identifier": [
                        {
                            "type": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "MR" }] },
                            "system": "https://healthid.ndhm.gov.in",
                            "value": "91-1234-5678-9012"
                        }
                    ],
                    "name": [{ "text": "Rajesh Kumar Sharma" }],
                    "gender": "male"
                }
            },
            {
                "fullUrl": "urn:uuid:diagnostic-report-01",
                "resource": {
                    "resourceType": "DiagnosticReport",
                    "id": "diagnostic-report-01",
                    "status": "final",
                    "code": {
                        "coding": [{ "system": "http://loinc.org", "code": "24323-8", "display": "Metabolic panel" }],
                        "text": "Comprehensive Blood & Diabetes Profile"
                    },
                    "subject": { "reference": "urn:uuid:patient-01" },
                    "conclusion": "High fasting blood sugar (185 mg/dL) and elevated HbA1c (8.4%)."
                }
            }
        ]
    }'::jsonb,
    'PROCESSED'
) ON CONFLICT DO NOTHING;

-- Seed Record 2: Endocrinology Prescription (Metformin + Atorvastatin)
INSERT INTO health_records (
    id,
    user_id,
    document_type,
    record_date,
    title,
    summary_en,
    summary_regional,
    regional_language,
    extracted_data,
    fhir_bundle,
    status
) VALUES (
    'b2c3d4e5-f6a7-48b9-0c1d-2e3f4a5b6c7d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Prescription',
    '2026-03-29 11:15:00+05:30',
    'Endocrinology Follow-up Prescription',
    'Prescription for type 2 diabetes and dyslipidemia management following high blood glucose results. Added Metformin and lipid lowering therapy.',
    'उच्च रक्त शर्करा के लिए मेटफॉर्मिन और कोलेस्ट्रॉल नियंत्रण के लिए एटोरवास्टेटिन की दवाएं निर्धारित की गईं।',
    'hi',
    '{
        "record_type": "Prescription",
        "record_date": "2026-03-29",
        "patient_name": "Rajesh Kumar Sharma",
        "summary": {
            "english": "Prescription for type 2 diabetes and dyslipidemia management following high blood glucose results. Added Metformin and lipid lowering therapy.",
            "hindi": "मधुमेह और कोलेस्ट्रॉल नियंत्रण के लिए मेटफॉर्मिन और एटोरवास्टेटिन का परामर्श दिया गया है।",
            "telugu": "మధుమేహం మరియు కొలెస్ట్రాల్ నియంత్రణ కోసం మెట్‌ఫార్మిన్ మరియు అటోర్వాస్టాటిన్ సూచించబడ్డాయి."
        },
        "medications": [
            {
                "name": "Metformin Hydrochloride",
                "dosage": "500 mg",
                "frequency": "1-0-1 (Twice daily after food)",
                "duration": "90 days"
            },
            {
                "name": "Atorvastatin Calcium",
                "dosage": "10 mg",
                "frequency": "0-0-1 (Once daily at bedtime)",
                "duration": "30 days"
            },
            {
                "name": "Vitamin D3 (Cholecalciferol)",
                "dosage": "60,000 IU",
                "frequency": "Once weekly",
                "duration": "8 weeks"
            }
        ],
        "lab_observations": []
    }'::jsonb,
    '{
        "resourceType": "Bundle",
        "id": "bundle-prescription-01",
        "meta": {
            "profile": [
                "https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord"
            ]
        },
        "type": "document",
        "entry": [
            {
                "fullUrl": "urn:uuid:patient-01",
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-01",
                    "name": [{ "text": "Rajesh Kumar Sharma" }]
                }
            },
            {
                "fullUrl": "urn:uuid:medication-request-01",
                "resource": {
                    "resourceType": "MedicationRequest",
                    "status": "active",
                    "intent": "order",
                    "medicationCodeableConcept": {
                        "text": "Metformin Hydrochloride 500 mg"
                    },
                    "dosageInstruction": [
                        { "text": "1-0-1 Twice daily after food for 90 days" }
                    ]
                }
            }
        ]
    }'::jsonb,
    'PROCESSED'
) ON CONFLICT DO NOTHING;
