import { world, system } from "@minecraft/server";

const NPC_FAMILY = "minemate_npc";
const BODYGUARD_FAMILY = "minemate_bodyguard";
const GUARD_FAMILY = "minemate_guard";
const LUMBERJACK_FAMILY = "minemate_lumberjack";

const NPC_WEAPONS = {
    "minemate:bodyguard_dirt":    "minecraft:wooden_sword",
    "minemate:bodyguard_copper":  "minecraft:stone_sword",
    "minemate:bodyguard_iron":    "minecraft:iron_sword",
    "minemate:bodyguard_gold":    "minecraft:golden_sword",
    "minemate:bodyguard_diamond": "minecraft:diamond_sword",
    "minemate:bodyguard_nether":  "minecraft:netherite_sword",
    "minemate:guard_soldier":     "minecraft:iron_sword",
    "minemate:guard_sentry":      "minecraft:iron_axe",
    "minemate:lumberjack":        "minecraft:iron_axe"
};

const NPC_NAMES = {
    "minemate:bodyguard_dirt":    "Dirt Bodyguard",
    "minemate:bodyguard_copper":  "Copper Bodyguard",
    "minemate:bodyguard_iron":    "Iron Bodyguard",
    "minemate:bodyguard_gold":    "Gold Bodyguard",
    "minemate:bodyguard_diamond": "Diamond Bodyguard",
    "minemate:bodyguard_nether":  "Nether Bodyguard",
    "minemate:guard_soldier":     "Guard Soldier",
    "minemate:guard_sentry":      "Guard Sentry",
    "minemate:lumberjack":        "Lumberjack"
};

// --- Entity spawn handler ---
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;

    const typeFamily = entity.getComponent("minecraft:type_family");
    if (!typeFamily || !typeFamily.hasTypeFamily(NPC_FAMILY)) return;

    const isBodyguard = typeFamily.hasTypeFamily(BODYGUARD_FAMILY);
    const isLumberjack = typeFamily.hasTypeFamily(LUMBERJACK_FAMILY);

    system.run(() => {
        if (isBodyguard || isLumberjack) {
            // --- Tame + one-per-player (bodyguard OR lumberjack) ---
            const family = isBodyguard ? BODYGUARD_FAMILY : LUMBERJACK_FAMILY;
            const players = entity.dimension.getPlayers();
            if (players.length === 0) return;

            const loc = entity.location;
            const nearest = players.reduce((best, player) => {
                const d = (player.location.x - loc.x) ** 2
                        + (player.location.y - loc.y) ** 2
                        + (player.location.z - loc.z) ** 2;
                return d < best.d ? { player, d } : best;
            }, { player: players[0], d: Infinity }).player;

            // Kill nearest player's existing companion of same type
            const existing = entity.dimension.getEntities({ families: [family] });
            for (const other of existing) {
                if (other.id === entity.id) continue;
                const otherTameable = other.getComponent("minecraft:tameable");
                if (otherTameable && otherTameable.tamedToPlayerId === nearest.id) {
                    other.kill();
                }
            }

            // Tame the new companion to the nearest player
            const tameable = entity.getComponent("minecraft:tameable");
            if (tameable) {
                tameable.tame(nearest);
            }
        }

        // --- Shared: set name + equip weapon ---
        const name = NPC_NAMES[entity.typeId];
        if (name) {
            entity.nameTag = name;
        }

        const weapon = NPC_WEAPONS[entity.typeId];
        if (weapon) {
            entity.runCommandAsync(`replaceitem entity @s slot.weapon.mainhand 0 ${weapon} 1`);
        }

    });
});

// --- Guard group aggro: tag attacker so all guards target them ---
const AGGRO_TAG = "minemate_aggro";
const AGGRO_DURATION = 600; // 30 seconds in ticks

world.afterEvents.entityHurt.subscribe((event) => {
    const hurtEntity = event.hurtEntity;
    const attacker = event.damageSource.damagingEntity;
    if (!attacker) return;

    const typeFamily = hurtEntity.getComponent("minecraft:type_family");
    const isGuard = typeFamily && typeFamily.hasTypeFamily(GUARD_FAMILY);
    const isVillager = typeFamily && typeFamily.hasTypeFamily("villager");
    if (!isGuard && !isVillager) return;

    // Don't tag fellow guards/NPCs — prevents friendly fire aggro
    const attackerFamily = attacker.getComponent("minecraft:type_family");
    if (attackerFamily && attackerFamily.hasTypeFamily(NPC_FAMILY)) return;

    system.run(() => {
        try {
            if (!attacker.hasTag(AGGRO_TAG)) {
                attacker.addTag(AGGRO_TAG);
            }
            // Remove tag after 30 seconds
            system.runTimeout(() => {
                try { attacker.removeTag(AGGRO_TAG); } catch (_) {}
            }, AGGRO_DURATION);
        } catch (_) {}
    });
});

