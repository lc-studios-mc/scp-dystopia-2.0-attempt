import * as mc from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Fzone, getAllFnets, getFnet } from "@/features/fnet/fnet";
import { consumeHandItem, isCreativeOrSpectator } from "@/utils/player";
import { getBlockCardinalDirection, getRelativeBlockAtDirection, reverseDirection } from "@/utils/direction";

const STATE = {
	isLkdnActive: "lc:is_lkdn_active",
	detectedRedstone: "lc:detected_redstone",
	fnetIndex: "lc:fnet_index",
	fzoneIndex: "lc:fzone_index",
} as const;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:lkdn_panel", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	beforeOnPlayerPlace(e) {
		e.cancel = true;

		mc.system.run(() => {
			if (!e.player) return;
			showPlacementForm(e.player, e);
		});
	},
	onPlayerInteract(e) {
		mc.system.run(() => {
			onInteract(e);
		});
	},
	onTick({ block }) {
		mc.system.run(() => {
			if (!block.isValid) return;
			updateRedstonePowering(block);
			updateVisual(block);
		});
	},
};

function getZone(panelBlock: mc.Block): Fzone {
	const fnet = getFnet(Number(panelBlock.permutation.getState(STATE.fnetIndex)));
	const zone = fnet.getZone(Number(panelBlock.permutation.getState(STATE.fzoneIndex)));
	return zone;
}

function updateVisual(panelBlock: mc.Block): void {
	const zone = getZone(panelBlock);

	const isPanelActive = Boolean(panelBlock.permutation.getState(STATE.isLkdnActive));

	if (isPanelActive == zone.isLkdnActive) return;

	panelBlock.setPermutation(panelBlock.permutation.withState(STATE.isLkdnActive, zone.isLkdnActive));

	panelBlock.dimension.playSound("scpdy.interact.lever.flip", panelBlock.center(), { volume: 1.1 });
}

function updateRedstonePowering(panelBlock: mc.Block): void {
	const zone = getZone(panelBlock);

	const previouslyDetectedRedstone = Boolean(panelBlock.permutation.getState(STATE.detectedRedstone));
	const currentlyDetectedRedstone = checkRedstonePower(panelBlock);

	if (previouslyDetectedRedstone && !currentlyDetectedRedstone) {
		zone.stopLkdn();
		updateVisual(panelBlock);
	}

	if (currentlyDetectedRedstone) {
		zone.startLkdn(Infinity);
		updateVisual(panelBlock);
	}

	panelBlock.setPermutation(panelBlock.permutation.withState(STATE.detectedRedstone, currentlyDetectedRedstone));
}

function checkRedstonePower(panelBlock: mc.Block): boolean {
	const cardinalDir = getBlockCardinalDirection(panelBlock.permutation);
	if (!cardinalDir) throw new Error("Failed to get block direction");

	const cardinalDirReversed = reverseDirection(cardinalDir);

	const backBlock = getRelativeBlockAtDirection(panelBlock, cardinalDirReversed, 1);
	const redstonePower = backBlock?.getRedstonePower();

	if (redstonePower == undefined || redstonePower <= 0) return false;

	return true;
}

async function showPlacementForm(player: mc.Player, e: mc.BlockComponentPlayerPlaceBeforeEvent): Promise<void> {
	const fnets = getAllFnets();

	const formData1 = new ActionFormData();

	formData1.title({ translate: "scpdy.lkdnPanel" });
	formData1.body({ translate: "scpdy.fnetManager.selectFnet" });
	fnets.forEach((fnet) => formData1.button(fnet.name));

	const response1 = await formData1.show(player);

	if (!player.isValid) return;
	if (response1.canceled) return;
	if (response1.selection == undefined) return;

	const fnet = getFnet(response1.selection);
	const zones = fnet.getAllZones();

	const formData2 = new ActionFormData();

	formData2.title({ translate: "scpdy.lkdnPanel" });
	formData2.body({ translate: "scpdy.fnetManager.selectFzone" });
	zones.forEach((zone) => formData2.button(zone.name));

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

	const newPermutation = e.permutationToPlace
		.withState(STATE.fnetIndex, fnet.index)
		.withState(STATE.fzoneIndex, zone.index);

	e.block.setPermutation(newPermutation);
	e.dimension.playSound("place.iron", e.block.center(), { pitch: 0.81 });
}

