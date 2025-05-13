import { isAirOrLiquid } from "@lib/utils/blockUtils";
import * as mc from "@minecraft/server";
import { getDoorSoundInfo } from "./doorSounds";
import { dropDoorItem } from "./shared";

const STATE_NAMES = {
	isLowerPart: "lc:is_lower_part",
	isOpened: "lc:is_opened",
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

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const { block, player, dimension } = arg;

	if (!player) return;

	const isLowerPart = block.permutation.getState(STATE_NAMES.isLowerPart) === true;

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

	const isOpened = block.permutation.getState(STATE_NAMES.isOpened) === true;

	block.setPermutation(block.permutation.withState(STATE_NAMES.isOpened, !isOpened));

	otherPartBlock.setPermutation(otherPartBlock.permutation.withState(STATE_NAMES.isOpened, !isOpened));

	if (isOpened) {
		const doorSoundInfo = getDoorSoundInfo(block.typeId);

		if (doorSoundInfo) {
			dimension.playSound(doorSoundInfo.closeSound.id, block.location, {
				pitch: doorSoundInfo.closeSound.pitch,
				volume: doorSoundInfo.closeSound.volume,
			});
		}
	} else {
		const doorSoundInfo = getDoorSoundInfo(block.typeId);

		if (doorSoundInfo) {
			dimension.playSound(doorSoundInfo.openSound.id, block.location, {
				pitch: doorSoundInfo.openSound.pitch,
				volume: doorSoundInfo.openSound.volume,
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
	event.blockComponentRegistry.registerCustomComponent("scpdy:standard_door", {
		onPlace,
		onPlayerInteract,
		onPlayerDestroy,
	});
});
