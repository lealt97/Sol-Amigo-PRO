# Recuperação de desastre — SaaS SolAmigo

Este runbook define como recuperar o SaaS SolAmigo após indisponibilidade grave, corrupção de dados, exclusão acidental, comprometimento de credenciais ou perda de um ambiente. Ele cobre Supabase Postgres/Auth/Storage/Edge Functions e os dois serviços Railway.

O procedimento deve ser executado por uma pessoa autorizada, com registro de horários, responsáveis, comandos executados e evidências. A primeira restauração deve ocorrer em ambiente isolado. Nunca use produção como ambiente inicial de teste.

## 1. Objetivos operacionais do beta

- **RPO inicial:** até 24 horas de perda máxima de dados.
- **RTO inicial:** até 8 horas para restabelecer o fluxo essencial.
- **Fluxo essencial:** login, MFA, clientes, kits, propostas, geração e leitura segura de PDF, aprovação e recusa públicas.
- Os objetivos devem ser revistos antes do lançamento comercial e sempre que volume, plano do Supabase ou criticidade do produto mudar.

## 2. Situações que ativam este runbook

Ative o procedimento quando ocorrer pelo menos uma destas situações:

1. banco indisponível ou corrompido;
2. exclusão ou alteração em massa não autorizada;
3. perda de objetos dos buckets de Storage;
4. credencial administrativa ou `service_role` comprometida;
5. migrations aplicadas incorretamente sem rollback seguro;
6. Edge Function pública indisponível ou entregando arquivos incorretos;
7. deploy Railway que interrompe login, propostas ou PDFs;
8. perda completa do projeto Supabase ou de um ambiente Railway.

## 3. Papéis durante o incidente

Uma mesma pessoa pode acumular papéis no beta, mas cada decisão deve ser registrada.

| Papel | Responsabilidade |
|---|---|
| Coordenador do incidente | declara o incidente, define severidade, autoriza restauração e retorno ao ar |
| Operador de banco | seleciona backup, restaura Postgres/Auth e valida integridade |
| Operador de Storage | recupera buckets, objetos, hashes e tipos MIME |
| Operador da aplicação | recupera Edge Functions, variáveis e Railway |
| Responsável por comunicação | registra impacto, atualizações e encerramento |

## 4. Ativos que precisam ser recuperáveis

### 4.1 Código e configuração versionada

- branch `main` e commit de produção;
- `supabase/migrations`;
- `supabase/functions/public-proposal-pdf`;
- `supabase/config.toml`;
- `railway.json` e `server.mjs`;
- documentação de variáveis em `docs/ENVIRONMENT_VARIABLES.md`.

### 4.2 Banco

O pacote de banco deve preservar:

- roles necessárias;
- schema e histórico de migrations;
- dados de `auth`, `public` e metadados de `storage`;
- políticas RLS, funções, triggers, índices e constraints;
- manifesto, tamanho e SHA-256 dos arquivos de backup.

### 4.3 Storage

O banco guarda metadados, mas os bytes dos arquivos precisam de cópia separada. O inventário deve incluir todos os buckets existentes, inclusive futuros. Os buckets atualmente usados pela aplicação são:

- `proposals`: PDFs comerciais privados;
- `pdf-assets`: imagens e recursos dos modelos de PDF;
- `logos`: logos das empresas.

Para cada objeto, preserve:

- bucket e caminho completo;
- bytes do arquivo;
- tamanho;
- SHA-256;
- tipo MIME;
- data do backup.

### 4.4 Configurações externas

- URLs públicas e redirects do Auth;
- configuração de e-mail do Auth;
- secrets das Edge Functions;
- variáveis dos dois serviços Railway;
- domínio, DNS e certificados, quando aplicável;
- credenciais S3 de backup, guardadas fora do repositório.

## 5. Política mínima de backup

### 5.1 Cadência

- backup lógico do banco: diário;
- cópia dos bytes do Storage: diária;
- pacote completo banco + Storage + manifestos: semanal;
- snapshot manual antes de migrations, troca de chaves ou mudanças destrutivas;
- exercício de restauração em ambiente isolado: mensal durante o beta;
- exercício adicional antes de cada lançamento comercial relevante.

### 5.2 Retenção inicial

- diários: 30 dias;
- semanais: 12 semanas;
- mensais: 12 meses;
- evidências dos exercícios: 12 meses.

A retenção deve ser revisada na fase de LGPD para compatibilizar necessidade operacional, contratos e política de exclusão.

### 5.3 Segurança do backup

