# Copies the Leaguepedia bot credentials from .env.local into the GitHub Actions secrets of this repo.
# Run it yourself after creating or rotating the bot password:  powershell -File scripts/set-ci-secrets.ps1
# Values are never printed.
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
$repo = 'lv333d/lol-connections'
$names = 'LEAGUEPEDIA_BOT_USER', 'LEAGUEPEDIA_BOT_PASSWORD'
$found = 0
foreach ($line in Get-Content (Join-Path $PSScriptRoot '..\.env.local')) {
  if ($line -match '^([A-Z_]+)=(.+)$' -and $names -contains $Matches[1]) {
    & $gh secret set $Matches[1] --body $Matches[2].Trim() -R $repo
    $found++
  }
}
if ($found -ne $names.Count) { Write-Warning "Znaleziono $found z $($names.Count) wpisów w .env.local" }
