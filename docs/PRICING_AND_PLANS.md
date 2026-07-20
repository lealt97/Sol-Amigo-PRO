# Planos e preços iniciais do SolAmigo

## Objetivo

Este documento define a estrutura comercial inicial para o lançamento beta do SaaS. A estratégia usa somente dois níveis de produto — Gratuito e Pro — para reduzir complexidade de cobrança, suporte e comunicação durante a validação do mercado.

Preços, intervalos e limites quantitativos ficam versionados no mesmo catálogo comercial. Nenhum desses valores substitui as regras de autorização no servidor.

## Moeda e mercado

- moeda: real brasileiro (`BRL`);
- público principal: integradores, projetistas e vendedores autônomos de energia solar no Brasil;
- preços exibidos em valores brutos ao cliente;
- cobranças, impostos, notas fiscais, reembolsos e meios de pagamento serão tratados pela integração do provedor e pelas políticas legais futuras.

## Catálogo comercial

### Gratuito

- preço: **R$ 0,00**;
- periodicidade: sem cobrança recorrente;
- cartão: não exigido para criar ou manter a conta;
- cota: **5 propostas por mês**;
- objetivo: permitir que um integrador conheça o fluxo principal e gere valor antes da compra;
- conversão: o usuário pode migrar para o Pro a qualquer momento.

O plano Gratuito permanece como plano permanente de entrada, e não como teste que expira automaticamente. Seus limites são suficientes para avaliação real do produto, mas inferiores aos do Pro.

### Pro mensal

- preço: **R$ 100,00 por mês**;
- cobrança: recorrente mensal;
- cota: **30 propostas por mês**;
- compromisso: sem fidelidade mínima além do período já pago;
- objetivo: atender profissionais e pequenas integradoras que preferem menor desembolso inicial.

### Pro anual

- preço: **R$ 1.000,00 por ano**;
- cobrança: valor integral antecipado para doze meses;
- cota: **40 propostas por mês**;
- equivalente mensal informativo: **R$ 83,33**;
- economia comparada a doze mensalidades: **R$ 200,00**;
- desconto efetivo: aproximadamente **16,7%**, equivalente a dois meses do plano mensal.

O anual é uma forma de cobrança do mesmo produto Pro e libera o mesmo conjunto de funcionalidades. Como benefício comercial do compromisso anual, concede uma franquia mensal 10 propostas superior à opção mensal. A autorização continua usando o produto `pro` em conjunto com o intervalo `month` ou `year`.

## Posicionamento

O preço mensal de R$ 100,00 posiciona o SolAmigo como uma ferramenta profissional acessível, acima das soluções básicas de baixo custo e abaixo de plataformas completas com equipes, operação pós-venda e contratos empresariais. A decisão considera que o produto já entrega dimensionamento, cálculo financeiro, gestão de clientes e propostas, personalização visual, PDFs profissionais e fluxo público de aprovação.

A estrutura simples evita lançar diversos níveis antes de conhecer o comportamento real de uso. Planos adicionais, como Equipe ou Enterprise, somente devem ser criados após evidência de demanda e requisitos claros de múltiplos usuários, permissões, suporte ou integrações.

## Regras comerciais iniciais

1. O identificador do produto é `free` ou `pro`; mensal e anual são intervalos de cobrança do mesmo plano Pro.
2. Produto e intervalo formam a chave necessária para resolver a cota: `free/free`, `pro/month` ou `pro/year`.
3. Valores são armazenados em centavos inteiros, nunca em ponto flutuante.
4. O plano Gratuito não exige método de pagamento.
5. O plano anual é pré-pago e concede doze meses de acesso Pro.
6. Cupons e preços promocionais não alteram o código do plano e não devem ser codificados como planos permanentes.
7. IDs de preço do provedor de pagamentos ficam em configuração protegida por ambiente, e não neste catálogo público.
8. A interface pode exibir o equivalente mensal do anual, mas o checkout deve informar claramente que a cobrança é de R$ 1.000,00 à vista para o período anual.
9. Alterações futuras de preço ou cota não mudam silenciosamente uma assinatura já contratada; a política de renovação e comunicação será definida antes do lançamento comercial.
10. Nenhum bloqueio de recurso pode depender somente do frontend. O servidor deverá consultar assinatura, intervalo, período e uso.
11. O plano Gratuito não deve ser apresentado como “grátis para sempre” até a Política Comercial e os Termos de Uso aprovarem essa promessa.

## Hipótese de lançamento e revisão

Os valores são uma hipótese comercial para o beta. Devem ser revisados após:

- entrevistas e testes com 5 a 10 integradores;
- medição de ativação, frequência de geração de propostas e conversão;
- custo real de Supabase, Storage, geração de PDF, suporte e provedor de pagamentos;
- comparação entre receita média por conta e custo de atendimento;
- análise de cancelamentos e objeções de preço.

Uma revisão não exige criar novos planos. A primeira opção deve ser ajustar preço, limites ou comunicação mantendo `free` e `pro`.

## Referência técnica

A fonte de verdade versionada está em `src/lib/billing/planCatalog.ts`:

- Gratuito: `0` centavos e 5 propostas/mês;
- Pro mensal: `10_000` centavos e 30 propostas/mês;
- Pro anual: `100_000` centavos e 40 propostas/mês.

A página pública importa esse catálogo, e o banco replica os mesmos limites por intervalo. A integração de cobrança deve comparar o preço recebido do provedor com o produto e intervalo esperados. Nunca deve confiar em preço ou cota enviados pelo navegador.
