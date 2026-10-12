-- Allow ABDM FHIR JSON bundles to be stored alongside photos and PDFs.
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf', 'application/json']
where id = 'documents';
