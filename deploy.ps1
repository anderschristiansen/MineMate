$comMojang = "$env:APPDATA\Minecraft Bedrock\Users\Shared\games\com.mojang"
$bpDest = "$comMojang\development_behavior_packs\MineMate_BP"
$rpDest = "$comMojang\development_resource_packs\MineMate_RP"

$root = $PSScriptRoot

Write-Host "Deploying MineMate packs..."

New-Item -ItemType Directory -Force -Path $bpDest | Out-Null
New-Item -ItemType Directory -Force -Path $rpDest | Out-Null

Copy-Item -Path "$root\behavior_pack\*" -Destination $bpDest -Recurse -Force
Copy-Item -Path "$root\resource_pack\*" -Destination $rpDest -Recurse -Force

Write-Host "Done! Packs deployed to:"
Write-Host "  BP -> $bpDest"
Write-Host "  RP -> $rpDest"

# Generate .mcpack files for iPad installation (zip then rename)
Write-Host "Generating .mcpack files..."
Compress-Archive -Path "$root\behavior_pack\*" -DestinationPath "$root\MineMate_BP.zip" -Force
Compress-Archive -Path "$root\resource_pack\*" -DestinationPath "$root\MineMate_RP.zip" -Force
Move-Item "$root\MineMate_BP.zip" "$root\MineMate_BP.mcpack" -Force
Move-Item "$root\MineMate_RP.zip" "$root\MineMate_RP.mcpack" -Force
Write-Host "  MineMate_BP.mcpack -> $root\MineMate_BP.mcpack"
Write-Host "  MineMate_RP.mcpack -> $root\MineMate_RP.mcpack"
