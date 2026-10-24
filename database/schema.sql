-- Personal Health Copilot - Full PostgreSQL / Supabase Schema
-- Aligned with backend/app/services/store.py and ABDM FHIR R4 pipeline

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Patients Table (Family profiles scoped by owner_id)
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relation TEXT NOT NULL DEFAULT 'Self',
    age TEXT,
    sex TEXT,
    abha_number TEXT,
    abha_address TEXT,
    abha_linked BOOLEAN DEFAULT FALSE,
    is_sample BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patients_owner_id ON patients(owner_id);

-- 2. Health Records Table
CREATE TABLE IF NOT EXISTS health_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    owner_id TEXT NOT NULL,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('Prescription', 'DiagnosticReport', 'DischargeSummary')),
    record_date TEXT,
    title TEXT NOT NULL,
    extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
    extraction JSONB NOT NULL DEFAULT '{}'::jsonb,
    name_check TEXT DEFAULT 'match',
    source_filename TEXT,
    source_mime TEXT,
    storage_path TEXT,
    preview_path TEXT,
    fhir_bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_sample BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_health_records_owner_patient ON health_records(owner_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_health_records_date ON health_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_gin_extracted ON health_records USING gin (extracted);

-- 3. Normalized Medications Table (for instant clinical queries and schedules)
CREATE TABLE IF NOT EXISTS medications (
    id BIGSERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    record_id TEXT NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    form TEXT,
    dosage TEXT,
    frequency TEXT,
    timing TEXT,
    duration TEXT,
    prescribed_on TEXT
);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(owner_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);

-- 4. Normalized Lab Observations Table (for biomarker tracking & abnormal flags)
CREATE TABLE IF NOT EXISTS lab_observations (
    id BIGSERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    record_id TEXT NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    value_text TEXT,
    value_numeric NUMERIC,
    unit TEXT,
    reference_range TEXT,
    reference_low NUMERIC,
    reference_high NUMERIC,
    flag TEXT,
    observed_on TEXT
);
CREATE INDEX IF NOT EXISTS idx_lab_observations_patient ON lab_observations(owner_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_observations_flag ON lab_observations(flag);

-- 5. Conditions / Diagnoses Table
CREATE TABLE IF NOT EXISTS conditions (
    id BIGSERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    record_id TEXT NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    recorded_on TEXT
);
CREATE INDEX IF NOT EXISTS idx_conditions_patient ON conditions(owner_id, patient_id);

-- 6. Audit Log Table (for compliance, security, and MCP tracking)
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    action TEXT NOT NULL,
    patient_id TEXT,
    resource_id TEXT,
    detail JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_log_owner ON audit_log(owner_id, created_at DESC);

-- 7. Supabase Storage Bucket setup notice
-- Bucket name: 'documents' (Private bucket with authenticated RLS policies)
