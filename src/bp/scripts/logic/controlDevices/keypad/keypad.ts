import * as mc from "@minecraft/server";

mc.world.afterEvents.entityDie.subscribe(event => {
	if (mc.world.gameRules.doMobLoot) {
		const placerItem = new mc.ItemStack("lc:scpdy_keypad_placer");
		event.deadEntity.dimension.spawnItem(placerItem, event.deadEntity.location);
	}

	event.deadEntity.remove();
}, {
	entityTypes: ["lc:scpdy_keypad"],
});
