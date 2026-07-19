# Testes E2E com Playwright

A aplicação utiliza Playwright para validar os principais fluxos públicos e a compatibilidade do PDF em diferentes motores de navegador e perfis de dispositivo.

## Cenários cobertos

- carregamento da página de login;
- validação de e-mail e senha;
- navegação entre login, recuperação de senha e cadastro;
- solicitação de recuperação sem revelar se a conta existe;
- redirecionamento de visitantes anônimos ao acessar uma rota protegida;
- tratamento de token público inválido;
- carregamento do resumo comercial pelo link público;
- aprovação de proposta;
- abertura, preenchimento e confirmação da recusa;
- exibição do link seguro do PDF;
- resposta com MIME type `application/pdf`;
- cabeçalho `%PDF-` e marcador final `%%EOF`;
- abertura em nova aba;
- ausência de estouro horizontal em desktop e mobile.

As chamadas externas do Supabase são interceptadas nos testes. Nenhum dado real de produção é criado ou alterado pela suíte E2E.

## Navegadores e dispositivos

A suíte completa continua sendo executada no Chrome desktop. A validação específica do PDF também roda nos seguintes projetos:

- Firefox desktop;
- WebKit, equivalente ao motor do Safari, em desktop;
- Chromium no perfil Pixel 5;
- WebKit no perfil iPhone 13.

## Execução local

Instale os navegadores uma vez:

```bash
npx playwright install chromium firefox webkit
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

O GitHub Actions executa primeiro TypeScript, testes unitários e build. Após a aprovação desse bloco, instala Chromium, Firefox e WebKit e executa os projetos E2E com um único worker para maior estabilidade.

Em caso de falha, o workflow publica por sete dias o relatório HTML, screenshots, vídeos e traces disponíveis.
