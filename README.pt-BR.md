# Simulador de Máquina de Turing

[English](README.md)

Um simulador interativo de máquina de Turing que roda no navegador.
Use-o para aprender um pouquinho mais sobre Teoria da computação :)

Demo: https://strawndri.github.io/turing-machine-simulator/

## Recursos

- Desenhe diagramas de estados: crie estados, ligue-os, curve setas e mova grupos;
- Regras `[ler; escrever; mover]`, com `L` (esquerda), `R` (direita) e `S` (estático);
- De 1 a 4 fitas, e cada uma pode ser somente leitura;
- Alfabeto da fita Γ e símbolo em branco editáveis;
- Máquinas não determinísticas (δ0 e δ1) com árvore de computações;
- Execução passo a passo ou contínua, com controle de velocidade;
- Desfazer e refazer, salvar e carregar em JSON, exportar PNG e exemplos prontos;
- Português e inglês, temas claro e escuro.

A máquina que você desenha fica salva no navegador (localStorage).

## Começando

1. Escolha um exemplo no menu, ou use `+ Estado` e `Transição` para desenhar a sua;
2. Clique numa transição para editar as regras;
3. Clique numa célula da fita e digite, ou escreva uma palavra no campo de entrada e clique em `Carregar`;
4. Clique em `Passo` ou `Executar`.

## Opções

- **Barra do topo:** exemplos, idioma, tema e `Salvar / carregar`;
- **Barra do diagrama:** ferramentas, desfazer e refazer, zoom e exportar PNG;
- **Painel lateral:** edite o estado ou a transição selecionados;
- **Painel das fitas:** número de fitas, símbolo em branco, alfabeto Γ e entrada;
- **Não determinística:** uma caixa para usar `δ0` e `δ1`, e as visões `Diagrama` e `Árvore`;
- **Controles de execução:** `Passo`, `Executar`, `Reiniciar` e velocidade.

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
