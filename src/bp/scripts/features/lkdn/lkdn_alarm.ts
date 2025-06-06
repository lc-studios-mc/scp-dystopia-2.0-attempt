import * as mc from "@minecraft/server";
import { getAllFnets, getFnet, type Fzone } from "@/features/fnet/fnet";
import { ActionFormData } from "@minecraft/server-ui";
import { consumeHandItem, isCreativeOrSpectator } from "@/utils/player";
import { isHoldingWrench } from "@/utils/wrench";

const STATE = {
	fnetIndex: "lc:fnet_index",
	fzoneIndex: "lc:fzone_index",
	isActive: "lc:is_active",
	soundLoop: "lc:sound_loop",
} as const;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:lkdn_alarm", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	beforeOnPlayerPlace(e) {
		e.cancel = true;

		mc.system.run(() => {
			beforeOnPlayerPlaceAsync(e);
		});
	},
	onPlayerInteract(e) {
		if (!e.player) return;
		if (!isHoldingWrench(e.player)) return;

		const soundLoop = Boolean(e.block.permutation.getState(STATE.soundLoop));
		if (soundLoop) {
			e.player.onScreenDisplay.setActionBar({ translate: "scpdy.machinery.alarm.soundLoop.off" });
		} else {
			e.player.onScreenDisplay.setActionBar({ translate: "scpdy.machinery.alarm.soundLoop.on" });
		}

		e.block.setPermutation(e.block.permutation.withState(STATE.soundLoop, !soundLoop));
		e.player.playSound("random.click");
	},
	onTick({ block, dimension }) {
		const soundLoop = Boolean(block.permutation.getState(STATE.soundLoop));
		const fzone = getFzone(block.permutation);
		const shouldBeActive = fzone.isLkdnActive || fzone.isLkdnScheduled;
		const isCurrentlyActive = Boolean(block.permutation.getState(STATE.isActive));

		if (shouldBeActive && !isCurrentlyActive) {
			block.setPermutation(block.permutation.withState(STATE.isActive, true));
		} else if (!shouldBeActive && isCurrentlyActive) {
			block.setPermutation(block.permutation.withState(STATE.isActive, false));
		}

		const shouldPlaySound = (shouldBeActive && soundLoop) || (shouldBeActive && !isCurrentlyActive);

		if (shouldPlaySound) {
			dimension.playSound("scpdy.misc.alarm", block.center(), {
				volume: 1.1,
			});
		}
	},
};

function getFzone(permutation: mc.BlockPermutation): Fzone {
	const fnetIndex = Number(permutation.getState(STATE.fnetIndex));
	const fzoneIndex = Number(permutation.getState(STATE.fzoneIndex));
	const fnet = getFnet(fnetIndex);
	const fzone = fnet.getZone(fzoneIndex);
	return fzone;
}

async function beforeOnPlayerPlaceAsync(e: mc.BlockComponentPlayerPlaceBeforeEvent): Promise<void> {
	if (!e.player) return;

	const fnets = getAllFnets();

	const formData1 = new ActionFormData();

	formData1.title({ translate: "scpdy.lkdnAlarm" });
	formData1.body({ translate: "scpdy.fnetManager.selectFnet" });
	fnets.forEach((fnet) => formData1.button(fnet.name));

	const response1 = await formData1.show(e.player);

	if (!e.player.isValid) return;
	if (response1.canceled) return;
	if (response1.selection == undefined) return;

	const fnet = getFnet(response1.selection);
	const zones = fnet.getAllZones();

	const formData2 = new ActionFormData();

	formData2.title({ translate: "scpdy.lkdnAlarm" });
	formData2.body({ translate: "scpdy.fnetManager.selectFzone" });
	zones.forEach((zone) => formData2.button(zone.name));

	const response2 = await formData2.show(e.player);

	if (!e.player.isValid) return;
	if (response2.canceled) return;
	if (response2.selection == undefined) return;

	const zone = zones[response2.selection]!;

	if (!e.block.isValid) return;
	if (!e.block.isAir && !e.block.isLiquid) return;

	const shouldAbort =
		!isCreativeOrSpectator(e.player) &&
		consumeHandItem(e.player, {
			filter: (itemStack) => itemStack.typeId === e.permutationToPlace.getItemStack()?.typeId,
			max: 1,
		}) <= 0;

	if (shouldAbort) return;

	const newPermutation = e.permutationToPlace
		.withState(STATE.fnetIndex, fnet.index)
		.withState(STATE.fzoneIndex, zone.index);

	e.block.setPermutation(newPermutation);
	e.dimension.playSound("place.iron", e.block.center(), { pitch: 0.81 });
}
