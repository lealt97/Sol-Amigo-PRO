-- =========================================================
-- Codigos comerciais das propostas
-- =========================================================
-- Preenche propostas antigas de teste que aparecem como "Sem codigo"
-- e ajusta o padrao inicial do status para o novo fluxo comercial.

alter table public.proposals
  add column if not exists code text;

-- Gera codigo sequencial por usuario e ano para propostas sem codigo.
with proposals_without_code as (
  select
    id,
    user_id,
    coalesce(extract(year from created_at)::int, extract(year from now())::int) as proposal_year,
    row_number() over (
      partition by user_id, coalesce(extract(year from created_at)::int, extract(year from now())::int)
      order by created_at, id
    ) as sequence_number
  from public.proposals
  where code is null or btrim(code) = '' or lower(btrim(code)) = 'sem codigo' or lower(btrim(code)) = 'sem código'
)
update public.proposals p
set code = 'FV-' || proposals_without_code.proposal_year || '-' || lpad(proposals_without_code.sequence_number::text, 4, '0')
from proposals_without_code
where p.id = proposals_without_code.id;

-- No fluxo novo, propostas nascem como pendentes em vez de rascunho.
alter table public.proposals
  alter column status set default 'pending';

update public.proposals
set status = 'pending'
where status = 'draft';

-- Evita que o mesmo usuario tenha duas propostas com o mesmo codigo.
create unique index if not exists proposals_user_code_unique_idx
  on public.proposals(user_id, code)
  where code is not null;
