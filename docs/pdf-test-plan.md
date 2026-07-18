# Geração e armazenamento de PDF

Este documento registra as garantias verificadas automaticamente no fluxo de geração das propostas.

## Comportamento esperado

- Cada proposta usa um caminho estável no bucket `proposals`: `<user_id>/proposta-<proposal_id>.pdf`.
- Novas gerações substituem o arquivo da mesma proposta com `upsert`, evitando versões órfãs com timestamp.
- O PDF precisa possuir conteúdo antes de ser enviado ao Storage.
- Os metadados da proposta só são atualizados depois do upload concluído.
- O token público existente é reutilizado; quando ausente, um novo token é criado.
- Após a migração para o caminho estável, o arquivo anterior é removido somente depois da persistência dos novos metadados.
- Falha de renderização ou upload interrompe o fluxo sem atualizar a proposta.
- Falha ao persistir metadados remove o novo arquivo quando ele ainda não representa a versão atual.
- Falha na limpeza de um arquivo antigo é registrada, mas não invalida um PDF novo já persistido.

## Cenários automatizados

A suíte `tests/pdf-generation.test.ts` cobre:

1. construção e sanitização do caminho de armazenamento;
2. renderização, upload e persistência dos metadados;
3. reutilização do token público;
4. geração repetida no mesmo caminho;
5. limpeza de caminhos antigos;
6. falha do renderizador;
7. rejeição de PDF vazio;
8. falha de upload;
9. rollback após falha de banco;
10. proteção da versão atual durante falhas;
11. falha não crítica durante limpeza.

A validação obrigatória é executada por `npm run check`, juntamente com o TypeScript completo e o build de produção.
