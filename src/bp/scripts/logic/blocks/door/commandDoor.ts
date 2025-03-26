import * as mc from "@minecraft/server";
import { isAirOrLiquid } from "@lib/utils/blockUtils";
import { dropDoorItem } from "./shared";
import { getDoorSoundInfo } from "./doorSounds";
import * as vec3 from "@lib/utils/vec3";

const STATE_NAMES = {
	isLowerPart: "lc:is_lower_part",
	openOnNextMove: "lc:open_on_next_move",
	move: "lc:move",
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

	if (!isLowerPart) return;
	if (mc.system.currentTick % 2 !== 0) return; // Update only once per 2 ticks

	const openOnNextMove = block.permutation.getState(STATE_NAMES.openOnNextMove) === true;
	const move = block.permutation.getState(STATE_NAMES.move) === true;
	const doorOpenProgress = block.permutation.getState(STATE_NAMES.doorOpenProgress) as number;

	if (openOnNextMove) {
		if (doorOpenProgress < 15) {
			const progressVal = doorOpenProgress + 1;

			block.setPermutation(block.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal));

			otherPartBlock.setPermutation(
				otherPartBlock.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal),
			);

			if (progressVal === 1) {
				const doorSoundInfo = getDoorSoundInfo(block.typeId);

				if (doorSoundInfo) {
					dimension.playSound(doorSoundInfo.openSound.id, block.location, {
						pitch: doorSoundInfo.openSound.pitch,
						volume: doorSoundInfo.openSound.volume,
					});
				}
			}
		} else {
			block.setPermutation(block.permutation.withState(STATE_NAMES.move, false));
		}
	}

	if (!openOnNextMove) {
		if (doorOpenProgress > 0) {
			const progressVal = doorOpenProgress - 1;

			block.setPermutation(block.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal));

			otherPartBlock.setPermutation(
				otherPartBlock.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal),
			);

			if (progressVal === 14) {
				const doorSoundInfo = getDoorSoundInfo(block.typeId);

				if (doorSoundInfo) {
					dimension.playSound(doorSoundInfo.closeSound.id, block.location, {
						pitch: doorSoundInfo.closeSound.pitch,
						volume: doorSoundInfo.closeSound.volume,
					});
				}
			}
		} else {
			block.setPermutation(block.permutation.withState(STATE_NAMES.move, false));
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
	event.blockComponentRegistry.registerCustomComponent("scpdy:command_door", {
		onPlace,
		onTick,
		onPlayerDestroy,
	});
});

const SE_ID_CMD_DOOR_CLOSE = "scpdy:cmd_door_close";
const SE_ID_CMD_DOOR_OPEN = "scpdy:cmd_door_open";
const SE_ID_CMD_DOOR_SWITCH = "scpdy:cmd_door_switch";

mc.system.afterEvents.scriptEventReceive.subscribe(
	(event) => {
		if (![SE_ID_CMD_DOOR_CLOSE, SE_ID_CMD_DOOR_OPEN, SE_ID_CMD_DOOR_SWITCH].includes(event.id))
			return;

		const sourceLoc = event.sourceBlock?.center() ?? event.sourceEntity?.location ?? vec3.ZERO;

		const sourceDim =
			event.sourceEntity?.dimension ??
			event.sourceBlock?.dimension ??
			mc.world.getDimension("overworld");

		const location = vec3.fromString(event.message, sourceLoc);

		const block = sourceDim.getBlock(location);

		if (!block) return;
		if (!block.hasTag("command_door")) return;

		const isLowerPart = block?.permutation.getState(STATE_NAMES.isLowerPart) === true;

		let doorBlock: mc.Block | undefined;

		if (isLowerPart) {
			doorBlock = block;
		} else {
			doorBlock = block.below();
		}

		if (!doorBlock) return;
		if (!doorBlock.hasTag("command_door")) return;

		switch (event.id) {
			case SE_ID_CMD_DOOR_OPEN:
				doorBlock.setPermutation(
					doorBlock.permutation
						.withState(STATE_NAMES.move, true)
						.withState(STATE_NAMES.openOnNextMove, true),
				);
				break;
			case SE_ID_CMD_DOOR_CLOSE:
				doorBlock.setPermutation(
					doorBlock.permutation
						.withState(STATE_NAMES.move, true)
						.withState(STATE_NAMES.openOnNextMove, false),
				);
				break;
			case SE_ID_CMD_DOOR_SWITCH:
				const openOnNextMove = doorBlock.permutation.getState(STATE_NAMES.openOnNextMove) === true;

				doorBlock.setPermutation(
					doorBlock.permutation
						.withState(STATE_NAMES.move, true)
						.withState(STATE_NAMES.openOnNextMove, !openOnNextMove),
				);
				break;
		}
	},
	{
		namespaces: ["scpdy"],
	},
);
