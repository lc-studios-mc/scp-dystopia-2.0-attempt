import * as mc from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { type Fnet, getAllFnets } from "./fnet";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:fnet_manager", {
		onUse(arg0) {
			mc.system.run(() => {
				showFnetSelectionForm(arg0.source);
			});
		},
	});
});

async function showFnetSelectionForm(player: mc.Player): Promise<void> {
	const fnets = getAllFnets();

	const formData = new ActionFormData();

	formData.title({ translate: "scpdy.fnetManager" });
	formData.body({ translate: "scpdy.fnetManager.selectFnetToEdit" });
	formData.divider();

	fnets.forEach((fnet) => formData.button(fnet.name));

	const response = await formData.show(player);

	if (!player.isValid) return;
	if (response.canceled) return;
	if (response.selection == undefined) return;

	const selected = fnets[response.selection]!;

	await showFnetEditForm(player, selected);
}

async function showFnetEditForm(player: mc.Player, fnet: Fnet): Promise<void> {
	const formData = new ActionFormData();

	formData.title({ translate: "scpdy.fnetManager" });
	formData.body({ translate: "scpdy.fnetManager.selectedX", with: { rawtext: [fnet.name] } });
	formData.divider();

	formData.button({ translate: "scpdy.fnetManager.changeName" });
	formData.button({ translate: "scpdy.fnetManager.changeZoneNames" });

	const response = await formData.show(player);

	if (!player.isValid) return;
	if (response.canceled) return;

	if (response.selection === 0) {
		await showChangeFnetNameForm(player, fnet);
	} else if (response.selection === 1) {
		await showChangeFzoneNamesForm(player, fnet);
	}
}

async function showChangeFnetNameForm(player: mc.Player, fnet: Fnet): Promise<void> {
	const formData = new ModalFormData();

	formData.title({ translate: "scpdy.fnetManager" });
	formData.submitButton({ translate: "scpdy.misc.text.saveAndExit" });
	formData.textField(
		{ translate: "scpdy.misc.text.newName" },
		{ translate: "scpdy.misc.text.enterNewName" },
		{
			defaultValue: fnet.getCustomName(),
			tooltip: { translate: "scpdy.misc.text.leaveThisEmptyToReset" },
		},
	);

	const response = await formData.show(player);

	if (!player.isValid) return;
	if (response.canceled) return;
	if (!response.formValues) return;

	const newName = String(response.formValues[0]).trim();

	if (newName === "") {
		fnet.setCustomName(undefined);
		return;
	}

	fnet.setCustomName(newName);
}

async function showChangeFzoneNamesForm(player: mc.Player, fnet: Fnet): Promise<void> {
	const zones = fnet.getAllZones();

	const formData = new ModalFormData();

	formData.title({ translate: "scpdy.fnetManager" });
	formData.submitButton({ translate: "scpdy.misc.text.saveAndExit" });
	formData.label({ translate: "scpdy.fnetManager.youCanEditZoneNames" });
	formData.divider();

	for (const zone of zones) {
		formData.textField(
			zone.name,
			{ translate: "scpdy.misc.text.enterNewName" },
			{
				defaultValue: zone.getCustomName(),
				tooltip: { translate: "scpdy.misc.text.leaveThisEmptyToReset" },
			},
		);
	}

	const response = await formData.show(player);

	if (!player.isValid) return;
	if (response.canceled) return;
	if (!response.formValues) return;

	for (let i = 0; i < response.formValues.length; i++) {
		const formValue = response.formValues[i];

		if (i < 2) continue;

		const zoneIndex = i - 2; // Because 0 is label and 1 is divider

		const zone = zones[zoneIndex]!;

		const newName = String(formValue).trim();

		if (newName === "") {
			zone.setCustomName(undefined);
			return;
		}

		zone.setCustomName(newName);
	}
}
