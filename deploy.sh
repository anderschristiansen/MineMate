#!/usr/bin/env bash

COM_MOJANG="$LOCALAPPDATA/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang"
BP_DEST="$COM_MOJANG/development_behavior_packs/MineMate_BP"
RP_DEST="$COM_MOJANG/development_resource_packs/MineMate_RP"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Deploying MineMate packs..."

mkdir -p "$BP_DEST" "$RP_DEST"

cp -rf "$SCRIPT_DIR/behavior_pack/." "$BP_DEST/"
cp -rf "$SCRIPT_DIR/resource_pack/." "$RP_DEST/"

echo "Done! Packs deployed to:"
echo "  BP -> $BP_DEST"
echo "  RP -> $RP_DEST"