- use `umask 077` ao gerar arquivos locais;
- criptografe o pacote antes de enviá-lo para armazenamento externo;
- mantenha pelo menos uma cópia fora do Supabase e fora do Railway;
- limite acesso a operadores autorizados com MFA;
- nunca versione backups, senhas, chaves S3, tokens ou `service_role`;
- nunca imprima segredos nos logs;
- registre checksum antes e depois de qualquer transferência.

## 6. Criação do pacote portátil

Os exemplos usam placeholders. Não cole valores reais em scripts versionados ou tickets.

```bash
set -euo pipefail
umask 077

export INCIDENT_ID="backup-$(date -u +%Y%m%dT%H%M%SZ)"
export BACKUP_DIR="backups/${INCIDENT_ID}"
export SOURCE_DB_URL="postgresql://..."

mkdir -p "${BACKUP_DIR}/database" "${BACKUP_DIR}/storage"
```

### 6.1 Banco

Gere roles, schema e dados separadamente:

```bash
supabase db dump --db-url "${SOURCE_DB_URL}" \
  -f "${BACKUP_DIR}/database/roles.sql" --role-only

supabase db dump --db-url "${SOURCE_DB_URL}" \
  -f "${BACKUP_DIR}/database/schema.sql"

supabase db dump --db-url "${SOURCE_DB_URL}" \
  -f "${BACKUP_DIR}/database/data.sql" \
  --use-copy --data-only \
  -x "storage.buckets_vectors" \
  -x "storage.vector_indexes"

supabase db dump --db-url "${SOURCE_DB_URL}" \
  -f "${BACKUP_DIR}/database/history-schema.sql" \
  --schema supabase_migrations

supabase db dump --db-url "${SOURCE_DB_URL}" \
  -f "${BACKUP_DIR}/database/history-data.sql" \
  --use-copy --data-only --schema supabase_migrations
```

Registre integridade:

```bash
find "${BACKUP_DIR}/database" -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > "${BACKUP_DIR}/database-sha256.txt"
```

### 6.2 Bytes do Storage

Use credenciais S3 exclusivas para servidor, com acesso restrito ao processo de backup. Descubra todos os buckets antes da cópia e não dependa apenas da lista atual.

Exemplo com AWS CLI e endpoint S3 do projeto:

```bash
export SOURCE_STORAGE_ENDPOINT="https://<project-ref>.storage.supabase.co/storage/v1/s3"

aws --endpoint-url "${SOURCE_STORAGE_ENDPOINT}" s3 ls \
  > "${BACKUP_DIR}/storage-buckets.txt"

for bucket in proposals pdf-assets logos; do
  mkdir -p "${BACKUP_DIR}/storage/${bucket}"
  aws --endpoint-url "${SOURCE_STORAGE_ENDPOINT}" \
    s3 sync "s3://${bucket}" "${BACKUP_DIR}/storage/${bucket}" \
    --only-show-errors
 done

find "${BACKUP_DIR}/storage" -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > "${BACKUP_DIR}/storage-sha256.txt"
```

A lista do `for` deve ser atualizada dinamicamente quando novos buckets forem adicionados. Não use `--delete` em operações de backup ou restauração.

### 6.3 Manifesto do pacote

Registre no mínimo:

```text
incident_id=
created_at_utc=
source_environment=
source_project_ref=
production_commit=
postgres_version=
database_backup_method=
storage_backup_method=
database_sha256_file=
storage_sha256_file=
operator=
```

Criptografe o diretório final e confirme o checksum do arquivo criptografado antes do upload externo.

## 7. Primeiros 15 minutos de um incidente

1. criar identificador do incidente e registrar horário UTC;
2. classificar o impacto e nomear o coordenador;
3. interromper mudanças, deploys e migrations;
4. preservar logs e evidências;
5. revogar ou rotacionar credenciais comprometidas;
6. impedir novas escritas quando houver risco de aumentar a perda;
7. identificar o último backup íntegro anterior ao evento;
8. registrar o commit e os deployments Railway ativos;
9. decidir entre rollback da aplicação, restauração do banco ou reconstrução completa.

Não apague o ambiente afetado antes de preservar logs, configuração, inventário e backups disponíveis.

## 8. Árvore de decisão

### Cenário A — somente o frontend/deploy está quebrado

Use rollback Railway. Não restaure o banco.

### Cenário B — banco precisa voltar a um ponto anterior, projeto Supabase está saudável

Use a restauração nativa disponível no painel ou PITR, escolhendo um ponto anterior ao incidente. Depois recupere separadamente objetos do Storage que não estejam presentes.

### Cenário C — projeto Supabase foi perdido, comprometido ou não é confiável

Crie um projeto novo, restaure banco e Storage, publique a Edge Function, altere variáveis Railway e faça cutover somente após homologação.

### Cenário D — somente objetos do Storage foram perdidos

