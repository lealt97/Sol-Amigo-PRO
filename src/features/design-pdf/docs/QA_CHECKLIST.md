# Checklist de QA — Design PDF

Use esta lista após alterações no módulo `src/features/design-pdf`.

## Página principal

- A rota `/design-pdf` abre normalmente.
- Os modelos padrão aparecem no carrossel.
- O carrossel avança, volta e troca o card ativo ao clicar.
- O botão `Adicionar Modelo` cria um modelo a partir do preset.
- A seção `Meus Modelos` mostra o modelo criado.

## Editor

- O editor abre ao adicionar ou editar um modelo.
- O nome do modelo pode ser alterado.
- A aba `Cores` atualiza o preview em tempo real.
- A aba `Imagens` permite selecionar logo do perfil.
- A aba `Imagens` permite enviar logo específico.
- A aba `Imagens` permite enviar foto da capa.
- O enquadramento da foto muda o preview em tempo real.
- Zoom, posição e rotação funcionam para logo e foto.
- A aba `Páginas` permite ligar e desligar seções.
- O botão `Salvar` persiste as alterações.

## Meus modelos

- `Duplicar` cria cópia sem alterar o original.
- `Definir padrão` marca apenas um modelo como padrão.
- `Excluir` remove o modelo.
- Se o modelo padrão for excluído, outro modelo remanescente vira padrão.

## PDF/SVG

- O preview e a geração final usam o mesmo engine SVG.
- Cores, textos, logo e foto são aplicados pelo mesmo fluxo.
- IDs do SVG são únicos por modelo para evitar conflito entre previews.
- Capas com `cover-photo-layer` e capas antigas com `pattern` continuam compatíveis.
