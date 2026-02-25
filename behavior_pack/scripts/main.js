import { world, system } from "@minecraft/server";

const NPC_FAMILY = "minemate_npc";
const BODYGUARD_FAMILY = "minemate_bodyguard";
const GUARD_FAMILY = "minemate_guard";

const NPC_WEAPONS = {
    "minemate:bodyguard_dirt":    "minecraft:wooden_sword",
    "minemate:bodyguard_copper":  "minecraft:stone_sword",
    "minemate:bodyguard_iron":    "minecraft:iron_sword",
    "minemate:bodyguard_gold":    "minecraft:golden_sword",
    "minemate:bodyguard_diamond": "minecraft:diamond_sword",
    "minemate:bodyguard_nether":  "minecraft:netherite_sword",
    "minemate:guard_soldier":     "minecraft:iron_sword",
    "minemate:guard_sentry":      "minecraft:iron_axe"
};

const NPC_NAMES = {
    "minemate:bodyguard_dirt":    "Dirt Bodyguard",
    "minemate:bodyguard_copper":  "Copper Bodyguard",
    "minemate:bodyguard_iron":    "Iron Bodyguard",
    "minemate:bodyguard_gold":    "Gold Bodyguard",
    "minemate:bodyguard_diamond": "Diamond Bodyguard",
    "minemate:bodyguard_nether":  "Nether Bodyguard",
    "minemate:guard_soldier":     "Guard Soldier",
    "minemate:guard_sentry":      "Guard Sentry"
};

// --- Entity spawn handler ---
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;

    const typeFamily = entity.getComponent("minecraft:type_family");
    if (!typeFamily || !typeFamily.hasTypeFamily(NPC_FAMILY)) return;

    const isBodyguard = typeFamily.hasTypeFamily(BODYGUARD_FAMILY);

    system.run(() => {
        if (isBodyguard) {
            // --- Bodyguard-only: tame + one-per-player ---
            const players = entity.dimension.getPlayers();
            if (players.length === 0) return;

            const loc = entity.location;
            const nearest = players.reduce((best, player) => {
                const d = (player.location.x - loc.x) ** 2
                        + (player.location.y - loc.y) ** 2
                        + (player.location.z - loc.z) ** 2;
                return d < best.d ? { player, d } : best;
            }, { player: players[0], d: Infinity }).player;

            // Kill nearest player's existing bodyguard
            const existing = entity.dimension.getEntities({ families: [BODYGUARD_FAMILY] });
            for (const other of existing) {
                if (other.id === entity.id) continue;
                const otherTameable = other.getComponent("minecraft:tameable");
                if (otherTameable && otherTameable.tamedToPlayerId === nearest.id) {
                    other.kill();
                }
            }

            // Tame the new bodyguard to the nearest player
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
    const name = NPC_NAMES[entity.typeId] || "NPC";
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
