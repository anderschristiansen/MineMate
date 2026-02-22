# MineMate – Minecraft Bedrock Addon

## Overview
A Minecraft Bedrock addon adding hireable AI companions with different roles.
Currently implemented: tiered Bodyguard companions sold by an NPC trader.
Planned: lumberjack, miner, and other job-based followers.

## Project Structure
```
behavior_pack/
  entities/         # Entity behavior definitions (one file per entity)
  trading/          # Trade table JSONs
  scripts/          # JavaScript (main.js) for logic that needs scripting
  manifest.json     # Declares data + script modules, RP dependency

resource_pack/
  entity/           # Client entity definitions (one file per entity)
  textures/entity/  # Texture PNGs (simple names, no underscores, e.g. dirt.png)
  texts/            # en_US.lang + da_DK.lang + languages.json
  manifest.json
```

## Deploying
```powershell
.\deploy.ps1
```
Copies both packs to Minecraft's development folders and generates
`MineMate_BP.mcpack` / `MineMate_RP.mcpack` for Realm/iPad distribution.

Minecraft data path: `%APPDATA%\Minecraft Bedrock\Users\Shared\games\com.mojang`

## Naming Conventions
- **File names**: simple, lowercase, no underscores (e.g. `dirt.json`, `iron.png`)
- **Entity identifiers**: `minemate:<role>_<tier>` (e.g. `minemate:companion_dirt`)
- **Type family**: all companions share `minemate_companion` family for script filtering
- **Trader identifier**: `minemate:trader`

## Companion Tiers (Bodyguard)
| Tier     | Entity ID                   | HP | Attack | Speed | Detection |
|----------|-----------------------------|----|--------|-------|-----------|
| Dirt     | minemate:companion_dirt     | 20 | 3      | 0.30  | 12        |
| Copper   | minemate:companion_copper   | 30 | 5      | 0.32  | 14        |
| Iron     | minemate:companion_iron     | 40 | 7      | 0.34  | 16        |
| Gold     | minemate:companion_gold     | 50 | 9      | 0.36  | 18        |
| Diamond  | minemate:companion_diamond  | 60 | 12     | 0.38  | 20        |
| Nether   | minemate:companion_nether   | 80 | 16     | 0.40  | 24 + fire |

## Scripting (scripts/main.js)
Minimal JS — only used for things vanilla JSON cannot do:
1. **Auto-tame** newly spawned companion to the nearest player (`EntityTameableComponent.tame()`)
2. **One per player** — kills the player's existing companion before taming the new one

Uses `@minecraft/server` v1.15.0. Script module declared in `behavior_pack/manifest.json`.

## Trade Table
All 6 bodyguard tiers sold by `minemate:trader` in `trading/minemate_trader.json`.
Spawn egg item IDs use `_spawn_egg` suffix: `minemate:companion_dirt_spawn_egg`.

## Key Rules
- Use vanilla JSON behavior components first — only add scripting when necessary
- One entity file per tier (no component group switching between tiers)
- Textures live in `resource_pack/textures/entity/` with simple names
- Always run `.\deploy.ps1` after changes — it handles PC deploy + mcpack generation
- Add new entity names to both `en_US.lang` and `da_DK.lang`
