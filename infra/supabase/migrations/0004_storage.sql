-- Default per-user uploads bucket
insert into storage.buckets (id, name, public)
values ('__PROJECT_KEBAB__-uploads', '__PROJECT_KEBAB__-uploads', false)
on conflict (id) do nothing;

-- Users can manage objects under their own user-id prefix: <uid>/<...path>
create policy "uploads: users read own"
  on storage.objects for select
  using (
    bucket_id = '__PROJECT_KEBAB__-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "uploads: users insert own"
  on storage.objects for insert
  with check (
    bucket_id = '__PROJECT_KEBAB__-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "uploads: users update own"
  on storage.objects for update
  using (
    bucket_id = '__PROJECT_KEBAB__-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "uploads: users delete own"
  on storage.objects for delete
  using (
    bucket_id = '__PROJECT_KEBAB__-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
