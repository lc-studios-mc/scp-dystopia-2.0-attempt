import { getInputDeviceModeFromIndex } from "@/features/input_devices/mode";
import { createBlockStatesString } from "@/utils/block";
import { getBlockCardinalDirection, reverseDirection } from "@/utils/direction";
import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";
import { clamp } from "@/utils/math";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:upgrade_v1_keycard_reader", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	onTick({ block, dimension }, arg1) {
		const params = arg1.params as any;

		const newType = String(params.newType).trim();
		const clearanceLevel = Number(params.level);

		if (newType === "") return;
		if (isNaN(clearanceLevel)) return;

		const modeIndex = Number(block.permutation.getState("lc:mode"));
		const modeString = getInputDeviceModeFromIndex(modeIndex);

		const cardinalDir = getBlockCardinalDirection(block.permutation) ?? mc.Direction.North;
		const reversedDir = reverseDirection(cardinalDir);

		const oldPermutation = block.permutation;

		const statesString = createBlockStatesString({
			"minecraft:cardinal_direction": reversedDir.toLowerCase(),
			"lc:mode": modeString,
			"lc:clearance_level": clamp(Math.floor(clearanceLevel), 0, 6),
		});

		const cmd = `setblock ${vec3.toString2(block)} ${newType} [${statesString}]`;

		dimension.runCommand(cmd);

		// @ts-expect-error
		console.log(`Converted ${oldPermutation.type.id} at ${vec3.toString(block)} to ${newType}`);
	},
};
