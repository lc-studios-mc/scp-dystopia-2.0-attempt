import * as mc from "@minecraft/server";
import { isAirOrLiquid } from "@lib/utils/blockUtils";
import { dropDoorItem } from "./shared";
import { getDoorSoundInfo } from "./doorSounds";
import {
	FacilityZone,
	getFacilityNetwork,
	MAX_FACILITY_ZONE_COUNT,
} from "@logic/facilityNetwork/network";
import { ModalFormData } from "@minecraft/server-ui";
import { getClearanceLevel } from "@lib/utils/scpdyUtils";

const STATE_NAMES = {
	isLowerPart: "lc:is_lower_part",
	facilityZoneIndex: "lc:facility_zone_index",
	doorOpenProgress: "lc:door_open_progress",
	o5OpenTime: "lc:o5_open_time",
} as const;

async function showSetZoneForm(
	player: mc.Player,
	blockPermutation: mc.BlockPermutation,
): Promise<mc.BlockPermutation | undefined> {
	if (!blockPermutation.type.id.startsWith("lc:scpdy_lockdown_door")) return;

	const prevZoneIndex = blockPermutation.getState(STATE_NAMES.facilityZoneIndex) as number;

	const networkIndex = Number(blockPermutation.type.id[blockPermutation.type.id.length - 1]) - 1;
	const network = getFacilityNetwork(networkIndex);
	const zones: FacilityZone[] = Array.from(
		{
			length: MAX_FACILITY_ZONE_COUNT,
		},
		(_, index) => network.getZone(index),
	);

	const response = await new ModalFormData()
		.title({ translate: "scpdy.form.lockdownDoor.setZone.title" })
		.submitButton({ translate: "scpdy.form.lockdownDoor.setZone.submitButton" })
		.dropdown(
			{ translate: "scpdy.form.lockdownDoor.setZone.dropdown.label" },
			zones.map(
				({ name, index }) =>
					name ?? {
						translate: "scpdy.form.lockdownDoor.setZone.dropdown.option",
						with: [(index + 1).toString()],
					},
			),
			prevZoneIndex < 0 ? 0 : prevZoneIndex,
		)
		.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const zoneIndexSelection = response.formValues[0];

	if (typeof zoneIndexSelection !== "number") return;

	player.sendMessage({ translate: "scpdy.msg.lockdownDoor.setZone.success" });

	return blockPermutation.withState(STATE_NAMES.facilityZoneIndex, zoneIndexSelection);
}

function beforeOnPlayerPlace(arg: mc.BlockComponentPlayerPlaceBeforeEvent): void {
	arg.cancel = true;

	if (!arg.player) return;

	const isCreative = arg.player.getGameMode() === mc.GameMode.creative;
	const equippable = arg.player.getComponent("equippable")!;
	const mainhandSlot = equippable.getEquipmentSlot(mc.EquipmentSlot.Mainhand);
	const itemStack = mainhandSlot.getItem();

	if (!isCreative) {
		if (mainhandSlot.amount <= 1) {
			mainhandSlot.setItem(undefined);
		} else {
			mainhandSlot.amount -= 1;
		}
	}

	showSetZoneForm(arg.player, arg.permutationToPlace).then((permutation) => {
		if (!arg.player) return;

		if (!permutation || !isAirOrLiquid(arg.block.typeId)) {
			if (!isCreative) {
				itemStack!.amount = 1;
				arg.player.getComponent("inventory")!.container!.addItem(itemStack!);
			}

			return;
		}

		arg.block.setPermutation(permutation);
	});
}

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

	const zoneIndex = block.permutation.getState(STATE_NAMES.facilityZoneIndex) as number;

	if (zoneIndex === -1) return;

	const networkIndex = Number(block.permutation.type.id[block.permutation.type.id.length - 1]) - 1;
	const isLockdownActive = !getFacilityNetwork(networkIndex).getZone(zoneIndex).isLockdownActive;

	const o5OpenTime = block.permutation.getState(STATE_NAMES.o5OpenTime) as number;

	if (o5OpenTime > 0 && mc.system.currentTick % 8 === 0) {
		block.setPermutation(block.permutation.withState(STATE_NAMES.o5OpenTime, o5OpenTime - 1));
	}

	const open = isLockdownActive || o5OpenTime > 0;
	const doorOpenProgress = block.permutation.getState(STATE_NAMES.doorOpenProgress) as number;

	if (open) {
		if (doorOpenProgress < 15) {
			const progressVal = doorOpenProgress + 1;

			block.setPermutation(block.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal));

			otherPartBlock.setPermutation(
				otherPartBlock.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal),
			);

			if (progressVal === 1) {
				const doorSoundInfo = getDoorSoundInfo(block.typeId);

				if (doorSoundInfo) {
					dimension.playSound(doorSoundInfo.openSound.id, block.center(), {
						pitch: doorSoundInfo.openSound.pitch,
						volume: doorSoundInfo.openSound.volume,
					});
				}
			}
		}
	} else {
		if (doorOpenProgress > 0) {
			const progressVal = doorOpenProgress - 1;

			block.setPermutation(block.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal));

			otherPartBlock.setPermutation(
				otherPartBlock.permutation.withState(STATE_NAMES.doorOpenProgress, progressVal),
			);

			if (progressVal === 14) {
				const doorSoundInfo = getDoorSoundInfo(block.typeId);

				if (doorSoundInfo) {
					dimension.playSound(doorSoundInfo.closeSound.id, block.center(), {
						pitch: doorSoundInfo.closeSound.pitch,
						volume: doorSoundInfo.closeSound.volume,
					});
				}
			}
		}
	}
}

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const { dimension, player } = arg;

	const isLowerPart = arg.block.permutation.getState(STATE_NAMES.isLowerPart);
	const block = isLowerPart ? arg.block : arg.block.below()!;

	if (!player) return;

	const zoneIndex = block.permutation.getState(STATE_NAMES.facilityZoneIndex) as number;

	if (zoneIndex === -1) return;

	const networkIndex = Number(block.permutation.type.id[block.permutation.type.id.length - 1]) - 1;
	const isLockdownActive = getFacilityNetwork(networkIndex).getZone(zoneIndex).isLockdownActive;

	if (!isLockdownActive) return;

	const holdingKeycardLevel = getClearanceLevel(player);

	if (holdingKeycardLevel === -1) return;

	if (holdingKeycardLevel >= 6) {
		block.setPermutation(block.permutation.withState(STATE_NAMES.o5OpenTime, 5));

		dimension.playSound("scpdy.interact.keycard_reader.accept", block.center());

		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.misc.accessGranted",
		});
	} else {
		dimension.playSound("scpdy.interact.keycard_reader.deny", block.center());

		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.misc.accessDenied",
		});
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
	event.blockComponentRegistry.registerCustomComponent("scpdy:lockdown_door", {
		beforeOnPlayerPlace,
		onPlace,
		onTick,
		onPlayerInteract,
		onPlayerDestroy,
	});
});
