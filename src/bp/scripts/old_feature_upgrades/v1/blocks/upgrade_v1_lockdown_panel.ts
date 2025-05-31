import { createBlockStatesString } from "@/utils/block";
import { getBlockCardinalDirection } from "@/utils/direction";
import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:upgrade_v1_lockdown_panel", {
		onPlayerInteract: (arg0, arg1) => upgrade(arg0.block, arg1.params),
		onTick: (arg0, arg1) => upgrade(arg0.block, arg1.params),
	});
});

function upgrade(block: mc.Block, params: any): void {
	const newType = String(params.newType).trim();

	if (newType === "") return;

	const fnetIndex = Number(params.networkIndex);
	const fzoneIndex = Number(block.permutation.getState("lc:facility_zone_index"));

	const cardinalDir = getBlockCardinalDirection(block.permutation) ?? mc.Direction.North;

	const statesString = createBlockStatesString({
		"minecraft:cardinal_direction": cardinalDir.toLowerCase(),
		"lc:fnet_index": fnetIndex,
		"lc:fzone_index": fzoneIndex,
	});

	const oldPermutation = block.permutation;

	const cmd = `setblock ${vec3.toString2(block)} ${newType} [${statesString}]`;

	block.dimension.runCommand(cmd);

	// @ts-expect-error
	console.log(`Converted ${oldPermutation.type.id} at ${vec3.toString(block)} to ${newType}`);
}
