# Link na Bio — LP Victory

Site estático de três páginas: a Link Tree na raiz e duas landing pages em
subpastas. Sem build, sem framework, sem dependência de domínio.

```
/           Link Tree            (index.html)
/mdp/       Marques Drumond & Patrão   ← cópia, NÃO é o destino do banner
/brasa/     BRASA Smash House
```

Os banners apontam para destinos diferentes de propósito:

| Banner | Destino | Por quê |
| --- | --- | --- |
| 1 — MDP | `https://mdpodontologia.com.br/` | o cliente já tem domínio próprio no ar |
| 2 — BRASA | `brasa/` | ainda não tem domínio; é servida por este deploy |

`brasa/` é **relativo sem barra inicial**: funciona em `*.vercel.app`, em
domínio próprio, em `localhost` e em subpasta, sem editar uma linha.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `index.html` + `assets/` | Link Tree — a página principal |
| `mdp/` | cópia de deploy de `../site-mdp` — **gerada, não edite aqui**. Nenhum link aponta para ela desde que o banner 1 passou a usar o domínio do cliente (ver *Observações*) |
| `brasa/` | cópia de deploy de `../meu-site-hamburger` — **gerada, não edite aqui** |
| `link-na-bio.html` | Link Tree em arquivo único offline (WhatsApp, e-mail, pen drive) — a página abre sem internet, mas os **banners precisam do site publicado** |
| `build-deploy.ps1` | sincroniza `mdp/` e `brasa/` a partir das pastas originais |
| `build-standalone.ps1` | gera o `link-na-bio.html` a partir do `index.html` |
| `vercel.json` | cache de 1 ano para `assets/` e `mdp/assets/` |
| `.vercelignore` | mantém scripts e o standalone fora do deploy |

As pastas `mdp/` e `brasa/` são **cópias**. As fontes da verdade continuam em
`../site-mdp` e `../meu-site-hamburger`, cada uma com seu próprio histórico.

## Fluxo de trabalho

Editou uma das landing pages na pasta original:

```powershell
.\build-deploy.ps1     # ressincroniza mdp/ e brasa/
git add -A; git commit -m "atualiza landing X"; git push
```

Editou o `index.html` da Link Tree:

```powershell
.\build-standalone.ps1 # regera o link-na-bio.html
```

Testar as três páginas juntas antes de publicar:

```powershell
python -m http.server 8777
```

Depois abra `http://127.0.0.1:8777/` e clique nos dois banners.

## Deploy na Vercel

Importe o repositório na Vercel. Nas configurações do projeto:

- **Framework Preset:** `Other`
- **Build Command:** vazio
- **Output Directory:** vazio (a raiz do repo já é o site)

A Vercel serve `/mdp/` e `/brasa/` pelo `index.html` de cada pasta
automaticamente. Nenhuma rota precisa ser declarada.

## Editar os links

Todos os links editáveis têm o atributo `data-edit`:

| `data-edit` | Aponta para |
| --- | --- |
| `banner-1` | `https://mdpodontologia.com.br/` |
| `banner-2` | `brasa/` |
| `instagram`, `whatsapp`, `email` | rodapé |

## Observações

- **`mdp/` virou conteúdo duplicado.** É cópia byte a byte de um site que já
  está no ar em `mdpodontologia.com.br` — mesmo HTML, mesmo `<title>`. Desde
  que o banner 1 passou a apontar para o domínio do cliente, nada mais linka
  para `/mdp/`, mas o endereço continua público e indexável, competindo com o
  site real do cliente. Três saídas, em ordem de preferência:
  1. remover `mdp/` do deploy (linha `mdp/` no `.vercelignore`);
  2. bloquear indexação com um header `X-Robots-Tag: noindex` para
     `/mdp/(.*)` no `vercel.json` — não toca no HTML da landing;
  3. deixar como está, se a intenção for manter um espelho de backup.
- Os arquivos `.htaccess` em `mdp/` e `brasa/` são ignorados pela Vercel.
  Estão ali para o caso de o site ir para um servidor Apache (HostGator).
- A BRASA carrega as 8 fotos direto do Unsplash por hotlink, e ambas as
  landings usam CDN (GSAP, Lenis, Google Fonts): dependem de internet.

## Fontes

Self-hosted em `assets/fonts/`:

- **Satoshi** — Indian Type Foundry, via [Fontshare](https://fontshare.com)
- **Alfa Slab One**, **Instrument Serif**, **JetBrains Mono** — Google Fonts (OFL)
