import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:dont_get_durability_damage_on_hit", {
		onBeforeDurabilityDamage(arg) {
			arg.durabilityDamage = 0;
		},
	});
});
