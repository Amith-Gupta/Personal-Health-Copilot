-- Personal Health Copilot schema.
-- One caregiver account (auth.users) owns several patients (family members).
-- Every row carries owner_id so row-level security can scope it to auth.uid().
-- health_records keeps the full extraction and the ABDM FHIR R4 document bundle;
-- medications, lab_observations and conditions are normalised copies for querying and trends.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  relation text not null default 'Family member',
  age text,
  sex text check (sex in ('M', 'F', 'O')),
  abha_number text check (abha_number ~ '^\d{2}-\d{4}-\d{4}-\d{4}$'),
  abha_address text check (abha_address ~ '^[a-z0-9][a-z0-9._]{2,31}@(abdm|sbx)$'),
  abha_linked boolean not null default false,
  abha_linked_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index patients_owner_idx on public.patients (owner_id);

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  document_type text not null check (document_type in ('Prescription', 'DiagnosticReport', 'DischargeSummary')),
  record_date date,
  title text not null,
  extracted jsonb not null,
  extraction jsonb not null,
  name_check text not null default 'missing' check (name_check in ('match', 'mismatch', 'missing')),
  source_filename text not null,
  source_mime text not null,
  storage_path text,
  fhir_bundle jsonb not null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index health_records_patient_date_idx on public.health_records (patient_id, record_date desc);
create index health_records_owner_idx on public.health_records (owner_id);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  record_id uuid not null references public.health_records (id) on delete cascade,
  name text not null,
  form text,
  dosage text,
  frequency text,
  timing text,
  duration text,
  prescribed_on date
);
create index medications_patient_idx on public.medications (patient_id);

create table public.lab_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  record_id uuid not null references public.health_records (id) on delete cascade,
  test_name text not null,
  value_text text not null,
  value_numeric numeric,
  unit text,
  reference_range text,
  reference_low numeric,
  reference_high numeric,
  flag text not null check (flag in ('NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'UNKNOWN')),
  observed_on date
);
create index lab_observations_patient_test_idx on public.lab_observations (patient_id, lower(test_name), observed_on);

create table public.conditions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  record_id uuid not null references public.health_records (id) on delete cascade,
  name text not null,
  recorded_on date
);
create index conditions_patient_idx on public.conditions (patient_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid,
  action text not null,
  resource_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_owner_idx on public.audit_log (owner_id, created_at desc);

-- Row-level security: an account sees only its own family. The backend uses the
-- service key and filters by the verified user id as well; RLS is the second wall.
do $$
declare t text;
begin
  foreach t in array array['patients', 'health_records', 'medications', 'lab_observations', 'conditions', 'audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s owner read" on public.%1$I for select to authenticated using (owner_id = (select auth.uid()))', t);
  end loop;
  foreach t in array array['patients', 'health_records', 'medications', 'lab_observations', 'conditions'] loop
    execute format('create policy "%1$s owner write" on public.%1$I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Private bucket for the original documents, stored under <owner_id>/<record_id>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 15728640,
        array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

create policy "documents owner read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
