# Link na Bio — LP Victory

Site estático: a Link Tree na raiz e duas landing pages em subpasta. Sem
build, sem framework, sem dependência de domínio.

```
/            Link Tree            (index.html)
/brasa/      BRASA Smash House
/fornalha/   Fornalha (pizzaria)
```

Os três banners apontam para destinos diferentes de propósito:

| Banner | Destino | Por quê |
| --- | --- | --- |
| 1 — MDP | `https://mdpodontologia.com.br/` | site do cliente, hospedado por ele — **nenhum arquivo dele mora aqui** |
| 2 — BRASA | `brasa/` | ainda não tem domínio; é servida por este deploy |
| 3 — Fornalha | `fornalha/` | idem: peça de portfólio, servida por este deploy |

`brasa/` e `fornalha/` são **relativos sem barra inicial**: funcionam em
`*.vercel.app`, em domínio próprio, em `localhost` e em subpasta, sem editar
uma linha.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `index.html` + `assets/` | Link Tree — a página principal |
| `brasa/` | cópia de deploy de `../meu-site-hamburger` — **gerada, não edite aqui** |
| `fornalha/` | cópia de deploy de `../site-pizzaria` — **gerada, não edite aqui** |
| `link-na-bio.html` | Link Tree em arquivo único offline (WhatsApp, e-mail, pen drive) — a página abre sem internet, mas os banners 2 e 3 precisam do site publicado |
| `build-deploy.ps1` | sincroniza `brasa/` e `fornalha/` a partir das pastas originais |
| `build-standalone.ps1` | gera o `link-na-bio.html` a partir do `index.html` |
| `vercel.json` | cache de 1 ano para `assets/` |
| `.vercelignore` | mantém scripts e o standalone fora do deploy |

`brasa/` e `fornalha/` são **cópias**. As fontes da verdade continuam em
`../meu-site-hamburger` e `../site-pizzaria`, cada uma com seu próprio
histórico.

Da Fornalha entra só o que o navegador pede: `index.html`, `css/`, `js/` e
`assets/` (fontes self-hosted e fotos). Ficam de fora `design-system/`,
`ARCHITECTURE.md` e os JPGs/MP4s de referência de direção de arte que moram
soltos na raiz da origem — ~14 MB que ninguém baixaria.

Os arquivos `assets/mdp-logo.png` e `assets/mdp-tile.png` são as imagens do
**card** do banner 1 na Link Tree — junto com as variáveis `--mdp-*` e a
classe `.card--mdp` no CSS. Não têm relação com a landing page do cliente:
são o visual do botão que leva ao site dele.

## Fluxo de trabalho

Editou uma das landings na pasta original:

```powershell
.\build-deploy.ps1     # ressincroniza brasa/ e fornalha/
git add -A; git commit -m "atualiza landings"; git push
```

Editou o `index.html` da Link Tree:

```powershell
.\build-standalone.ps1 # regera o link-na-bio.html
```

Testar as duas páginas juntas antes de publicar:

```powershell
python -m http.server 8777
```

Depois abra `http://127.0.0.1:8777/` e clique nos três banners.

## Deploy na Vercel

Importe o repositório na Vercel. Nas configurações do projeto:

- **Framework Preset:** `Other`
- **Build Command:** vazio
- **Output Directory:** vazio (a raiz do repo já é o site)

A Vercel serve `/brasa/` e `/fornalha/` pelo `index.html` de cada pasta
automaticamente. Nenhuma rota precisa ser declarada.

## Editar os links

Todos os links editáveis têm o atributo `data-edit`:

| `data-edit` | Aponta para |
| --- | --- |
| `banner-1` | `https://mdpodontologia.com.br/` |
| `banner-2` | `brasa/` |
| `banner-3` | `fornalha/` |
| `instagram`, `whatsapp`, `email` | rodapé |

## Observações

- A BRASA carrega as 8 fotos direto do Unsplash por hotlink e usa CDN
  (GSAP, Lenis, Google Fonts): depende de internet.
- A Fornalha é o oposto: zero dependência externa — fontes, fotos e ícones
  saem todos da mesma origem. É a única das três que roda offline depois do
  primeiro carregamento.
- Os arquivos `assets/fornalha-lockup.svg` e `assets/pizza-photo.jpg` são o
  **card** do banner 3, junto com as variáveis `--forn-*` e a classe
  `.card--fornalha`. O lockup traz o wordmark em contorno de vetor porque a
  Link Tree não serve os `.woff2` da Fornalha — um `<text>` cairia em fonte
  substituta.
- Não há mais nenhum `.htaccess` no projeto. O que existia era um arquivo de
  performance para Apache, herdado de outro projeto, e a Vercel o ignora. Se
  um dia o site for para HostGator, vale reescrever um.

## Fontes

Self-hosted em `assets/fonts/`:

- **Satoshi** — Indian Type Foundry, via [Fontshare](https://fontshare.com)
- **Alfa Slab One**, **Instrument Serif**, **JetBrains Mono** — Google Fonts (OFL)
