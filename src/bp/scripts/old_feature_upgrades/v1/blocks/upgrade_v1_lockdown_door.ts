import { createBlockStatesString } from "@/utils/block";
import { getBlockCardinalDirection } from "@/utils/direction";
import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";
import { unflattenToCoordinates } from "@/utils/math";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:upgrade_v1_lockdown_door", {
		onPlayerInteract: (arg0, arg1) => upgrade(arg0.block, arg1.params),
		onTick: (arg0, arg1) => upgrade(arg0.block, arg1.params),
		onRandomTick: (arg0, arg1) => upgrade(arg0.block, arg1.params),
	});
});

function upgrade(block: mc.Block, params: any): void {
	const isLowerPart = Boolean(block.permutation.getState("lc:is_lower_part"));
	if (!isLowerPart) return; // Only run upgrade for lower part

	const newType = String(params.newType).trim();
	if (newType === "") return;

	try {
		const above = block.above()!;
		if (above.typeId === block.typeId) {
			above.setType("minecraft:air"); // Remove upper part
		}
	} catch {}

	const fnetIndex = Number(params.networkIndex);
	const fzoneIndex = Number(block.permutation.getState("lc:facility_zone_index"));
	const fzoneIndexUnflat = unflattenToCoordinates(fzoneIndex);

	const cardinalDir = getBlockCardinalDirection(block.permutation) ?? mc.Direction.North;

	const statesString = createBlockStatesString({
		"minecraft:cardinal_direction": cardinalDir.toLowerCase(),
		"lc:fnet_index": fnetIndex,
		"lc:fzone_index_major": fzoneIndexUnflat.major,
		"lc:fzone_index_minor": fzoneIndexUnflat.minor,
	});

	const oldPermutation = block.permutation;

	const cmd = `setblock ${vec3.toString2(block)} ${newType} [${statesString}]`;

	block.dimension.runCommand(cmd);

	// @ts-expect-error
	console.log(`Converted ${oldPermutation.type.id} at ${vec3.toString(block)} to ${newType}`);
}
