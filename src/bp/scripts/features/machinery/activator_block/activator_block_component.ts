import { flattenCoordinates, unflattenToCoordinates } from "@/utils/misc";
import { isHoldingWrench } from "@/utils/wrench";
import * as mc from "@minecraft/server";
import { ActivatorBlockEvents } from "./events";

/**
 * Sets the power level of an Activator Block.
 * @param activatorBlock - Activator Block.
 * @param powerLevel - Level of the power. (min: `0`, max: `15`, default: `15`)
 * @returns Whether the operation was successful.
 */
export function setPowerLevel(activatorBlock: mc.Block, powerLevel = 15): boolean {
	if (!activatorBlock.isValid) return false;
	if (!activatorBlock.hasTag("lc:activator")) return false;

	activatorBlock.setPermutation(_setPowerLevelState(activatorBlock.permutation, powerLevel));

	return true;
}

const STATE = {
	powerLevelMajor: "lc:power_level_major",
	powerLevelMinor: "lc:power_level_minor",
	detectRedstone: "lc:detect_redstone",
} as const;

const POWER_LEVEL_DECREASE_INTERVAL = 8;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:activator_block", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	onTick({ block }) {
		const detectRedstone = Boolean(block.permutation.getState(STATE.detectRedstone));

		const currentPowerLevel = getPowerLevelState(block.permutation);

		let newPowerLevel = 0;

		if (currentPowerLevel > 0 && mc.system.currentTick % POWER_LEVEL_DECREASE_INTERVAL === 0) {
			newPowerLevel = currentPowerLevel - 1;
		}

		const isRedstoneDetected = detectRedstone && checkRedstonePower(block);
		if (isRedstoneDetected && newPowerLevel === 0) {
			newPowerLevel = 1;
		}

		if (currentPowerLevel !== newPowerLevel) {
			block.setPermutation(_setPowerLevelState(block.permutation, newPowerLevel));
		}

		if (currentPowerLevel > 0 || newPowerLevel > 0) {
			ActivatorBlockEvents.emit("onTickPower", { block, powered: newPowerLevel > 0 });
		}
	},
	onPlayerInteract({ block, dimension, player }) {
		if (!player) return;

		if (!isHoldingWrench(player)) {
			player.onScreenDisplay.setActionBar({ translate: "scpdy.misc.text.wrenchIsRequired" });
			return;
		}

		const detectRedstone = Boolean(block.permutation.getState(STATE.detectRedstone));

		block.setPermutation(block.permutation.withState(STATE.detectRedstone, !detectRedstone));

		player.playSound("random.click");

		if (detectRedstone) {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.activatorBlock.text.redstoneDetection.off",
			});
		} else {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.activatorBlock.text.redstoneDetection.on",
			});

			if (player.addTag("scpdy_warned_activator_redstone_detection_lag")) {
				mc.system.runTimeout(() => {
					if (!player.isValid) return;

					player.sendMessage({
						translate: "scpdy.activatorBlock.text.redstoneDetection.warn",
					});

					player.playSound("note.bass");
				}, 15);
			}
		}
	},
};

function checkRedstonePower(block: mc.Block): boolean {
	if (Number(block.getRedstonePower()) > 0) return true;
	if (Number(block.below()?.getRedstonePower()) > 0) return true;
	return false;
}

function getPowerLevelState(permutation: mc.BlockPermutation): number {
	const major = Number(permutation.getState(STATE.powerLevelMajor));
	const minor = Number(permutation.getState(STATE.powerLevelMinor));
	return flattenCoordinates(major, minor);
}

export function _setPowerLevelState(
	permutation: mc.BlockPermutation,
	powerLevel: number,
): mc.BlockPermutation {
	const { major, minor } = unflattenToCoordinates(powerLevel);

	return permutation
		.withState(STATE.powerLevelMajor, major)
		.withState(STATE.powerLevelMinor, minor);
}
