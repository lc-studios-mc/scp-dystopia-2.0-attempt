import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:cannot_be_placed_by_player", {
		beforeOnPlayerPlace(arg) {
			arg.cancel = true;
		},
	});
});
