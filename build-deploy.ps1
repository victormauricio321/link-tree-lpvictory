# Sincroniza as landing pages para dentro deste projeto, prontas para deploy.
#
#   meu-site-hamburger/  ->  brasa/           (servida em /brasa/)
#   site-pizzaria/       ->  fornalha/        (servida em /fornalha/)
#   site-airbnb/         ->  casa-na-lagoa/   (servida em /casa-na-lagoa/)
#
# As pastas de origem NAO sao alteradas: continuam sendo a fonte da verdade.
# Rode este script sempre que editar uma das landing pages.
#
# Uso:  .\build-deploy.ps1

$ErrorActionPreference = "Stop"

$root     = $PSScriptRoot
$projetos = Split-Path $root -Parent

$fontes = @(
    @{ Nome = "BRASA Smash House"; De = "meu-site-hamburger"; Para = "brasa"    }
    @{ Nome = "Fornalha";          De = "site-pizzaria";      Para = "fornalha" }
    @{ Nome = "Casa na Lagoa";     De = "site-airbnb";        Para = "casa-na-lagoa" }
)

# Material de trabalho que nao deve ir para producao.
$excluirPastas   = @(".git", ".claude", "graphify-out", "prints-portfolio",
                     "node_modules", "design-system")
$excluirArquivos = @(".gitignore", ".gitattributes", ".gitkeep", "*.ps1", "*.md", "*.mp4")

# A pasta assets/ do burger so tem referencias de design (paleta, tipografia)
# e as duas imagens que viraram o card da Link Tree: nada disso e usado pelo
# site em si, que carrega as fotos do Unsplash.
#
# Ja a Fornalha USA a propria assets/ (fontes self-hosted e as fotos servidas
# da mesma origem) - so os JPGs de referencia de direcao de arte, que moram
# soltos na raiz da origem, ficam de fora. Sao ~1,8 MB que ninguem baixa.
$excluirPorProjeto = @{
    "meu-site-hamburger" = @("assets", "b-icon.png", "card-imagem.png")
    "site-pizzaria"      = @("cores-e-estrutura-grid.jpg", "estrutura-grid.jpg",
                             "tipografia1.jpg", "tipografia2.jpg",
                             "tom-de-voz1.jpg", "tom-de-voz2.jpg")
    # assets/img/_src sao os originais de camera: a pasta assets/img ao lado ja
    # tem as versoes servidas (avif/webp/jpg em 5 larguras). tools/ sao scripts
    # de build em Node - nao rodam em producao. Juntos, 61 + 2 arquivos e ~10 MB.
    "site-airbnb"        = @("_src", "tools")
}

foreach ($f in $fontes) {
    $origem  = Join-Path $projetos $f.De
    $destino = Join-Path $root     $f.Para

    if (-not (Test-Path $origem)) { throw "origem nao encontrada: $origem" }

    Write-Host ""
    Write-Host ("-> {0}" -f $f.Nome) -ForegroundColor Cyan
    Write-Host ("   {0}/  ->  {1}/" -f $f.De, $f.Para)

    if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
    New-Item -ItemType Directory -Path $destino | Out-Null

    $extras = $excluirPorProjeto[$f.De]
    $copiados = 0
    $bytes    = 0

    Get-ChildItem $origem -Recurse -File -Force | ForEach-Object {
        $rel   = $_.FullName.Substring($origem.Length + 1)
        $parts = $rel.Split([char]'\')

        if ($parts | Where-Object { $excluirPastas -contains $_ }) { return }
        if ($extras -and ($parts | Where-Object { $extras -contains $_ })) { return }
        foreach ($p in $excluirArquivos) { if ($_.Name -like $p) { return } }

        $alvo = Join-Path $destino $rel
        $pai  = Split-Path $alvo -Parent
        if (-not (Test-Path $pai)) { New-Item -ItemType Directory -Path $pai -Force | Out-Null }
        Copy-Item $_.FullName $alvo -Force
        $script:copiados++
        $script:bytes += $_.Length
    }

    if (-not (Test-Path (Join-Path $destino "index.html"))) {
        throw "$($f.Para)/index.html nao foi gerado - a origem tem index.html?"
    }

    Write-Host ("   {0} arquivos, {1:N0} KB" -f $copiados, ($bytes / 1KB)) -ForegroundColor Green
}

Write-Host ""
Write-Host "Estrutura pronta:" -ForegroundColor Green
Write-Host "  /           -> index.html      (Link Tree)"
Write-Host "  /brasa/     -> brasa/index.html"
Write-Host "  /fornalha/  -> fornalha/index.html"
