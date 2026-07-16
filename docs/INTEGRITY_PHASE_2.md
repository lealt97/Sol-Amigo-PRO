# Integridade de dados — Fase 2

A Fase 2 altera o salvamento de propostas para impedir perda silenciosa de dados, códigos repetidos e estados parcialmente persistidos.

## Alterações

- O código `FV-AAAA-0001` passa a ser gerado atomicamente no PostgreSQL.
- `proposals.revision` implementa controle otimista de concorrência.
- Proposta, cálculo solar, levantamento de cargas e evento são persistidos pela RPC `save_proposal_bundle` em uma única transação.
- Atualizações parciais são mescladas com o estado atual antes dos recálculos.
- Salvamentos do mesmo projeto são enfileirados no navegador, evitando que uma requisição antiga termine depois da mais nova.
- Um conflito entre abas ou sessões provoca recarga dos dados e uma nova tentativa controlada.
- A duplicação passa a preservar dimensionamento solar, consumo, kit, custos, planimetria e cargas, sem copiar código, PDF, token ou status comercial.
- A exclusão usa apenas o `DELETE` da proposta; os registros relacionados são removidos pelas chaves estrangeiras com `ON DELETE CASCADE`.
- A tabela de cálculos passa a aceitar somente um registro por proposta.

## Migrations

Aplicar depois das migrations da Fase 1 e nesta ordem:

1. `supabase/migrations/20260716205000_restore_consumption_history.sql`
2. `supabase/migrations/20260716210000_integrity_phase_2.sql`

O primeiro arquivo garante as colunas `history` usadas pelo wizard. O segundo cria a sequência, a revisão, os índices e a RPC transacional.

## Testes manuais obrigatórios

1. Criar duas propostas quase simultaneamente e confirmar códigos distintos.
2. Criar uma proposta pelo wizard e confirmar que proposta, cálculo e cargas aparecem juntos.
3. Interromper um salvamento com payload inválido e confirmar que nenhuma parte foi persistida.
4. Alterar rapidamente vários campos e confirmar que o último valor permanece após recarregar a página.
5. Abrir a mesma proposta em duas abas, alterar nas duas e confirmar que não ocorre sobrescrita silenciosa.
6. Fazer uma atualização parcial por um serviço e confirmar que custos, dimensionamento e cargas não são zerados.
7. Duplicar uma proposta completa e comparar consumo, HSP, módulos, kit, custos, telhado e cargas.
8. Confirmar que a duplicata recebeu novo `id`, novo código e novo token, sem PDF anterior.
9. Excluir uma proposta e confirmar a remoção dos cálculos, cargas e eventos relacionados.
10. Consultar `solar_system_calculations` e confirmar no máximo uma linha por `proposal_id`.

## Observação sobre o banco atual

O histórico de migrations do projeto Supabase pode estar vazio quando alterações anteriores foram executadas manualmente no SQL Editor. Nesse cenário, não execute indiscriminadamente todos os arquivos antigos do repositório. Revise o estado do schema e aplique somente as migrations necessárias, na ordem documentada.
