# Sincroniza as duas landing pages para dentro deste projeto, prontas para deploy.
#
#   site-mdp/            -> mdp/     (servida em /mdp/)
#   meu-site-hamburger/  -> brasa/   (servida em /brasa/)
#
# As pastas de origem NAO sao alteradas: continuam sendo a fonte da verdade.
# Rode este script sempre que editar uma das landing pages.
#
# Uso:  .\build-deploy.ps1

$ErrorActionPreference = "Stop"

$root    = $PSScriptRoot
$projetos = Split-Path $root -Parent

$fontes = @(
    @{ Nome = "Marques Drumond & Patrao"; De = "site-mdp";           Para = "mdp"   },
    @{ Nome = "BRASA Smash House";        De = "meu-site-hamburger"; Para = "brasa" }
)

# Material de trabalho que nao deve ir para producao.
$excluirPastas   = @(".git", ".claude", "graphify-out", "prints-portfolio", "node_modules")
$excluirArquivos = @(".gitignore", "*.ps1", "*.md")

# A pasta assets/ do burger so tem referencias de design (paleta, tipografia),
# nenhuma delas usada pelo site. O site-mdp, ao contrario, depende da sua.
$excluirPorProjeto = @{ "meu-site-hamburger" = @("assets", "b-icon.png", "card-imagem.png") }

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

    # O .htaccess do MDP e generico (compressao + cache) e serve as duas.
    # E ignorado pela Vercel, mas mantem o projeto pronto para Apache/HostGator.
    $htaccess = Join-Path $destino ".htaccess"
    if (-not (Test-Path $htaccess)) {
        $modelo = Join-Path $projetos "site-mdp\.htaccess"
        if (Test-Path $modelo) { Copy-Item $modelo $htaccess }
    }

    Write-Host ("   {0} arquivos, {1:N0} KB" -f $copiados, ($bytes / 1KB)) -ForegroundColor Green
}

Write-Host ""
Write-Host "Estrutura pronta:" -ForegroundColor Green
Write-Host "  /        -> index.html      (Link Tree)"
Write-Host "  /mdp/    -> mdp/index.html"
Write-Host "  /brasa/  -> brasa/index.html"
