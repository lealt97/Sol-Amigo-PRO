begin;

-- Remove permissive legacy policies. PostgreSQL combines permissive policies
-- with OR, so these rules allowed any authenticated account to write or delete
-- files belonging to another account inside the logos bucket.
drop policy if exists "Authenticated upload logos bucket" on storage.objects;
drop policy if exists "Authenticated update logos bucket" on storage.objects;
drop policy if exists "Authenticated delete logos bucket" on storage.objects;

-- Keep one public read rule because logos are rendered in proposals and PDFs.
drop policy if exists "Public read logos bucket" on storage.objects;

-- Recreate the write policies explicitly scoped to the first folder segment,
-- which is always the authenticated user's UUID.
drop policy if exists "Owner upload logos" on storage.objects;
drop policy if exists "Owner update logos" on storage.objects;
drop policy if exists "Owner delete logos" on storage.objects;

create policy "Owner upload logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner update logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner delete logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
