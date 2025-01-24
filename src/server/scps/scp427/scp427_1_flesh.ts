import * as mc from "@minecraft/server";

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:scp427_1_flesh_cooked", {
		onConsume(arg) {
			arg.source.addEffect("strength", 1200, { amplifier: 1 });
		},
	});
});

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:scp427_1_flesh_raw", {
		onConsume(arg) {
			arg.source.addEffect("poison", 600, { amplifier: 0 });
		},
	});
});
