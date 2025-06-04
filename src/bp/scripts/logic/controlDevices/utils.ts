import { getBlockCardinalDirection, getRelativeBlock } from "@lib/utils/blockUtils";
import { rotationToDirection } from "@lib/utils/miscUtils";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { activateRbPlaceholder, tellRbPlaceholderIsMissing } from "./rbPlaceholder";

export const CONTROL_DEVICE_MODE = {
	powerDoorActivator: 0,
	openNearestBlastDoor: 1,
	placeRedstoneBlockBelow: 2,
	placeRedstoneBlockBehind: 3,
} as const;

export type ControlDevicePulseOpts = {
	/** Clearance level of this pulse */
	clearanceLevel?: number;
	/** Leave this unset to use block's cardinal direction or entity's rotation */
	facingDirection?: mc.Direction;
	/** Player that triggered this pulse */
	source?: mc.Player;
	/** Whether this pulse should only do one thing: close the nearest blast door */
	onlyCloseBlastDoor?: boolean;
	/** How long the power sent to a Mech. Door Activator should last (max 15) */
	mechDoorActivationDuration?: number;
};

/**
 * Emit control device pulse
 * @param controlDevice Control device block or entity (button, keypad, etc.)
 * @param opts Options
 */
export function emitControlDevicePulse(controlDevice: mc.Block | mc.Entity, opts?: ControlDevicePulseOpts): boolean {
	let mode;
	try {
		mode = getControlDeviceMode(controlDevice);
	} catch {
		return false;
	}

	const originBlock =
		controlDevice instanceof mc.Block ? controlDevice : controlDevice.dimension.getBlock(controlDevice.location);

	if (!originBlock) return false;

	const dir =
		opts?.facingDirection ??
		(controlDevice instanceof mc.Block
			? getBlockCardinalDirection(controlDevice.permutation)
			: rotationToDirection(controlDevice.getRotation()));

	const isO5Access = opts?.clearanceLevel == undefined ? false : opts.clearanceLevel >= 6;

	switch (mode) {
		case CONTROL_DEVICE_MODE.powerDoorActivator:
			if (opts?.onlyCloseBlastDoor) return false;
			sendPowerToDoorActivators(getRelativeBlock(originBlock, dir, 1), opts?.mechDoorActivationDuration);
			return true;
		case CONTROL_DEVICE_MODE.openNearestBlastDoor: {
			throw new Error("Unimplemented!");
		}
		case CONTROL_DEVICE_MODE.placeRedstoneBlockBelow: {
			if (opts?.onlyCloseBlastDoor) return false;

			const result = activateRbPlaceholder(originBlock.below(3));
			if (!result && opts?.source) tellRbPlaceholderIsMissing(opts.source);

			return result;
		}
		case CONTROL_DEVICE_MODE.placeRedstoneBlockBehind: {
			if (opts?.onlyCloseBlastDoor) return false;

			const result = activateRbPlaceholder(getRelativeBlock(originBlock, dir, 2));
			if (!result && opts?.source) tellRbPlaceholderIsMissing(opts.source);

			return result;
		}
		default:
			return false;
	}
}

function sendPowerToDoorActivators(from?: mc.Block, powerLevel = 15): void {
	if (!from) return;

	tryPowerDoorActivator(from, powerLevel);
	tryPowerDoorActivator(from.above(), powerLevel);

	const b1 = from.below();

	tryPowerDoorActivator(b1, powerLevel);

	const b2 = b1?.below();

	tryPowerDoorActivator(b2, powerLevel);

	const b2n1 = b2?.north();
	const b2n2 = b2n1?.north();
	const b2s1 = b2?.south();
	const b2s2 = b2s1?.south();
	const b2w1 = b2?.west();
	const b2w2 = b2w1?.west();
	const b2e1 = b2?.east();
	const b2e2 = b2e1?.east();

	if (tryPowerDoorActivator(b2n1, powerLevel)) tryPowerDoorActivator(b2n2, powerLevel);

	if (tryPowerDoorActivator(b2s1, powerLevel)) tryPowerDoorActivator(b2s2, powerLevel);

	if (tryPowerDoorActivator(b2w1, powerLevel)) tryPowerDoorActivator(b2w2, powerLevel);

	if (tryPowerDoorActivator(b2e1, powerLevel)) tryPowerDoorActivator(b2e2, powerLevel);
}

export function addControlDeviceModeDropdownToForm(formData: ModalFormData): void {
	formData.dropdown(
		{ translate: "scpdy.form.controlDevice.modeDropdown.label" },
		[
			{ translate: "scpdy.form.controlDevice.modeDropdown.opt0" },
			{ translate: "scpdy.form.controlDevice.modeDropdown.opt1" },
			{ translate: "scpdy.form.controlDevice.modeDropdown.opt2" },
			{ translate: "scpdy.form.controlDevice.modeDropdown.opt3" },
		],
		{ defaultValueIndex: 0 },
	);
}

export function getControlDeviceMode(controlDevice: mc.Block | mc.Entity): number {
	let value;
	try {
		if (controlDevice instanceof mc.Block) {
			value = controlDevice.permutation.getState("lc:control_device_mode");
		} else if (controlDevice instanceof mc.Entity) {
			value = controlDevice.getProperty("lc:control_device_mode");
		}
	} catch {}

	if (typeof value !== "number") {
		throw new Error("Control device mode property/state is not defined");
	}

	return value;
}

export function setControlDeviceMode(controlDevice: mc.Block | mc.Entity, value: number): void {
	try {
		if (controlDevice instanceof mc.Block) {
			controlDevice.setPermutation(controlDevice.permutation.withState("lc:control_device_mode", value));
		} else if (controlDevice instanceof mc.Entity) {
			controlDevice.setProperty("lc:control_device_mode", value);
		}
	} catch {
		throw new Error("Failed to set control device mode");
	}
}

function tryPowerDoorActivator(...args: unknown[]): boolean {
	throw new Error("Door Activator is no longer available.");
}
