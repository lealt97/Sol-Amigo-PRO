-- =========================================================
-- Limpeza de propostas pendentes duplicadas de teste
-- =========================================================
-- Mantem apenas a proposta aberta mais recente por cliente/usuario.
-- Uma proposta aberta aqui significa: pending/draft ainda nao enviada,
-- nao visualizada, nao aprovada e nao recusada.

create temporary table tmp_duplicate_open_proposals on commit drop as
select id
from (
  select
    id,
    row_number() over (
      partition by user_id, client_id
      order by coalesce(updated_at, created_at) desc, created_at desc, id desc
    ) as row_number_for_client
  from public.proposals
  where status in ('draft', 'pending')
    and sent_whatsapp_at is null
    and public_viewed_at is null
    and accepted_at is null
    and rejected_at is null
) ranked
where row_number_for_client > 1;

-- Remove registros filhos antes da proposta para evitar erro de chave estrangeira.
delete from public.proposal_events
where proposal_id in (select id from tmp_duplicate_open_proposals);

delete from public.solar_system_calculations
where proposal_id in (select id from tmp_duplicate_open_proposals);

delete from public.proposal_loads
where proposal_id in (select id from tmp_duplicate_open_proposals);

delete from public.proposals
where id in (select id from tmp_duplicate_open_proposals);
