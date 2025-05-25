import { destroyBlock } from "@/utils/block";
import { getEntityClearanceLevel } from "@/utils/clearance_level";
import { flattenCoordinates, unflattenToCoordinates } from "@/utils/math";
import { consumeHandItem, isCreativeOrSpectator } from "@/utils/player";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

interface EasyDoorComponentParams {
	openSound?: {
		id: string;
		volume?: number;
		pitch?: number;
	};
	closeSound?: {
		id: string;
		volume?: number;
		pitch?: number;
	};
}

type ControlMode = "close" | "open" | "switch";
type NextAction = "none" | "open" | "close";

const STATE = {
	isBottomPart: "lc:is_bottom_part",
	clearanceLevel: "lc:clearance_level",
	nextAction: "lc:next_action",
	stepMajor: "lc:step_major",
	stepMinor: "lc:step_minor",
} as const;

const MIN_STEP_INDEX = 0;
const MAX_STEP_INDEX = 15;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:easy_door", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	beforeOnPlayerPlace(arg) {
		arg.cancel = true; // Required for custom asynchronous placement

		mc.system.run(() => {
			if (!arg.player) return;
			if (!arg.player.isValid) return;

			showPlacementForm(arg.player, arg);
		});
	},
	onPlace({ block }) {
		const isBottomPart = Boolean(block.permutation.getState(STATE.isBottomPart));

		if (!isBottomPart) {
			const blockBelow = block.below();

			if (!blockBelow || blockBelow.typeId === block.typeId) return;

			block.setType("minecraft:air");
			return;
		}

		const blockAbove = block.above();

		if (!blockAbove || !(blockAbove.isAir || block.isLiquid)) {
			destroyBlock(block);
			return;
		}

		const upperPartPermutation = block.permutation.withState(STATE.isBottomPart, false);

		blockAbove.setPermutation(upperPartPermutation);
	},
	onPlayerDestroy({ block, destroyedBlockPermutation }) {
		const isBottomPart = Boolean(destroyedBlockPermutation.getState(STATE.isBottomPart));
		const otherPartBlock = isBottomPart ? block.above() : block.below();

		if (!otherPartBlock || otherPartBlock.typeId !== destroyedBlockPermutation.type.id) return;

		destroyBlock(otherPartBlock);
	},
	onTick({ block, dimension }, arg1) {
		const params = arg1.params as EasyDoorComponentParams;

		const isBottomPart = Boolean(block.permutation.getState(STATE.isBottomPart));
		if (!isBottomPart) return; // Only the bottom part should be updated

		const otherPartBlock = isBottomPart ? block.above() : block.below();
		if (!otherPartBlock || otherPartBlock.typeId !== block.typeId) return;

		const nextAction = block.permutation.getState(STATE.nextAction) as NextAction;

		const { major: currentStepMajor, minor: currentStepMinor } = getStep(block.permutation);
		const currentStepIndex = flattenCoordinates(currentStepMajor, currentStepMinor);
		const newStepIndex = getUpdatedStepIndex(currentStepIndex, nextAction, MIN_STEP_INDEX, MAX_STEP_INDEX);

		const newNextAction: NextAction =
			// idk wtf is going on
			mc.system.currentTick % 2 === 0 && (newStepIndex <= MIN_STEP_INDEX || newStepIndex >= MAX_STEP_INDEX)
				? "none"
				: nextAction;

		const newStepUnflat = unflattenToCoordinates(newStepIndex, 4);
		block.setPermutation(
			block.permutation
				.withState(STATE.nextAction, newNextAction)
				.withState(STATE.stepMajor, newStepUnflat.major)
				.withState(STATE.stepMinor, newStepUnflat.minor),
		);
		otherPartBlock.setPermutation(
			otherPartBlock.permutation
				.withState(STATE.stepMajor, newStepUnflat.major)
				.withState(STATE.stepMinor, newStepUnflat.minor),
		);

		// --- Play Sounds ---
		if (mc.system.currentTick % 2 !== 0) return currentStepIndex; // Sounds are also updated only every 2 ticks
		if (params.openSound && nextAction === "open" && newStepIndex === 1) {
			dimension.playSound(params.openSound.id, block.location, {
				volume: params.openSound.volume,
				pitch: params.openSound.pitch,
			});
		}
		if (params.closeSound && nextAction === "close" && newStepIndex === 14) {
			dimension.playSound(params.closeSound.id, block.location, {
				volume: params.closeSound.volume,
				pitch: params.closeSound.pitch,
			});
		}
	},
	onPlayerInteract({ block, dimension, player }) {
		if (!player) return;

		const minClearanceLevel = Number(block.permutation.getState(STATE.clearanceLevel));
		const playerClearanceLevel = getEntityClearanceLevel(player);

		const isAccepted = playerClearanceLevel >= minClearanceLevel;

		if (!isAccepted) {
			dimension.playSound("scpdy.interact.keycard_reader.deny", block.center());
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.misc.text.youDontHaveRequiredClearanceLevel",
				with: [String(minClearanceLevel)],
			});
			return;
		}

		mc.system.run(() => {
			tryControl(block, "switch");
		});

		// dont play sound when the min clearance level is none (-1)
		if (minClearanceLevel !== -1) {
			dimension.playSound("scpdy.interact.keycard_reader.accept", block.center());
		}
	},
};