Não restaure o banco inteiro. Recupere os bytes pelo caminho original, compare checksums e valide PDFs, logos e imagens.

## 9. Rollback somente da aplicação no Railway

1. abrir cada serviço Railway;
2. acessar **Deployments**;
3. selecionar o último deployment comprovadamente saudável;
4. executar **Rollback**;
5. repetir no segundo serviço;
6. confirmar `GET /health` com HTTP 200;
7. testar login, MFA, dashboard, proposta e link público;
8. registrar IDs dos deployments anterior e restaurado.

Se o deployment não estiver mais disponível para rollback, faça redeploy do commit Git conhecido como saudável.

## 10. Restauração nativa do banco no mesmo projeto

Use esta opção quando o projeto ainda for confiável e a restauração nativa estiver disponível.

1. declarar janela de indisponibilidade;
2. impedir novas escritas;
3. selecionar o backup ou ponto anterior ao incidente;
4. confirmar que o horário escolhido atende ao RPO;
5. iniciar a restauração pelo painel;
6. aguardar conclusão antes de reiniciar tráfego;
7. reaplicar, quando necessário, secrets, passwords de roles customizadas, publicações ou integrações externas;
8. restaurar os bytes do Storage separadamente;
9. executar a validação da seção 15.

Uma restauração do banco não recupera bytes removidos do Storage.

## 11. Reconstrução completa em novo projeto Supabase

### 11.1 Preparar o destino

1. criar projeto Supabase exclusivo de recuperação;
2. usar região compatível com produção;
3. habilitar extensões necessárias;
4. configurar URLs, redirects e e-mail do Auth;
5. registrar nova URL, project ref, chave pública e credenciais protegidas;
6. manter o projeto inacessível ao público durante a restauração.

### 11.2 Restaurar banco

```bash
export TARGET_DB_URL="postgresql://..."

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "${BACKUP_DIR}/database/roles.sql" \
  --file "${BACKUP_DIR}/database/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "${BACKUP_DIR}/database/data.sql" \
  --dbname "${TARGET_DB_URL}"

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "${BACKUP_DIR}/database/history-schema.sql" \
  --file "${BACKUP_DIR}/database/history-data.sql" \
  --dbname "${TARGET_DB_URL}"
```

Depois:

1. comparar checksums do pacote;
2. executar `supabase db lint --linked` no projeto de recuperação;
3. confirmar histórico de migrations;
4. revisar erros de owner e roles sem ignorá-los silenciosamente;
5. redefinir passwords de roles customizadas quando existirem;
6. confirmar RLS e grants antes de expor o projeto.

O teste automatizado do repositório em `.github/scripts/test-database-backup-restore.sh` continua sendo a homologação local de referência para ordem, fingerprints e integridade relacional.

### 11.3 Restaurar Edge Function

```bash
supabase link --project-ref "${TARGET_PROJECT_REF}"
supabase functions deploy public-proposal-pdf --no-verify-jwt
```

Configure no ambiente protegido da função:

- `SUPABASE_URL` do projeto recuperado;
- `SUPABASE_SERVICE_ROLE_KEY` do projeto recuperado.

Nunca coloque a `service_role` no Railway, no frontend ou em variável `VITE_*`.

## 12. Restaurar bytes do Storage

1. validar `storage-sha256.txt` antes da cópia;
2. confirmar que buckets e políticas foram restaurados;
3. usar endpoint e credenciais S3 do projeto de destino;
4. enviar objetos preservando bucket e caminho completos;
5. não usar `--delete`;
6. gerar novo inventário e checksum no destino;
7. comparar contagem, caminhos, tamanhos e hashes;
8. validar tipos MIME de PDFs e imagens.

Exemplo:

```bash
export TARGET_STORAGE_ENDPOINT="https://<target-ref>.storage.supabase.co/storage/v1/s3"

for bucket in proposals pdf-assets logos; do
  aws --endpoint-url "${TARGET_STORAGE_ENDPOINT}" \
    s3 sync "${BACKUP_DIR}/storage/${bucket}" "s3://${bucket}" \
    --only-show-errors
 done
```

Valide especialmente:

- `proposals/<user-id>/proposta-<proposal-id>.pdf`;
- logos nos caminhos do usuário;
- imagens de capa e recursos dos modelos;
- PDF com `application/pdf`, cabeçalho `%PDF-` e marcador final `%%EOF`.

## 13. Reconectar Railway ao projeto recuperado

Nos dois serviços Railway:

1. atualizar `VITE_SUPABASE_URL`;
2. atualizar `VITE_SUPABASE_ANON_KEY` com chave pública;
3. confirmar `NODE_ENV=production`;
4. revisar alterações antes de aplicar;
5. executar novo build e deploy, porque `VITE_*` é incorporada ao bundle;
6. confirmar `GET /health`;
7. não adicionar `SUPABASE_SERVICE_ROLE_KEY`.

