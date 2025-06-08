import { createBlockStatesString } from "@/utils/block";
import { getBlockCardinalDirection } from "@/utils/direction";
import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:upgrade_v1_boolean_door", {
		onTick,
		onRandomTick: onTick,
	});
});

function onTick({ block, dimension }: mc.BlockComponentTickEvent, arg1: mc.CustomComponentParameters): void {
	const params = arg1.params as any;

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

	const cardinalDir = getBlockCardinalDirection(block.permutation) ?? mc.Direction.North;

	const isClearanceSet = Boolean(block.permutation.getState("lc:is_clearance_set"));
	const minClearanceLevel = Number(block.permutation.getState("lc:minimum_clearance_level"));

	const statesString = createBlockStatesString({
		"minecraft:cardinal_direction": cardinalDir.toLowerCase(),
		"lc:clearance_level": isClearanceSet ? minClearanceLevel : -1,
	});

	const oldPermutation = block.permutation;

	const cmd = `setblock ${vec3.toString2(block)} ${newType} [${statesString}]`;

	dimension.runCommand(cmd);

	// @ts-expect-error
	console.log(`Converted ${oldPermutation.type.id} at ${vec3.toString(block)} to ${newType}`);
}
