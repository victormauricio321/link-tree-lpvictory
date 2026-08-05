# Gera link-na-bio.html: um unico arquivo HTML com todos os assets em base64.
# Uso:  .\build-standalone.ps1

$root = $PSScriptRoot
$src  = Join-Path $root "index.html"
$out  = Join-Path $root "link-na-bio.html"

if (-not (Test-Path $src)) { throw "index.html nao encontrado em $root" }

$html = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)

$mime = @{ ".woff2" = "font/woff2"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".svg" = "image/svg+xml" }

Get-ChildItem (Join-Path $root "assets") -File -Recurse | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
    if (-not $html.Contains($rel)) { return }

    $type = $mime[$_.Extension.ToLower()]
    if (-not $type) { Write-Warning "extensao desconhecida, ignorado: $rel"; return }

    $uri  = "data:$type;base64," + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($_.FullName))
    $html = $html.Replace($rel, $uri)
    Write-Host ("{0,-34} {1,8:N0} bytes -> embutido" -f $rel, $_.Length)
}

$html = $html.Replace(
    "/* ---------- FONTES (arquivos locais, funcionam offline) ---------- */",
    "/* ---------- FONTES embutidas em base64 (arquivo 100% offline) ---------- */")

if ($html -match '(?<!data:[^"'')]{0,80})assets/') {
    Write-Warning "ainda restam referencias a assets/ no HTML gerado"
} else {
    Write-Host "OK: nenhuma referencia externa" -ForegroundColor Green
}

[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("`nlink-na-bio.html gerado: {0:N0} KB" -f ((Get-Item $out).Length / 1KB))
