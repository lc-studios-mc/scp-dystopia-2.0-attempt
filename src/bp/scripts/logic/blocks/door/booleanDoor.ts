import { isAirOrLiquid } from "@lib/utils/blockUtils";
import { isWrench } from "@lib/utils/scpdyUtils";
import { getClearanceLevel } from "@lib/utils/scpdyUtils";
import * as mc from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getDoorSoundInfo } from "./doorSounds";
import { dropDoorItem } from "./shared";

const STATE_NAMES = {
	isLowerPart: "lc:is_lower_part",
	openOnNextMove: "lc:open_on_next_move",
	move: "lc:move",
	doorOpenProgress: "lc:door_open_progress",
	isClearanceSet: "lc:is_clearance_set",
	minimumClearanceLevel: "lc:minimum_clearance_level",
} as const;

function onPlace(arg: mc.BlockComponentOnPlaceEvent): void {
	const { block, dimension } = arg;

	const isLowerPart = block.permutation.getState(STATE_NAMES.isLowerPart,);

	if (!isLowerPart) {
		const blockBelow = block.below();

		if (blockBelow && blockBelow.typeId !== block.typeId) {
			block.setType("minecraft:air",);
		}

		return;
	}

	const blockAbove = block.above();

	if (!blockAbove || !isAirOrLiquid(blockAbove.typeId,)) {
		dropDoorItem(block.typeId, dimension, block.center(),);

		block.setType("minecraft:air",);
		return;
	}

	const upperPartPermutation = block.permutation.withState(STATE_NAMES.isLowerPart, false,);

	blockAbove.setPermutation(upperPartPermutation,);
}

