# Testes E2E com Playwright

A aplicação utiliza Playwright para validar os principais fluxos públicos no navegador Chromium.

## Cenários cobertos

- carregamento da página de login;
- validação de e-mail e senha;
- navegação entre login, recuperação de senha e cadastro;
- solicitação de recuperação sem revelar se a conta existe;
- redirecionamento de visitantes anônimos ao acessar uma rota protegida;
- tratamento de token público inválido;
- carregamento do resumo comercial pelo link público;
- aprovação de proposta;
- abertura, preenchimento e confirmação da recusa.

As chamadas externas do Supabase são interceptadas nos testes. Nenhum dado real de produção é criado ou alterado pela suíte E2E.

## Execução local

Instale o navegador uma vez:

```bash
npx playwright install chromium
```

Execute os testes:

```bash
npm run test:e2e
```

Para usar a interface visual do Playwright:

```bash
npm run test:e2e:ui
```

## Integração contínua

O GitHub Actions executa primeiro TypeScript, testes unitários e build. Após a aprovação desse bloco, instala o Chromium e executa a suíte E2E com um único worker para maior estabilidade.

Em caso de falha, o workflow publica por sete dias o relatório HTML, screenshots, vídeos e traces disponíveis.