async function showPlacementForm(player: mc.Player, e: mc.BlockComponentPlayerPlaceBeforeEvent): Promise<void> {
	const formData = new ModalFormData();

	formData.title({ translate: "scpdy.easyDoor" });
	formData.dropdown(
		{ translate: "scpdy.misc.text.clearanceLevel" },
		[
			{ translate: "scpdy.misc.text.none" },
			{ translate: "scpdy.misc.text.clearanceLevel.level_0" },
			{ translate: "scpdy.misc.text.clearanceLevel.level_1" },
			{ translate: "scpdy.misc.text.clearanceLevel.level_2" },
			{ translate: "scpdy.misc.text.clearanceLevel.level_3" },
			{ translate: "scpdy.misc.text.clearanceLevel.level_4" },
			{ translate: "scpdy.misc.text.clearanceLevel.level_5" },
			{ translate: "scpdy.misc.text.clearanceLevel.o5" },
		],
		{
			defaultValueIndex: 0,
			tooltip: { translate: "scpdy.misc.text.clearanceLevel.tooltip" },
		},
	);

	const response = await formData.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;
	if (!player.isValid) return;

	const clearanceLevelRes = Number(response.formValues[0]);
	const clearanceLevel = clearanceLevelRes - 1; // Because 0 is none but clearance level "0" exists

	const newPermutation = e.permutationToPlace.withState(STATE.clearanceLevel, clearanceLevel);

	if (!e.block.isValid) return;
	if (!e.block.isAir && !e.block.isLiquid) return;

	const shouldAbort =
		!isCreativeOrSpectator(player) &&
		consumeHandItem(player, {
			filter: (itemStack) => itemStack.typeId === e.permutationToPlace.getItemStack()?.typeId,
			max: 1,
		}) <= 0;

	if (shouldAbort) return;

	e.block.setPermutation(newPermutation);

	e.dimension.playSound("place.iron", e.block.center(), { pitch: 0.81 });
}

function getUpdatedStepIndex(
	currentStepIndex: number,
	nextAction: NextAction,
	minStepIndex: number,
	maxStepIndex: number,
): number {
	if (mc.system.currentTick % 2 !== 0) return currentStepIndex; // Steps are updated only every 2 ticks
	if (nextAction === "open" && currentStepIndex < maxStepIndex) {
		return currentStepIndex + 1;
	}
	if (nextAction === "close" && currentStepIndex > minStepIndex) {
		return currentStepIndex - 1;
	}
	return currentStepIndex;
}

function getStep(permutation: mc.BlockPermutation): { major: number; minor: number } {
	const major = Number(permutation.getState(STATE.stepMajor));
	const minor = Number(permutation.getState(STATE.stepMinor));
	return { major, minor };
}

function tryControl(easyDoorBlock: mc.Block, mode: ControlMode): void {
	if (!easyDoorBlock.isValid) throw new Error("Block is invalid");

	if (!easyDoorBlock.hasTag("lc:easy_door")) throw new Error("Block is not a Command Door");

	if (easyDoorBlock.hasTag("lc:door_top_part")) {
		return tryControl(easyDoorBlock.below()!, mode); // Only the bottom part should simulate
	}

	const newNextAction = getAppropriateNextActionForControl(easyDoorBlock.permutation, mode);

	easyDoorBlock.setPermutation(easyDoorBlock.permutation.withState(STATE.nextAction, newNextAction));
}

function getAppropriateNextActionForControl(permutation: mc.BlockPermutation, mode: ControlMode): NextAction {
	const { major: currentStepMajor, minor: currentStepMinor } = getStep(permutation);
	const currentStepIndex = flattenCoordinates(currentStepMajor, currentStepMinor);
	const currentNextAction = permutation.getState(STATE.nextAction) as NextAction;

	switch (mode) {
		case "close":
			return currentStepIndex > MIN_STEP_INDEX ? "close" : "none";
		case "open":
			return currentStepIndex < MAX_STEP_INDEX ? "open" : "none";
		case "switch":
			return currentStepIndex < MAX_STEP_INDEX || currentNextAction === "close"
				? "open"
				: currentStepIndex > MIN_STEP_INDEX || currentNextAction === "open"
					? "close"
					: "none";
	}
}
