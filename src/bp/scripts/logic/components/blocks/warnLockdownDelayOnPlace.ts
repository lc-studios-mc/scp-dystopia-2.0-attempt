import * as mc from "@minecraft/server";

function onPlace(arg: mc.BlockComponentOnPlaceEvent): void {
	const nearbyPlayers = arg.dimension.getPlayers({
		location: arg.block.center(),
		maxDistance: 6,
		excludeTags: ["scpdy_warned_lockdown_system_delay"],
	},);

	for (const player of nearbyPlayers) {
		player.addTag("scpdy_warned_lockdown_system_delay",);
		player.playSound("note.bass", { volume: 0.8, pitch: 1.1 },);

		player.sendMessage({
			rawtext: [
				{ translate: "scpdy.msg.lockdownSystem.setZone.lagWarn.line_1" },
				{ text: "\n" },
				{ translate: "scpdy.msg.lockdownSystem.setZone.lagWarn.line_2" },
			],
		},);
	}
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:warn_lockdown_delay_on_place", {
		onPlace,
	},);
},);
