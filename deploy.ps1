param(
    [ValidateSet("major", "minor", "patch")]
    [string]$Bump = "patch"
)

$root = $PSScriptRoot
$comMojang = "$env:APPDATA\Minecraft Bedrock\Users\Shared\games\com.mojang"
$bpDest = "$comMojang\development_behavior_packs\MineMate_BP"
$rpDest = "$comMojang\development_resource_packs\MineMate_RP"

# --- Version bump ---
$bpPath = "$root\behavior_pack\manifest.json"
$rpPath = "$root\resource_pack\manifest.json"

$bpManifest = Get-Content $bpPath -Raw | ConvertFrom-Json
$rpManifest = Get-Content $rpPath -Raw | ConvertFrom-Json

$ver = @([int]$bpManifest.header.version[0], [int]$bpManifest.header.version[1], [int]$bpManifest.header.version[2])
switch ($Bump) {
    "major" { $ver[0]++; $ver[1] = 0; $ver[2] = 0 }
    "minor" { $ver[1]++; $ver[2] = 0 }
    "patch" { $ver[2]++ }
}
$verStr = "$($ver[0]).$($ver[1]).$($ver[2])"

Write-Host "Bumping version to v$verStr ($Bump)..."

# Update BP manifest
$bpManifest.header.version = $ver
$bpManifest.header.description = "A companion NPC that follows you. v$verStr"
foreach ($mod in $bpManifest.modules) { $mod.version = $ver }
foreach ($dep in $bpManifest.dependencies) {
    if ($dep.uuid -eq $rpManifest.header.uuid) { $dep.version = $ver }
}

# Update RP manifest
$rpManifest.header.version = $ver
$rpManifest.header.description = "Visuals for the MineMate companion. v$verStr"
foreach ($mod in $rpManifest.modules) { $mod.version = $ver }

# Write manifests (UTF-8 without BOM — Realms reject BOM-prefixed JSON)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($bpPath, ($bpManifest | ConvertTo-Json -Depth 10), $utf8NoBom)
[System.IO.File]::WriteAllText($rpPath, ($rpManifest | ConvertTo-Json -Depth 10), $utf8NoBom)

# --- Deploy ---
Write-Host "Deploying MineMate packs..."

New-Item -ItemType Directory -Force -Path $bpDest | Out-Null
New-Item -ItemType Directory -Force -Path $rpDest | Out-Null

Copy-Item -Path "$root\behavior_pack\*" -Destination $bpDest -Recurse -Force
Copy-Item -Path "$root\resource_pack\*" -Destination $rpDest -Recurse -Force

Write-Host "Done! Packs deployed to:"
Write-Host "  BP -> $bpDest"
Write-Host "  RP -> $rpDest"

# Generate .mcpack files for iPad/Realm installation
Write-Host "Generating .mcpack files..."
Compress-Archive -Path "$root\behavior_pack\*" -DestinationPath "$root\MineMate_BP.zip" -Force
Compress-Archive -Path "$root\resource_pack\*" -DestinationPath "$root\MineMate_RP.zip" -Force
Move-Item "$root\MineMate_BP.zip" "$root\MineMate_BP.mcpack" -Force
Move-Item "$root\MineMate_RP.zip" "$root\MineMate_RP.mcpack" -Force
Write-Host "  MineMate_BP.mcpack -> $root\MineMate_BP.mcpack"
Write-Host "  MineMate_RP.mcpack -> $root\MineMate_RP.mcpack"

Write-Host ""
Write-Host "v$verStr deployed!"
