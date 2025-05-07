import { ensureType } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
	type CCTVCameraRef,
	LINKER_ITEM_TYPE,
	SERVER_ENTITY_TYPE,
	TABLET_ITEM_TYPE,
} from "./shared";

type CCTVCameraListSortMethod = "a-z" | "z-a" | "nearest" | "farthest";

export function getPassword(cctvSerer: mc.Entity): string | undefined {
	const value = cctvSerer.getDynamicProperty("password");
	return value?.toString();
}

export function setPassword(cctvServer: mc.Entity, password?: string): void {
	cctvServer.setDynamicProperty("password", password);
}

export async function showPasswordForm(player: mc.Player, cctvServer: mc.Entity): Promise<boolean> {
	const password = getPassword(cctvServer);

	const lastEnteredCctvPassword = ensureType(
		player.getDynamicProperty("lastEnteredCctvPassword"),
		"string",
	);

	const response = await new ModalFormData()
		.title({
			translate: "scpdy.form.cctvServer.locked.title",
		})
		.textField(
			{
				translate: "scpdy.form.cctvServer.locked.passwordField.label",
			},
			{
				translate: "scpdy.form.cctvServer.locked.passwordField.placeholder",
			},
			{ defaultValue: lastEnteredCctvPassword },
		)
		.submitButton({
			translate: "scpdy.form.cctvServer.locked.submitButton",
		})
		.show(player);

	if (response.canceled) return false;
	if (response.formValues === undefined) return false;

	const enteredPassword = response.formValues[0]?.toString();

	player.setDynamicProperty("lastEnteredCctvPassword", enteredPassword);

	if (enteredPassword === undefined || password !== enteredPassword) {
		player.sendMessage({
			translate: "scpdy.msg.misc.wrongPassword",
		});
		return false;
	}

	return true;
}

export function getCameraRefs(cctvServer: mc.Entity): CCTVCameraRef[] {
	const cameraIds = cctvServer
		.getDynamicPropertyIds()
		.filter((propId) => propId.startsWith("cameraId_"))
		.sort()
		.map((propId) => cctvServer.getDynamicProperty(propId) as string);

	const arr: CCTVCameraRef[] = [];

	for (let i = 0; i < cameraIds.length; i++) {
		const entityId = cameraIds[i]!;

		arr.push({
			entityId,
		});
	}

	return arr;
}

export function setCameraRefs(cctvServer: mc.Entity, values: CCTVCameraRef[]): void {
	const propIds = cctvServer.getDynamicPropertyIds();
	const cameraIdPropIds = propIds.filter((propId) => propId.startsWith("cameraId_"));

	// Delete existing references

	for (let i = 0; i < cameraIdPropIds.length; i++) {
		const propId = cameraIdPropIds[i];
		cctvServer.setDynamicProperty(propId!);
	}

	// Add new references

	for (let i = 0; i < values.length; i++) {
		const newValue = values[i];
		cctvServer.setDynamicProperty(`cameraId_${i}`, newValue!.entityId);
	}
}

