# Simulador de Máquina de Turing

[English](README.md)

Um simulador interativo de máquina de Turing que roda no navegador. Sem build e sem dependências.

Demo: https://strawndri.github.io/turing-machine-simulator/

## Recursos

- Desenhe o diagrama de estados: crie estados, arraste de um até outro para criar transições, curve-as e gire os laços;
- Regras no formato `[ler; escrever; mover]`, com movimentos `L`, `R` e `S`;
- De 1 a 4 fitas, e cada uma pode ser somente leitura; as regras viram `[a, b; a, b; R, S]`;
- Defina o alfabeto da fita Γ e o símbolo em branco;
- Execução passo a passo ou contínua, com controle de velocidade; o estado e a regra atuais ficam destacados;
- Desfazer e refazer, salvar e carregar em JSON, e exemplos prontos;
- Interface em português e em inglês, e seis temas (automático, claro, escuro, planta azul, terminal e sépia).

## Como rodar

Abra o `index.html` no navegador. Para servir localmente:

```sh
python3 -m http.server
```

A máquina que você desenha fica salva no navegador (localStorage).

## Começando

1. Escolha um exemplo no menu, ou use `+ Estado` e `Transição` para desenhar a sua;
2. Clique numa transição para editar as regras;
3. Clique numa célula da fita e digite, ou escreva uma palavra no campo de entrada e clique em `Carregar`;
4. Clique em `Passo` ou `Executar`.

Atalhos: `V` selecionar, `E` novo estado, `T` nova transição, `Delete` apagar, `Ctrl+Z` desfazer.

## Licença

[MIT](LICENSE)
