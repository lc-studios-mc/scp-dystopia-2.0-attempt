import * as mc from "@minecraft/server";
import { _EVENTS, _setPowerLevelState } from "./activator_block_component";

export const ActivatorBlockEvents = _EVENTS;

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
