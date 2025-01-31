import * as mc from "@minecraft/server";
import {
	FacilityNetwork,
	FacilityZone,
	getFacilityNetwork,
	MAX_FACILITY_ZONE_COUNT,
} from "@server/facilityNetwork/network";
import { ModalFormData } from "@minecraft/server-ui";
import { Player as UiPlayer } from "@minecraft/server-ui/node_modules/@minecraft/server";
import { isAirOrLiquid } from "@lib/utils/blockUtils";

function getFacilityNetworkOfPanel(blockTypeId: string): FacilityNetwork {
	const networkIndex = Number(blockTypeId[blockTypeId.length - 1]) - 1;
	return getFacilityNetwork(networkIndex);
}

function getZoneOfPanel(block: mc.Block): FacilityZone {
	const zoneIndex = block.permutation.getState("lc:facility_zone_index");
	return getFacilityNetworkOfPanel(block.typeId).getZone(zoneIndex as number);
}

interface FlipLeverOptions {
	updateZoneState?: boolean;
	player?: mc.Player;
	sendMessage?: boolean;
	lockdownDelay?: number;
	lockdownDuration?: number;
}

function flipLever(block: mc.Block, options?: FlipLeverOptions): void {
	const { updateZoneState, player, lockdownDelay, lockdownDuration } = options ?? {};

	const wasActivated = block.permutation.getState("lc:is_activated") === true;

	if (lockdownDelay === undefined || lockdownDelay <= 0) {
		block.dimension.playSound("scpdy.interact.lever.flip", block.center(), { volume: 1.1 });

		block.setPermutation(block.permutation.withState("lc:is_activated", !wasActivated));
	}

	if (!updateZoneState) return;

	const zone = getZoneOfPanel(block);

	if (wasActivated && zone.isLockdownActive) {
		zone.stopLockdown();

		if (options?.sendMessage === true) {
			if (zone.name === undefined) {
				player?.sendMessage({
					translate: "scpdy.msg.lockdownPanel.activate.deactivatedLockdown.noZoneName",
					with: [(zone.index + 1).toString()],
				});
			} else {
				player?.sendMessage({
					translate: "scpdy.msg.lockdownPanel.activate.deactivatedLockdown",
					with: [zone.name],
				});
			}
		}
	} else if (!wasActivated && !zone.isLockdownActive) {
		zone.startLockdown(lockdownDelay, lockdownDuration);

		if (options?.sendMessage === true) {
			if (zone.name === undefined) {
				player?.sendMessage({
					translate: "scpdy.msg.lockdownPanel.activate.activatedLockdown.noZoneName",
					with: [(zone.index + 1).toString()],
				});
			} else {
				player?.sendMessage({
					translate: "scpdy.msg.lockdownPanel.activate.activatedLockdown",
					with: [zone.name],
				});
			}
		}
	}
}

