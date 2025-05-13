import * as mc from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
	type FacilityNetwork,
	type FacilityZone,
	getFacilityNetwork,
	MAX_FACILITY_NETWORK_COUNT,
	MAX_FACILITY_ZONE_COUNT,
} from "./network";

async function showEditZoneNameForm(player: mc.Player, facilityZone: FacilityZone): Promise<void> {
	const response = await new ModalFormData()
		.title({ translate: "scpdy.form.fnm.editZoneName.title" })
		.textField(
			{ translate: "scpdy.form.fnm.editZoneName.nameField.label" },
			{ translate: "scpdy.form.fnm.editZoneName.nameField.placeholder" },
			{ defaultValue: facilityZone.name },
		)
		.submitButton({ translate: "scpdy.form.fnm.editZoneName.submitButton" })
		.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const newName = String(response.formValues[0] ?? "");

	if (newName.trim() === "") {
		facilityZone.name = undefined;
	} else {
		facilityZone.name = newName;
	}
}

async function showZoneListForm(player: mc.Player, facilityNetwork: FacilityNetwork): Promise<void> {
	const buttons: { label: string | mc.RawMessage; onClick: () => Promise<void> }[] = [];

	for (let i = 0; i < MAX_FACILITY_ZONE_COUNT; i++) {
		const facilityZone = facilityNetwork.getZone(i);

		buttons.push({
			label: facilityZone.name ?? {
				translate: "scpdy.form.fnm.zoneList.button",
				with: [(i + 1).toString()],
			},
			async onClick() {
				await showEditZoneNameForm(player, facilityZone);
				await showZoneListForm(player, facilityNetwork);
			},
		});
	}

	const formData = new ActionFormData()
		.title({ translate: "scpdy.form.fnm.zoneList.title" })
		.body({ translate: "scpdy.form.fnm.zoneList.body" });

	for (const button of buttons) {
		formData.button(button.label);
	}

	const response = await formData.show(player);

	if (response.canceled) return;
	if (response.selection === undefined) return;

	await buttons[response.selection]!.onClick();
}

async function showEditNetworkNameForm(player: mc.Player, facilityNetwork: FacilityNetwork): Promise<void> {
	const response = await new ModalFormData()
		.title({ translate: "scpdy.form.fnm.editNetworkName.title" })
		.textField(
			{ translate: "scpdy.form.fnm.editNetworkName.nameField.label" },
			{ translate: "scpdy.form.fnm.editNetworkName.nameField.placeholder" },
			{ defaultValue: facilityNetwork.name },
		)
		.submitButton({ translate: "scpdy.form.fnm.editNetworkName.submitButton" })
		.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const newName = String(response.formValues[0] ?? "");

	if (newName.trim() === "") {
		facilityNetwork.name = undefined;
	} else {
		facilityNetwork.name = newName;
	}
}

async function showSelectNetworkActionForm(player: mc.Player, facilityNetwork: FacilityNetwork): Promise<void> {
	const response = await new ActionFormData()
		.title(
			facilityNetwork.name ?? {
				translate: "scpdy.form.fnm.selectNetworkAction.title",
				with: [(facilityNetwork.index + 1).toString()],
			},
		)
		.body({ translate: "scpdy.form.fnm.selectNetworkAction.body" })
		.button({ translate: "scpdy.form.fnm.selectNetworkAction.button1" })
		.button({ translate: "scpdy.form.fnm.selectNetworkAction.button2" })
		.show(player);

	if (response.canceled) return;

	if (response.selection === 0) {
		await showEditNetworkNameForm(player, facilityNetwork);
	} else if (response.selection === 1) {
		await showZoneListForm(player, facilityNetwork);
		await showSelectNetworkActionForm(player, facilityNetwork);
	}
}

async function showManagerForm(player: mc.Player): Promise<void> {
	if (!player.hasTag("scpdy_read_fnm_instruction")) {
		const response = await new ActionFormData()
			.title({ translate: "scpdy.form.fnm.instructions.title" })
			.body({
				rawtext: [
					{ translate: "scpdy.form.fnm.instructions.body.line_1" },
					{ text: "\n" },
					{ text: "\n" },
					{
						translate: "scpdy.form.fnm.instructions.body.line_2",
						with: [MAX_FACILITY_NETWORK_COUNT.toString(), MAX_FACILITY_ZONE_COUNT.toString()],
					},
					{ text: "\n" },
					{ text: "\n" },
					{ translate: "scpdy.form.fnm.instructions.body.line_3" },
					{ text: "\n" },
					{ text: "\n" },
					{ translate: "scpdy.form.fnm.instructions.body.line_4" },
					{ text: "\n" },
					{ text: "\n" },
					{ translate: "scpdy.form.fnm.instructions.body.line_5" },
					{ text: "\n" },
					{ text: "\n" },
					{ translate: "scpdy.form.fnm.instructions.body.line_6" },
					{ text: "\n" },
					{ text: "\n" },
					{ translate: "scpdy.form.fnm.instructions.body.line_7" },
				],
			})
			.button({ translate: "scpdy.form.misc.ok" })
			.show(player);

		if (response.canceled) return;

		player.addTag("scpdy_read_fnm_instruction");
	}

	const buttons: { label: string | mc.RawMessage; onClick: () => Promise<void> }[] = [];

	for (let i = 0; i < MAX_FACILITY_NETWORK_COUNT; i++) {
		const facilityNetwork = getFacilityNetwork(i);

		buttons.push({
			label: facilityNetwork.name ?? {
				translate: "scpdy.form.fnm.main.button",
				with: [(i + 1).toString()],
			},
			async onClick() {
				await showSelectNetworkActionForm(player, facilityNetwork);
				await showManagerForm(player);
			},
		});
	}

	const formData = new ActionFormData()
		.title({
			translate: "scpdy.form.fnm.main.title",
		})
		.body({ translate: "scpdy.form.fnm.main.body" });

	for (const button of buttons) {
		formData.button(button.label);
	}

	const response = await formData.show(player);

	if (response.canceled) return;
	if (response.selection === undefined) return;

	await buttons[response.selection]!.onClick();
}

function onUse(args: mc.ItemComponentUseEvent): void {
	showManagerForm(args.source);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:facility_network_manager", {
		onUse,
	});
});
