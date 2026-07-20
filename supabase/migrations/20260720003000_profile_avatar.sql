begin;

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'URL pública da foto de perfil exibida no avatar da navegação.';

commit;