async function showSetZoneForm(
	player: mc.Player,
	originalPermutation: mc.BlockPermutation,
): Promise<mc.BlockPermutation | undefined> {
	const network = getFacilityNetworkOfPanel(originalPermutation.type.id);
	const zones: FacilityZone[] = Array.from(
		{
			length: MAX_FACILITY_ZONE_COUNT,
		},
		(_, index) => network.getZone(index),
	);

	const response = await new ModalFormData()
		.title({ translate: "scpdy.form.lockdownPanel.setZone.title" })
		.submitButton({ translate: "scpdy.form.lockdownPanel.setZone.submitButton" })

		.dropdown(
			{ translate: "scpdy.form.lockdownPanel.setZone.dropdown.label" },
			zones.map(
				({ name, index }) =>
					name ?? {
						translate: "scpdy.form.lockdownPanel.setZone.dropdown.option",
						with: [(index + 1).toString()],
					},
			),
			0,
		)
		.show(<UiPlayer>player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const zoneIndexSelection = response.formValues[0];

	if (typeof zoneIndexSelection !== "number") return;

	const zone = network.getZone(zoneIndexSelection);

	player!.sendMessage({ translate: "scpdy.msg.lockdownPanel.setZone.success" });

	const newBlockPerm = originalPermutation
		.withState("lc:facility_zone_index", zoneIndexSelection)
		.withState("lc:is_zone_name_set", zone.name !== undefined);

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

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent) {
	const correctPerm = arg.block.permutation;

	const isActivated = correctPerm.getState("lc:is_activated") === true;

	if (isActivated) {
		flipLever(arg.block, {
			updateZoneState: true,
			player: arg.player,
			sendMessage: true,
		});
		return;
	}

	const zone = getZoneOfPanel(arg.block);

	if (zone.lockdownDelay !== undefined && zone.lockdownDelay > 0) {
		zone.stopLockdown();

		if (zone.name === undefined) {
			arg.player?.sendMessage({
				translate: "scpdy.msg.lockdownPanel.activate.deactivatedLockdown.noZoneName",
				with: [(zone.index + 1).toString()],
			});
		} else {
			arg.player?.sendMessage({
				translate: "scpdy.msg.lockdownPanel.activate.deactivatedLockdown",
				with: [zone.name],
			});
		}

		return;
	}

	const formData = new ModalFormData()
		.title({ translate: "scpdy.form.lockdownPanel.activate.title" })
		.textField(
			{
				translate: "scpdy.form.lockdownPanel.activate.delayField.label",
			},
			{
				translate: "scpdy.form.lockdownPanel.activate.delayField.placeholder",
			},
		)
		.textField(
			{
				translate: "scpdy.form.lockdownPanel.activate.durationField.label",
			},
			{
				translate: "scpdy.form.lockdownPanel.activate.durationField.placeholder",
			},
		);

	formData.show(<UiPlayer>arg.player).then((response) => {
		if (response.canceled) return;
		if (!response.formValues) return;

		if (!arg.block.matches(correctPerm.type.id, correctPerm.getAllStates())) {
			arg.player?.sendMessage({
				translate: "scpdy.msg.misc.somethingWentWrong",
			});
			return;
		}

		const delayText = (response.formValues[0] as string) ?? "";
		const durationText = (response.formValues[1] as string) ?? "";

		const delay = delayText.trim() === "" ? undefined : parseInt(delayText);
		const duration = durationText.trim() === "" ? undefined : parseInt(durationText);

		if ((delay !== undefined && isNaN(delay)) || (duration !== undefined && isNaN(duration))) {
			arg.player?.sendMessage({
				translate: "scpdy.msg.misc.somethingWentWrong",
			});
			return;
		}

		flipLever(arg.block, {
			updateZoneState: true,
			player: arg.player,
			lockdownDelay: delay,
			lockdownDuration: duration,
			sendMessage: delay === undefined,
		});

		if (delay === undefined) return;

		if (zone.name === undefined) {
			arg.player?.sendMessage({
				translate: "scpdy.msg.lockdownPanel.activate.startedDelayedLockdown.noZoneName",
				with: [(zone.index + 1).toString(), delay.toString()],
			});
		} else {
			arg.player?.sendMessage({
				translate: "scpdy.msg.lockdownPanel.activate.startedDelayedLockdown",
				with: [zone.name, delay.toString()],
			});
		}
	});
}

function onTick(arg: mc.BlockComponentTickEvent) {
	const zone = getZoneOfPanel(arg.block);

	const isZoneNameSet = arg.block.permutation.getState("lc:is_zone_name_set") === true;

	if (zone.name !== undefined && !isZoneNameSet) {
		arg.block.setPermutation(arg.block.permutation.withState("lc:is_zone_name_set", true));
	} else if (zone.name === undefined && isZoneNameSet) {
		arg.block.setPermutation(arg.block.permutation.withState("lc:is_zone_name_set", false));
	}

	const isActivated = arg.block.permutation.getState("lc:is_activated") === true;

	if (zone.isLockdownActive !== isActivated) {
		flipLever(arg.block);
	}
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:lockdown_panel", {
		beforeOnPlayerPlace,
		onPlayerInteract,
		onTick,
	});
});
