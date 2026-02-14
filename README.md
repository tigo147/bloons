# Bloons Clone TD (Web)

Jogo inspirado em tower defense no estilo Bloons TD, feito com **HTML + CSS + JavaScript puro**, jogável no **PC (mouse)** e no **celular (toque)**.

## Como jogar

- Clique em **Iniciar onda** para enviar inimigos.
- Ative **Modo infinito: ON** para ter inimigos contínuos sem fim.
- Ative **Construir torre (50)** e toque/clique no mapa para posicionar torres.
- Defenda a trilha para os inimigos não chegarem ao final.
- Use **Velocidade x1/x2/x3** para acelerar o jogo.
- No modo infinito, a dificuldade sobe automaticamente com o tempo.

## Rodar localmente

Como é um site estático, basta abrir `index.html` no navegador.

Se preferir servidor local:

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.

## Publicar no GitHub Pages

Este repositório já inclui workflow em `.github/workflows/pages.yml`.

1. Faça push para a branch `main` (ou `work`, conforme configurado).
2. No GitHub, vá em **Settings → Pages** e defina **Source: GitHub Actions**.
3. Aguarde o workflow **Deploy static site to GitHub Pages** concluir.
4. O jogo ficará disponível na URL do Pages do repositório.

## Observações

- Projeto independente, sem assets do jogo original.
- Foco em compatibilidade web e responsividade.