function onTick(arg: mc.BlockComponentTickEvent): void {
	const { block, dimension } = arg;

	const isLowerPart = block.permutation.getState(STATE_NAMES.isLowerPart,);

	let otherPartBlock: mc.Block | undefined;

	if (isLowerPart) {
		otherPartBlock = block.above();
	} else {
		otherPartBlock = block.below();
	}

	if (
		!otherPartBlock ||
		otherPartBlock.typeId !== block.typeId ||
		otherPartBlock.permutation.getState(STATE_NAMES.isLowerPart,) === isLowerPart
	) {
		block.setType("minecraft:air",);
		return;
	}

	// Open / Close

	if (!isLowerPart) return;
	if (mc.system.currentTick % 2 !== 0) return; // Update only once per 2 ticks

	const openOnNextMove = block.permutation.getState(STATE_NAMES.openOnNextMove,) === true;
	const move = block.permutation.getState(STATE_NAMES.move,) === true;
	const doorOpenProgress = block.permutation.getState(STATE_NAMES.doorOpenProgress,) as number;

	if (openOnNextMove) {
		if (doorOpenProgress < 15) {
			const progressVal = doorOpenProgress + 1;

			block.setPermutation(
				block.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal,),
			);

			otherPartBlock.setPermutation(
				otherPartBlock.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal,),
			);

			if (progressVal === 1) {
				const doorSoundInfo = getDoorSoundInfo(block.typeId,);

				if (doorSoundInfo) {
					dimension.playSound(doorSoundInfo.openSound.id, block.location, {
						pitch: doorSoundInfo.openSound.pitch,
						volume: doorSoundInfo.openSound.volume,
					},);
				}
			}
		} else {
			block.setPermutation(block.permutation.withState(STATE_NAMES.move, false,),);
		}
	}

	if (!openOnNextMove) {
		if (doorOpenProgress > 0) {
			const progressVal = doorOpenProgress - 1;

			block.setPermutation(
				block.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal,),
			);

			otherPartBlock.setPermutation(
				otherPartBlock.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal,),
			);

			if (progressVal === 14) {
				const doorSoundInfo = getDoorSoundInfo(block.typeId,);

				if (doorSoundInfo) {
					dimension.playSound(doorSoundInfo.closeSound.id, block.location, {
						pitch: doorSoundInfo.closeSound.pitch,
						volume: doorSoundInfo.closeSound.volume,
					},);
				}
			}
		} else {
			block.setPermutation(block.permutation.withState(STATE_NAMES.move, false,),);
		}
	}
}

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const { block, player, dimension } = arg;

	if (!player) return;

	const isLowerPart = block.permutation.getState(STATE_NAMES.isLowerPart,);

	let otherPartBlock: mc.Block | undefined;

	if (isLowerPart) {
		otherPartBlock = block.above();
	} else {
		otherPartBlock = block.below();
	}

	if (
		!otherPartBlock ||
		otherPartBlock.typeId !== block.typeId ||
		otherPartBlock.permutation.getState(STATE_NAMES.isLowerPart,) === isLowerPart
	) {
		block.setType("minecraft:air",);
		return;
	}

	let lowerPartBlock: mc.Block;
	let upperPartBlock: mc.Block;

	if (isLowerPart) {
		lowerPartBlock = block;
		upperPartBlock = otherPartBlock;
	} else {
		lowerPartBlock = otherPartBlock;
		upperPartBlock = block;
	}

	const lowerPartBlockTypeId = lowerPartBlock.typeId;

	const mainhandItem = player.getComponent("equippable",)?.getEquipment(mc.EquipmentSlot.Mainhand,);

	const isClearanceSet = lowerPartBlock.permutation.getState(STATE_NAMES.isClearanceSet,) === true;

	if (!isWrench(mainhandItem,)) {
		const openOnNextMove =
			lowerPartBlock.permutation.getState(STATE_NAMES.openOnNextMove,) === true;

		if (!isClearanceSet) {
			lowerPartBlock.setPermutation(
				lowerPartBlock.permutation
					.withState(STATE_NAMES.move, true,)
					.withState(STATE_NAMES.openOnNextMove, !openOnNextMove,),
			);

			return;
		}

		const minimumLevel = lowerPartBlock.permutation.getState(
			STATE_NAMES.minimumClearanceLevel,
		) as number;
		const keycardLevel = getClearanceLevel(player,);

		if (keycardLevel < minimumLevel) {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.misc.accessDenied",
			},);

			dimension.playSound("scpdy.interact.keycard_reader.deny", lowerPartBlock.center(),);

			return;
		}

		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.misc.accessGranted",
		},);

		dimension.playSound("scpdy.interact.keycard_reader.accept", lowerPartBlock.center(),);

		lowerPartBlock.setPermutation(
			lowerPartBlock.permutation
				.withState(STATE_NAMES.move, true,)
				.withState(STATE_NAMES.openOnNextMove, !openOnNextMove,),
		);

		return;
	}

	if (isClearanceSet) {
		player.playSound("random.click",);
		player.sendMessage({
			translate: "scpdy.msg.booleanDoor.clearanceAlreadySet",
		},);
		return;
	}

	const formData = new ActionFormData()
		.title({ translate: "scpdy.form.booleanDoor.clearanceOption.title" },)
		.body({ translate: "scpdy.form.booleanDoor.clearanceOption.body" },)
		.button("0",)
		.button("1",)
		.button("2",)
		.button("3",)
		.button("4",)
		.button("5",)
		.button("O5",);

	formData.show(player,).then((response) => {
		try {
			if (response.canceled) return;
			if (response.selection === undefined) return;

			if (!lowerPartBlock.isValid) throw lowerPartBlock;
			if (lowerPartBlock.typeId !== lowerPartBlockTypeId) throw lowerPartBlock;
			if (!upperPartBlock.isValid) throw upperPartBlock;

			const selection = Number(response.selection,);

			if (isNaN(selection,)) throw selection;

			lowerPartBlock.setPermutation(
				lowerPartBlock.permutation
					.withState(STATE_NAMES.isClearanceSet, true,)
					.withState(STATE_NAMES.minimumClearanceLevel, selection,),
			);

			upperPartBlock.setPermutation(
				upperPartBlock.permutation
					.withState(STATE_NAMES.isClearanceSet, true,)
					.withState(STATE_NAMES.minimumClearanceLevel, selection,),
			);
		} catch {
			player.sendMessage({
				translate: "scpdy.msg.misc.unknownError",
			},);
		}
	},);
}

function onPlayerDestroy(arg: mc.BlockComponentPlayerDestroyEvent): void {
	const { block, destroyedBlockPermutation, dimension, player } = arg;

	dropDoorItem(destroyedBlockPermutation.type.id, dimension, block.center(), player,);

	const isLowerPart = destroyedBlockPermutation.getState(STATE_NAMES.isLowerPart,) === true;

	let otherPartBlock: mc.Block | undefined;

	if (isLowerPart) {
		otherPartBlock = block.above();
	} else {
		otherPartBlock = block.below();
	}

	if (!otherPartBlock || otherPartBlock.typeId !== destroyedBlockPermutation.type.id) return;

	otherPartBlock.setType("minecraft:air",);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:boolean_door", {
		onPlace,
		onTick,
		onPlayerInteract,
		onPlayerDestroy,
	},);
},);
