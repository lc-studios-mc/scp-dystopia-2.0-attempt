import { ensureType } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import * as cctvServerMod from "./cctvServer";
import { SERVER_ENTITY_TYPE, TABLET_ITEM_TYPE } from "./shared";
import { removeCctvUsage, setCctvUsage } from "./tick";

function getCctvServerId(cctvTablet: mc.ItemStack): string | undefined {
	return ensureType(cctvTablet.getDynamicProperty("serverId"), "string");
}

function setCctvServerId(cctvTablet: mc.ItemStack, value?: string): mc.ItemStack {
	const newItemStack = cctvTablet.clone();

	newItemStack.setDynamicProperty("serverId", value);

	return newItemStack;
}

function onSelectCameraToUse(
	player: mc.Player,
	cctvServer: mc.Entity,
	cctvCamera: mc.Entity,
	cctvTabletItem: mc.ItemStack,
): void {
	function stopCondition(): boolean {
		try {
			const equippable = player.getComponent("equippable")!;
			const mainhandItem = equippable.getEquipment(mc.EquipmentSlot.Mainhand);

			if (!mainhandItem) return true;
			if (mainhandItem.typeId !== cctvTabletItem.typeId) return true;
			if (player.getComponent("health")!.currentValue <= 0) return true;
			if (cctvServer.getComponent("health")!.currentValue <= 0) return true;
			if (cctvCamera.getComponent("health")!.currentValue <= 0) return true;

			return false;
		} catch {
			return true;
		}
	}

	setCctvUsage({
		player,
		cctvServer,
		cctvCamera,
		stopCondition,
	});
}

async function showCameraList(player: mc.Player, cctvServer: mc.Entity, cctvTabletItem: mc.ItemStack): Promise<void> {
	const mainhandSlot = player.getComponent("equippable")!.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	if (mainhandSlot.typeId !== TABLET_ITEM_TYPE) return;

	const cameraRefs = cctvServerMod.getCameraRefs(cctvServer);

	const cameraListForm = new ActionFormData()
		.title({
			translate: "scpdy.form.cctvTablet.chooseCamera.title",
		})
		.body({
			translate: "scpdy.form.cctvTablet.chooseCamera.body",
			with: [cameraRefs.length.toString()],
		});

	const buttons: { label: mc.RawMessage; callback: () => Promise<void> }[] = [];

	for (let cameraRefIndex = 0; cameraRefIndex < cameraRefs.length; cameraRefIndex++) {
		const cameraRef = cameraRefs[cameraRefIndex]!;
		const cameraEntity = mc.world.getEntity(cameraRef.entityId);

		if (!cameraEntity || cameraEntity.dimension.id !== cctvServer.dimension.id) {
			buttons.push({
				label: {
					translate: "scpdy.form.cctvTablet.chooseCamera.button.cameraElementError",
					with: [cameraRefIndex.toString()],
				},
				async callback() {
					player.sendMessage({
						translate: "scpdy.msg.cctvTablet.cameraUnavailable",
					});
				},
			});
		} else {
			buttons.push({
				label: {
					translate: "scpdy.form.cctvTablet.chooseCamera.button.cameraElement",
					with: [
						cameraRefIndex.toString(),
						cameraEntity.nameTag.trim() ? cameraEntity.nameTag : `${vec3.toString(vec3.round(cameraEntity.location))}`,
					],
				},
				async callback() {
					onSelectCameraToUse(player, cctvServer, cameraEntity, cctvTabletItem);
				},
			});
		}
	}

	buttons.push({
		label: {
			translate: "scpdy.form.cctvTablet.failedToGetServer.removeLinkButton",
		},
		async callback() {
			if (mainhandSlot.typeId !== TABLET_ITEM_TYPE) return;

			const newItemStack = setCctvServerId(cctvTabletItem, undefined);

			mainhandSlot.setItem(newItemStack);

			removeCctvUsage(player);

			player.sendMessage({ translate: "scpdy.msg.cctvTablet.removedServerLink" });
		},
	});

	for (const button of buttons) {
		cameraListForm.button(button.label);
	}

	const response = await cameraListForm.show(player);

	if (response.canceled || response.selection === undefined) {
		return;
	}

	await buttons[response.selection]!.callback();
}

function onUseCctvTablet(player: mc.Player, itemStack: mc.ItemStack): void {
	const mainhandSlot = player.getComponent("equippable")!.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	if (mainhandSlot.typeId !== TABLET_ITEM_TYPE) return;

	const cctvServerId = getCctvServerId(itemStack);

	if (cctvServerId === undefined) {
		new ActionFormData()
			.title({ translate: "scpdy.form.cctvTablet.notLinkedToServer.title" })
			.body({ translate: "scpdy.form.cctvTablet.notLinkedToServer.body" })
			.button({ translate: "scpdy.form.misc.close" })
			.show(player);

		return;
	}

	const cctvServer = mc.world.getEntity(cctvServerId);

	if (!cctvServer || cctvServer.typeId !== SERVER_ENTITY_TYPE) {
		new ActionFormData()
			.title({ translate: "scpdy.form.cctvTablet.failedToGetServer.title" })
			.body({ translate: "scpdy.form.cctvTablet.failedToGetServer.body" })
			.button({ translate: "scpdy.form.cctvTablet.failedToGetServer.removeLinkButton" })
			.show(player)
			.then((response) => {
				if (mainhandSlot.typeId !== TABLET_ITEM_TYPE) return;
				if (response.canceled) return;

				if (response.selection === 0) {
					const newItemStack = setCctvServerId(itemStack, undefined);

					mainhandSlot.setItem(newItemStack);

					player.sendMessage({ translate: "scpdy.msg.cctvMonitor.removedServerLink" });
				}
			});

		return;
	}

	showCameraList(player, cctvServer, itemStack);
}

function onInteractCctvServerAuthorized(player: mc.Player, cctvServer: mc.Entity, itemStack: mc.ItemStack): void {
	const mainhandSlot = player.getComponent("equippable")!.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	if (mainhandSlot.typeId !== TABLET_ITEM_TYPE) return;

	const newItemStack = setCctvServerId(itemStack, cctvServer.id);

	mainhandSlot.setItem(newItemStack);

	player.sendMessage({
		translate: "scpdy.msg.cctvTablet.connectedToServer",
		with: [cctvServer.id],
	});
}

function onInteractCctvServer(player: mc.Player, itemStack: mc.ItemStack, cctvServer: mc.Entity): void {
	const savedServerId = getCctvServerId(itemStack);

	if (savedServerId !== undefined) {
		player.sendMessage({
			translate: "scpdy.msg.cctvTablet.alreadyConnectedToServer",
		});
		return;
	}

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
	if (arg.source.getItemCooldown("scpdy_cctv_tablet_interact") > 0) return;

	onUseCctvTablet(arg.source, arg.itemStack);

	arg.source.startItemCooldown("scpdy_cctv_tablet_use", 2);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:cctv_tablet", {
		onUse: onUseItem,
	});
});

mc.world.afterEvents.playerInteractWithEntity.subscribe((event) => {
	if (event.player.isSneaking) return;
	if (event.target.typeId !== SERVER_ENTITY_TYPE) return;
	if (!event.itemStack) return;
	if (event.itemStack.typeId !== TABLET_ITEM_TYPE) return;
	if (event.player.getItemCooldown("scpdy_cctv_tablet_use") > 0) return;

	onInteractCctvServer(event.player, event.itemStack, event.target);

	event.player.startItemCooldown("scpdy_cctv_tablet_interact", 2);
});
