import { world, system } from "@minecraft/server";

const COMPANION_FAMILY = "minemate_companion";

const COMPANION_WEAPONS = {
    "minemate:companion_dirt":    "minecraft:wooden_sword",
    "minemate:companion_copper":  "minecraft:stone_sword",
    "minemate:companion_iron":    "minecraft:iron_axe",
    "minemate:companion_gold":    "minecraft:golden_sword",
    "minemate:companion_diamond": "minecraft:diamond_sword",
    "minemate:companion_nether":  "minecraft:netherite_axe"
};

const COMPANION_NAMES = {
    "minemate:companion_dirt":    "Dirt Bodyguard",
    "minemate:companion_copper":  "Copper Bodyguard",
    "minemate:companion_iron":    "Iron Bodyguard",
    "minemate:companion_gold":    "Gold Bodyguard",
    "minemate:companion_diamond": "Diamond Bodyguard",
    "minemate:companion_nether":  "Nether Bodyguard"
};

world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;

    const typeFamily = entity.getComponent("minecraft:type_family");
    if (!typeFamily || !typeFamily.hasTypeFamily(COMPANION_FAMILY)) return;

    system.run(() => {
        // Find nearest player — they become the new companion's owner
        const players = entity.dimension.getPlayers();
        if (players.length === 0) return;

        const loc = entity.location;
        const nearest = players.reduce((best, player) => {
            const d = (player.location.x - loc.x) ** 2
                    + (player.location.y - loc.y) ** 2
                    + (player.location.z - loc.z) ** 2;
            return d < best.d ? { player, d } : best;
        }, { player: players[0], d: Infinity }).player;

        // Kill only the nearest player's existing companion, leave others' alone
        const existing = entity.dimension.getEntities({ families: [COMPANION_FAMILY] });
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

        // Set name tag so death messages show correctly (e.g. "Dirt Bodyguard died")
        const name = COMPANION_NAMES[entity.typeId];
        if (name) {
            entity.nameTag = name;
        }

        // Re-equip weapon after taming (tame() resets equipment slots)
        const weapon = COMPANION_WEAPONS[entity.typeId];
        if (weapon) {
            entity.runCommandAsync(`replaceitem entity @s slot.weapon.mainhand 0 ${weapon} 1`);
        }
    });
});
