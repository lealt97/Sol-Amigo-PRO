# Variáveis de ambiente — SolAmigo Propostas FV

Este documento define as variáveis permitidas e obrigatórias em desenvolvimento, homologação e produção.

## 1. Frontend Vite

As variáveis abaixo são incorporadas ao bundle durante o build. Elas são públicas por natureza e podem ser visualizadas pelo navegador.

| Variável | Obrigatória | Ambientes | Finalidade |
|---|---:|---|---|
| `VITE_SUPABASE_URL` | Sim | desenvolvimento, homologação e produção | URL base do projeto Supabase, sem `/rest/v1` no final. |
| `VITE_SUPABASE_ANON_KEY` | Sim | desenvolvimento, homologação e produção | Chave pública `anon` ou publishable do Supabase. |

### Regras de segurança

- Nunca use `SUPABASE_SERVICE_ROLE_KEY` em uma variável iniciada por `VITE_`.
- Nunca coloque `STRIPE_SECRET_KEY`, segredo de webhook, IDs administrativos, SMTP ou banco no frontend.
- Homologação e produção devem usar projetos Supabase e contas/modos Stripe distintos.
- Ao alterar uma variável `VITE_*`, execute um novo build e deploy; mudar somente o runtime não altera um bundle já compilado.

## 2. Servidor de produção no Railway

| Variável | Obrigatória | Origem | Finalidade |
|---|---:|---|---|
| `PORT` | Automática | Railway | Porta usada pelo servidor Express. O Railway injeta esse valor em cada deployment. |
| `NODE_ENV` | Recomendada | Railway/configuração | Deve ser `production` no ambiente comercial. |

O processo de produção é iniciado por `npm start`, que executa `node server.mjs`. O endpoint `/health` deve responder HTTP 200 para o healthcheck do Railway.

## 3. Variáveis comuns das Supabase Edge Functions

Estas variáveis pertencem somente ao ambiente protegido das Edge Functions.

| Variável | Obrigatória | Visibilidade | Finalidade |
|---|---:|---|---|
| `SUPABASE_URL` | Sim | servidor | URL do projeto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | segredo de servidor | Ações administrativas e gravações protegidas no banco. |

A `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser copiada para frontend, Railway público, repositório, logs, navegador ou arquivo `.env` versionado.

### `public-proposal-pdf`

Usa as credenciais comuns para consultar a proposta e criar URL temporária para o PDF privado.

### `stripe-customer` e futuras funções Stripe

| Variável | Obrigatória | Ambiente | Finalidade |
|---|---:|---|---|
| `STRIPE_SECRET_KEY` | Sim | homologação e produção | Chave secreta da Stripe usada exclusivamente no servidor. Use `sk_test_...` em homologação e `sk_live_...` em produção. |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Para checkout | homologação e produção | ID `price_...` do Pro mensal de R$ 100,00. |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Para checkout | homologação e produção | ID `price_...` do Pro anual de R$ 1.000,00. |
| `STRIPE_WEBHOOK_SECRET` | Para webhook | homologação e produção | Segredo `whsec_...` exclusivo do endpoint e do modo Stripe correspondente. |
| `SITE_URL` | Para checkout | homologação e produção | Origem HTTPS permitida para URLs de sucesso e cancelamento. |

Regras:

- nunca prefixar segredos Stripe com `VITE_`;
- nunca registrar valores completos de chaves em logs ou eventos;
- usar produtos, preços e endpoints separados entre modo de teste e modo live;
- trocar `STRIPE_WEBHOOK_SECRET` quando o endpoint for recriado ou houver suspeita de exposição;
- configurar segredos com `supabase secrets set`, nunca em migration SQL;
- a aplicação deve confiar nos IDs de preço configurados no servidor, e não em valores enviados pelo navegador.

## 4. Matriz de ambientes

| Ambiente | Supabase | Stripe | Railway | Dados permitidos |
|---|---|---|---|---|
| Desenvolvimento | Projeto exclusivo de desenvolvimento | mocks ou Stripe CLI/test mode | execução local | dados fictícios |
| Homologação | Projeto exclusivo de homologação | modo de teste | serviço/ambiente de staging | dados de teste controlados |
| Produção | Projeto exclusivo de produção | modo live | serviço/ambiente de produção | dados reais de clientes |

Cada ambiente deve possuir suas próprias URLs, chaves públicas, segredos, buckets, migrations, produtos, preços, endpoint de webhook e configurações de autenticação.

## 5. Validação antes de publicar

1. Confirmar que `VITE_SUPABASE_URL` corresponde ao ambiente correto.
2. Confirmar que a chave do frontend é pública e não é `service_role`.
3. Confirmar que a chave Stripe corresponde ao modo correto e não aparece no bundle.
4. Validar que os IDs mensais e anuais pertencem ao produto Pro do mesmo ambiente.
5. Executar `npm run build`.
6. Executar `npm start` e validar `GET /health`.
7. Confirmar login, MFA, geração de PDF e link público no ambiente publicado.
8. Invocar `stripe-customer` com usuário de teste e confirmar o vínculo idempotente.
9. Quando o webhook existir, validar sua assinatura usando corpo bruto e segredo do endpoint.
10. Verificar que nenhum segredo aparece no bundle, logs ou painel do navegador.
