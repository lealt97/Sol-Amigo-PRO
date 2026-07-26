-- O Wizard possui oito etapas indexadas de 0 a 7.
-- A constraint anterior terminava em 6 e bloqueava a conclusão da proposta.

alter table public.proposals
  drop constraint if exists proposals_flow_step_range;

alter table public.proposals
  add constraint proposals_flow_step_range
  check (flow_step is null or (flow_step >= 0 and flow_step <= 7));
