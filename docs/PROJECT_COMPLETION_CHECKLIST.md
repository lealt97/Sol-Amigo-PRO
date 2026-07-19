# Checklist de Conclusão — SaaS SolAmigo

Este documento acompanha a preparação do produto para lançamento comercial. Um item só deve ser marcado como concluído quando houver validação no ambiente de homologação ou produção e, quando aplicável, evidência em teste automatizado.

## Status geral

- [x] Núcleo funcional do MVP implementado
- [x] Fechamento técnico e qualidade
- [ ] Segurança e recuperação de conta
- [ ] Cobrança, planos e controle de acesso
- [ ] Área administrativa
- [ ] LGPD e documentos legais
- [ ] Monitoramento e operação
- [ ] Onboarding e lançamento beta

## Fase 1 — Fechamento técnico

### TypeScript, build e integração contínua

- [x] Build de produção protegido por testes do núcleo
- [x] Workflow de qualidade configurado no GitHub Actions
- [x] Fazer `npm run typecheck` completo passar sem erros
- [x] Promover o typecheck completo a bloqueio obrigatório do build
- [x] Confirmar build e deploy nos dois serviços Railway
- [x] Diagnosticar e corrigir o serviço Railway que apresenta falha
- [x] Documentar variáveis obrigatórias por ambiente

### Testes automatizados

- [x] Testes dos cálculos solares e financeiros
- [x] Testes de autenticação e recuperação de senha
- [x] Testes de ativação, desafio e desativação do MFA
- [x] Testes de cadastro, edição e exclusão de clientes
- [x] Testes de criação, edição, duplicação e exclusão de propostas
- [x] Testes de kits solares
- [x] Testes de geração e armazenamento de PDF
- [x] Testes do link público, aprovação e recusa
- [x] Testes de isolamento entre contas distintas
- [x] Adicionar testes E2E com Playwright

Evidência atual: 122 testes automatizados do núcleo e 12 execuções E2E com Playwright aprovados no GitHub Actions. A cobertura inclui cálculos, autenticação, recuperação de senha, MFA, clientes, propostas, kits solares, geração e armazenamento de PDF, fluxo público, regressões das políticas RLS e Storage, encaixe proporcional de logos, ajuste de nomes e endereços longos, enquadramento de imagens verticais e horizontais, paletas e cores estáticas de contraste, geração repetida sem perda estrutural de qualidade, compatibilidade do PDF em Chrome, Firefox e WebKit nos perfis desktop, Android e iPhone, política de tamanho do arquivo final, navegação pública, validação de formulários, redirecionamento de rotas protegidas, recuperação de senha, aprovação e recusa pelo navegador. A validação no Supabase ativo executou 21 verificações transacionais com duas identidades distintas para clientes, propostas, kits, modelos de PDF, PDFs privados, logos e recursos de PDF, com TypeScript completo e build de produção aprovados.

### PDFs e editor visual

- [x] Validar todos os modelos com logo horizontal, vertical e quadrada
- [x] Validar nomes e endereços longos sem cortes
- [x] Validar imagens verticais e horizontais
- [x] Validar todas as paletas e cores de contraste
- [x] Testar geração repetida sem perda de qualidade
- [x] Testar PDF em navegadores e dispositivos diferentes
- [x] Definir limite aceitável de tamanho do arquivo final

Evidência de logos: os 12 modelos A4 foram verificados quanto à existência de slot de logo ou fallback documentado. Logos horizontais, quadradas e verticais são centralizadas com `preserveAspectRatio="xMidYMid meet"`, mantendo a proporção e permanecendo integralmente dentro da área disponível.

Evidência de textos longos: nomes empresariais, nomes pessoais, cidades e endereços completos são quebrados em linhas e têm a fonte reduzida progressivamente até caber na área disponível, sem remover caracteres nem aplicar reticências. O PDF carrega rua, número, complemento, bairro, cidade, estado e CEP do cadastro do cliente e exibe o endereço completo no bloco de aceite.

Evidência de imagens: os 12 modelos A4 foram verificados quanto à existência de área de foto reconhecida pelo motor. Imagens paisagem e retrato usam `preserveAspectRatio` em modo `slice`, mantendo a proporção original, preenchendo integralmente a máscara e recortando somente o excedente. O zoom mínimo de 100% e o limite dos deslocamentos impedem o aparecimento de bordas vazias, enquanto o seletor de foco permite priorizar a região desejada.

