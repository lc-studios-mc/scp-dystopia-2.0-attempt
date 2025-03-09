import * as mc from "@minecraft/server";
import {
	FacilityNetwork,
	FacilityZone,
	getFacilityNetwork,
	MAX_FACILITY_ZONE_COUNT,
} from "@server/facilityNetwork/network";
import { ModalFormData } from "@minecraft/server-ui";
import { isAirOrLiquid } from "@lib/utils/blockUtils";

function getFacilityNetworkOfAlarm(blockTypeId: string): FacilityNetwork {
	const networkIndex = Number(blockTypeId[blockTypeId.length - 1]) - 1;
	return getFacilityNetwork(networkIndex);
}

function getZoneOfAlarm(block: mc.Block): FacilityZone {
	const zoneIndex = block.permutation.getState("lc:facility_zone_index");
	return getFacilityNetworkOfAlarm(block.typeId).getZone(zoneIndex as number);
}

async function showSetZoneForm(
	player: mc.Player,
	originalPermutation: mc.BlockPermutation,
): Promise<mc.BlockPermutation | undefined> {
	const network = getFacilityNetworkOfAlarm(originalPermutation.type.id);
	const zones: FacilityZone[] = Array.from(
		{
			length: MAX_FACILITY_ZONE_COUNT,
		},
		(_, index) => network.getZone(index),
	);

	const response = await new ModalFormData()
		.title({ translate: "scpdy.form.lockdownAlarm.setZone.title" })
		.submitButton({ translate: "scpdy.form.lockdownAlarm.setZone.submitButton" })
		.dropdown(
			{ translate: "scpdy.form.lockdownAlarm.setZone.dropdown.label" },
			zones.map(
				({ name, index }) =>
					name ?? {
						translate: "scpdy.form.lockdownAlarm.setZone.dropdown.option",
						with: [(index + 1).toString()],
					},
			),
			0,
		)
		// @ts-expect-error
		.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const zoneIndexSelection = response.formValues[0];

	if (typeof zoneIndexSelection !== "number") return;

	player!.sendMessage({ translate: "scpdy.msg.lockdownAlarm.setZone.success" });

	const newBlockPerm = originalPermutation.withState("lc:facility_zone_index", zoneIndexSelection);

	return newBlockPerm;
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

function onTick(arg: mc.BlockComponentTickEvent): void {
	const zone = getZoneOfAlarm(arg.block);

	const isActivated = arg.block.permutation.getState("lc:is_activated") === true;

	if (zone.lockdownDelay !== undefined) {
		arg.dimension.playSound("scpdy.misc.alarm", arg.block.center(), { volume: 1.5 });

		arg.block.setPermutation(arg.block.permutation.withState("lc:is_activated", true));
	}

	if (zone.isLockdownActive && !isActivated) {
		const playedSinceLockdown = arg.block.permutation.getState("lc:played_since_lockdown") === true;

		if (!playedSinceLockdown) {
			arg.dimension.playSound("scpdy.misc.alarm", arg.block.center(), { volume: 1.5 });
		}

		arg.block.setPermutation(
			arg.block.permutation
				.withState("lc:is_activated", true)
				.withState("lc:played_since_lockdown", false),
		);
	} else if (!zone.isLockdownActive && zone.lockdownDelay === undefined && isActivated) {
		arg.block.setPermutation(
			arg.block.permutation
				.withState("lc:is_activated", false)
				.withState("lc:played_since_lockdown", false),
		);
	}
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:lockdown_alarm", {
		beforeOnPlayerPlace,
		onTick,
	});
});