// --- Clear aggro on respawn ---
world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn) return;
    system.run(() => {
        try { event.player.removeTag(AGGRO_TAG); } catch (_) {}
        // Reset guard AI so hurt_by_target forgets the player
        const guards = event.player.dimension.getEntities({ families: [GUARD_FAMILY] });
        for (const guard of guards) {
            try { guard.runCommandAsync("tp @s ~ ~ ~"); } catch (_) {}
        }
    });
});

// --- Health bar name tag updates + Passive regeneration ---
const TOTAL_HEARTS = 10;
const REGEN_AMOUNT = 1;

function buildHealthTag(entity) {
    let name = NPC_NAMES[entity.typeId] || "NPC";
    // Show status for bodyguards
    const typeFamily = entity.getComponent("minecraft:type_family");
    if (typeFamily && typeFamily.hasTypeFamily(BODYGUARD_FAMILY)) {
        name += entity.hasTag("staying") ? " §c[Staying]" : " §a[Following]";
    }
    // Show chopping status for lumberjack
    if (entity.typeId === "minemate:lumberjack") {
        name += entity.hasTag("chopping") ? " §a[Chopping]" : " §7[Following]";
    }
    const health = entity.getComponent("minecraft:health");
    if (!health) return name;

    const filled = Math.round((health.currentValue / health.effectiveMax) * TOTAL_HEARTS);
    const red = "§c" + "❤".repeat(filled);
    const gray = "§7" + "❤".repeat(TOTAL_HEARTS - filled);
    return name + "\n" + red + gray;
}

// 1 HP every 5 seconds (100 ticks)
system.runInterval(() => {
    for (const dim of ["overworld", "nether", "the_end"]) {
        const npcs = world.getDimension(dim).getEntities({ families: [NPC_FAMILY] });
        for (const npc of npcs) {
            try {
                // Regen
                const health = npc.getComponent("minecraft:health");
                if (health && health.currentValue < health.effectiveMax) {
                    health.setCurrentValue(Math.min(health.currentValue + REGEN_AMOUNT, health.effectiveMax));
                }
                // Name tag
                npc.nameTag = buildHealthTag(npc);
            } catch (_) { /* entity may have been removed */ }
        }
    }
}, 100);

// --- Whistle items: summon companion to player ---
world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;
    if (!item) return;

    let family = null;
    let label = null;
    if (item.typeId === "minemate:bodyguard_whistle") {
        family = BODYGUARD_FAMILY;
        label = "Bodyguard";
    } else if (item.typeId === "minemate:lumberjack_whistle") {
        family = LUMBERJACK_FAMILY;
        label = "Lumberjack";
    }
    if (!family) return;

    system.run(() => {
        try {
            const companions = player.dimension.getEntities({ families: [family] });
            let found = false;
            for (const companion of companions) {
                const tameable = companion.getComponent("minecraft:tameable");
                if (tameable && tameable.tamedToPlayerId === player.id) {
                    companion.teleport(player.location);
                    // Switch to following mode
                    if (family === BODYGUARD_FAMILY && companion.hasTag("staying")) {
                        companion.removeTag("staying");
                        companion.triggerEvent("minemate:follow");
                    }
                    if (family === LUMBERJACK_FAMILY && companion.hasTag("chopping")) {
                        companion.removeTag("chopping");
                        ljAnchors.delete(companion.id);
                        companion.triggerEvent("minemate:stop_chopping");
                    }
                    const name = NPC_NAMES[companion.typeId] || label;
                    player.sendMessage(`§e${name}: §fComing to you!`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                player.sendMessage(`§c${label} not found!`);
            }
        } catch (_) {}
    });
});

// --- Bodyguard: interact to toggle stay/follow ---
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const entity = event.target;
    const typeFamily = entity.getComponent("minecraft:type_family");
    if (!typeFamily || !typeFamily.hasTypeFamily(BODYGUARD_FAMILY)) return;

    system.run(() => {
        try {
            const name = NPC_NAMES[entity.typeId] || "Bodyguard";
            if (entity.hasTag("staying")) {
                entity.removeTag("staying");
                entity.triggerEvent("minemate:follow");
                event.player.sendMessage(`§e${name}: §fFollowing you!`);
            } else {
                entity.addTag("staying");
                entity.triggerEvent("minemate:stay");
                event.player.sendMessage(`§e${name}: §fStaying here!`);
            }
        } catch (_) {}
    });
});

// --- Lumberjack: interact to toggle chopping mode ---
const LOG_TYPES = new Set([
    "minecraft:oak_log", "minecraft:birch_log", "minecraft:spruce_log",
    "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log",
    "minecraft:mangrove_log", "minecraft:cherry_log",
    "minecraft:oak_leaves", "minecraft:birch_leaves", "minecraft:spruce_leaves",
    "minecraft:jungle_leaves", "minecraft:acacia_leaves", "minecraft:dark_oak_leaves",
    "minecraft:mangrove_leaves", "minecraft:cherry_leaves", "minecraft:azalea_leaves",
    "minecraft:azalea_leaves_flowered"
]);

