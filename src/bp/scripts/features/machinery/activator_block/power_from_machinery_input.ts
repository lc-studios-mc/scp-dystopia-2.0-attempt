import * as mc from "@minecraft/server";
import { MachineryInputEvents } from "../input/events";
import { getRelativeBlockAtDirection } from "@/utils/direction";
import { setPowerLevel } from "./activator_block_component";

const POWER_LEVEL = 10;

MachineryInputEvents.on("onActivate", (data) => {
	if (data.mode !== "powerActivators") return;

	const block = data.block ?? data.dimension.getBlock(data.location);
	if (!block) return;

	const blockBehind = getRelativeBlockAtDirection(block, data.pulseDirection ?? mc.Direction.North);
	if (!blockBehind) return;

	sendPowerToActivatorBlocks(blockBehind);
});

function sendPowerToActivatorBlocks(origin: mc.Block): void {
	tryCrossFrom(origin);

	const below1 = origin.below(1);
	if (below1) {
		tryCrossFrom(below1);
	}

	const below2 = origin.below(2);
	if (below2) {
		tryCrossFrom(below2);
	}

	const below3 = origin.below(3);
	if (below3) {
		if (setPowerLevel(below3, POWER_LEVEL)) {
			tryCrossFrom(below3);
		}
	}
}

function tryCrossFrom(block: mc.Block): void {
	setPowerLevel(block, POWER_LEVEL);

	const north = block.north();
	if (north && setPowerLevel(north, POWER_LEVEL)) {
		const north2 = north.north();
		if (north2) setPowerLevel(north2, POWER_LEVEL);
	}

	const south = block.south();
	if (south && setPowerLevel(south, POWER_LEVEL)) {
		const south2 = south.south();
		if (south2) setPowerLevel(south2, POWER_LEVEL);
	}

	const west = block.west();
	if (west && setPowerLevel(west, POWER_LEVEL)) {
		const west2 = west.west();
		if (west2) setPowerLevel(west2, POWER_LEVEL);
	}

	const east = block.east();
	if (east && setPowerLevel(east, POWER_LEVEL)) {
		const east2 = east.east();
		if (east2) setPowerLevel(east2, POWER_LEVEL);
	}
}
