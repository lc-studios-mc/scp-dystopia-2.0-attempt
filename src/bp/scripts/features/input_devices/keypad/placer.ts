import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import {
	attachNewKeypadEntityTo,
	setKeypadHint,
	setKeypadLoudIncorrectBuzzer,
	setKeypadO5Clearance,
	setKeypadPassword,
} from "./keypad";

const KEYPAD_PLACER_ITEM_TYPE_ID = "lc:scpdy_keypad_placer";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:keypad_placer", {
		onUseOn,
	});
});

function onUseOn(arg: mc.ItemComponentUseOnEvent): void {
	const player = arg.source;
	if (!(player instanceof mc.Player)) return;
	if (arg.blockFace === mc.Direction.Down || arg.blockFace === mc.Direction.Up) return;

	processPlacementAsync(player, arg).catch(() => {
		player.sendMessage({ translate: "scpdy.msg.misc.somethingWentWrong" });
	});
}

async function processPlacementAsync(
	player: mc.Player,
	event: mc.ItemComponentUseOnEvent,
): Promise<void> {
	const formData = new ModalFormData()
		.title({ translate: "scpdy.form.keypad.placementOpts.title" })
		.label({ translate: "scpdy.form.keypad.placementOpts.warning" })
		.textField(
			{ translate: "scpdy.form.keypad.placementOpts.passwordField.label" },
			{ translate: "scpdy.form.keypad.placementOpts.passwordField.placeholder" },
		)
		.textField(
			{ translate: "scpdy.form.keypad.placementOpts.hintField.label" },
			{ translate: "scpdy.form.keypad.placementOpts.hintField.placeholder" },
		)
		.toggle({ translate: "scpdy.form.keypad.placementOpts.loudIncorrectBuzzerToggle.label" }, {
			defaultValue: false,
		})
		.divider()
		.dropdown(
			{ translate: "scpdy.form.controlDevice.modeDropdown.label" },
			[
				{ translate: "scpdy.machinery.input.mode.text.powerRelayDoors" },
				{ translate: "scpdy.machinery.input.mode.text.ctrlBlastDoor" },
				{ translate: "scpdy.machinery.input.mode.text.placeRbBelow" },
				{ translate: "scpdy.machinery.input.mode.text.placeRbBehind" },
			],
			{ defaultValueIndex: 0 },
		)
		.toggle({ translate: "scpdy.form.keypad.placementOpts.O5ClearanceToggle.label" })
		.submitButton({ translate: "scpdy.form.keypad.placementOpts.submitButton" });

	// @ts-expect-error
	const response = await formData.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const password = String(response.formValues[1]).trim();
	const hint = String(response.formValues[2]);
	const loudIncorrectBuzzer = response.formValues[3] === true;
	const controlDeviceMode = Number(response.formValues[5]);
	const o5Clearance = response.formValues[6] === true;

	if (password === "") {
		player.playSound("note.bass");
		player.sendMessage({ translate: "scpdy.msg.keypad.placement.passwordRequired" });
		return;
	}

	if (password.length > 15) {
		player.playSound("note.bass");
		player.sendMessage({ translate: "scpdy.msg.keypad.placement.passwordTooLong" });
		return;
	}

	if (player.getGameMode() !== mc.GameMode.Creative) {
		const equippable = player.getComponent("equippable");
		if (!equippable) return;

		const mainhandSlot = equippable.getEquipmentSlot(mc.EquipmentSlot.Mainhand);
		if (!mainhandSlot.hasItem()) return;
		if (mainhandSlot.typeId !== KEYPAD_PLACER_ITEM_TYPE_ID) return;

		const itemAmount = mainhandSlot.amount;
		if (itemAmount === 1) {
			mainhandSlot.setItem();
		} else {
			mainhandSlot.amount = itemAmount - 1;
		}
	}

	const keypad = attachNewKeypadEntityTo(event.block, event.blockFace, player);

	setKeypadPassword(keypad, password);
	setKeypadHint(keypad, hint);
	setKeypadLoudIncorrectBuzzer(keypad, loudIncorrectBuzzer);
	keypad.setProperty("lc:control_device_mode", controlDeviceMode);
	setKeypadO5Clearance(keypad, o5Clearance);
}
