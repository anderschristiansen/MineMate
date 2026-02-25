# MineMate – Minecraft Bedrock Addon

## Overview
A Minecraft Bedrock addon adding hireable AI companions and village guards.
Currently implemented: tiered Bodyguard companions (sold by NPC trader) and
Guard NPCs (Soldier + Sentry) that protect villages.
Planned: lumberjack, miner, and other job-based followers.

## Project Structure
```
behavior_pack/
  entities/
    bodyguard/      # Bodyguard tiers (dirt, copper, iron, gold, diamond, nether)
    guard/          # Guard types (soldier, sentry)
    trader.json     # NPC trader entity
  loot_tables/equipment/  # Weapon loadouts per entity
  trading/          # Trade table JSONs
  scripts/          # JavaScript (main.js) for logic that needs scripting
  manifest.json     # Declares data + script modules, RP dependency

resource_pack/
  entity/
    bodyguard/      # Client entity definitions for bodyguard tiers
    guard/          # Client entity definitions for guard types
    trader.entity.json
  textures/entity/  # Texture PNGs (simple names, no underscores)
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
- **File names**: simple, lowercase, no underscores (e.g. `dirt.json`, `soldier.png`)
- **Entity identifiers**: `minemate:<role>_<variant>` (e.g. `minemate:bodyguard_dirt`, `minemate:guard_soldier`)
- **Trader identifier**: `minemate:trader`

## Type Families
- `minemate_npc` — shared by all roles (health bar, regen in script)
- `minemate_bodyguard` — bodyguard-specific (auto-tame, one-per-player)
- `minemate_guard` — guard-specific (group aggro)

## Bodyguard Tiers
| Tier     | Entity ID                   | HP | Attack | Speed | Detection |
|----------|-----------------------------|----|--------|-------|-----------|
| Dirt     | minemate:bodyguard_dirt     | 20 | 3      | 0.30  | 12        |
| Copper   | minemate:bodyguard_copper   | 30 | 5      | 0.32  | 14        |
| Iron     | minemate:bodyguard_iron     | 40 | 7      | 0.34  | 16        |
| Gold     | minemate:bodyguard_gold     | 50 | 9      | 0.36  | 18        |
| Diamond  | minemate:bodyguard_diamond  | 60 | 12     | 0.38  | 20        |
| Nether   | minemate:bodyguard_nether   | 80 | 16     | 0.40  | 24 + fire |

## Guard Types
| Type    | Entity ID              | HP | Attack       | Speed | Detection |
|---------|------------------------|----|--------------|-------|-----------|
| Soldier | minemate:guard_soldier | 80 | 10 (melee)   | 0.35  | 20        |
| Sentry  | minemate:guard_sentry  | 50 | 7 (melee)    | 0.32  | 18        |

Guards stay near spawn (`minecraft:home`, 16-block radius), attack monsters,
and use a **group aggro** system: attacking one guard tags you with `minemate_aggro`,
causing all nearby guards to target you.

## Scripting (scripts/main.js)
Minimal JS — only used for things vanilla JSON cannot do:
1. **Auto-tame** newly spawned bodyguard to the nearest player
2. **One per player** — kills the player's existing bodyguard before taming the new one
3. **Weapon equip** — sets mainhand weapon on spawn
4. **Group aggro** — tags attackers of guards so nearby guards retaliate
5. **Health bar** — updates nameTag with heart display for all NPCs
6. **Passive regen** — 1 HP every 5 seconds for all NPCs

Uses `@minecraft/server` v1.15.0. Script module declared in `behavior_pack/manifest.json`.

## Trade Table
All 6 bodyguard tiers sold by `minemate:trader` in `trading/minemate_trader.json`.
Spawn egg item IDs use `_spawn_egg` suffix: `minemate:bodyguard_dirt_spawn_egg`.

## Target Platform
This addon runs on a Realm played from an iPad (iOS). All features, scripts, and JSON must be fully compatible with Minecraft Bedrock on tablet/iOS. Avoid anything that only works on Windows/PC — always verify that APIs, components, and format versions are supported on the mobile Bedrock client.

## Key Rules
- Use vanilla JSON behavior components first — only add scripting when necessary
- One entity file per type (no component group switching between types)
- Textures live in `resource_pack/textures/entity/` with simple names
- Always run `.\deploy.ps1` after changes — it handles PC deploy + mcpack generation
- Add new entity names to both `en_US.lang` and `da_DK.lang`
- All JSON files must be UTF-8 without BOM (iOS/Realm rejects BOM-encoded files)
