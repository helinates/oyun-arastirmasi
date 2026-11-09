# Oyun Arastirmasi - yerel sunucu (Windows PowerShell 5.1 ve ustu, kurulum gerektirmez)
# Bu dosya BASLAT.bat tarafindan calistirilir. Site klasorunu http://localhost:8000 adresinden sunar.
# Port her zaman 8000 olmalidir: yerel moddaki veriler tarayicida bu adrese bagli tutulur.

$ErrorActionPreference = 'Stop'
$kok = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
if (-not $kok.EndsWith('\')) { $kok = $kok + '\' }
$port = 8000
$adres = "http://localhost:$port/"

$dinleyici = New-Object System.Net.HttpListener
$dinleyici.Prefixes.Add($adres)
try {
  $dinleyici.Start()
} catch {
  Write-Host ""
  Write-Host "Sunucu baslatilamadi. Site zaten acik olabilir (baska bir BASLAT penceresi)." -ForegroundColor Yellow
  Write-Host "Tarayicida $adres adresini acmayi deneyin."
  Start-Process $adres
  Read-Host "Kapatmak icin Enter'a basin"
  exit 1
}

$tipler = @{
  '.html' = 'text/html; charset=utf-8'; '.htm' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
  '.wasm' = 'application/wasm'; '.task' = 'application/octet-stream'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'
  '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.webp' = 'image/webp'
  '.mp3' = 'audio/mpeg'; '.wav' = 'audio/wav'; '.ogg' = 'audio/ogg'
  '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
}

Write-Host ""
Write-Host "  Oyun Arastirmasi sitesi acik: $adres" -ForegroundColor Green
Write-Host "  Bu pencere acik kaldikca site calisir. Ders bitince pencereyi kapatin."
Write-Host ""
Start-Process $adres

while ($dinleyici.IsListening) {
  try { $baglam = $dinleyici.GetContext() } catch { break }
  $yanit = $baglam.Response
  try {
    $yol = [Uri]::UnescapeDataString($baglam.Request.Url.AbsolutePath).TrimStart('/').Replace('/', '\')
    $tam = [IO.Path]::GetFullPath((Join-Path $kok $yol))
    if (-not $tam.StartsWith($kok, [StringComparison]::OrdinalIgnoreCase) -and ($tam + '\') -ne $kok) {
      $yanit.StatusCode = 403
    } elseif (Test-Path -LiteralPath $tam -PathType Container) {
      if ($baglam.Request.Url.AbsolutePath.EndsWith('/')) {
        $tam = Join-Path $tam 'index.html'
      } else {
        $yanit.StatusCode = 301
        $yanit.RedirectLocation = $baglam.Request.Url.AbsolutePath + '/' + $baglam.Request.Url.Query
        $tam = $null
      }
    }
    if ($tam -and $yanit.StatusCode -eq 200) {
      if (Test-Path -LiteralPath $tam -PathType Leaf) {
        $veri = [IO.File]::ReadAllBytes($tam)
        $uzanti = [IO.Path]::GetExtension($tam).ToLower()
        $tip = $tipler[$uzanti]
        if (-not $tip) { $tip = 'application/octet-stream' }
        $yanit.ContentType = $tip
        $yanit.Headers.Add('Cache-Control', 'no-cache')
        $yanit.ContentLength64 = $veri.Length
        $yanit.OutputStream.Write($veri, 0, $veri.Length)
      } else {
        $yanit.StatusCode = 404
      }
    }
  } catch {
    try { $yanit.StatusCode = 500 } catch { }
  } finally {
    try { $yanit.OutputStream.Close() } catch { }
  }
}