export function sortCameraList(
	values: CCTVCameraRef[],
	sortMethod: CCTVCameraListSortMethod,
	cctvServer?: mc.Entity,
): void {
	switch (sortMethod) {
		case "a-z":
			values.sort((a, b) => {
				const cameraEntityA = mc.world.getEntity(a.entityId);
				const cameraEntityB = mc.world.getEntity(b.entityId);

				if (!cameraEntityA || !cameraEntityB) return 0;

				return cameraEntityA.nameTag.localeCompare(cameraEntityB.nameTag);
			});
			break;
		case "z-a":
			values.sort((a, b) => {
				const cameraEntityA = mc.world.getEntity(a.entityId);
				const cameraEntityB = mc.world.getEntity(b.entityId);

				if (!cameraEntityA || !cameraEntityB) return 0;

				return cameraEntityB.nameTag.localeCompare(cameraEntityA.nameTag);
			});
			break;
		case "nearest":
			values.sort((a, b) => {
				if (!cctvServer) return 0;

				const cameraEntityA = mc.world.getEntity(a.entityId);
				const cameraEntityB = mc.world.getEntity(b.entityId);

				if (!cameraEntityA || !cameraEntityB) return 0;
				if (cameraEntityA.dimension.id !== cameraEntityB.dimension.id) return 0;

				const distA = vec3.distance(cctvServer.location, cameraEntityA.location);
				const distB = vec3.distance(cctvServer.location, cameraEntityB.location);

				return distA - distB;
			});
			break;
		case "farthest":
			values.sort((a, b) => {
				if (!cctvServer) return 0;

				const cameraEntityA = mc.world.getEntity(a.entityId);
				const cameraEntityB = mc.world.getEntity(b.entityId);

				if (!cameraEntityA || !cameraEntityB) return 0;
				if (cameraEntityA.dimension.id !== cameraEntityB.dimension.id) return 0;

				const distA = vec3.distance(cctvServer.location, cameraEntityA.location);
				const distB = vec3.distance(cctvServer.location, cameraEntityB.location);

				return distB - distA;
			});
			break;
	}
}