const CHOP_RADIUS = 15;           // max distance from anchor
const ljAnchors = new Map();      // entity id -> { x, y, z }

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const entity = event.target;
    if (entity.typeId !== "minemate:lumberjack") return;

    system.run(() => {
        try {
            if (entity.hasTag("chopping")) {
                // Stop chopping — return to following
                entity.removeTag("chopping");
                ljAnchors.delete(entity.id);
                entity.triggerEvent("minemate:stop_chopping");
                event.player.sendMessage("§eLumberjack: §fFollowing you!");
            } else {
                // Start chopping — anchor at current position
                entity.addTag("chopping");
                ljAnchors.set(entity.id, { x: entity.location.x, y: entity.location.y, z: entity.location.z });
                entity.triggerEvent("minemate:start_chopping");
                event.player.sendMessage("§eLumberjack: §fChopping trees nearby!");
            }
        } catch (_) {}
    });
});

// Walk toward tree + chop when close — runs every 4 ticks (0.2 s)
const ljTargets = new Map();      // entity id -> { x, y, z }
const ljChopCooldown = new Map(); // entity id -> intervals remaining
let ljScanTick = 0;

function findNearestLog(dim, loc, anchor) {
    const bx = Math.floor(loc.x);
    const by = Math.floor(loc.y);
    const bz = Math.floor(loc.z);
    let best = null;
    let bestDist = Infinity;
    for (let dy = -3; dy <= 20; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
            for (let dz = -8; dz <= 8; dz++) {
                try {
                    const px = bx + dx, py = by + dy, pz = bz + dz;
                    // Must be within anchor radius
                    const ax = px + 0.5 - anchor.x;
                    const az = pz + 0.5 - anchor.z;
                    if (ax * ax + az * az > CHOP_RADIUS * CHOP_RADIUS) continue;
                    const block = dim.getBlock({ x: px, y: py, z: pz });
                    if (block && LOG_TYPES.has(block.typeId)) {
                        const d = dx * dx + dy * dy + dz * dz;
                        if (d < bestDist) {
                            bestDist = d;
                            best = { x: px, y: py, z: pz };
                        }
                    }
                } catch (_) {}
            }
        }
    }
    return best;
}

system.runInterval(() => {
    ljScanTick++;
    const shouldScan = ljScanTick % 4 === 0;

    for (const dimName of ["overworld", "nether", "the_end"]) {
        const dim = world.getDimension(dimName);
        const lumberjacks = dim.getEntities({ families: [LUMBERJACK_FAMILY] });
        for (const lj of lumberjacks) {
            try {
                if (!lj.hasTag("chopping")) continue;
                const anchor = ljAnchors.get(lj.id);
                if (!anchor) continue;

                // Enforce anchor radius
                const loc = lj.location;
                const adx = loc.x - anchor.x;
                const adz = loc.z - anchor.z;
                if (Math.sqrt(adx * adx + adz * adz) > CHOP_RADIUS) {
                    lj.teleport(anchor);
                    continue;
                }

                // Validate existing target
                let target = ljTargets.get(lj.id);
                if (target) {
                    try {
                        const block = dim.getBlock(target);
                        if (!block || !LOG_TYPES.has(block.typeId)) {
                            ljTargets.delete(lj.id);
                            target = null;
                        }
                    } catch (_) {
                        ljTargets.delete(lj.id);
                        target = null;
                    }
                }

                // Scan for new target periodically
                if (!target && shouldScan) {
                    target = findNearestLog(dim, lj.location, anchor);
                    if (target) ljTargets.set(lj.id, target);
                }

                if (!target) continue;

                // Decrement chop cooldown
                const cd = ljChopCooldown.get(lj.id) || 0;
                if (cd > 0) ljChopCooldown.set(lj.id, cd - 1);

                const tx = target.x + 0.5;
                const ty = target.y;
                const tz = target.z + 0.5;
                const hdist = Math.sqrt((tx - loc.x) ** 2 + (tz - loc.z) ** 2);

                if (hdist > 1.5) {
                    // Walk toward the tree
                    const dx = tx - loc.x;
                    const dz = tz - loc.z;
                    const step = 1.2;
                    lj.teleport(
                        { x: loc.x + (dx / hdist) * step, y: loc.y, z: loc.z + (dz / hdist) * step },
                        { facingLocation: { x: tx, y: ty, z: tz } }
                    );
                } else {
                    // Face the tree
                    lj.teleport(loc, { facingLocation: { x: tx, y: ty, z: tz } });

                    // Chop when cooldown is ready
                    if (cd <= 0) {
                        lj.runCommandAsync(`setblock ${target.x} ${target.y} ${target.z} air destroy`);
                        ljTargets.delete(lj.id);
                        ljChopCooldown.set(lj.id, 0); // chop every tick (10 ticks = 0.5s interval)
                    }
                }
            } catch (_) {}
        }
    }
}, 4);
