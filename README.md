# Sol Amigo Propostas FV

SaaS para empresas integradoras, projetistas e vendedores de energia solar criarem propostas comerciais fotovoltaicas profissionais, dimensionarem sistemas, calcularem preço, margem, economia e payback, além de acompanharem clientes e propostas.

## Principais recursos

- autenticação e perfis de empresa;
- cadastro e gestão de clientes;
- criação, edição, duplicação e histórico de propostas;
- dimensionamento On-Grid, híbrido e Off-Grid;
- levantamento de cargas;
- cadastro e seleção de kits fotovoltaicos;
- cálculo de custos, margem, desconto, lucro e markup;
- cálculo de economia e payback;
- modelos de PDF personalizáveis;
- geração de PDF e envio por link público/WhatsApp;
- aprovação ou recusa pública da proposta;
- armazenamento privado dos PDFs comerciais;
- salvamento transacional e controle de concorrência por revisão.

## Tecnologias

- React 19
- TypeScript
- Vite
- React Router
- React Hook Form
- Zod
- Supabase Auth, Postgres, RLS, Storage e Edge Functions
- `@react-pdf/renderer`
- Recharts
- Tailwind CSS
- Express para servir o build de produção

## Requisitos

- Node.js 20 ou superior;
- npm;
- projeto Supabase configurado.

## Configuração local

1. Instale as dependências:

```bash
npm ci
```

2. Copie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

3. Preencha somente as credenciais públicas do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Nunca coloque a `SUPABASE_SERVICE_ROLE_KEY` no frontend ou em variáveis iniciadas por `VITE_`.

4. Inicie o projeto:

```bash
npm run dev
```

A aplicação será aberta por padrão em `http://localhost:3000`.

## Comandos

```bash
npm run dev             # servidor local de desenvolvimento
npm run typecheck       # auditoria TypeScript completa da aplicação
npm run typecheck:core  # verificação estrita isolada do núcleo e dos testes
npm run test            # executa todas as suítes automatizadas
npm run build           # TypeScript completo + testes + build de produção
npm run build:app       # somente o build Vite, sem as validações
npm start               # servidor Express do build de produção
npm run check           # alias do build protegido
npm run preview         # visualização do build pelo Vite
```

O comando `npm run build` é propositalmente protegido. O Railway e outros ambientes que usam o script padrão de build só publicam a aplicação depois que o TypeScript completo, os testes automatizados e o build Vite terminam com sucesso.

## Qualidade e integração contínua

O workflow `.github/workflows/quality.yml` executa automaticamente na branch `main` e em pull requests:

1. `npm ci`;
2. verificação TypeScript completa;
3. testes automatizados;
4. build de produção.

Os testes atuais cobrem cálculos solares e financeiros, validação de login, autenticação por senha, recuperação e atualização de senha, decisão do gate MFA, desafio TOTP, elevação para AAL2, criação de fator com nome único, desativação de fatores e tradução dos principais erros de MFA.

## Railway

A configuração de produção fica versionada em `railway.json` e prevalece sobre diferenças manuais entre serviços vinculados ao repositório:

- builder Railpack;
- build por `npm run build`;
- inicialização por `npm start`;
- healthcheck em `/health`;
- reinício automático limitado em caso de falha.

O servidor `server.mjs` usa a porta fornecida pelo Railway, serve o diretório `dist`, suporta as rotas da SPA e encerra corretamente ao receber `SIGTERM`.

As variáveis exigidas em cada ambiente estão documentadas em `docs/ENVIRONMENT_VARIABLES.md`.

## Supabase

As alterações de banco ficam em `supabase/migrations` e devem ser aplicadas em ordem cronológica.

Com a CLI vinculada ao projeto:

```bash
supabase db push
```

A função pública que entrega PDFs privados está em:

```text
supabase/functions/public-proposal-pdf
```

Implantação:

```bash
supabase functions deploy public-proposal-pdf --no-verify-jwt
```

Essa função é pública por design, valida o token da proposta no servidor e retorna uma URL assinada temporária. A service role permanece apenas no ambiente protegido da Edge Function.

## Estrutura principal

```text
src/
  components/          componentes compartilhados
  contexts/            autenticação e contexto global
  features/design-pdf/ editor de modelos de proposta
  lib/auth/            fluxos testáveis de login, recuperação e MFA
  lib/calculations/    cálculos solares, financeiros e payback
  lib/pdf/             geração e armazenamento de PDF
  pages/               páginas e fluxos da aplicação
  services/            acesso ao Supabase e regras de persistência
  types/               tipos do domínio
supabase/
  functions/           Edge Functions
  migrations/          evolução do banco e políticas
tests/                 testes automatizados
server.mjs             servidor do build de produção
railway.json           configuração de deploy como código
```

## Segurança

- As tabelas utilizam Row Level Security.
- O fluxo público não consulta diretamente a tabela de propostas.
- O payload público não inclui custos internos, margem, comissão ou lucro.
- PDFs comerciais são armazenados em bucket privado.
- Novos uploads são separados por pasta de usuário.
- Proposta, cálculo solar, cargas e evento são persistidos em uma transação.
- Alterações concorrentes usam o campo `revision` para evitar sobrescritas silenciosas.

Consulte também:

- `docs/SECURITY_PHASE_1.md`
- `docs/INTEGRITY_PHASE_2.md`
- `docs/QUALITY_PHASE_3.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/DISASTER_RECOVERY_RUNBOOK.md`
- `docs/MFA_LOST_PHONE_PROCEDURE.md`
- `docs/PROJECT_COMPLETION_CHECKLIST.md`

## Estado do projeto

O produto está em desenvolvimento ativo. Antes de uma publicação comercial definitiva, valide as migrations, Edge Functions, políticas RLS, fluxo público, geração de PDF e autenticação no ambiente de homologação.
