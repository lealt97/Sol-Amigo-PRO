begin;

update public.proposals
set public_token = replace(gen_random_uuid()::text, '-', '')
where public_token is null;

alter table public.proposals
  alter column public_token set default replace(gen_random_uuid()::text, '-', '');

commit;
