import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:scp500_pill", {
		onConsume(arg) {
			// Remove most negative effects
			arg.source.removeEffect("wither");
			arg.source.removeEffect("poison");
			arg.source.removeEffect("slowness");
			arg.source.removeEffect("mining_fatigue");
			arg.source.removeEffect("nausea");
			arg.source.removeEffect("blindness");
			arg.source.removeEffect("weakness");
			arg.source.removeEffect("hunger");
			arg.source.removeEffect("instant_damage");

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
