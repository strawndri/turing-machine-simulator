# Simulador de Máquina de Turing

[English](README.md)

Um simulador interativo de máquina de Turing que roda no navegador.
Use-o para aprender um pouquinho mais sobre Teoria da computação :)

Demo: https://strawndri.github.io/turing-machine-simulator/

## Recursos

- Desenhe o diagrama de estados: crie estados, arraste de um até outro para criar transições, curve-as e gire os laços; selecione vários itens com um retângulo para mover ou apagar de uma vez;
- Regras no formato `[ler; escrever; mover]`, com movimentos `L` (esquerda), `R` (direita) e `S` (estático);
- De 1 a 4 fitas, e cada uma pode ser somente leitura; as regras viram `[a, b; a, b; R, S]`;
- Defina o alfabeto da fita Γ e o símbolo em branco;
- Máquinas não determinísticas com δ0 e δ1: avance a árvore de computações nível por nível, veja cada ramo e a sua fita, e desenhe a árvore, com o mesmo movimento e zoom do diagrama;
- Execução passo a passo ou contínua, com controle de velocidade; o estado e a regra atuais ficam destacados;
- Desfazer e refazer, salvar e carregar em JSON, salvar ou copiar o diagrama e a árvore de computações em PNG, e exemplos prontos;
- Interface em português e em inglês, e dois temas (claro e escuro).

A máquina que você desenha fica salva no navegador (localStorage).

## Começando

1. Escolha um exemplo no menu, ou use `+ Estado` e `Transição` para desenhar a sua;
2. Clique numa transição para editar as regras;
3. Clique numa célula da fita e digite, ou escreva uma palavra no campo de entrada e clique em `Carregar`;
4. Clique em `Passo` ou `Executar`.

## Opções

- **Barra do topo:** `Exemplos` carrega máquinas prontas; o menu de idioma alterna entre português e inglês; o menu de tema alterna entre claro e escuro; `Salvar / carregar` copia a máquina em JSON ou carrega uma que você colou;
- **Barra do diagrama:** `Selecionar`, `+ Estado`, `Transição` e `Mover tela` trocam a ferramenta; `Desfazer` e `Refazer` percorrem as suas mudanças; `−`, `Ajustar` e `+` dão zoom; `Salvar PNG` e `Copiar PNG` exportam o que você vê;
- **Painel lateral:** edite o estado selecionado (nome, inicial, final) ou a transição (as regras, uma `[ler; escrever; mover]` por linha);
- **Painel das fitas:** `−` e `+` definem o número de fitas (de 1 a 4, e cada uma pode ser somente leitura); `Branco` define o símbolo em branco; a lista Γ é o alfabeto da fita; cada fita tem o seu campo de entrada, e você também pode digitar nas células e mover a cabeça;
- **Não determinística:** marque a caixa para dar a cada regra um `δ0` ou `δ1` e explorar a árvore de computações nível por nível; `Diagrama` e `Árvore` alternam a visualização, e o painel lateral lista todos os ramos;
- **Controles de execução:** `Passo`, `Executar` e `Reiniciar`, mais o controle de velocidade.

## Atalhos

| Atalho | Ação |
| --- | --- |
| `V` | Selecionar |
| `E` | Novo estado |
| `T` | Nova transição |
| `H` | Mover a tela |
| `Shift` + arrastar | Mover a tela (diagrama e árvore) |
| Rolar com dois dedos (touchpad) | Mover a tela (diagrama e árvore) |
| Arrastar no espaço vazio | Selecionar vários itens |
| `Delete` | Apagar a seleção |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Desfazer / refazer |
| `Ctrl` + roda do mouse, ou pinça no touchpad | Zoom (diagrama e árvore) |
| `Esc` | Cancelar |

Licenciado sob a [Licença MIT](LICENSE).
