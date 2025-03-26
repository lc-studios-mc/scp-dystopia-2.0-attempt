import * as mc from "@minecraft/server";
import { isAirOrLiquid } from "@lib/utils/blockUtils";
import { getDoorSoundInfo } from "./doorSounds";
import { dropDoorItem } from "./shared";

const STATE_NAMES = {
	isLowerPart: "lc:is_lower_part",
	ticksUntilPowerOff: "lc:ticks_until_power_off",
	doorOpenProgress: "lc:door_open_progress",
} as const;

function onPlace(arg: mc.BlockComponentOnPlaceEvent): void {
	const { block, dimension } = arg;

	const isLowerPart = block.permutation.getState(STATE_NAMES.isLowerPart);

	if (!isLowerPart) {
		const blockBelow = block.below();

		if (blockBelow && blockBelow.typeId !== block.typeId) {
			block.setType("minecraft:air");
		}

		return;
	}

	const blockAbove = block.above();

	if (!blockAbove || !isAirOrLiquid(blockAbove.typeId)) {
		dropDoorItem(block.typeId, dimension, block.center());

		block.setType("minecraft:air");
		return;
	}

	const upperPartPermutation = block.permutation.withState(STATE_NAMES.isLowerPart, false);

	blockAbove.setPermutation(upperPartPermutation);
}

function onTick(arg: mc.BlockComponentTickEvent): void {
	const { block, dimension } = arg;

	const isLowerPart = block.permutation.getState(STATE_NAMES.isLowerPart);

	let otherPartBlock: mc.Block | undefined;

	if (isLowerPart) {
		otherPartBlock = block.above();
	} else {
		otherPartBlock = block.below();
	}

	if (
		!otherPartBlock ||
		otherPartBlock.typeId !== block.typeId ||
		otherPartBlock.permutation.getState(STATE_NAMES.isLowerPart) === isLowerPart
	) {
		block.setType("minecraft:air");
		return;
	}

	// Open / Close

	if (mc.system.currentTick % 2 !== 0) return; // Update only once per 2 ticks

	const ticksUntilPowerOff = block.permutation.getState(STATE_NAMES.ticksUntilPowerOff) as number;

	const isPowered = ticksUntilPowerOff > 0;

	const currentOpenProgress = block.permutation.getState(STATE_NAMES.doorOpenProgress) as number;

	const nextOpenProgress: number =
		currentOpenProgress < 15 && isPowered
			? currentOpenProgress + 1
			: currentOpenProgress > 0 && !isPowered
			? currentOpenProgress - 1
			: currentOpenProgress;

	block.setPermutation(block.permutation.withState(STATE_NAMES.doorOpenProgress, nextOpenProgress));

	otherPartBlock.setPermutation(
		otherPartBlock.permutation.withState(STATE_NAMES.doorOpenProgress, nextOpenProgress),
	);

	if (ticksUntilPowerOff > 0) {
		block.setPermutation(
			block.permutation.withState(STATE_NAMES.ticksUntilPowerOff, ticksUntilPowerOff - 1),
		);
	}

	// Play sound

	const doorSoundInfo = getDoorSoundInfo(arg.block.typeId);

	if (doorSoundInfo) {
		if (isPowered && nextOpenProgress === 1) {
			dimension.playSound(doorSoundInfo.openSound.id, block.location, {
				volume: doorSoundInfo.openSound.volume,
				pitch: doorSoundInfo.openSound.pitch,
			});
		} else if (!isPowered && nextOpenProgress === 14) {
			dimension.playSound(doorSoundInfo.closeSound.id, block.location, {
				volume: doorSoundInfo.closeSound.volume,
				pitch: doorSoundInfo.closeSound.pitch,
			});
		}
	}
}

function onPlayerDestroy(arg: mc.BlockComponentPlayerDestroyEvent): void {
	const { block, destroyedBlockPermutation, dimension, player } = arg;

	dropDoorItem(destroyedBlockPermutation.type.id, dimension, block.center(), player);

	const isLowerPart = destroyedBlockPermutation.getState(STATE_NAMES.isLowerPart) === true;

	let otherPartBlock: mc.Block | undefined;

	if (isLowerPart) {
		otherPartBlock = block.above();
	} else {
		otherPartBlock = block.below();
	}

	if (!otherPartBlock || otherPartBlock.typeId !== destroyedBlockPermutation.type.id) return;

	otherPartBlock.setType("minecraft:air");
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:mechanical_door", {
		onPlace,
		onTick,
		onPlayerDestroy,
	});
});
