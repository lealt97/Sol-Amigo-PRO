# Integração do provedor — Stripe Billing

## Decisão

O provedor inicial do SolAmigo será o Stripe Billing, usando Stripe Checkout para as futuras assinaturas mensal e anual.

A escolha mantém o formulário de pagamento hospedado pelo provedor e concentra no servidor a criação de clientes, sessões, assinaturas e webhooks. O frontend nunca recebe a chave secreta e nunca informa o preço monetário que será cobrado.

## Escopo desta etapa

Esta etapa integra o SDK oficial da Stripe ao ambiente de Supabase Edge Functions e implementa o vínculo idempotente entre uma conta autenticada e um Customer da Stripe.

Ainda não estão incluídos:

- criação da Checkout Session;
- processamento de webhooks;
- ativação ou cancelamento da assinatura;
- portal de cobrança;
- bloqueios por plano.

Esses itens permanecem separados no checklist para permitir revisão e homologação individual.

## Arquitetura

### Módulo compartilhado

`supabase/functions/_shared/stripeBilling.ts`:

- importa `stripe` com versão exata `20.4.0`;
- lê segredos somente de `Deno.env`;
- valida formatos de chave, Price IDs e segredo de webhook;
- cria o cliente com duas tentativas automáticas de rede, timeout de dez segundos e telemetria desativada;
- resolve o Price ID mensal ou anual exclusivamente pela configuração do servidor;
- gera chaves de idempotência com no máximo 255 caracteres.

### Edge Function `stripe-customer`

A função exige JWT válido e aceita somente `POST`.

Fluxo:

1. valida o JWT com Supabase Auth no servidor;
2. consulta a assinatura vinculada a `auth.users.id`;
3. rejeita conflito com outro provedor;
4. retorna sucesso sem nova chamada quando já existe Customer vinculado;
5. cria o Customer com e-mail, nome e `supabase_account_id` em metadata;
6. usa chave idempotente estável `customer:create` por conta;
7. atualiza a assinatura somente quando `provider_customer_id` ainda é nulo;
8. confirma o resultado em caso de concorrência;
9. registra `provider.customer_linked` na trilha de cobrança;
10. retorna apenas `linked` e `existing`, sem expor o Customer ID.

## Idempotência e concorrência

A chave de criação não depende de cabeçalhos ou dados enviados pelo navegador. Repetições imediatas da mesma operação usam a mesma chave. A atualização no banco aplica comparação `provider_customer_id is null`, garantindo que apenas uma execução seja responsável pelo evento de vínculo.

Quando a Stripe cria o Customer e a atualização local falha, a próxima tentativa usa a mesma chave idempotente. O sistema não apaga automaticamente o Customer remoto, pois a exclusão compensatória poderia remover um recurso já utilizado por outra execução concorrente.

## Segredos

Configurar exclusivamente como Supabase secrets:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_REDACTED \
  STRIPE_PRO_MONTHLY_PRICE_ID=price_REDACTED \
  STRIPE_PRO_ANNUAL_PRICE_ID=price_REDACTED \
  SITE_URL=https://staging.example.com
```

O segredo do webhook será adicionado quando o endpoint correspondente for implementado:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_REDACTED
```

Nunca enviar valores reais por chat, issue, commit, log ou variável `VITE_*`.

## Produtos e preços no Stripe

No modo de teste, criar um produto chamado **SolAmigo Pro** com dois Prices recorrentes em BRL:

- mensal: R$ 100,00, intervalo mensal;
- anual: R$ 1.000,00, intervalo anual.

Os IDs `price_...` são configuração de ambiente. Eles não devem ser inseridos em migration, bundle do frontend ou tabela editável pelo usuário.

## Publicação e teste de homologação

1. aplicar a migration de cobrança;
2. configurar a chave secreta do modo de teste;
3. publicar a função:

```bash
supabase functions deploy stripe-customer
```

4. entrar com uma conta de homologação;
5. invocar `stripe-customer` pelo cliente Supabase;
6. confirmar retorno `{ "linked": true, "existing": false }`;
7. invocar novamente e confirmar `{ "linked": true, "existing": true }`;
8. confirmar no Stripe Workbench que existe um único Customer;
9. confirmar em `subscriptions` que `provider = 'stripe'` e o Customer ID foi persistido;
10. confirmar um único evento `provider.customer_linked`.

## Critério para marcar o checklist

O item **Integrar provedor de pagamentos** somente pode ser marcado quando:

- a função estiver publicada em homologação;
- a chave usada for de teste;
- uma conta de teste for vinculada com sucesso;
- a segunda invocação não criar outro Customer;
- nenhum segredo aparecer no frontend ou nos logs;
- TypeScript, testes e build estiverem aprovados.
