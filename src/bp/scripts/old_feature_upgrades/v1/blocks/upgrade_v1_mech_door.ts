import { createBlockStatesString } from "@/utils/block";
import { getBlockCardinalDirection } from "@/utils/direction";
import * as vec3 from "@/utils/vec3";
import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent(
		"scpdy:upgrade_mechanical_door_to_relay_door",
		COMPONENT,
	);
});

const COMPONENT: mc.BlockCustomComponent = {
	onTick({ block, dimension }, arg1) {
		const params = arg1.params as any;
		const isLowerPart = Boolean(block.permutation.getState("lc:is_lower_part"));

		if (!isLowerPart) return; // Only run upgrade for lower part

		const relayDoorType = String(params.relayDoorType);

		if (relayDoorType === "") return;

		const cardinalDirection = getBlockCardinalDirection(block.permutation) ?? mc.Direction.North;

		const statesString = createBlockStatesString({
			"minecraft:cardinal_direction": cardinalDirection.toLowerCase(),
		});

		const cmd = `setblock ${vec3.toString2(block)} ${relayDoorType} [${statesString}]`;

		try {
			const above = block.above()!;
			if (above.typeId === block.typeId) {
				above.setType("minecraft:air");
			}
		} catch {}

		const oldPermutation = block.permutation;

		dimension.runCommand(cmd);

		// @ts-expect-error
		console.log(
			`Converted ${oldPermutation.type.id} at ${vec3.toString(block)} to ${relayDoorType}`,
		);
	},
};
