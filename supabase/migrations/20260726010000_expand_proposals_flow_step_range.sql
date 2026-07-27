-- O Wizard possui oito etapas indexadas de 0 a 7.
-- A constraint anterior terminava em 6 e bloqueava a conclusão da proposta.
--
-- Os campos do fluxo já existiam no banco remoto antes da adoção do histórico
-- completo de migrations. Eles são declarados aqui para permitir reconstrução
-- limpa do projeto em homologação e ambientes locais.

alter table public.proposals
  add column if not exists flow_step integer,
  add column if not exists flow_state jsonb,
  add column if not exists flow_version integer,
  add column if not exists flow_completed boolean not null default false,
  add column if not exists flow_last_saved_at timestamptz;

alter table public.proposals
  drop constraint if exists proposals_flow_step_range;

alter table public.proposals
  add constraint proposals_flow_step_range
  check (flow_step is null or (flow_step >= 0 and flow_step <= 7));

create index if not exists proposals_active_flow_draft_idx
  on public.proposals(user_id, client_id, updated_at desc)
  where status = 'draft'
    and flow_completed is false
    and flow_state is not null;
