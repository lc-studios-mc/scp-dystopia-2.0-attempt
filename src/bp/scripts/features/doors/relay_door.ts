import { destroyBlock } from "@/utils/block";
import { flattenCoordinates, unflattenToCoordinates } from "@/utils/math";
import * as mc from "@minecraft/server";
import { MachineryInputEvents } from "../machinery/input/events";
import { getRelativeBlockAtDirection } from "@/utils/direction";
import { isHoldingWrench } from "@/utils/wrench";

interface RelayDoorComponentParams {
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

const STATE = {
	isBottomPart: "lc:is_bottom_part",
	detectRedstone: "lc:detect_redstone",
	powerLevelMajor: "lc:power_level_major",
	powerLevelMinor: "lc:power_level_minor",
	stepMajor: "lc:step_major",
	stepMinor: "lc:step_minor",
} as const;

const DEFAULT_MIN_STEP_INDEX = 0;
const DEFAULT_MAX_STEP_INDEX = 15;
const POWER_LEVEL_DECREASE_INTERVAL = 12;

mc.system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("scpdy:relay_door", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	onTick({ block, dimension }, { params: unknownParams }) {
		if (!block.hasTag("lc:relay_door")) return;

		const params = unknownParams as RelayDoorComponentParams;
		const minStepIndex = DEFAULT_MIN_STEP_INDEX;
		const maxStepIndex = DEFAULT_MAX_STEP_INDEX;

		const isBottomPart = Boolean(block.permutation.getState(STATE.isBottomPart));
		if (!isBottomPart) return; // Only the bottom part should simulate

		const otherPartBlock = isBottomPart ? block.above() : block.below();
		if (!otherPartBlock || otherPartBlock.typeId !== block.typeId) return;

		// --- Power Level Logic ---
		const { major: currentPowerLevelMajor, minor: currentPowerLevelMinor } = getPowerLevel(block.permutation);
		const currentPowerLevel = flattenCoordinates(currentPowerLevelMajor, currentPowerLevelMinor, 3);
		const detectRedstone = Boolean(block.permutation.getState(STATE.detectRedstone));
		const isRedstoneDetected = detectRedstone && checkRedstonePower(block);
		let newPowerLevel = getUpdatedPowerLevel(currentPowerLevel, detectRedstone, block, isRedstoneDetected);

		// --- Step Logic ---
		const { major: currentStepMajor, minor: currentStepMinor } = getStep(block.permutation);
		const currentStepIndex = flattenCoordinates(currentStepMajor, currentStepMinor);
		const newStepIndex = getUpdatedStepIndex(currentStepIndex, currentPowerLevel, minStepIndex, maxStepIndex);

		// --- Apply State Changes ---
		const newPowerLevelUnflat = unflattenToCoordinates(newPowerLevel, 3);
		const newStepUnflat = unflattenToCoordinates(newStepIndex, 4);
		block.setPermutation(
			block.permutation
				.withState(STATE.powerLevelMajor, newPowerLevelUnflat.major)
				.withState(STATE.powerLevelMinor, newPowerLevelUnflat.minor)
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
		if (params.openSound && currentPowerLevel > 0 && newStepIndex === 1) {
			dimension.playSound(params.openSound.id, block.location, {
				volume: params.openSound.volume,
				pitch: params.openSound.pitch,
			});
		}
		if (params.closeSound && !isRedstoneDetected && currentPowerLevel <= 0 && newStepIndex === 14) {
			dimension.playSound(params.closeSound.id, block.location, {
				volume: params.closeSound.volume,
				pitch: params.closeSound.pitch,
			});
		}
	},
	beforeOnPlayerPlace({ player }) {
		if (!player) return;

		// Show tip for beginners. In-game tips are very important!
		mc.system.run(() => {
			if (!player.addTag("scpdy_sent_relay_door_tip")) return;

			mc.system.runTimeout(() => {
				if (!player || !player.isValid) return;

				player.sendMessage({ translate: "scpdy.relayDoor.tip" });
				player.playSound("random.orb");
			}, 8);
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
	onPlayerBreak({ block, brokenBlockPermutation }) {
		const isBottomPart = Boolean(brokenBlockPermutation.getState(STATE.isBottomPart));
		const otherPartBlock = isBottomPart ? block.above() : block.below();

		if (!otherPartBlock || otherPartBlock.typeId !== brokenBlockPermutation.type.id) return;

		destroyBlock(otherPartBlock);
	},
	onPlayerInteract({ player, block: blockUnchecked }) {
		if (!player) return;

		if (!isHoldingWrench(player)) return;

		const block = blockUnchecked.hasTag("lc:door_top_part") ? blockUnchecked.below()! : blockUnchecked;

		const detectRedstone = Boolean(block.permutation.getState(STATE.detectRedstone));

		block.setPermutation(block.permutation.withState(STATE.detectRedstone, !detectRedstone));

		player.playSound("random.click");

		if (detectRedstone) {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.relayDoor.text.redstoneDetection.off",
			});
		} else {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.relayDoor.text.redstoneDetection.on",
			});

			if (player.addTag("scpdy_warned_relay_door_redstone_detection_lag")) {
				mc.system.runTimeout(() => {
					if (!player.isValid) return;

					player.sendMessage({
						translate: "scpdy.relayDoor.text.redstoneDetection.warn",
					});

					player.playSound("note.bass");
				}, 15);
			}
		}
	},
};

// --- Helper Functions for onTick ---
function getUpdatedPowerLevel(
	currentPowerLevel: number,
	detectRedstone: boolean,
	block: mc.Block,
	isRedstoneDetected: boolean,
): number {
	let newPowerLevel = currentPowerLevel;
	if (currentPowerLevel > 0 && mc.system.currentTick % POWER_LEVEL_DECREASE_INTERVAL === 0) {
		newPowerLevel--;
	}
	if (isRedstoneDetected && newPowerLevel === 0) {
		newPowerLevel = 1;
	}
	return newPowerLevel;
}

function getUpdatedStepIndex(
	currentStepIndex: number,
	currentPowerLevel: number,
	minStepIndex: number,
	maxStepIndex: number,
): number {
	if (mc.system.currentTick % 2 !== 0) return currentStepIndex; // Steps are updated only every 2 ticks
	if (currentPowerLevel > 0 && currentStepIndex < maxStepIndex) {
		return currentStepIndex + 1;
	}
	if (currentPowerLevel <= 0 && currentStepIndex > minStepIndex) {
		return currentStepIndex - 1;
	}
	return currentStepIndex;
}

function getPowerLevel(permutation: mc.BlockPermutation): { major: number; minor: number } {
	const major = Number(permutation.getState(STATE.powerLevelMajor));
	const minor = Number(permutation.getState(STATE.powerLevelMinor));
	return { major, minor };
}

function getStep(permutation: mc.BlockPermutation): { major: number; minor: number } {
	const major = Number(permutation.getState(STATE.stepMajor));
	const minor = Number(permutation.getState(STATE.stepMinor));
	return { major, minor };
}

function checkRedstonePower(block: mc.Block): boolean {
	if (Number(block.getRedstonePower()) > 0) return true;
	if (Number(block.below(1)?.getRedstonePower()) > 0) return true;
	if (Number(block.below(2)?.getRedstonePower()) > 0) return true;
	return false;
}

MachineryInputEvents.on("onActivate", (data) => {
	if (data.mode !== "powerRelayDoors") return;

	const block = data.block ?? data.dimension.getBlock(data.location);
	if (!block) return;

	const blockBehind = getRelativeBlockAtDirection(block, data.pulseDirection ?? mc.Direction.North);
	if (!blockBehind) return;

	tryPowerRelayDoorsFrom(blockBehind);
});

function tryPowerRelayDoorsFrom(block: mc.Block): void {
	setPowerLevel(block);

	const north = block.north();
	if (north && setPowerLevel(north)) {
		const north2 = north.north();
		if (north2) setPowerLevel(north2);
	}

	const south = block.south();
	if (south && setPowerLevel(south)) {
		const south2 = south.south();
		if (south2) setPowerLevel(south2);
	}

	const west = block.west();
	if (west && setPowerLevel(west)) {
		const west2 = west.west();
		if (west2) setPowerLevel(west2);
	}

	const east = block.east();
	if (east && setPowerLevel(east)) {
		const east2 = east.east();
		if (east2) setPowerLevel(east2);
	}

	const below2 = block.below(2);
	below2 && setPowerLevel(below2);
}

function setPowerLevel(relayDoorBlock: mc.Block, powerLevel = 6): boolean {
	if (!relayDoorBlock.isValid) return false;

	if (!relayDoorBlock.hasTag("lc:relay_door")) return false;

	if (relayDoorBlock.hasTag("lc:door_top_part")) {
		return setPowerLevel(relayDoorBlock.below()!); // Top part does not simulate power levels
	}

	const powerLevelUnflat = unflattenToCoordinates(powerLevel, 3);

	relayDoorBlock.setPermutation(
		relayDoorBlock.permutation
			.withState(STATE.powerLevelMajor, powerLevelUnflat.major)
			.withState(STATE.powerLevelMinor, powerLevelUnflat.minor),
	);

	return true;
}
