# Modelo de dados de planos, assinaturas e uso

## Objetivo

Este documento descreve a fundação persistente da Fase 3. A migration `20260720030000_billing_foundation.sql` cria quatro tabelas e inicializa automaticamente toda conta no plano Gratuito. A migration `20260720210000_align_plan_interval_limits.sql` alinha as cotas por intervalo com a página comercial.

A etapa não integra um provedor de pagamentos e não implementa checkout ou webhooks. Esses fluxos usarão este modelo como fonte de verdade no servidor.

## `billing_plans`

Catálogo global e somente leitura para a API.

Guarda:

- código estável do produto (`free` ou `pro`);
- nome de exibição e moeda;
- preços mensal e anual em centavos inteiros;
- cota de propostas do intervalo mensal em `proposals_per_month`;
- cota de propostas do intervalo anual em `annual_proposals_per_month`;
- limites de usuários e armazenamento;
- flags de publicação e ativação;
- metadados não sensíveis.

Os valores iniciais são:

- Gratuito: R$ 0,00, 5 propostas/mês, 1 usuário e 250 MiB;
- Pro mensal: R$ 100,00/mês, 30 propostas/mês, 5 usuários e 10 GiB;
- Pro anual: R$ 1.000,00/ano, 40 propostas/mês, 5 usuários e 10 GiB.

A função interna `resolve_plan_proposal_limit(plan_code, billing_interval)` retorna a cota correta e só pode ser executada pelo servidor. Usuários anônimos e autenticados podem consultar somente planos públicos e ativos; nenhum deles pode alterar o catálogo.

## `subscriptions`

Representa o estado atual da assinatura de uma conta.

Características:

- relação um-para-um com `auth.users` por `account_id`;
- referência ao plano efetivo;
- intervalo `free`, `month` ou `year`;
- estado controlado: `free`, `incomplete`, `trialing`, `active`, `past_due`, `unpaid` ou `canceled`;
- identificadores externos genéricos para o futuro provedor;
- período atual, cancelamento no fim do período e tolerância;
- restrições que impedem combinar plano Gratuito com intervalo pago ou status pago.

O usuário pode apenas ler a própria assinatura. Escritas são exclusivas do `service_role` no servidor.

## `billing_events`

Trilha append-only dos eventos de cobrança.

Guarda eventos como inicialização, ativação, renovação, falha, cancelamento e sincronização futura com o provedor. `provider_event_id` possui índice único parcial para permitir processamento idempotente de webhooks.

A coluna `metadata` deve conter apenas um resumo sanitizado. Payload bruto do provedor, segredo de webhook, dados completos de cartão e credenciais nunca devem ser persistidos nessa tabela.

O usuário pode consultar apenas os próprios eventos. Não possui permissão de inserir, alterar ou excluir.

## `account_usage`

Armazena contadores e snapshots por período mensal:

- propostas criadas;
- bytes ocupados no Storage;
- assentos utilizados;
- plano aplicado ao período;
- intervalo de cobrança aplicado ao período;
- fuso e datas de início/fim;
- versão para atualizações concorrentes futuras.

Existe uma única linha por conta e início de período. Registrar `billing_interval` evita que uma conta Pro mensal e uma conta Pro anual recebam a mesma cota por engano. A futura autorização no servidor deverá resolver o limite por produto e intervalo, reservar a cota transacionalmente antes da operação e incrementar a versão.

## Inicialização automática

O gatilho `initialize_billing_account_on_signup` atua depois da criação em `auth.users` e chama funções internas com `search_path` fixo. Ele cria de modo idempotente:

1. assinatura `free`;
2. período mensal atual em `America/Sao_Paulo`, com intervalo `free`;
3. evento `subscription.initialized`.

A migration também executa o mesmo processo para usuários já existentes. As funções não podem ser chamadas por `anon`, `authenticated` ou `service_role` através da API, exceto a função específica de resolução de cota, liberada somente ao `service_role`.

## RLS e privilégios

- todas as quatro tabelas possuem RLS ativo;
- catálogo: leitura pública somente dos registros ativos e publicados;
- assinatura, eventos e uso: leitura somente quando `auth.uid() = account_id`;
- frontend não recebe escrita em nenhuma tabela de cobrança;
- o servidor recebe apenas os privilégios necessários: atualizar assinatura e uso, inserir eventos e resolver limites;
- exclusão da conta continua removendo os dados relacionados por `ON DELETE CASCADE`.

## Backup e restauração

Assinaturas, eventos e uso integram a fixture completa de backup. Durante a restauração de `auth.users`, os gatilhos criam registros automáticos; o runbook de homologação remove esses registros antes de restaurar os valores determinísticos do arquivo lógico.

O teste compara fingerprints antes e depois e valida os vínculos entre usuário, assinatura, evento e período de uso.

## Próximos passos

1. escolher e integrar o provedor de pagamentos;
2. criar checkout exclusivamente no servidor;
3. validar assinatura de webhooks e deduplicar por `provider_event_id`;
4. atualizar `subscriptions` e inserir `billing_events` na mesma transação;
5. aplicar limites através de RPC ou Edge Function usando produto e intervalo, nunca apenas no frontend;
6. implementar tolerância para pagamentos vencidos.
