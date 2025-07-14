import { ensureType } from "@lib/utils/miscUtils";
import * as mc from "@minecraft/server";
import * as cctvMonitorMod from "./cctv_monitor";
import * as cctvServerMod from "./cctv_server";
import {
	CAMERA_ENTITY_TYPE,
	type CCTVCameraRef,
	type CCTVMonitorRef,
	MONITOR_ENTITY_TYPE,
	SERVER_ENTITY_TYPE,
} from "./shared";
import { LINKER_ITEM_TYPE } from "./shared";

function getCameraRefs(cctvLinker: mc.ItemStack): CCTVCameraRef[] {
	const cameraIds = cctvLinker
		.getDynamicPropertyIds()
		.filter((propId) => propId.startsWith("cameraId_"))
		.sort()
		.map((propId) => ensureType(cctvLinker.getDynamicProperty(propId), "string"));

	const arr: CCTVCameraRef[] = [];

	for (let i = 0; i < cameraIds.length; i++) {
		const entityId = cameraIds[i]!;

		arr.push({
			entityId,
		});
	}

	return arr;
}

function setCameraRefs(cctvLinker: mc.ItemStack, values: CCTVCameraRef[]): mc.ItemStack {
	const propIds = cctvLinker.getDynamicPropertyIds();
	const cameraIdPropIds = propIds.filter((propId) => propId.startsWith("cameraId_"));
	const newItemStack = cctvLinker.clone();

	// Delete existing references

	for (let i = 0; i < cameraIdPropIds.length; i++) {
		const propId = cameraIdPropIds[i];
		newItemStack.setDynamicProperty(propId!);
	}

	// Add new references

	for (let i = 0; i < values.length; i++) {
		const newValue = values[i];
		newItemStack.setDynamicProperty(`cameraId_${i}`, newValue!.entityId);
	}

	return newItemStack;
}

function getMonitorRefs(cctvLinker: mc.ItemStack): CCTVMonitorRef[] {
	const monitorIds = cctvLinker
		.getDynamicPropertyIds()
		.filter((propId) => propId.startsWith("monitorId_"))
		.sort()
		.map((propId) => ensureType(cctvLinker.getDynamicProperty(propId), "string"));

	const arr: CCTVMonitorRef[] = [];

	for (let i = 0; i < monitorIds.length; i++) {
		const entityId = monitorIds[i]!;

		arr.push({
			entityId,
		});
	}

	return arr;
}

function setMonitorRefs(cctvLinker: mc.ItemStack, values: CCTVMonitorRef[]): mc.ItemStack {
	const propIds = cctvLinker.getDynamicPropertyIds();
	const monitorIdPropIds = propIds.filter((propId) => propId.startsWith("monitorId_"));
	const newItemStack = cctvLinker.clone();

	// Delete existing references

	for (let i = 0; i < monitorIdPropIds.length; i++) {
		const propId = monitorIdPropIds[i];
		newItemStack.setDynamicProperty(propId!);
	}

	// Add new references

	for (let i = 0; i < values.length; i++) {
		const newValue = values[i];
		newItemStack.setDynamicProperty(`monitorId_${i}`, newValue!.entityId);
	}

	return newItemStack;
}

function onUseCctvLinker(player: mc.Player, itemStack: mc.ItemStack): void {
	const cameraRefs = getCameraRefs(itemStack);
	const monitorRefs = getMonitorRefs(itemStack);

	if (cameraRefs.length <= 0 && monitorRefs.length <= 0) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.guide",
		});
		return;
	}

	player.sendMessage({
		translate: "scpdy.msg.cctvLinker.status.cameras",
		with: [cameraRefs.length.toString()],
	});

	player.sendMessage({
		translate: "scpdy.msg.cctvLinker.status.monitors",
		with: [monitorRefs.length.toString()],
	});
}

function onInteractCctvCamera(player: mc.Player, cctvCamera: mc.Entity, itemStack: mc.ItemStack): void {
	const mainhandSlot = player.getComponent("equippable")!.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	if (mainhandSlot.typeId !== LINKER_ITEM_TYPE) return;

	const cameraRefs = getCameraRefs(itemStack);

	const isAlreadyCollected = cameraRefs.findIndex((ref) => ref.entityId === cctvCamera.id) !== -1;

	if (isAlreadyCollected) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.alreadyCollectedCamera",
			with: [cctvCamera.id.toString()],
		});
		return;
	}

	cameraRefs.push({
		entityId: cctvCamera.id,
	});

	const newItemStack = setCameraRefs(itemStack, cameraRefs);

	mainhandSlot.setItem(newItemStack);

	player.sendMessage({
		translate: "scpdy.msg.cctvLinker.collectedCamera",
		with: [cctvCamera.id.toString()],
	});
}

