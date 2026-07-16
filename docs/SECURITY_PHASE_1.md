# Segurança — Fase 1

Esta alteração protege o fluxo público das propostas e os arquivos comerciais.

## O que muda

- O visitante deixa de consultar ou atualizar diretamente a tabela `proposals`.
- A página pública usa somente RPCs `SECURITY DEFINER` com retorno limitado.
- Custos internos, margem, comissão, IDs de relacionamento e documentos do cliente não são enviados ao navegador público.
- O bucket `proposals` passa a ser privado.
- O PDF é aberto por uma Edge Function que valida o token e emite uma URL assinada de 15 minutos.
- Logos e imagens de capa continuam legíveis publicamente, mas novos uploads são gravados em pastas isoladas pelo `user_id`.
- Novas propostas recebem `public_token` automaticamente.

## Implantação

### 1. Aplicar as migrations

Com Supabase CLI vinculado ao projeto:

```bash
supabase db push
```

Ou execute no SQL Editor, nesta ordem:

1. `supabase/migrations/20260716190000_security_phase_1.sql`
2. `supabase/migrations/20260716190500_public_token_default.sql`

### 2. Implantar a Edge Function

```bash
supabase functions deploy public-proposal-pdf --no-verify-jwt
```

A função usa os segredos padrão disponíveis no ambiente do Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Nunca coloque a service role key em uma variável `VITE_*` ou no frontend.

### 3. Publicar o frontend

Faça o build e publique a versão que contém o novo `publicProposalService` e o novo fluxo de geração de PDF.

```bash
npm install
npm run lint
npm run build
```

## Testes manuais obrigatórios

1. Criar uma proposta e gerar o PDF.
2. Confirmar que o objeto foi salvo no bucket `proposals` sob a pasta do usuário.
3. Confirmar que o bucket `proposals` está privado.
4. Abrir o PDF pela tela interna.
5. Abrir o link público em uma janela anônima.
6. Abrir o PDF pela página pública.
7. Aprovar uma proposta e conferir o evento no histórico.
8. Recusar outra proposta e conferir motivo e evento.
9. Tentar consultar `/rest/v1/proposals` com a chave anônima e confirmar que nenhuma proposta pública é listada.
10. Entrar com dois usuários diferentes e confirmar que um não consegue gravar, alterar ou excluir arquivos da pasta do outro.

## Compatibilidade com PDFs existentes

A migration tenta recuperar `pdf_storage_path` a partir das URLs públicas e assinadas antigas. PDFs cujo endereço não siga o padrão do Supabase Storage precisarão ser regenerados.

## MFA

O controle visual de MFA existente ainda não representa um fator TOTP real do Supabase Auth. A implementação correta exige matrícula do fator, QR Code, verificação e desafio no login. Ela deve ser tratada em uma alteração separada antes de declarar MFA disponível aos usuários.
