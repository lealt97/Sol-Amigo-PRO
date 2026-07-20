# P2 — Estado de implementação

## Objetivo

O P2 prepara o SolAmigo para um **beta controlado**, sem declarar que o produto está juridicamente ou comercialmente liberado para lançamento aberto.

## Implementado no código

### Documentos legais e aceite versionado

- páginas públicas para Termos de Uso, Política de Privacidade e Política de Cancelamento e Reembolso;
- versões identificadas por tipo e código;
- minutas marcadas explicitamente como `draft` e “revisão jurídica pendente”;
- aceite obrigatório no cadastro;
- persistência do aceite por conta, tipo, versão, data e origem;
- consulta e renovação do aceite na área “Privacidade e Dados”.

O código não considera as minutas juridicamente aprovadas. A ativação comercial aberta continua bloqueada até revisão profissional, aprovação formal e definição das informações legais da empresa responsável.

### Direitos sobre os dados

- exportação autenticada em JSON;
- inclusão de cadastro, clientes, kits, propostas, cálculos, eventos, assinatura, uso, aceites e inventário de arquivos;
- links temporários de uma hora para arquivos privados;
- exclusão completa protegida por nova autenticação com senha;
- remoção dos arquivos gerenciados antes da exclusão do usuário;
- preservação de trilhas estritamente necessárias de forma desvinculada da conta;
- bloqueio da RPC legada que excluía somente os registros do banco.

A exportação não inclui senha, hash de senha, segredo MFA, TOTP, códigos de recuperação, token, chave de pagamento ou dados de cartão.

### Administração do SaaS

- tabela `platform_admins`, sem acesso pelo frontend comum;
- papéis `support`, `operations` e `super_admin` validados no servidor;
- painel de contas, empresas, assinatura, uso, falhas e feedback do beta;
- bloqueio e reativação pela Supabase Auth;
- justificativa obrigatória;
- proteção contra autobloqueio;
- auditoria append-only de visualizações e alterações administrativas.

Nenhum administrador inicial é criado automaticamente. O primeiro `super_admin` deve ser cadastrado por procedimento controlado e auditado.

### Onboarding e beta

- fluxo “Primeiros Passos” com cinco etapas calculadas a partir dos dados reais:
  1. empresa;
  2. logo;
  3. kit solar;
  4. cliente;
  5. primeira proposta;
- progresso persistente sem criar estado duplicado;
- formulário de feedback do beta com categoria, mensagem e nota opcional;
- consulta administrativa dos feedbacks.

### Comunicação financeira

O PDF identifica o cálculo como **payback simples** e informa que a estimativa não considera inflação energética, degradação, manutenção, indisponibilidade, financiamento, impostos, custo de capital, reajustes tarifários ou mudanças regulatórias. O documento também informa que o resultado não é garantia de geração, economia ou retorno.

## Validação automatizada

- contratos TypeScript para documentos legais, aceite, exportação, exclusão, administração, onboarding e aviso financeiro;
- teste SQL de aceites, isolamento do feedback, privilégios administrativos e auditoria append-only;
- auditoria RLS ampliada para as tabelas e funções P2;
- homologação das migrations no Supabase local pelo GitHub Actions.

## Pendências externas obrigatórias

O P2 somente poderá ser considerado concluído para lançamento aberto depois de:

1. revisão jurídica das três minutas;
2. identificação formal do controlador, operador, encarregado e canal do titular;
3. definição e aprovação dos períodos de retenção;
4. definição da política comercial de cancelamento, arrependimento e reembolso;
5. publicação das novas migrations e Edge Functions em homologação;
6. criação controlada do primeiro administrador;
7. execução do beta real com 5 a 10 integradores solares;
8. registro das métricas, incidentes, objeções e correções do beta;
9. validação completa de exportação e exclusão em homologação;
10. decisão formal GO / NO-GO assinada pelos responsáveis.

Até essas etapas serem concluídas, o estado correto é:

> **Código preparado para beta controlado; lançamento comercial aberto não aprovado.**