function onInteractCctvMonitor(player: mc.Player, cctvMonitor: mc.Entity, itemStack: mc.ItemStack): void {
	const mainhandSlot = player.getComponent("equippable")!.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	if (mainhandSlot.typeId !== LINKER_ITEM_TYPE) return;

	const monitorRefs = getMonitorRefs(itemStack);

	const isAlreadyCollected = monitorRefs.findIndex((ref) => ref.entityId === cctvMonitor.id) !== -1;

	if (isAlreadyCollected) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.alreadyCollectedMonitor",
			with: [cctvMonitor.id.toString()],
		});
		return;
	}

	monitorRefs.push({
		entityId: cctvMonitor.id,
	});

	const newItemStack = setMonitorRefs(itemStack, monitorRefs);

	mainhandSlot.setItem(newItemStack);

	player.sendMessage({
		translate: "scpdy.msg.cctvLinker.collectedMonitor",
		with: [cctvMonitor.id.toString()],
	});
}

function onInteractCctvServerAuthorized(player: mc.Player, cctvServer: mc.Entity, itemStack: mc.ItemStack): void {
	const mainhandSlot = player.getComponent("equippable")!.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	if (mainhandSlot.typeId !== LINKER_ITEM_TYPE) return;

	const linkerCameraRefs = getCameraRefs(itemStack);
	const linkerMonitorRefs = getMonitorRefs(itemStack);

	if (linkerCameraRefs.length <= 0 && linkerMonitorRefs.length <= 0) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.nothingToLink",
		});
		return;
	}

	const serverCameraRefs = cctvServerMod.getCameraRefs(cctvServer);

	let linkedCameraCount = 0;
	let linkedMonitorCount = 0;
	let skippedCameraCount = 0;
	let skippedMonitorCount = 0;

	// Link cameras

	for (const cameraRefToLink of linkerCameraRefs) {
		const isAlreadyAdded = serverCameraRefs.findIndex((ref) => ref.entityId === cameraRefToLink.entityId) !== -1;

		if (isAlreadyAdded) {
			skippedCameraCount++;
			continue;
		}

		serverCameraRefs.push(cameraRefToLink);
		linkedCameraCount++;
	}

	// Link monitors

	for (const monitorRef of linkerMonitorRefs) {
		const cctvMonitor = mc.world.getEntity(monitorRef.entityId);

		if (!cctvMonitor || cctvMonitor.typeId !== MONITOR_ENTITY_TYPE) {
			skippedMonitorCount++;
			continue;
		}

		if (cctvMonitorMod.getCctvServerId(cctvMonitor) !== undefined) {
			skippedMonitorCount++;
			continue;
		}

		cctvMonitorMod.setCctvServerId(cctvMonitor, cctvServer.id);
		linkedMonitorCount++;
	}

	// Finalize

	cctvServerMod.setCameraRefs(cctvServer, serverCameraRefs);

	let newItemStack = setCameraRefs(itemStack, []);
	newItemStack = setMonitorRefs(newItemStack, []);

	mainhandSlot.setItem(newItemStack);

	if (linkedCameraCount > 0) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.linkedCameras",
			with: [linkedCameraCount.toString()],
		});
	}

	if (linkedMonitorCount > 0) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.linkedMonitors",
			with: [linkedMonitorCount.toString()],
		});
	}

	if (skippedCameraCount > 0) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.skippedCameras",
			with: [skippedCameraCount.toString()],
		});
	}

	if (skippedMonitorCount > 0) {
		player.sendMessage({
			translate: "scpdy.msg.cctvLinker.skippedMonitors",
			with: [skippedMonitorCount.toString()],
		});
	}
}

function onInteractCctvServer(player: mc.Player, cctvServer: mc.Entity, itemStack: mc.ItemStack): void {
	const password = cctvServerMod.getPassword(cctvServer);

	if (password === undefined || password.trim() === "") {
		onInteractCctvServerAuthorized(player, cctvServer, itemStack);
		return;
	}

	cctvServerMod.showPasswordForm(player, cctvServer).then((isCorrect) => {
		if (!isCorrect) return;

		try {
			onInteractCctvServerAuthorized(player, cctvServer, itemStack);
		} catch (error) {
			player.sendMessage({
				translate: "scpdy.msg.misc.error",
				with: [`${error}`],
			});
		}
	});
}

function onUseItem(arg: mc.ItemComponentUseEvent): void {
	if (!arg.itemStack) return;
	onUseCctvLinker(arg.source, arg.itemStack);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:cctv_linker", {
		onUse: onUseItem,
	});
});

mc.world.afterEvents.playerInteractWithEntity.subscribe((event) => {
	if (!event.itemStack) return;
	if (event.itemStack.typeId !== LINKER_ITEM_TYPE) return;
	if (event.player.isSneaking) return;

	switch (event.target.typeId) {
		case CAMERA_ENTITY_TYPE:
			onInteractCctvCamera(event.player, event.target, event.itemStack);
			break;
		case MONITOR_ENTITY_TYPE:
			onInteractCctvMonitor(event.player, event.target, event.itemStack);
			break;
		case SERVER_ENTITY_TYPE:
			onInteractCctvServer(event.player, event.target, event.itemStack);
			break;
	}
});
