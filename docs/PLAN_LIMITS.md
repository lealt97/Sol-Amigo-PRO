# Limites iniciais dos planos SolAmigo

## Objetivo

Este documento define os limites quantitativos do plano Gratuito e das opções Pro durante o beta. Os valores são uma hipótese operacional e comercial; deverão ser revisados com dados reais de ativação, conversão, custo de infraestrutura e volume de propostas.

A fundação persistente de uso já registra plano e intervalo. A aplicação transacional dos bloqueios no servidor permanece em item posterior da Fase 3.

## Resumo

| Recurso | Gratuito | Pro mensal | Pro anual |
|---|---:|---:|---:|
| Propostas criadas por mês | 5 | 30 | 40 |
| Usuários por conta | 1 | 5 | 5 |
| Armazenamento total | 250 MiB | 10 GiB | 10 GiB |

O Pro mensal e o Pro anual pertencem ao mesmo produto `pro` e liberam o mesmo conjunto de funcionalidades. O intervalo anual concede uma franquia comercial de 10 propostas adicionais por mês.

## Propostas mensais

### Regra de contagem

- a janela é o mês civil no fuso `America/Sao_Paulo`, iniciando à 00:00 do primeiro dia;
- uma proposta conta quando sua criação é confirmada no servidor;
- rascunhos contam, pois já ocupam recursos e representam uso real do produto;
- duplicar uma proposta cria uma nova proposta e consome uma unidade;
- editar, visualizar, aprovar, recusar ou gerar novamente o PDF não consome outra unidade;
- excluir uma proposta não devolve a unidade do mês, evitando contorno do limite por criação e exclusão repetida;
- falhas transacionais que não persistem a proposta não consomem unidade.

A tabela de uso registra o plano e o intervalo aplicados ao período. A autorização futura deverá reservar a unidade de forma atômica, em vez de calcular a cota apenas contando propostas ainda existentes.

## Usuários por conta

O limite representa assentos da empresa e inclui:

- o proprietário da conta;
- usuários ativos;
- convites pendentes ainda válidos.

Convites revogados ou expirados e usuários efetivamente removidos deixam de ocupar assento. Suspender um usuário não deve liberar automaticamente a vaga enquanto ele continuar pertencendo à empresa; a remoção formal é necessária para impedir alternância abusiva de assentos.

O produto atual opera com um usuário por conta. A cota de cinco usuários do Pro é uma definição futura para quando gestão de equipe, convites e permissões forem implementados.

## Armazenamento

O armazenamento soma os bytes efetivamente ocupados por objetos pertencentes à conta nos buckets gerenciados pelo SaaS, incluindo:

- PDFs de propostas;
- logos da empresa;
- foto de perfil;
- imagens e recursos enviados para modelos de PDF;
- outros arquivos privados que venham a ser associados à conta.

Metadados do PostgreSQL não entram nessa cota. O servidor deve usar o tamanho real registrado no Storage e nunca confiar em tamanho informado pelo navegador.

## Avisos e bloqueio

- a interface deve avisar quando o uso atingir 80% de qualquer limite;
- ao atingir 100%, somente a operação incremental correspondente é bloqueada;
- leitura, download, exportação, exclusão de arquivos e acesso a dados existentes continuam permitidos;
- o sistema nunca apaga dados automaticamente por excesso de uso;
- mensagens devem mostrar uso atual, limite, data de renovação da cota mensal quando aplicável e ação recomendada.

Exemplos:

- proposta no limite: bloquear nova criação, mas permitir editar e enviar propostas existentes;
- assentos no limite: bloquear novo convite, mas manter usuários atuais;
- armazenamento no limite: bloquear upload ou geração que aumente bytes, mas permitir baixar e excluir arquivos.

## Downgrade do Pro para o Gratuito

Quando uma conta acima dos limites do Gratuito perde o acesso Pro:

1. dados e arquivos existentes são preservados;
2. nenhum usuário é removido automaticamente;
3. novas propostas, convites e uploads ficam bloqueados enquanto o uso estiver acima da cota aplicável;
4. o proprietário pode reduzir uso, remover membros ou reativar o Pro;
5. propostas existentes permanecem acessíveis e exportáveis;
6. a política de tolerância por falha de pagamento será definida em item posterior do checklist e poderá adiar o início desses bloqueios.

## Fonte de verdade técnica

Os valores versionados estão em `src/lib/billing/planCatalog.ts` e são expostos pelas funções de `src/lib/billing/planLimits.ts`:

- Gratuito: 5 propostas/mês, 1 usuário, 250 MiB;
- Pro mensal: 30 propostas/mês, 5 usuários, 10 GiB;
- Pro anual: 40 propostas/mês, 5 usuários, 10 GiB;
- aviso: 80% de utilização.

No banco, `billing_plans.proposals_per_month` representa a cota do intervalo mensal e `annual_proposals_per_month` representa a cota anual. A função interna `resolve_plan_proposal_limit(plan_code, billing_interval)` resolve o valor correto no servidor.

A aplicação no servidor deverá ler o plano e o intervalo efetivos da assinatura, consultar o período e o uso persistidos, reservar a cota de forma transacional e só então executar a operação. Validações de interface serão apenas informativas.

## Revisão após o beta

Revisar os limites usando:

- propostas criadas por conta e por mês;
- tamanho médio e percentis dos PDFs;
- armazenamento acumulado por conta;
- número real de colaboradores por empresa;
- taxa de contas que atingem 80% e 100%;
- conversão do Gratuito para o Pro;
- cancelamentos motivados por cota ou preço;
- custo de Supabase, Storage, transferência e suporte.

Mudanças futuras devem ser versionadas, comunicadas e nunca reduzir silenciosamente direitos já pagos durante o período vigente.
