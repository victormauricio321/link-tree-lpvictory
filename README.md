# Link na Bio — LP Victory

Página "link na bio" single-page, mobile-first, com dois cards de projeto.
Sem build, sem dependências, sem CDN.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `index.html` | versão de trabalho — referencia `assets/` |
| `link-na-bio.html` | **entregável**: arquivo único, imagens e fontes em base64, abre offline sem a pasta `assets/` |
| `assets/` | imagens dos cards, marca LP Victory e fontes `.woff2` |
| `build-standalone.ps1` | gera o `link-na-bio.html` a partir do `index.html` |

## Editar os links

Todos os links editáveis têm o atributo `data-edit`:

| `data-edit` | Onde aparece |
| --- | --- |
| `banner-1` | card Marques Drumond & Patrão |
| `banner-2` | card BRASA — Smash House |
| `instagram` | rodapé |
| `whatsapp` | rodapé |
| `email` | rodapé |

Os dois `banner-*` ainda apontam para URLs de placeholder.

## Regerar o standalone

`link-na-bio.html` **não** se atualiza sozinho. Depois de editar o `index.html`:

```powershell
.\build-standalone.ps1
```

O script embute cada arquivo de `assets/` como data URI e avisa se sobrar
alguma referência externa.

## Fontes

Self-hosted em `assets/fonts/`:

- **Satoshi** — Indian Type Foundry, via [Fontshare](https://fontshare.com)
- **Alfa Slab One**, **Instrument Serif**, **JetBrains Mono** — Google Fonts (OFL)
