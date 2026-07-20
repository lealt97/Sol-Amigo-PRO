-- =========================================================
-- P1: assets privados e validação de uploads no servidor
-- - imagens de capa e fotos de telhado deixam de usar URL pública
-- - Storage rejeita MIME e tamanho fora dos limites permitidos
-- - referências internas usam storage://bucket/path
-- =========================================================

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values
  (
    'pdf-assets',
    'pdf-assets',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'proposals',
    'proposals',
    false,
    15728640,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'logos',
    'logos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- A capa personalizada é privada. O proprietário continua podendo ler,
-- gravar, substituir e remover somente objetos da própria pasta.
drop policy if exists "Public read pdf-assets" on storage.objects;
drop policy if exists "Leitura pública para pdf-assets" on storage.objects;
drop policy if exists "Owner read pdf-assets" on storage.objects;

create policy "Owner read pdf-assets"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pdf-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Converte URLs públicas ou assinadas legadas em referências persistentes.
-- URLs externas informadas deliberadamente pelo usuário permanecem intactas.
update public.pdf_user_models model
set cover_image_url = 'storage://pdf-assets/' || regexp_replace(
  split_part(model.cover_image_url, '?', 1),
  '^.*/storage/v1/object/(public|sign|authenticated)/pdf-assets/',
  ''
)
where model.cover_image_url is not null
  and model.cover_image_url ~ '/storage/v1/object/(public|sign|authenticated)/pdf-assets/'
  and regexp_replace(
    split_part(model.cover_image_url, '?', 1),
    '^.*/storage/v1/object/(public|sign|authenticated)/pdf-assets/',
    ''
  ) like model.user_id::text || '/%';

update public.proposals proposal
set roof_image_url = 'storage://proposals/' || regexp_replace(
  split_part(proposal.roof_image_url, '?', 1),
  '^.*/storage/v1/object/(public|sign|authenticated)/proposals/',
  ''
)
where proposal.roof_image_url is not null
  and proposal.roof_image_url ~ '/storage/v1/object/(public|sign|authenticated)/proposals/'
  and regexp_replace(
    split_part(proposal.roof_image_url, '?', 1),
    '^.*/storage/v1/object/(public|sign|authenticated)/proposals/',
    ''
  ) like proposal.user_id::text || '/%';

comment on column public.pdf_user_models.cover_image_url is
  'URL externa ou referência privada storage://pdf-assets/<user_id>/...; nunca persistir URL assinada temporária.';

comment on column public.proposals.roof_image_url is
  'URL externa ou referência privada storage://proposals/<user_id>/...; nunca persistir URL assinada temporária.';

notify pgrst, 'reload schema';

commit;
