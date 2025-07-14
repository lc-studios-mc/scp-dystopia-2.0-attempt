import * as mc from "@minecraft/server";

const onStepOn = (arg: mc.BlockComponentStepOnEvent): void => {
	const { block, dimension, entity } = arg;

	if (!mc.world.gameRules.tntExplodes) return;

	const explode = block.permutation.getState("lc:explode") === true;

	if (explode) return;

	try {
		block.setPermutation(block.permutation.withState("lc:explode", true));
	} catch {}

	if (entity) {
		entity.applyDamage(28, { cause: mc.EntityDamageCause.blockExplosion });
	}

	mc.system.run(() => {
		dimension.spawnEntity("lc:scpdy_landmine_explosion", block.center());
	});
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:landmine", {
		onStepOn,
	});
});
