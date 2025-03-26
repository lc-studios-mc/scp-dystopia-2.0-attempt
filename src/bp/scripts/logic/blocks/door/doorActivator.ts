import * as mc from "@minecraft/server";
import { anyConnectedBlockHasRedstonePower } from "@lib/utils/blockUtils";
import { isWrench } from "@lib/utils/scpdyUtils";

/**
 * Tries to activate door activator.
 * @param powerLevel Power level to send to the door activator (in integer)
 */
export function tryPowerDoorActivator(block?: mc.Block, powerLevel = 15): boolean {
	if (!block) return false;
	if (block.typeId !== "lc:scpdy_door_activator") return false;

	block.setPermutation(
		block.permutation.withState("lc:ticks_until_power_off", Math.floor(powerLevel)),
	);

	return true;
}

function onTick(arg: mc.BlockComponentTickEvent): void {
	const { block } = arg;

	const ticksUntilPowerOff = block.permutation.getState("lc:ticks_until_power_off") as number;
	const detectRedstone = block.permutation.getState("lc:detect_redstone") === true;
	const hasDetectedRedstone = detectRedstone && anyConnectedBlockHasRedstonePower(block);

	let isPowered = false;

	if (ticksUntilPowerOff > 0) {
		const val =
			ticksUntilPowerOff -
			((hasDetectedRedstone && ticksUntilPowerOff === 1) ||
			(ticksUntilPowerOff > 1 && mc.system.currentTick % 6 !== 0)
				? 0
				: 1);

		if (ticksUntilPowerOff !== val) {
			block.setPermutation(block.permutation.withState("lc:ticks_until_power_off", val));
		}

		isPowered = val > 0;
	} else if (hasDetectedRedstone) {
		block.setPermutation(block.permutation.withState("lc:ticks_until_power_off", 1));

		isPowered = true;
	}

	if (!isPowered) return;

	const blockAbove = block.above();

	if (!blockAbove || !blockAbove.hasTag("mechanical_door")) return;

	blockAbove.setPermutation(blockAbove.permutation.withState("lc:ticks_until_power_off", 2));
}

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const { block, player } = arg;

	if (!player) return;
	if (!isWrench(player.getComponent("equippable")?.getEquipment(mc.EquipmentSlot.Mainhand))) return;

	const detectRedstone = block.permutation.getState("lc:detect_redstone") === true;

	block.setPermutation(block.permutation.withState("lc:detect_redstone", !detectRedstone));

	player.playSound("random.click");

	if (detectRedstone) {
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.doorActivator.redstoneDetectionOff",
		});
	} else {
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.doorActivator.redstoneDetectionOn",
		});

		if (player.addTag("scpdy_warned_redstone_lag")) {
			player.playSound("note.bass");

			player.sendMessage({
				translate: "scpdy.msg.doorActivator.redstoneLagWarning",
			});
		}
	}
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:door_activator", {
		onTick,
		onPlayerInteract,
	});
});
