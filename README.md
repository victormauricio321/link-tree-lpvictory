# Link na Bio — LP Victory

Site estático de duas páginas: a Link Tree na raiz e uma landing page em
subpasta. Sem build, sem framework, sem dependência de domínio.

```
/           Link Tree            (index.html)
/brasa/     BRASA Smash House
```

Os dois banners apontam para destinos diferentes de propósito:

| Banner | Destino | Por quê |
| --- | --- | --- |
| 1 — MDP | `https://mdpodontologia.com.br/` | site do cliente, hospedado por ele — **nenhum arquivo dele mora aqui** |
| 2 — BRASA | `brasa/` | ainda não tem domínio; é servida por este deploy |

`brasa/` é **relativo sem barra inicial**: funciona em `*.vercel.app`, em
domínio próprio, em `localhost` e em subpasta, sem editar uma linha.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `index.html` + `assets/` | Link Tree — a página principal |
| `brasa/` | cópia de deploy de `../meu-site-hamburger` — **gerada, não edite aqui** |
| `link-na-bio.html` | Link Tree em arquivo único offline (WhatsApp, e-mail, pen drive) — a página abre sem internet, mas o banner 2 precisa do site publicado |
| `build-deploy.ps1` | sincroniza `brasa/` a partir da pasta original |
| `build-standalone.ps1` | gera o `link-na-bio.html` a partir do `index.html` |
| `vercel.json` | cache de 1 ano para `assets/` |
| `.vercelignore` | mantém scripts e o standalone fora do deploy |

`brasa/` é uma **cópia**. A fonte da verdade continua em
`../meu-site-hamburger`, com seu próprio histórico.

Os arquivos `assets/mdp-logo.png` e `assets/mdp-tile.png` são as imagens do
**card** do banner 1 na Link Tree — junto com as variáveis `--mdp-*` e a
classe `.card--mdp` no CSS. Não têm relação com a landing page do cliente:
são o visual do botão que leva ao site dele.

## Fluxo de trabalho

Editou a landing da BRASA na pasta original:

```powershell
.\build-deploy.ps1     # ressincroniza brasa/
git add -A; git commit -m "atualiza landing brasa"; git push
```

Editou o `index.html` da Link Tree:

```powershell
.\build-standalone.ps1 # regera o link-na-bio.html
```

Testar as duas páginas juntas antes de publicar:

```powershell
python -m http.server 8777
```

Depois abra `http://127.0.0.1:8777/` e clique nos dois banners.

## Deploy na Vercel

Importe o repositório na Vercel. Nas configurações do projeto:

- **Framework Preset:** `Other`
- **Build Command:** vazio
- **Output Directory:** vazio (a raiz do repo já é o site)

A Vercel serve `/brasa/` pelo `index.html` da pasta automaticamente. Nenhuma
rota precisa ser declarada.

## Editar os links

Todos os links editáveis têm o atributo `data-edit`:

| `data-edit` | Aponta para |
| --- | --- |
| `banner-1` | `https://mdpodontologia.com.br/` |
| `banner-2` | `brasa/` |
| `instagram`, `whatsapp`, `email` | rodapé |

## Observações

- A BRASA carrega as 8 fotos direto do Unsplash por hotlink e usa CDN
  (GSAP, Lenis, Google Fonts): depende de internet.
- Não há mais nenhum `.htaccess` no projeto. O que existia era um arquivo de
  performance para Apache, herdado de outro projeto, e a Vercel o ignora. Se
  um dia o site for para HostGator, vale reescrever um.

## Fontes

Self-hosted em `assets/fonts/`:

- **Satoshi** — Indian Type Foundry, via [Fontshare](https://fontshare.com)
- **Alfa Slab One**, **Instrument Serif**, **JetBrains Mono** — Google Fonts (OFL)