async function showMainMenu(player: mc.Player, cctvServer: mc.Entity): Promise<void> {
	const password = getPassword(cctvServer);

	async function actionCameraList(): Promise<void> {
		const cameraRefs = getCameraRefs(cctvServer);

		const cameraListForm = new ActionFormData()
			.title({
				translate: "scpdy.form.cctvServer.cameraList.title",
			})
			.body({
				translate: "scpdy.form.cctvServer.cameraList.body",
				with: [cameraRefs.length.toString()],
			});

		const buttons: { label: mc.RawMessage; callback: () => Promise<void> }[] = [];

		if (cameraRefs.length <= 0) {
			buttons.push({
				label: { translate: "scpdy.form.cctvServer.cameraList.button.noElement" },
				async callback() {},
			});
		} else {
			for (let cameraRefIndex = 0; cameraRefIndex < cameraRefs.length; cameraRefIndex++) {
				const cameraRef = cameraRefs[cameraRefIndex]!;
				const cameraEntity = mc.world.getEntity(cameraRef.entityId);

				async function actionEditCamera(): Promise<void> {
					const response = await new ActionFormData()
						.title({
							translate: "scpdy.form.cctvServer.editCamera.title",
							with: [cameraRefIndex.toString()],
						})
						.body({ translate: "scpdy.form.cctvServer.editCamera.body" })
						.button({ translate: "scpdy.form.misc.no" })
						.button({ translate: "scpdy.form.misc.yes" })
						.show(player);

					if (response.selection === 1) {
						cameraRefs.splice(cameraRefIndex, 1);
						setCameraRefs(cctvServer, cameraRefs);
					}
				}

				if (!cameraEntity || cameraEntity.dimension.id !== cctvServer.dimension.id) {
					buttons.push({
						label: {
							translate: "scpdy.form.cctvServer.cameraList.button.cameraElementError",
							with: [cameraRefIndex.toString()],
						},
						callback: actionEditCamera,
					});
				} else {
					buttons.push({
						label: {
							translate: "scpdy.form.cctvServer.cameraList.button.cameraElement",
							with: [
								cameraRefIndex.toString(),
								cameraEntity.nameTag.trim()
									? cameraEntity.nameTag
									: `${vec3.toString(vec3.round(cameraEntity.location))}`,
							],
						},
						callback: actionEditCamera,
					});
				}
			}

			buttons.push({
				label: {
					translate: "scpdy.form.cctvServer.cameraList.button.sortAZ",
				},
				async callback() {
					sortCameraList(cameraRefs, "a-z");
					setCameraRefs(cctvServer, cameraRefs);
				},
			});

			buttons.push({
				label: {
					translate: "scpdy.form.cctvServer.cameraList.button.sortZA",
				},
				async callback() {
					sortCameraList(cameraRefs, "z-a");
					setCameraRefs(cctvServer, cameraRefs);
				},
			});

			buttons.push({
				label: {
					translate: "scpdy.form.cctvServer.cameraList.button.sortByNearest",
				},
				async callback() {
					sortCameraList(cameraRefs, "nearest", cctvServer);
					setCameraRefs(cctvServer, cameraRefs);
				},
			});

			buttons.push({
				label: {
					translate: "scpdy.form.cctvServer.cameraList.button.sortByFarthest",
				},
				async callback() {
					sortCameraList(cameraRefs, "farthest", cctvServer);
					setCameraRefs(cctvServer, cameraRefs);
				},
			});

			buttons.push({
				label: {
					translate: "scpdy.form.cctvServer.cameraList.button.removeAllCameras",
				},
				async callback() {
					setCameraRefs(cctvServer, []);
				},
			});
		}

		for (const button of buttons) {
			cameraListForm.button(button.label);
		}

		const response = await cameraListForm.show(player);

		if (response.canceled || response.selection === undefined) {
			mc.system.run(() => {
				showMainMenu(player, cctvServer);
			});
			return;
		}

		await buttons[response.selection]!.callback();

		mc.system.run(() => {
			actionCameraList();
		});
	}

	async function actionSetPassword(): Promise<void> {
		const response = await new ModalFormData()
			.title({
				translate:
					password === undefined || password.trim() === ""
						? "scpdy.form.cctvServer.setPassword.title1"
						: "scpdy.form.cctvServer.setPassword.title2",
			})
			.textField(
				{
					translate: "scpdy.form.cctvServer.setPassword.passwordField.label",
				},
				{
					translate: "scpdy.form.cctvServer.setPassword.passwordField.placeholder",
				},
			)
			.submitButton({
				translate: "scpdy.form.cctvServer.setPassword.submitButton",
			})
			.show(player);

		if (response.canceled || response.formValues === undefined) {
			mc.system.run(() => {
				showMainMenu(player, cctvServer);
			});
			return;
		}

		player.setDynamicProperty("lastEnteredCctvPassword");

		const newPassword = response.formValues[0]?.toString();

		if (newPassword === undefined || newPassword.trim() === "") {
			player.sendMessage({
				translate: "scpdy.msg.misc.removedPassword",
			});
		} else {
			player.sendMessage({
				translate: "scpdy.msg.misc.setNewPassword",
			});
		}

		setPassword(cctvServer, newPassword?.trim());
	}

	const menuResponse = await new ActionFormData()
		.title({
			translate: "scpdy.form.cctvServer.main.title",
		})
		.body({
			translate: "scpdy.form.cctvServer.main.body",
		})
		.button({
			translate: "scpdy.form.cctvServer.main.button.cameraList",
		})
		.button({
			translate:
				password === undefined || password.trim() === ""
					? "scpdy.form.cctvServer.main.button.setPassword"
					: "scpdy.form.cctvServer.main.button.changePassword",
		})
		.show(player);

	if (menuResponse.canceled) return;
	if (menuResponse.selection === undefined) return;

	switch (menuResponse.selection) {
		case 0:
			await actionCameraList();
			break;
		case 1:
			await actionSetPassword();
			break;
	}
}

async function onInteract(player: mc.Player, cctvServer: mc.Entity): Promise<void> {
	const password = getPassword(cctvServer);

	if (password === undefined || password.trim() === "") {
		showMainMenu(player, cctvServer);
		return;
	}

	const playerEnteredCorrectPassword = await showPasswordForm(player, cctvServer);

	if (!playerEnteredCorrectPassword) return;

	try {
		await showMainMenu(player, cctvServer);
	} catch (error) {
		player.sendMessage({
			translate: "scpdy.msg.misc.error",
			with: [`${error}`],
		});
	}
}

mc.world.afterEvents.playerInteractWithEntity.subscribe((event) => {
	if (event.target.typeId !== SERVER_ENTITY_TYPE) return;
	if (event.itemStack?.typeId === LINKER_ITEM_TYPE) return;
	if (event.itemStack?.typeId === TABLET_ITEM_TYPE) return;
	if (event.player.isSneaking) return;

	onInteract(event.player, event.target);
});
