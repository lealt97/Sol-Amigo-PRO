# Planos e preços iniciais do SolAmigo

## Objetivo

Este documento define a estrutura comercial inicial para o lançamento beta do SaaS. A estratégia usa somente dois níveis de produto — Gratuito e Pro — para reduzir complexidade de cobrança, suporte e comunicação durante a validação do mercado.

Os limites quantitativos de propostas, usuários e armazenamento serão definidos separadamente no próximo item do checklist. O catálogo comercial deste documento não deve ser usado como substituto das regras de autorização no servidor.

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
- objetivo: permitir que um integrador conheça o fluxo principal e gere valor antes da compra;
- conversão: o usuário pode migrar para o Pro a qualquer momento.

O plano Gratuito permanece como plano permanente de entrada, e não como teste que expira automaticamente. Seus limites serão suficientes para avaliação real do produto, mas inferiores aos do Pro.

### Pro mensal

- preço: **R$ 100,00 por mês**;
- cobrança: recorrente mensal;
- compromisso: sem fidelidade mínima além do período já pago;
- objetivo: atender profissionais e pequenas integradoras que preferem menor desembolso inicial.

### Pro anual

- preço: **R$ 1.000,00 por ano**;
- cobrança: valor integral antecipado para doze meses;
- equivalente mensal informativo: **R$ 83,33**;
- economia comparada a doze mensalidades: **R$ 200,00**;
- desconto efetivo: aproximadamente **16,7%**, equivalente a dois meses do plano mensal.

O anual é uma forma de cobrança do mesmo produto Pro. Ele não cria um conjunto diferente de funcionalidades nem um papel de autorização separado.

## Posicionamento

O preço mensal de R$ 100,00 posiciona o SolAmigo como uma ferramenta profissional acessível, acima das soluções básicas de baixo custo e abaixo de plataformas completas com equipes, operação pós-venda e contratos empresariais. A decisão considera que o produto já entrega dimensionamento, cálculo financeiro, gestão de clientes e propostas, personalização visual, PDFs profissionais e fluxo público de aprovação.

A estrutura simples evita lançar diversos níveis antes de conhecer o comportamento real de uso. Planos adicionais, como Equipe ou Enterprise, somente devem ser criados após evidência de demanda e requisitos claros de múltiplos usuários, permissões, suporte ou integrações.

## Regras comerciais iniciais

1. O identificador do produto é `free` ou `pro`; mensal e anual são intervalos de cobrança do mesmo plano Pro.
2. Valores são armazenados em centavos inteiros, nunca em ponto flutuante.
3. O plano Gratuito não exige método de pagamento.
4. O plano anual é pré-pago e concede doze meses de acesso Pro.
5. Cupons e preços promocionais não alteram o código do plano e não devem ser codificados como planos permanentes.
6. IDs de preço do provedor de pagamentos ficam em configuração protegida por ambiente, e não neste catálogo público.
7. A interface pode exibir o equivalente mensal do anual, mas o checkout deve informar claramente que a cobrança é de R$ 1.000,00 à vista para o período anual.
8. Alterações futuras de preço não mudam silenciosamente uma assinatura já contratada; a política de renovação e comunicação será definida antes do lançamento comercial.
9. Nenhum bloqueio de recurso pode depender somente do frontend. O servidor deverá consultar assinatura, período e uso.
10. O plano Gratuito não deve ser apresentado como “grátis para sempre” até a Política Comercial e os Termos de Uso aprovarem essa promessa.

## Hipótese de lançamento e revisão

Os valores são uma hipótese comercial para o beta. Devem ser revisados após:

- entrevistas e testes com 5 a 10 integradores;
- medição de ativação, frequência de geração de propostas e conversão;
- custo real de Supabase, Storage, geração de PDF, suporte e provedor de pagamentos;
- comparação entre receita média por conta e custo de atendimento;
- análise de cancelamentos e objeções de preço.

Uma revisão não exige criar novos planos. A primeira opção deve ser ajustar preço, limites ou comunicação mantendo `free` e `pro`.

## Referência técnica

A fonte de verdade versionada dos valores está em `src/lib/billing/planCatalog.ts`:

- Gratuito: `0` centavos;
- Pro mensal: `10_000` centavos;
- Pro anual: `100_000` centavos.

A integração de cobrança deve importar ou reproduzir esse catálogo no servidor e comparar o preço recebido do provedor com o produto e intervalo esperados. Nunca deve confiar em preço enviado pelo navegador.