Mantenha o ambiente anterior disponível até a aprovação do cutover, quando for seguro fazê-lo.

## 14. Rotação após comprometimento

Quando houver suspeita de vazamento:

1. rotacionar senha do banco;
2. rotacionar chaves públicas/secretas conforme o painel permitir;
3. rotacionar `service_role` e secrets da Edge Function;
4. revogar credenciais S3 usadas no backup;
5. revisar sessões e fatores administrativos;
6. atualizar Railway e demais integrações;
7. confirmar que os valores antigos deixaram de funcionar;
8. registrar o motivo e o horário de cada rotação.

## 15. Validação obrigatória antes do retorno

### 15.1 Infraestrutura

- [ ] `GET /health` responde HTTP 200 nos dois serviços;
- [ ] build Railway corresponde ao commit aprovado;
- [ ] Edge Function responde `OPTIONS`, `GET` e `POST` conforme contrato;
- [ ] nenhum segredo aparece em logs ou bundle.

### 15.2 Banco e segurança

- [ ] migrations e schema estão completos;
- [ ] tabelas esperadas existem;
- [ ] RLS está ativa nas tabelas auditadas;
- [ ] usuário A não acessa dados do usuário B;
- [ ] login, recuperação de senha e MFA funcionam;
- [ ] tokens públicos inválidos, expirados e revogados são rejeitados.

### 15.3 Negócio

- [ ] clientes e kits aparecem corretamente;
- [ ] proposta abre com cálculo, cargas, histórico e modelo;
- [ ] nova proposta recebe código único;
- [ ] geração de PDF funciona;
- [ ] link público exibe somente dados comerciais;
- [ ] aprovação e recusa geram eventos.

### 15.4 Storage

- [ ] contagem de buckets e objetos confere;
- [ ] caminhos, tamanhos e hashes conferem;
- [ ] PDF privado abre por URL assinada;
- [ ] logos e imagens aparecem nos modelos;
- [ ] nenhum arquivo de outra empresa fica acessível.

O retorno ao ar exige aprovação explícita do coordenador do incidente.

## 16. Cutover e rollback da recuperação

1. registrar horário do cutover;
2. aplicar variáveis Railway do destino;
3. publicar os dois serviços;
4. executar smoke test completo;
5. liberar tráfego gradualmente quando possível;
6. monitorar erros, autenticação e geração de PDF;
7. manter o ambiente anterior congelado durante a janela de observação;
8. se a validação falhar, reverter Railway para o deployment anterior e manter o destino isolado para correção.

Não destrua o ambiente anterior no mesmo dia do cutover.

## 17. Evidências obrigatórias

O diretório do incidente deve conter:

- manifesto do backup;
- checksums do banco e Storage;
- commit recuperado;
- horários de detecção, contenção, restauração e retorno;
- comandos executados sem segredos;
- logs de erro e restauração;
- contagens e fingerprints antes/depois;
- resultado da checklist da seção 15;
- responsáveis e aprovação final;
- causa raiz e ações preventivas.

## 18. Exercício mensal

O exercício deve ocorrer somente em projeto isolado e descartável:

1. selecionar pacote recente;
2. verificar checksums;
3. criar destino vazio;
4. restaurar banco;
5. restaurar amostra representativa ou total do Storage;
6. publicar Edge Function;
7. conectar ambiente Railway de homologação;
8. executar testes automatizados e checklist manual;
9. medir RPO e RTO reais;
10. destruir o ambiente de teste após preservar evidências.

Falha no exercício gera correção prioritária e nova execução.

## 19. Limitações conhecidas

- metadados do Storage no Postgres não substituem os bytes dos arquivos;
- Storage não deve ser tratado como versionado; exclusões precisam de backup externo;
- restauração de banco pode exigir redefinição de passwords de roles customizadas;
- o ambiente Supabase local é apenas homologação e não deve ser usado como produção;
- mudanças de plano ou recursos do provedor exigem revisão deste runbook;
- códigos de recuperação MFA dos usuários ainda pertencem a item separado do checklist.

## 20. Referências oficiais

- Supabase — Database Backups: `https://supabase.com/docs/guides/platform/backups`
- Supabase — Backup and Restore using the CLI: `https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`
- Supabase — Download Objects: `https://supabase.com/docs/guides/storage/management/download-objects`
- Supabase — S3 Authentication: `https://supabase.com/docs/guides/storage/s3/authentication`
- Railway — Deployment Actions: `https://docs.railway.com/deployments/deployment-actions`
