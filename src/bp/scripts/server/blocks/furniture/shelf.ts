import * as mc from "@minecraft/server";
import { isHoldingWrench } from "@lib/utils/scpdyUtils";

function getMaxVariantIndex(shelfBlockPermutation: mc.BlockPermutation): number {
	switch (shelfBlockPermutation.type.id) {
		case "lc:scpdy_shelf_1":
			return 3;
		case "lc:scpdy_shelf_2":
			return 3;
		default:
			return 0;
	}
}

function beforeOnPlayerPlace(args: mc.BlockComponentPlayerPlaceBeforeEvent): void {
	args.permutationToPlace = args.permutationToPlace.withState("lc:variant", 0);
}

function onPlayerInteract(args: mc.BlockComponentPlayerInteractEvent): void {
	if (!args.player) return;
	if (!isHoldingWrench(args.player)) return;

	const currentVariant = args.block.permutation.getState("lc:variant") as number;

	const maxVariant = getMaxVariantIndex(args.block.permutation);

	const newVariant = currentVariant < maxVariant ? currentVariant + 1 : 0;

	args.block.setPermutation(args.block.permutation.withState("lc:variant", newVariant));
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:shelf", {
		beforeOnPlayerPlace,
		onPlayerInteract,
	});
});
