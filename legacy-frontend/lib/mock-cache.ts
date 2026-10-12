export type LanguageCode = "en" | "hi" | "te";

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
}

export interface LabObservationItem {
  test_name: string;
  observed_value: string;
  reference_range?: string;
  unit?: string;
  flag: "NORMAL" | "HIGH" | "LOW" | "ABNORMAL";
}

export interface SummaryItem {
  english: string;
  hindi?: string;
  telugu?: string;
}

export interface HealthRecord {
  id: string;
  user_id?: string;
  document_type: "Prescription" | "DiagnosticReport" | "DischargeSummary" | "LabReport";
  record_date: string;
  title: string;
  summary: SummaryItem;
  medications: MedicationItem[];
  lab_observations: LabObservationItem[];
  fhir_bundle: Record<string, any>;
  status: "PROCESSED" | "PENDING" | "FAILED";
  created_at: string;
}

export const MOCK_RECORDS_CACHE: HealthRecord[] = [
  {
    id: "rec-diag-001",
    user_id: "91-1234-5678-9012",
    document_type: "DiagnosticReport",
    record_date: "2026-03-28",
    title: "Comprehensive Metabolic & Diabetes Profile",
    summary: {
      english:
        "Fasting blood sugar (185 mg/dL) and HbA1c (8.4%) are significantly elevated, indicating uncontrolled diabetes mellitus. Total cholesterol is mildly elevated. Kidney and liver functions are normal.",
      hindi:
        "उपवास रक्त शर्करा (185 mg/dL) और HbA1c (8.4%) का स्तर काफी अधिक है, जो अनियंत्रित मधुमेह का संकेत देता है। कोलेस्ट्रॉल का स्तर थोड़ा बढ़ा हुआ है, जबकि गुर्दे और लिवर का कार्य सामान्य है।",
      telugu:
        "ఉపవాస రక్తంలో చక్కెర (185 mg/dL) మరియు HbA1c (8.4%) స్థాయిలు చాలా ఎక్కువగా ఉన్నాయి, ఇది నియంత్రణ లేని మధుమేహాన్ని సూచిస్తుంది. కొలెస్ట్రాల్ కొద్దిగా పెరిగింది, అయితే కిడ్నీ మరియు కాలేయ పనితీరు సాధారణంగా ఉంది.",
    },
    medications: [],
    lab_observations: [
      {
        test_name: "Fasting Blood Glucose",
        observed_value: "185",
        reference_range: "70 - 99",
        unit: "mg/dL",
        flag: "HIGH",
      },
      {
        test_name: "HbA1c (Glycated Hemoglobin)",
        observed_value: "8.4",
        reference_range: "4.0 - 5.6",
        unit: "%",
        flag: "HIGH",
      },
      {
        test_name: "Total Cholesterol",
        observed_value: "210",
        reference_range: "125 - 200",
        unit: "mg/dL",
        flag: "HIGH",
      },
      {
        test_name: "Serum Creatinine",
        observed_value: "0.9",
        reference_range: "0.7 - 1.3",
        unit: "mg/dL",
        flag: "NORMAL",
      },
      {
        test_name: "Blood Urea Nitrogen (BUN)",
        observed_value: "14",
        reference_range: "7 - 20",
        unit: "mg/dL",
        flag: "NORMAL",
      },
    ],
    fhir_bundle: {
      resourceType: "Bundle",
      id: "bundle-abdm-diag-001",
      meta: {
        versionId: "1",
        lastUpdated: "2026-03-28T09:30:00Z",
        profile: [
          "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord",
        ],
      },
      identifier: {
        system: "https://abdm.gov.in/bundle",
        value: "ABDM-DIAG-882194",
      },
      type: "document",
      timestamp: "2026-03-28T09:30:00Z",
      entry: [
        {
          fullUrl: "urn:uuid:Composition-01",
          resource: {
            resourceType: "Composition",
            id: "comp-diag-01",
            status: "final",
            type: {
              coding: [
                {
                  system: "http://snomed.info/sct",
                  code: "721981007",
                  display: "Diagnostic studies report",
                },
              ],
              text: "Diagnostic studies report",
            },
            subject: { reference: "urn:uuid:Patient-01" },
            title: "ABDM DiagnosticReport - Rajesh Kumar Sharma",
          },
        },
        {
          fullUrl: "urn:uuid:Patient-01",
          resource: {
            resourceType: "Patient",
            id: "Patient-01",
            identifier: [
              {
                system: "https://healthid.ndhm.gov.in",
                value: "91-1234-5678-9012",
              },
            ],
            name: [{ text: "Rajesh Kumar Sharma" }],
            gender: "male",
          },
        },
        {
          fullUrl: "urn:uuid:Observation-01",
          resource: {
            resourceType: "Observation",
            id: "obs-glucose",
            status: "final",
            code: { text: "Fasting Blood Glucose" },
            valueQuantity: {
              value: 185,
              unit: "mg/dL",
              system: "http://unitsofmeasure.org",
            },
            interpretation: [
              {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                    code: "H",
                    display: "High",
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    status: "PROCESSED",
    created_at: "2026-03-28T09:30:00Z",
  },
  {
    id: "rec-rx-002",
    user_id: "91-1234-5678-9012",
    document_type: "Prescription",
    record_date: "2026-03-29",
    title: "Endocrinology Consultation & Medication Plan",
    summary: {
      english:
        "Prescribed dual therapy to manage high fasting glucose and elevated cholesterol. Metformin to be taken twice daily after meals, and Atorvastatin once before sleep.",
      hindi:
        "उच्च रक्त शर्करा और बढ़े हुए कोलेस्ट्रॉल को नियंत्रित करने के लिए दवाएं निर्धारित की गईं। मेटफॉर्मिन भोजन के बाद दिन में दो बार और एटोरवास्टेटिन रात को सोने से पहले लें।",
      telugu:
        "అధిక రక్తంలో చక్కెర మరియు కొలెస్ట్రాల్ నియంత్రణ కోసం చికిత్స సూచించబడింది. మెట్‌ఫార్మిన్ భోజనం తర్వాత రోజుకు రెండుసార్లు మరియు అటోర్వాస్టాటిన్ నిద్రపోయే ముందు తీసుకోవాలి.",
    },
    medications: [
      {
        name: "Metformin Hydrochloride",
        dosage: "500 mg",
        frequency: "1-0-1 (Twice daily after food)",
        duration: "90 days",
      },
      {
        name: "Atorvastatin Calcium",
        dosage: "10 mg",
        frequency: "0-0-1 (Once daily at bedtime)",
        duration: "30 days",
      },
      {
        name: "Vitamin D3 (Cholecalciferol)",
        dosage: "60,000 IU",
        frequency: "Once weekly",
        duration: "8 weeks",
      },
    ],
    lab_observations: [],
    fhir_bundle: {
      resourceType: "Bundle",
      id: "bundle-abdm-rx-002",
      meta: {
        versionId: "1",
        lastUpdated: "2026-03-29T11:15:00Z",
        profile: [
          "https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord",
        ],
      },
      identifier: {
        system: "https://abdm.gov.in/bundle",
        value: "ABDM-RX-991204",
      },
      type: "document",
      timestamp: "2026-03-29T11:15:00Z",
      entry: [
        {
          fullUrl: "urn:uuid:Composition-02",
          resource: {
            resourceType: "Composition",
            id: "comp-rx-02",
            status: "final",
            type: {
              coding: [
                {
                  system: "http://snomed.info/sct",
                  code: "440545006",
                  display: "Prescription record",
                },
              ],
            },
            subject: { reference: "urn:uuid:Patient-01" },
            title: "ABDM Prescription - Rajesh Kumar Sharma",
          },
        },
        {
          fullUrl: "urn:uuid:MedicationRequest-01",
          resource: {
            resourceType: "MedicationRequest",
            id: "med-metformin",
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
              text: "Metformin Hydrochloride 500 mg",
            },
            dosageInstruction: [
              { text: "1-0-1 (Twice daily after food) for 90 days" },
            ],
          },
        },
      ],
    },
    status: "PROCESSED",
    created_at: "2026-03-29T11:15:00Z",
  },
  {
    id: "rec-ds-003",
    user_id: "91-1234-5678-9012",
    document_type: "DischargeSummary",
    record_date: "2026-02-14",
    title: "Hospital Discharge Summary - Acute Gastritis",
    summary: {
      english:
        "Discharged after successful conservative stabilization of acute gastritis. Advised bland diet, hydration, and proton-pump inhibitors for 14 days.",
      hindi:
        "तीव्र गैस्ट्र्रिटिस के सफल उपचार के बाद अस्पताल से छुट्टी दी गई। 14 दिनों तक हल्का आहार, पर्याप्त पानी और एंटासिड दवा लेने की सलाह दी गई।",
      telugu:
        "తీవ్రమైన గ్యాస్ట్రిటిస్ చికిత్స తర్వాత ఆసుపత్రి నుండి డిశ్చార్జ్ అయ్యారు. 14 రోజుల పాటు తేలికపాటి ఆహారం, పుష్కలంగా నీరు మరియు మందులు వాడాలని సూచించబడింది.",
    },
    medications: [
      {
        name: "Pantoprazole DSR",
        dosage: "40 mg",
        frequency: "1-0-0 (Once daily before food)",
        duration: "14 days",
      },
    ],
    lab_observations: [],
    fhir_bundle: {
      resourceType: "Bundle",
      id: "bundle-abdm-ds-003",
      meta: {
        profile: [
          "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord",
        ],
      },
      type: "document",
      timestamp: "2026-02-14T14:00:00Z",
      entry: [],
    },
    status: "PROCESSED",
    created_at: "2026-02-14T14:00:00Z",
  },
];
