# Procedimento para perda do celular com MFA

## Objetivo

Este procedimento orienta usuários e suporte quando o celular usado no aplicativo autenticador foi perdido, roubado, trocado ou deixou de funcionar.

O fluxo prioritário é sempre a recuperação de autoatendimento com um código de recuperação MFA de uso único. O procedimento não autoriza remoção manual de fatores, alteração direta das tabelas de autenticação ou desativação informal do MFA pelo suporte.

## Escopo

Aplica-se a contas com MFA TOTP ativo no SolAmigo Pro e cobre:

- perda, roubo ou dano do aparelho;
- troca de aparelho sem migração do autenticador;
- exclusão acidental do aplicativo autenticador;
- códigos TOTP indisponíveis ou permanentemente inacessíveis;
- suspeita de que o aparelho perdido possa estar desbloqueado.

Quando o usuário também não possui código de recuperação, o chamado deve seguir `docs/ADMIN_ACCOUNT_RECOVERY_PROCESS.md`. A definição desse processo não autoriza sua execução enquanto os pré-requisitos de papel administrativo, duplo controle, canal seguro, notificações e auditoria não estiverem disponíveis.

## Princípios de segurança

1. Nunca solicitar senha, código TOTP, chave secreta do autenticador ou código de recuperação por e-mail, telefone, chat ou chamado.
2. Nunca registrar códigos de recuperação em logs, tickets, capturas de tela ou anotações de suporte.
3. Nunca remover fatores diretamente em `auth.mfa_factors`, editar `auth.users` ou executar SQL improvisado no banco ativo.
4. Nunca expor `SUPABASE_SERVICE_ROLE_KEY` ao navegador, Railway ou equipe de atendimento.
5. A recuperação deve usar a Edge Function `mfa-recovery`, que valida o JWT, consome o código atomicamente e executa as ações administrativas no servidor.
6. Mensagens ao usuário não devem revelar se um código existe, já foi usado ou pertence a outra conta além da resposta genérica prevista no produto.
7. Após a recuperação, todas as sessões devem ser revogadas e o usuário deve entrar novamente.
8. O MFA deve ser configurado novamente antes de considerar o incidente encerrado.

## Fluxo A — usuário possui um código de recuperação

### 1. Iniciar o login

1. Acesse a tela de login do SolAmigo Pro.
2. Informe o e-mail e a senha normalmente.
3. Na tela **Verificação em duas etapas**, selecione **Perdi acesso ao aplicativo autenticador**.

### 2. Usar o código de recuperação

1. Digite um dos códigos salvos durante a ativação do MFA.
2. Confirme em **Usar código e remover MFA**.
3. O código é validado exclusivamente no servidor e funciona uma única vez.

### 3. Resultado esperado

Quando o código é válido, o sistema deve:

- consumir o código atomicamente;
- remover todos os fatores MFA do usuário pelo Admin API;
- revogar os demais códigos de recuperação ativos;
- marcar `mfa_enabled` como falso no perfil;
- revogar globalmente as sessões associadas ao token;
- encerrar a sessão local do navegador;
- redirecionar para novo login;
- exigir nova configuração do autenticador e geração de um novo conjunto de códigos.

### 4. Reconfigurar a proteção

1. Entre novamente com e-mail e senha.
2. Acesse **Configurações > Segurança**.
3. Ative o MFA em um novo aplicativo autenticador.
4. Confirme o código TOTP atual.
5. Gere os dez novos códigos de recuperação.
6. Salve-os em um gerenciador de senhas ou local físico seguro, separado do celular.
7. Confirme que os códigos foram armazenados antes de acessar o sistema.

## Fluxo B — usuário ainda possui uma sessão aberta

Uma sessão aberta não substitui o código de recuperação. O usuário deve:

1. evitar sair da sessão até confirmar que possui um código de recuperação;
2. exportar ou concluir atividades urgentes sem compartilhar dados sensíveis;
3. iniciar o Fluxo A em uma nova janela usando um código de recuperação;
4. após a recuperação, entrar novamente e reconfigurar o MFA.

A desativação normal em **Configurações > Segurança** exige o código TOTP atual. O suporte não deve contornar essa exigência.

## Fluxo C — usuário não possui código de recuperação

O suporte deve:

1. explicar que não pode remover o MFA manualmente;
2. classificar o chamado como **Recuperação de conta sem segundo fator**;
3. registrar somente dados mínimos: e-mail da conta, data aproximada do último acesso e descrição do problema;
4. não solicitar senha, segredo TOTP, documento pessoal ou qualquer credencial em canal comum;
5. encaminhar o caso ao processo definido em `docs/ADMIN_ACCOUNT_RECOVERY_PROCESS.md`;
6. confirmar se os pré-requisitos de execução administrativa estão ativos;
7. manter o caso no estado **bloqueado — pré-requisito indisponível** quando papel administrativo, duplo controle, canal seguro, notificações ou auditoria não existirem;
8. não alterar o Supabase enquanto a identidade não tiver sido verificada e duas aprovações independentes não tiverem sido registradas.

