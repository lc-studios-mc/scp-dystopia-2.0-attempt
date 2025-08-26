import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:scp500_pill", {
		onConsume(arg) {
			// Remove all current effects
			arg.source.getEffects().forEach((effect) => arg.source.removeEffect(effect.typeId));

			arg.source.addEffect("regeneration", 30 * mc.TicksPerSecond, {
				amplifier: 2,
			});

			arg.source.addEffect("absorption", 60 * mc.TicksPerSecond, {
				amplifier: 2,
			});

			arg.source.addEffect("resistance", 50 * mc.TicksPerSecond, {
				amplifier: 1,
			});
		},
	});
});
