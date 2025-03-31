import * as mc from "@minecraft/server";

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const isOpened = arg.block.permutation.getState("lc:is_opened") === true;

	if (isOpened) {
		arg.dimension.playSound("close.iron_trapdoor", arg.block.center());
	} else {
		arg.dimension.playSound("open.iron_trapdoor", arg.block.center());
	}

	arg.block.setPermutation(arg.block.permutation.withState("lc:is_opened", !isOpened));
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:openable_vent", {
		onPlayerInteract,
	});
});
