import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:keypad_placer", {
		onUseOn,
	});
});

function onUseOn(arg: mc.ItemComponentUseOnEvent): void {
	const player = arg.source;
	if (!(player instanceof mc.Player)) return;

	processPlacementAsync(player, arg)
		.catch(() => {
			player.sendMessage({ translate: "scpdy.msg.misc.somethingWentWrong" });
		});
}

async function processPlacementAsync(
	player: mc.Player,
	event: mc.ItemComponentUseOnEvent,
): Promise<void> {
}
