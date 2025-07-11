import * as mc from "@minecraft/server";
import { Fzone, getAllFnets, getFnet } from "../fnet/fnet";
import { ActionFormData } from "@minecraft/server-ui";
import { consumeHandItem, isCreativeOrSpectator } from "@/utils/player";
import { flattenCoordinates, unflattenToCoordinates } from "@/utils/math";
import { destroyBlock } from "@/utils/block";

interface LkdnDoorComponentParams {
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

type NextAction = "none" | "open" | "close";

const STATE = {
	isBottomPart: "lc:is_bottom_part",
	nextAction: "lc:next_action",
	fnetIndex: "lc:fnet_index",
	fzoneIndexMinor: "lc:fzone_index_minor",
	fzoneIndexMajor: "lc:fzone_index_major",
	stepMajor: "lc:step_major",
	stepMinor: "lc:step_minor",
} as const;

const MIN_STEP_INDEX = 0;
const MAX_STEP_INDEX = 15;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:lkdn_door", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
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
	beforeOnPlayerPlace(e) {
		e.cancel = true;

		mc.system.run(() => {
			if (!e.player) return;
			showPlacementForm(e.player, e);
		});
	},
	onTick(arg0, arg1) {
		onTick(arg0, arg1.params as LkdnDoorComponentParams);
	},
};

function getZone(block: mc.Block): Fzone {
	const fnet = getFnet(Number(block.permutation.getState(STATE.fnetIndex)));
	const zoneIndexUnflat = getZoneIndexUnflat(block.permutation);
	const zoneIndex = flattenCoordinates(zoneIndexUnflat.major, zoneIndexUnflat.minor, 3);
	const zone = fnet.getZone(zoneIndex);
	return zone;
}

function getZoneIndexUnflat(permutation: mc.BlockPermutation): { major: number; minor: number } {
	const major = Number(permutation.getState(STATE.fzoneIndexMajor));
	const minor = Number(permutation.getState(STATE.fzoneIndexMinor));
	return { major, minor };
}

function getStep(permutation: mc.BlockPermutation): { major: number; minor: number } {
	const major = Number(permutation.getState(STATE.stepMajor));
	const minor = Number(permutation.getState(STATE.stepMinor));
	return { major, minor };
}

async function showPlacementForm(player: mc.Player, e: mc.BlockComponentPlayerPlaceBeforeEvent): Promise<void> {
	const fnets = getAllFnets();

	const formData1 = new ActionFormData();

	formData1.title({ translate: "scpdy.lkdnDoor" });
	formData1.body({ translate: "scpdy.fnetManager.selectFnet" });
	fnets.forEach((fnet) => formData1.button(fnet.name));

	// @ts-expect-error
	const response1 = await formData1.show(player);

	if (!player.isValid) return;
	if (response1.canceled) return;
	if (response1.selection == undefined) return;

	const fnet = getFnet(response1.selection);
	const zones = fnet.getAllZones();

	const formData2 = new ActionFormData();

	formData2.title({ translate: "scpdy.lkdnDoor" });
	formData2.body({ translate: "scpdy.fnetManager.selectFzone" });
	zones.forEach((zone) => formData2.button(zone.name));

	// @ts-expect-error
	const response2 = await formData2.show(player);

	if (!player.isValid) return;
	if (response2.canceled) return;
	if (response2.selection == undefined) return;

	const zone = zones[response2.selection]!;

	if (!e.block.isValid) return;
	if (!e.block.isAir && !e.block.isLiquid) return;

	const shouldAbort =
		!isCreativeOrSpectator(player) &&
		consumeHandItem(player, {
			filter: (itemStack) => itemStack.typeId === e.permutationToPlace.getItemStack()?.typeId,
			max: 1,
		}) <= 0;

	if (shouldAbort) return;

	const zoneIndexUnflat = unflattenToCoordinates(zone.index, 3);

	const newPermutation = e.permutationToPlace
		.withState(STATE.fnetIndex, fnet.index)
		.withState(STATE.fzoneIndexMajor, zoneIndexUnflat.major)
		.withState(STATE.fzoneIndexMinor, zoneIndexUnflat.minor);

	e.block.setPermutation(newPermutation);
	e.dimension.playSound("place.iron", e.block.center(), { pitch: 0.81 });
}

function onTick({ block, dimension }: mc.BlockComponentTickEvent, params: LkdnDoorComponentParams): void {
	const isBottomPart = Boolean(block.permutation.getState(STATE.isBottomPart));
	if (!isBottomPart) return; // Only the bottom part should be updated

	const otherPartBlock = isBottomPart ? block.above() : block.below();
	if (!otherPartBlock || otherPartBlock.typeId !== block.typeId) return;

	const { major: currentStepMajor, minor: currentStepMinor } = getStep(block.permutation);
	const currentStepIndex = flattenCoordinates(currentStepMajor, currentStepMinor);

	const currentNextAction = block.permutation.getState(STATE.nextAction) as NextAction;
	const newNextAction = updateNextActionBasedOnZoneState(block, currentStepIndex, currentNextAction);

	const newStepIndex = getUpdatedStepIndex(currentStepIndex, newNextAction);

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
	if (mc.system.currentTick % 2 !== 0) return; // Sounds are also updated only every 2 ticks
	if (params.openSound && newNextAction === "open" && newStepIndex === 1) {
		dimension.playSound(params.openSound.id, block.location, {
			volume: params.openSound.volume,
			pitch: params.openSound.pitch,
		});
	}
	if (params.closeSound && newNextAction === "close" && newStepIndex === 14) {
		dimension.playSound(params.closeSound.id, block.location, {
			volume: params.closeSound.volume,
			pitch: params.closeSound.pitch,
		});
	}
}

function getUpdatedStepIndex(currentStepIndex: number, nextAction: NextAction): number {
	if (mc.system.currentTick % 2 !== 0) return currentStepIndex; // Steps are updated only every 2 ticks
	if (nextAction === "open" && currentStepIndex < MAX_STEP_INDEX) {
		return currentStepIndex + 1;
	}
	if (nextAction === "close" && currentStepIndex > MIN_STEP_INDEX) {
		return currentStepIndex - 1;
	}
	return currentStepIndex;
}

function updateNextActionBasedOnZoneState(
	block: mc.Block,
	currentStepIndex: number,
	currentNextAction: NextAction,
): NextAction {
	const zone = getZone(block);

	let newNextAction: NextAction;
	if (zone.isLkdnActive && currentStepIndex > MIN_STEP_INDEX) {
		newNextAction = "close";
	} else if (!zone.isLkdnActive && currentStepIndex < MAX_STEP_INDEX) {
		newNextAction = "open";
	} else {
		newNextAction = "none";
	}

	if (currentNextAction !== newNextAction) {
		block.setPermutation(block.permutation.withState(STATE.nextAction, newNextAction));
	}

	return newNextAction;
}
