# Limites do módulo

O Design PDF não deve depender diretamente de regras comerciais de dimensionamento fotovoltaico. Ele recebe dados já calculados e apenas renderiza ou configura o modelo visual.

Dependências aceitáveis:

- autenticação do usuário
- perfil/logos do usuário
- Supabase para persistência do modelo
- presets SVG
- componentes UI compartilhados

Dependências a evitar:

- cálculo de consumo
- cálculo financeiro
- geração de orçamento comercial
- regras de comissionamento
