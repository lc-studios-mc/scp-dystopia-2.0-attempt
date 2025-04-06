import { getClearanceLevel, isHoldingWrench } from "@lib/utils/scpdyUtils";
import * as mc from "@minecraft/server";
import { onActivateControlDevice, onInteractControlDeviceWithWrench } from "./shared";

function beforeOnPlayerPlace(arg: mc.BlockComponentPlayerPlaceBeforeEvent): void {
	if (!arg.player) return;

	arg.player.onScreenDisplay.setActionBar({
		translate: "scpdy.actionHint.controlDevice.changeMode0",
	});

	if (arg.player.addTag("scpdy_read_button_mode_tip")) {
		arg.player.sendMessage({
			translate: "scpdy.msg.controlDevice.modeTip",
		});
	}
}

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const { block, dimension, player } = arg;

	if (!player) return;

	if (isHoldingWrench(player)) {
		onInteractControlDeviceWithWrench(block, player);
		return;
	}

	const ticksUntilPowerOff = block.permutation.getState("lc:ticks_until_power_off") as number;

	if (ticksUntilPowerOff > 0) return;
	if (!player) return;

	const levelString = block
		.getTags()
		.find((tag) => tag.startsWith("keycard_reader:"))
		?.split(":")[1];

	let minimumLevel = -1;

	switch (levelString) {
		case "lvl_0":
			minimumLevel = 0;
			break;
		case "lvl_1":
			minimumLevel = 1;
			break;
		case "lvl_2":
			minimumLevel = 2;
			break;
		case "lvl_3":
			minimumLevel = 3;
			break;
		case "lvl_4":
			minimumLevel = 4;
			break;
		case "lvl_5":
			minimumLevel = 5;
			break;
		case "o5":
			minimumLevel = 6;
			break;
	}

	const keycardLevel = getClearanceLevel(player);

	if (keycardLevel < minimumLevel) {
		dimension.playSound("scpdy.interact.keycard_reader.deny", block.center());

		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.misc.accessDenied",
		});

		return;
	}

	block.setPermutation(block.permutation.withState("lc:ticks_until_power_off", 5));

	if (onActivateControlDevice(block, player, keycardLevel)) {
		dimension.playSound("scpdy.interact.keycard_reader.accept", block.center());

		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.misc.accessGranted",
		});
	} else {
		dimension.playSound("scpdy.interact.keycard_reader.deny", block.center());

		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.misc.accessDenied",
		});
	}
}

function onTick(arg: mc.BlockComponentTickEvent): void {
	const { block } = arg;

	const ticksUntilPowerOff = block.permutation.getState("lc:ticks_until_power_off") as number;

	if (ticksUntilPowerOff <= 0) return;

	const newValue = ticksUntilPowerOff - 1;

	block.setPermutation(block.permutation.withState("lc:ticks_until_power_off", newValue));
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:keycard_reader", {
		beforeOnPlayerPlace,
		onPlayerInteract,
		onTick,
	});
});
