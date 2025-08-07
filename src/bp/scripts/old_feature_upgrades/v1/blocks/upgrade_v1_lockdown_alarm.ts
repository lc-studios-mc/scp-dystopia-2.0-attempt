import { createBlockStatesString } from "@/utils/block";
import { getBlockCardinalDirection, getBlockFace } from "@/utils/direction";
import * as vec3 from "@/utils/vec3";
import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:upgrade_v1_lockdown_alarm", {
		onPlayerInteract: (arg0, arg1) => upgrade(arg0.block, arg1.params),
		onTick: (arg0, arg1) => upgrade(arg0.block, arg1.params),
	});
});

function upgrade(block: mc.Block, params: any): void {
	const newType = String(params.newType).trim();

	if (newType === "") return;

	const fnetIndex = Number(params.networkIndex);
	const fzoneIndex = Number(block.permutation.getState("lc:facility_zone_index"));

	const blockFace = getBlockFace(block.permutation) ?? mc.Direction.North;

	const statesString = createBlockStatesString({
		"minecraft:block_face": blockFace.toLowerCase(),
		"lc:fnet_index": fnetIndex,
		"lc:fzone_index": fzoneIndex,
	});

	const oldPermutation = block.permutation;

	const cmd = `setblock ${vec3.toString2(block)} ${newType} [${statesString}]`;

	block.dimension.runCommand(cmd);

	// @ts-expect-error
	console.log(`Converted ${oldPermutation.type.id} at ${vec3.toString(block)} to ${newType}`);
}
