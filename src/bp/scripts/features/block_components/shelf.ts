import { isHoldingWrench } from "@lib/utils/scpdyUtils";
import * as mc from "@minecraft/server";

const getMaxVariantIndex = (shelfBlockPermutation: mc.BlockPermutation): number => {
	switch (shelfBlockPermutation.type.id) {
		case "lc:scpdy_shelf_1":
			return 3;
		case "lc:scpdy_shelf_2":
			return 3;
		default:
			return 0;
	}
};

const onPlayerInteract = (arg: mc.BlockComponentPlayerInteractEvent): void => {
	if (!arg.player) return;
	if (!isHoldingWrench(arg.player)) return;

	const currentVariant = arg.block.permutation.getState("lc:variant") as number;

	const maxVariant = getMaxVariantIndex(arg.block.permutation);

	const newVariant = currentVariant < maxVariant ? currentVariant + 1 : 0;

	arg.block.setPermutation(arg.block.permutation.withState("lc:variant", newVariant));
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:shelf", {
		beforeOnPlayerPlace(arg) {
			arg.permutationToPlace = arg.permutationToPlace.withState("lc:variant", 0);
		},
		onPlayerInteract,
	});
});
