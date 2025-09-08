import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:scp207", {
		onConsume(arg) {
			arg.source.addEffect("speed", 180 * mc.TicksPerSecond, {
				amplifier: 2,
			});

			arg.source.addEffect("haste", 180 * mc.TicksPerSecond, {
				amplifier: 1,
			});

			arg.source.addEffect("wither", 180 * mc.TicksPerSecond, {
				amplifier: 0,
			});
		},
	});
});
