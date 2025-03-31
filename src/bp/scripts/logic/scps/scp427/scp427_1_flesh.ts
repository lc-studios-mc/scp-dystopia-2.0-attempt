import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:scp427_1_flesh_cooked", {
		onConsume(arg) {
			arg.source.addEffect("strength", 1200, { amplifier: 1 },);
		},
	},);
},);

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:scp427_1_flesh_raw", {
		onConsume(arg) {
			arg.source.addEffect("poison", 600, { amplifier: 0 },);
		},
	},);
},);
