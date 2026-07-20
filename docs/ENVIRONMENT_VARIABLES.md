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
- Nunca coloque segredos de pagamento, SMTP, administração ou banco no frontend.
- Nenhuma variável Cakto ou Stripe pode começar com `VITE_`.
- Homologação e produção devem usar projetos Supabase distintos.
- Ao alterar uma variável `VITE_*`, execute um novo build e deploy; mudar somente o runtime não altera um bundle já compilado.

## 2. Servidor de produção no Railway

| Variável | Obrigatória | Origem | Finalidade |
|---|---:|---|---|
| `PORT` | Automática | Railway | Porta usada pelo servidor Express. O Railway injeta esse valor em cada deployment. |
| `NODE_ENV` | Recomendada | Railway/configuração | Deve ser `production` no ambiente comercial. |

O processo de produção é iniciado por `npm start`, que executa `node server.mjs`. O endpoint `/health` deve responder HTTP 200 para o healthcheck do Railway.

## 3. Supabase Edge Functions

Estas variáveis pertencem somente ao ambiente protegido das Edge Functions.

### Credenciais padrão do Supabase

| Variável | Obrigatória | Visibilidade | Finalidade |
|---|---:|---|---|
| `SUPABASE_URL` | Sim | servidor | URL do projeto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | segredo de servidor | Operações administrativas controladas, incluindo PDF privado, MFA e billing. |

A `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser copiada para o Railway frontend, repositório, logs, navegador ou arquivo `.env` versionado.

### Cakto

| Variável | Obrigatória | Finalidade |
|---|---:|---|
| `CAKTO_CLIENT_ID` | Sim para Cakto | Identificador OAuth2 da integração. |
| `CAKTO_CLIENT_SECRET` | Sim para Cakto | Segredo OAuth2 exibido no painel Cakto. |
| `CAKTO_PRO_MONTHLY_OFFER_ID` | Sim para Cakto | Oferta server-side do Pro mensal de R$ 100,00. |
| `CAKTO_PRO_ANNUAL_OFFER_ID` | Sim para Cakto | Oferta server-side do Pro anual de R$ 1.000,00. |
| `CAKTO_API_BASE_URL` | Não | Override exclusivo para teste local controlado; em produção usa `https://api.cakto.com.br`. |

### Stripe

| Variável | Obrigatória | Finalidade |
|---|---:|---|
| `STRIPE_SECRET_KEY` | Sim para Stripe | Chave secreta ou restrita usada somente no servidor. |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Sim para Stripe | Price server-side do Pro mensal. |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Sim para Stripe | Price server-side do Pro anual. |
| `STRIPE_API_BASE_URL` | Não | Override exclusivo para teste local controlado; em produção usa `https://api.stripe.com`. |

As referências de oferta e Price não são aceitas do navegador. A função server-side escolhe a referência esperada a partir de `provider`, plano e intervalo.

## 4. Matriz de ambientes

| Ambiente | Supabase | Railway | Pagamentos | Dados permitidos |
|---|---|---|---|---|
| Desenvolvimento | Projeto exclusivo de desenvolvimento | execução local | mocks ou sandbox | dados fictícios |
| Homologação | Projeto exclusivo de homologação | serviço/ambiente de staging | Cakto/Stripe de teste | dados de teste controlados |
| Produção | Projeto exclusivo de produção | serviço/ambiente de produção | credenciais de produção | dados reais de clientes |

Cada ambiente deve possuir suas próprias URLs, chaves públicas, buckets, migrations aplicadas, configurações de autenticação, produtos/ofertas e webhooks.

## 5. Validação antes de publicar

1. Confirmar que `VITE_SUPABASE_URL` corresponde ao ambiente correto.
2. Confirmar que a chave do frontend é pública e não é `service_role`.
3. Confirmar que nenhum segredo Cakto ou Stripe usa prefixo `VITE_`.
4. Executar `npm run build`.
5. Executar `npm start` e validar `GET /health`.
6. Confirmar login, MFA, geração de PDF e link público no ambiente publicado.
7. Invocar `billing-provider-readiness` com sessão autenticada e confirmar os provedores esperados.
8. Verificar que nenhum segredo, token OAuth ou chave aparece no bundle, logs ou painel do navegador.
