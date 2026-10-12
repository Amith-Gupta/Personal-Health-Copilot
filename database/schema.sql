-- Enable UUID and vector extensions if on PostgreSQL/Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Profiles Table (Patient Identity & ABHA Linkage)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    abha_id TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Health Records Table (Prescriptions, Diagnostic Reports, Discharge Summaries)
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('Prescription', 'DiagnosticReport', 'DischargeSummary', 'LabReport')),
    record_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    summary_en TEXT NOT NULL,
    summary_regional TEXT,
    regional_language TEXT DEFAULT 'hi', -- 'hi' (Hindi), 'te' (Telugu), etc.
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    fhir_bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(768), -- For Gemini/OpenAI text embedding semantic search
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_records_user_id ON health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_health_records_record_date ON health_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_document_type ON health_records(document_type);
CREATE INDEX IF NOT EXISTS idx_health_records_gin_extracted ON health_records USING gin (extracted_data);
CREATE INDEX IF NOT EXISTS idx_health_records_gin_fhir ON health_records USING gin (fhir_bundle);

-- Semantic search similarity index (HNSW for pgvector cosine distance)
CREATE INDEX IF NOT EXISTS idx_health_records_embedding 
ON health_records USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE TRIGGER trg_update_health_records
BEFORE UPDATE ON health_records
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