Evidência de paletas e contraste: os 12 presets mantêm as quatro funções de cor (`primary`, `secondary`, `accent` e `neutral`) com valores hexadecimais válidos. A auditoria confirma que cada função original continua vinculada à mesma função ao trocar a paleta e que branco, transparências e preenchimentos técnicos permanecem estáticos. A capa 12 conserva `#D9D9D9` como cinza estrutural fixo e trata preto como função neutra. Esta validação não alterou SVGs, paletas nem o comportamento visual existente; foram adicionados somente testes de regressão e este registro.

Evidência de geração repetida: a proposta completa foi renderizada três vezes consecutivas pelo mesmo fluxo usado na aplicação. As execuções mantiveram o número de páginas, objetos, streams, fontes e imagens, com variação máxima permitida de 5% no tamanho do arquivo e sem mutação dos dados de entrada. O gerador passou a rejeitar arquivos sem cabeçalho, marcador final, páginas, objetos ou streams suficientes antes do upload; o documento comercial exige pelo menos 10 páginas e 4.096 bytes.

Evidência de navegadores e dispositivos: a página pública e a entrega segura do PDF foram verificadas no Chrome, Firefox e WebKit, usando perfis desktop, Pixel 5 e iPhone 13. Os testes confirmam link visível e seguro, abertura em nova aba, resposta `application/pdf`, cabeçalho `%PDF-`, marcador `%%EOF`, conteúdo íntegro e ausência de estouro horizontal. A validação foi adicionada sem alterar capas, paletas ou o comportamento visual existente.

Evidência de tamanho final: foi definida uma meta operacional de até 5 MiB para propostas normais e um limite absoluto de 15 MiB. Um PDF completo com capa rasterizada A4 detalhada permaneceu abaixo da meta no GitHub Actions. Todo arquivo é verificado antes do upload, e PDFs acima do limite absoluto são rejeitados com erro explícito, sem reduzir a resolução ou alterar o design das capas.

## Fase 2 — Supabase e segurança

### Banco, RLS e Storage

- [x] Aplicar todas as migrations em homologação
- [x] Revisar RLS de todas as tabelas
- [x] Confirmar isolamento de clientes, propostas, kits e configurações
- [x] Confirmar isolamento de arquivos por usuário no Storage
- [ ] Validar a Edge Function de PDF público
- [ ] Testar token público inválido, expirado e revogado
- [ ] Testar backup e restauração do banco
- [ ] Criar procedimento documentado de recuperação de desastre

Evidência de migrations em homologação: como branches hospedadas do Supabase exigem plano Pro, a validação foi executada em um ambiente Supabase local, isolado e descartável no GitHub Actions, sem copiar dados reais nem alterar produção. A reconstrução do banco a partir do zero revelou que o esquema-base anterior ao versionamento não estava registrado no repositório; foram adicionadas migrations idempotentes para formalizar esse baseline e compatibilizar instalações existentes. O fluxo `db reset --local` aplicou todas as migrations na ordem, `migration list --local` confirmou o histórico e `db lint --local` concluiu a auditoria. O workflow publica relatório por 14 dias e encerra todos os containers ao final.

Evidência de RLS: as 12 tabelas do schema `public` foram verificadas com RLS ativo. A auditoria automatizada exige cobertura CRUD nas tabelas pertencentes ao usuário, vínculo das políticas privadas com `auth.uid()`, eventos de proposta append-only, catálogos globais somente leitura e ausência de views públicas não auditadas. `proposal_sequences` permanece deliberadamente sem políticas e sem grants para `anon` ou `authenticated`, sendo acessada somente por função interna. Funções `SECURITY DEFINER` passam a usar `search_path` fixo; funções de gatilho não podem ser chamadas diretamente pela API; RPCs de conta exigem autenticação; e as RPCs públicas por token permanecem disponíveis para visualização, aprovação e recusa. Nenhuma regra funcional, capa, cálculo ou tela foi alterada.

### Autenticação e MFA

- [x] Login por e-mail e senha
- [x] Recuperação de senha
- [x] MFA TOTP com aplicativo autenticador
- [x] Desafio MFA nas rotas protegidas
- [ ] Criar códigos de recuperação de uso único
- [ ] Criar procedimento para perda do celular
- [ ] Exigir confirmação de senha para operações críticas
- [ ] Registrar eventos de ativação e remoção do MFA
- [ ] Definir processo administrativo seguro de recuperação de conta

