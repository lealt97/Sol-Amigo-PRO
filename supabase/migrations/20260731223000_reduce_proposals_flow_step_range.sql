-- O Wizard passou a possuir sete etapas indexadas de 0 a 6.
-- A seleção opcional do kit foi incorporada à etapa de preço e payback.

alter table public.proposals
  drop constraint if exists proposals_flow_step_range;

update public.proposals
set flow_step = 6
where flow_step is not null
  and flow_step > 6;

alter table public.proposals
  add constraint proposals_flow_step_range
  check (flow_step is null or (flow_step >= 0 and flow_step <= 6));
