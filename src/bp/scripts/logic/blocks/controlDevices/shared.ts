import { switchClosestBlastDoor } from "@logic/blastDoor/blastDoor";
import { tryPowerDoorActivator } from "@logic/blocks/door/doorActivator";
import * as mc from "@minecraft/server";
import { activateRbPlaceholder } from "./rbPlaceholder";

type CardinalDirection = "north" | "south" | "east" | "west";

export function onInteractControlDeviceWithWrench(block: mc.Block, player: mc.Player): void {
	const oldMode = block.permutation.getState("lc:mode",) as number;
	const newMode = oldMode < 3 ? oldMode + 1 : 0;

	block.setPermutation(block.permutation.withState("lc:mode", newMode,),);

	player.onScreenDisplay.setActionBar({
		translate: `scpdy.actionHint.controlDevice.changeMode${newMode}`,
	},);

	player.playSound("random.click",);
}

export function onActivateControlDevice(
	block: mc.Block,
	player?: mc.Player,
	clearanceLevel = -1,
): boolean {
	const mode = block.permutation.getState("lc:mode",) as number;

	switch (mode) {
		case 0:
			powerDoorActivatorsFromControlDeviceBlock(block, 12,);
			return true;
		case 1:
			return switchClosestBlastDoor(block, clearanceLevel >= 6,);
		case 2:
			if (!activateRbPlaceholderBelow(block,)) {
				player?.sendMessage({
					translate: "scpdy.msg.controlDevice.rbPlaceholderIsAbsent",
				},);
			}
			return true;
		case 3:
			if (!activateRbPlaceholderBehind(block,)) {
				player?.sendMessage({
					translate: "scpdy.msg.controlDevice.rbPlaceholderIsAbsent",
				},);

				return false;
			}
			return true;
	}

	return false;
}

function getBlockBehindControlDeviceBlock(
	controlDeviceBlock: mc.Block,
	steps = 1,
): mc.Block | undefined {
	const direction = controlDeviceBlock.permutation.getState(
		"minecraft:cardinal_direction",
	) as CardinalDirection;

	let blockBehind: mc.Block | undefined;

	switch (direction) {
		case "north":
			blockBehind = controlDeviceBlock.north(steps,);
			break;
		case "south":
			blockBehind = controlDeviceBlock.south(steps,);
			break;
		case "east":
			blockBehind = controlDeviceBlock.east(steps,);
			break;
		case "west":
			blockBehind = controlDeviceBlock.west(steps,);
			break;
		default:
			return;
	}

	if (!blockBehind) return;

	return blockBehind;
}

function powerDoorActivatorsFromControlDeviceBlock(block: mc.Block, powerLevel = 15): void {
	const blockBehind = getBlockBehindControlDeviceBlock(block,);

	if (!blockBehind) return;

	tryPowerDoorActivator(blockBehind, powerLevel,);
	tryPowerDoorActivator(blockBehind.above(), powerLevel,);

	const b1 = blockBehind.below();

	tryPowerDoorActivator(b1, powerLevel,);

	const b2 = b1?.below();

	tryPowerDoorActivator(b2, powerLevel,);

	const b2n1 = b2?.north();
	const b2n2 = b2n1?.north();
	const b2s1 = b2?.south();
	const b2s2 = b2s1?.south();
	const b2w1 = b2?.west();
	const b2w2 = b2w1?.west();
	const b2e1 = b2?.east();
	const b2e2 = b2e1?.east();

	if (tryPowerDoorActivator(b2n1, powerLevel,)) tryPowerDoorActivator(b2n2, powerLevel,);

	if (tryPowerDoorActivator(b2s1, powerLevel,)) tryPowerDoorActivator(b2s2, powerLevel,);

	if (tryPowerDoorActivator(b2w1, powerLevel,)) tryPowerDoorActivator(b2w2, powerLevel,);

	if (tryPowerDoorActivator(b2e1, powerLevel,)) tryPowerDoorActivator(b2e2, powerLevel,);
}

function activateRbPlaceholderBelow(controlDeviceBlock: mc.Block): boolean {
	const block = controlDeviceBlock.below(3,);
	return activateRbPlaceholder(block,);
}

function activateRbPlaceholderBehind(controlDeviceBlock: mc.Block): boolean {
	const block = getBlockBehindControlDeviceBlock(controlDeviceBlock, 2,);
	return activateRbPlaceholder(block,);
}