## Fase 3 — Planos, cobrança e assinatura

- [ ] Definir plano gratuito, mensal e anual
- [ ] Definir limites de propostas, usuários e armazenamento
- [ ] Criar tabelas de planos, assinaturas, eventos e uso
- [ ] Integrar provedor de pagamentos
- [ ] Implementar checkout
- [ ] Implementar webhooks no servidor
- [ ] Tratar pagamento aprovado, recusado e vencido
- [ ] Implementar cancelamento e reativação
- [ ] Implementar alteração de plano
- [ ] Criar tela de assinatura e próxima cobrança
- [ ] Aplicar bloqueios de recursos por plano no servidor
- [ ] Criar período de tolerância após falha de pagamento

## Fase 4 — Administração do SaaS

- [ ] Criar papel administrativo validado no servidor
- [ ] Criar painel de usuários e empresas
- [ ] Consultar plano, assinatura e uso
- [ ] Bloquear e reativar contas
- [ ] Consultar falhas de PDF e eventos importantes
- [ ] Registrar ações administrativas em log de auditoria
- [ ] Criar procedimento de suporte e recuperação de conta

## Fase 5 — LGPD e documentos legais

- [ ] Termos de Uso
- [ ] Política de Privacidade
- [ ] Política de cancelamento e reembolso
- [ ] Consentimento e versão dos termos no cadastro
- [ ] Exportação dos dados da conta
- [ ] Exclusão da conta e dados associados
- [ ] Definir períodos de retenção
- [ ] Criar canal de atendimento ao titular dos dados
- [ ] Revisar cookies e ferramentas de rastreamento

## Fase 6 — Operação e monitoramento

- [ ] Separar desenvolvimento, homologação e produção
- [ ] Configurar monitoramento de erros do frontend
- [ ] Configurar logs estruturados de backend e Edge Functions
- [ ] Criar alertas de falha na geração de PDF
- [ ] Monitorar disponibilidade da aplicação
- [ ] Monitorar consumo do Supabase e Storage
- [ ] Criar painel de métricas de produto
- [ ] Configurar backups e testar restauração periodicamente
- [ ] Definir processo de resposta a incidentes

## Fase 7 — Comunicação e onboarding

### E-mails transacionais

- [ ] Confirmação de cadastro
- [ ] Recuperação e alteração de senha
- [ ] Ativação e alteração do MFA
- [ ] Proposta enviada, visualizada, aprovada e recusada
- [ ] Assinatura iniciada, pagamento recusado e cancelamento
- [ ] Configurar domínio de envio, SPF, DKIM e DMARC

### Primeiro acesso

- [ ] Assistente de configuração da empresa
- [ ] Cadastro da logo e identidade visual
- [ ] Cadastro do primeiro kit
- [ ] Cadastro do primeiro cliente
- [ ] Geração guiada da primeira proposta
- [ ] Estados vazios com orientação clara
- [ ] Central de ajuda e tutoriais curtos

## Fase 8 — Lançamento comercial

- [ ] Domínio definitivo
- [ ] Página pública do produto
- [ ] Página de preços
- [ ] Demonstração do sistema
- [ ] FAQ e canal de suporte
- [ ] Métricas de aquisição e conversão
- [ ] Beta com 5 a 10 integradores solares
- [ ] Registrar e corrigir problemas encontrados no beta
- [ ] Aprovação final de segurança, cobrança e documentos legais
- [ ] Decisão formal GO / NO-GO

## Critério final de conclusão

O projeto estará pronto para lançamento quando um usuário novo conseguir, sem auxílio da equipe:

1. cadastrar-se e confirmar a conta;
2. configurar empresa, identidade visual e segurança;
3. cadastrar cliente e kit;
4. dimensionar um sistema;
5. calcular preço, margem, economia e payback;
6. gerar e enviar uma proposta em PDF;
7. receber aprovação ou recusa pelo link público;
8. contratar, administrar e cancelar uma assinatura;
9. exportar ou excluir seus dados;
10. recuperar o acesso à conta com segurança.

Além disso, nenhum usuário pode acessar dados ou arquivos de outra empresa, e toda falha crítica deve ser monitorada e tratável pela equipe.
