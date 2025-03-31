import * as mc from "@minecraft/server";

function beforeOnPlayerPlace(arg: mc.BlockComponentPlayerPlaceBeforeEvent): void {
	arg.permutationToPlace = arg.permutationToPlace.withState("lc:open", false,);
}

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	if (!arg.player) return;

	const interactionIndex = arg.block.permutation.getState("lc:interaction",) as number;

	switch (interactionIndex) {
		case 0:
			arg.dimension.playSound("scpdy.interact.laptop.open", arg.block.bottomCenter(),);
			arg.block.setPermutation(arg.block.permutation.withState("lc:open", true,),);
			break;
		case 1:
			arg.dimension.playSound("scpdy.interact.button.click", arg.block.bottomCenter(), {
				pitch: 1.2,
			},);
			arg.block.setPermutation(arg.block.permutation.withState("lc:on", true,),);
			break;
		case 2:
			arg.dimension.playSound("scpdy.interact.button.click", arg.block.bottomCenter(), {
				pitch: 0.8,
			},);
			arg.block.setPermutation(arg.block.permutation.withState("lc:on", false,),);
			break;
		case 3:
			arg.dimension.playSound("scpdy.interact.laptop.close", arg.block.bottomCenter(),);
			arg.block.setPermutation(arg.block.permutation.withState("lc:open", false,),);
			break;
	}

	arg.block.setPermutation(
		arg.block.permutation.withState(
			"lc:interaction",
			interactionIndex < 3 ? interactionIndex + 1 : 0,
		),
	);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:laptop", {
		beforeOnPlayerPlace,
		onPlayerInteract,
	},);
},);
