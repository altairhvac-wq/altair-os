# One-off helper to regenerate PNG PWA icons from the SVG branding colors.
Add-Type -AssemblyName System.Drawing

$iconsDir = Join-Path $PSScriptRoot "..\public\icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

function New-AltairIcon {
  param([int]$Size, [bool]$Maskable)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

  $pad = if ($Maskable) { [int]($Size * 0.18) } else { [int]($Size * 0.08) }
  $rect = New-Object System.Drawing.RectangleF ([single]$pad), ([single]$pad), ([single]($Size - 2 * $pad)), ([single]($Size - 2 * $pad))

  if ($Maskable) {
    $fontSize = [single]($Size * 0.38)
  } else {
    $fontSize = [single]($Size * 0.52)
  }

  $family = New-Object System.Drawing.FontFamily "Segoe UI"
  $font = New-Object System.Drawing.Font($family, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 6, 182, 212))
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString("A", $font, $brush, $rect, $sf)
  $font.Dispose()
  $brush.Dispose()
  $g.Dispose()
  return $bmp
}

$targets = @(
  @{ Path = "icon-192.png"; Size = 192; Maskable = $false },
  @{ Path = "icon-512.png"; Size = 512; Maskable = $false },
  @{ Path = "icon-maskable-512.png"; Size = 512; Maskable = $true },
  @{ Path = "apple-touch-icon.png"; Size = 180; Maskable = $false }
)

foreach ($target in $targets) {
  $out = Join-Path $iconsDir $target.Path
  $bmp = New-AltairIcon -Size $target.Size -Maskable $target.Maskable
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $out"
}
