# Regenerate PNG PWA icons from public/icons/icon.svg (native app icon).
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $scriptDir "generate-pwa-icons.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
