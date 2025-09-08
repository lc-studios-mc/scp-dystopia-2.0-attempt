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

			arg.source.addEffect("regeneration", 40 * mc.TicksPerSecond, {
				amplifier: 3,
			});

			arg.source.addEffect("absorption", 120 * mc.TicksPerSecond, {
				amplifier: 2,
			});
		},
	});
});
