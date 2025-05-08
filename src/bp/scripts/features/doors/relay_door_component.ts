import { destroyBlock } from "@/utils/block";
import { flattenCoordinates, unflattenToCoordinates } from "@/utils/misc";
import * as mc from "@minecraft/server";
import { ActivatorBlockEvents } from "../machinery/activator_block/public";

interface RelayDoorComponentParams {
	minStepIndex?: number;
	maxStepIndex?: number;
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
	powerLevel: "lc:power_level",
	stepMajor: "lc:step_major",
	stepMinor: "lc:step_minor",
} as const;

const DEFAULT_MIN_STEP_INDEX = 0;
const DEFAULT_MAX_STEP_INDEX = 15;

mc.system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("scpdy:relay_door", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	onTick({ block, dimension }, { params: unknownParams }) {
		if (!block.hasTag("lc:relay_door")) return;

		const params = unknownParams as RelayDoorComponentParams;
		const minStepIndex = params.minStepIndex ?? DEFAULT_MIN_STEP_INDEX;
		const maxStepIndex = params.maxStepIndex ?? DEFAULT_MAX_STEP_INDEX;

		const isBottomPart = Boolean(block.permutation.getState(STATE.isBottomPart));
		const otherPartBlock = isBottomPart ? block.above() : block.below();

		if (!otherPartBlock || otherPartBlock.typeId !== block.typeId) return;

		if (mc.system.currentTick % 2 !== 0) return; // Update only once per 2 ticks

		const currentPowerLevel = Number(block.permutation.getState(STATE.powerLevel));
		const nextPowerLevel = currentPowerLevel > 0 ? currentPowerLevel - 1 : 0;
		const isPowered = currentPowerLevel > 0;

		const { major: currentStepMajor, minor: currentStepMinor } = getStep(block.permutation);

		const currentStepIndex = flattenCoordinates(currentStepMajor, currentStepMinor);

		const newStepIndex = (() => {
			if (isPowered && currentStepIndex < maxStepIndex) {
				return currentStepIndex + 1;
			}
			if (!isPowered && currentStepIndex > minStepIndex) {
				return currentStepIndex - 1;
			}
			return currentStepIndex;
		})();

		const newStep = unflattenToCoordinates(newStepIndex);

		block.setPermutation(
			block.permutation
				.withState(STATE.stepMajor, newStep.major)
				.withState(STATE.stepMinor, newStep.minor)
				.withState(STATE.powerLevel, nextPowerLevel),
		);

		otherPartBlock.setPermutation(
			otherPartBlock.permutation
				.withState(STATE.stepMajor, newStep.major)
				.withState(STATE.stepMinor, newStep.minor),
		);

		if (params.openSound && isPowered && newStepIndex === 1) {
			dimension.playSound(params.openSound.id, block.location, {
				volume: params.openSound.volume,
				pitch: params.openSound.pitch,
			});
		}

		if (params.closeSound && !isPowered && newStepIndex === 14) {
			dimension.playSound(params.closeSound.id, block.location, {
				volume: params.closeSound.volume,
				pitch: params.closeSound.pitch,
			});
		}
	},
	onPlace({ block, dimension }) {
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
	onPlayerDestroy({ block, destroyedBlockPermutation, player }) {
		const isBottomPart = Boolean(destroyedBlockPermutation.getState(STATE.isBottomPart));
		const otherPartBlock = isBottomPart ? block.above() : block.below();

		if (!otherPartBlock || otherPartBlock.typeId !== destroyedBlockPermutation.type.id) return;

		destroyBlock(otherPartBlock);
	},
};

function getStep(permutation: mc.BlockPermutation): { major: number; minor: number } {
	const major = Number(permutation.getState(STATE.stepMajor));
	const minor = Number(permutation.getState(STATE.stepMinor));
	return { major, minor };
}

ActivatorBlockEvents.on("onTickPower", ({ block, powered }) => {
	if (!powered) return;

	const above = block.above();
	if (!above || !above.hasTag("lc:relay_door")) return;

	const isBottomPart = Boolean(above.permutation.getState(STATE.isBottomPart));
	if (!isBottomPart) return;

	above.setPermutation(above.permutation.withState(STATE.powerLevel, 2));
});
