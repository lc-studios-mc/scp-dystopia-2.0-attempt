import * as mc from "@minecraft/server";

const onStepOn = (arg: mc.BlockComponentStepOnEvent): void => {
	const { block, dimension, entity } = arg;

	if (!entity) return;
	if (entity instanceof mc.Player && entity.getGameMode() === mc.GameMode.Creative) return;

	try {
		const result = entity.applyDamage(2, {
			cause: mc.EntityDamageCause.contact,
		});

		if (result) {
			entity.addEffect("slowness", 40);
			entity.teleport(entity.location);
			dimension.playSound("block.sweet_berry_bush.hurt", block.center());
		}
	} catch {}
};

const onStepOff = (arg: mc.BlockComponentStepOnEvent): void => {
	const { entity } = arg;

	if (!entity) return;
	if (entity instanceof mc.Player && entity.getGameMode() === mc.GameMode.Creative) return;

	try {
		entity.applyDamage(1, {
			cause: mc.EntityDamageCause.override,
		});
	} catch {}
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:razor_wire", {
		onStepOn,
		onStepOff,
	});
});