Não é permitido usar recuperação de senha como substituto do segundo fator. Alterar a senha não remove o MFA.

## Caso de aparelho roubado ou possivelmente desbloqueado

Além do Fluxo A, orientar o usuário a:

1. bloquear ou apagar o aparelho remotamente pelo provedor do sistema operacional;
2. trocar a senha do e-mail principal, caso ele também estivesse acessível no aparelho;
3. trocar a senha do SolAmigo Pro após recuperar o acesso;
4. revisar dispositivos e sessões de outros serviços conectados;
5. comunicar imediatamente qualquer atividade suspeita observada na conta;
6. reconfigurar o MFA em outro aparelho e armazenar novos códigos.

## Procedimento do suporte

### Informações permitidas no chamado

- e-mail da conta;
- nome da empresa, quando informado espontaneamente;
- data e horário aproximados da perda;
- indicação de aparelho perdido, roubado, trocado ou danificado;
- confirmação de que o usuário possui ou não um código de recuperação;
- identificador do caso administrativo, quando criado;
- resultado final: autoatendimento concluído, escalado, bloqueado, recusado ou recuperado.

### Informações proibidas

- senha atual ou antiga;
- código TOTP;
- código de recuperação;
- chave secreta ou QR Code do autenticador;
- `access_token`, `refresh_token` ou cabeçalho `Authorization`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- cópia de banco, conteúdo de `auth.users` ou `auth.mfa_factors`;
- documento pessoal por e-mail, WhatsApp, chat comum ou ticket sem canal seguro aprovado.

### Resposta padrão quando há código de recuperação

> Na tela de verificação em duas etapas, escolha “Perdi acesso ao aplicativo autenticador” e use um dos códigos de recuperação salvos. Não envie esse código para o suporte. Após a recuperação, todas as sessões serão encerradas e você deverá configurar o MFA novamente.

### Resposta padrão quando não há código de recuperação

> Para proteger sua conta, o suporte não remove o MFA por e-mail, telefone ou chat. Registraremos o incidente e o encaminharemos ao processo administrativo seguro de recuperação de conta. A execução exige verificação forte de identidade, duplo controle, notificações e auditoria. Não envie sua senha, código TOTP, QR Code ou qualquer segredo de autenticação.

## Critérios de encerramento

Um incidente com código de recuperação somente pode ser encerrado quando:

- o código foi aceito uma única vez;
- as sessões anteriores foram revogadas;
- o usuário conseguiu entrar novamente;
- um novo fator TOTP foi verificado;
- um novo conjunto de códigos foi gerado e salvo;
- nenhuma credencial ou segredo foi registrado no chamado.

Um incidente sem código de recuperação somente pode ser encerrado quando:

- o processo administrativo foi executado com pré-requisitos ativos;
- a identidade foi confirmada por sinais independentes;
- o período de espera e as notificações foram concluídos;
- verificador, aprovador e executor são pessoas diferentes;
- todas as sessões e códigos antigos foram revogados;
- os fatores antigos foram removidos pela Admin API;
- o usuário configurou novo TOTP e novos códigos;
- a auditoria append-only foi concluída.

Caso contrário, o chamado permanece bloqueado, recusado ou escalado, sem alteração da conta.

## Validação técnica obrigatória

O fluxo deve permanecer coberto por testes que confirmem:

- geração de dez códigos com 96 bits de entropia;
- armazenamento somente de SHA-256 e quatro caracteres de identificação;
- geração restrita a sessão AAL2 e fator TOTP verificado;
- consumo atômico e de uso único;
- rejeição de reutilização e de códigos inexistentes;
- validação do usuário pelo JWT;
- `service_role` somente na Edge Function;
- remoção dos fatores pelo Admin API;
- revogação global das sessões;
- revogação dos códigos restantes;
- restauração compensatória do código quando a remoção falha antes de concluir;
- redirecionamento para novo login e nova configuração do MFA;
- documentação do processo administrativo e bloqueio explícito sem pré-requisitos.

## Revisão periódica

- revisar este procedimento após qualquer alteração no MFA, Supabase Auth ou Edge Function;
- executar o cenário de perda do celular no ambiente de homologação antes de cada lançamento;
- confirmar que a equipe de suporte conhece as informações proibidas;
- revisar em conjunto com `docs/ADMIN_ACCOUNT_RECOVERY_PROCESS.md`;
- atualizar o procedimento após qualquer incidente ou mudança na ferramenta administrativa.