async function onInteract(e: mc.BlockComponentPlayerInteractEvent): Promise<void> {
	if (!e.player) return;
	if (!e.player.isValid) return;

	const zone = getZone(e.block);

	if (checkRedstonePower(e.block)) {
		e.player.onScreenDisplay.setActionBar({ translate: "scpdy.misc.text.accessDenied" });
		e.dimension.playSound("scpdy.interact.button.click", e.block.center(), {
			pitch: 0.7,
			volume: 0.9,
		});
		return;
	}

	if (zone.isLkdnActive) {
		await showStopLkdnForm(e.player, e.block);
		return;
	}

	if (zone.isLkdnScheduled) {
		await showCancelLkdnScheduleForm(e.player, e.block);
		return;
	}

	await showStartLkdnForm(e.player, e.block);
}

async function showStartLkdnForm(player: mc.Player, panelBlock: mc.Block): Promise<void> {
	const zone = getZone(panelBlock);

	const formData = new ModalFormData();

	formData.title({ translate: "scpdy.lkdnPanel" });
	formData.label({ translate: "scpdy.lkdnPanel.networkX", with: { rawtext: [zone.fnet.name] } });
	formData.label({ translate: "scpdy.lkdnPanel.targetZoneX", with: { rawtext: [zone.name] } });
	formData.divider();

	// Delay
	formData.textField(
		{ translate: "scpdy.misc.text.delay" },
		{ translate: "scpdy.misc.text.none" },
		{
			tooltip: { translate: "scpdy.misc.text.enterNumber" },
		},
	);

	// Duration
	formData.textField(
		{ translate: "scpdy.misc.text.duration" },
		{ translate: "scpdy.misc.text.infinity" },
		{
			tooltip: { translate: "scpdy.misc.text.enterNumber" },
		},
	);

	const response = await formData.show(player);

	if (!player.isValid) return;
	if (response.canceled) return;
	if (!response.formValues) return;

	const delay = Number(response.formValues[3]);
	const duration = Number(response.formValues[4]);
	const durationMaybeInf = duration <= 0 ? Infinity : duration;

	if (delay > 0) {
		zone.scheduleLkdn(delay, durationMaybeInf);
		player.sendMessage({ translate: "scpdy.lkdnPanel.scheduledLkdn" });
	} else {
		zone.startLkdn(durationMaybeInf);
		player.sendMessage({ translate: "scpdy.lkdnPanel.startedLkdn" });
	}

	updateVisual(panelBlock);
}

async function showCancelLkdnScheduleForm(player: mc.Player, panelBlock: mc.Block): Promise<void> {
	const zone = getZone(panelBlock);

	const formData = new ActionFormData();

	formData.title({ translate: "scpdy.lkdnPanel" });
	formData.body({ translate: "scpdy.lkdnPanel.lkdnIsScheduled" });
	formData.label({ translate: "scpdy.lkdnPanel.networkX", with: { rawtext: [zone.fnet.name] } });
	formData.label({ translate: "scpdy.lkdnPanel.targetZoneX", with: { rawtext: [zone.name] } });
	formData.divider();
	formData.label({ translate: "scpdy.lkdnPanel.wannaCancelSchedule" });

	formData.button({ translate: "scpdy.misc.text.yes" });
	formData.button({ translate: "scpdy.misc.text.no" });

	const response = await formData.show(player);

	if (!player.isValid) return;
	if (response.canceled) return;

	if (response.selection !== 0) return; // 0 is yes

	if (zone.isLkdnActive) {
		player.sendMessage({ translate: "scpdy.misc.text.somethingWentWrong" });
		return; // Schedule is probably completed before the form was answered
	}

	zone.cancelScheduledLkdn();

	updateVisual(panelBlock);

	player.sendMessage({ translate: "scpdy.lkdnPanel.canceledSchedule" });
}

async function showStopLkdnForm(player: mc.Player, panelBlock: mc.Block): Promise<void> {
	const zone = getZone(panelBlock);

	const formData = new ActionFormData();

	formData.title({ translate: "scpdy.lkdnPanel" });
	formData.body({ translate: "scpdy.lkdnPanel.lkdnIsActive" });
	formData.label({ translate: "scpdy.lkdnPanel.networkX", with: { rawtext: [zone.fnet.name] } });
	formData.label({ translate: "scpdy.lkdnPanel.targetZoneX", with: { rawtext: [zone.name] } });
	formData.divider();
	formData.label({ translate: "scpdy.lkdnPanel.wannaStopLkdn" });

	formData.button({ translate: "scpdy.misc.text.yes" });
	formData.button({ translate: "scpdy.misc.text.no" });

	const response = await formData.show(player);

	if (!player.isValid) return;
	if (response.canceled) return;

	if (response.selection !== 0) return; // 0 is yes

	if (!zone.isLkdnActive) {
		player.sendMessage({ translate: "scpdy.misc.text.somethingWentWrong" });
		return; // Lockdown has ended before the form was answered
	}

	zone.stopLkdn();

	updateVisual(panelBlock);

	player.sendMessage({ translate: "scpdy.lkdnPanel.stoppedLkdn" });
}
