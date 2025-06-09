import { directionToRotation, reversedDirection, rotationToDirection } from "@lib/utils/miscUtils";
import { getClearanceLevel } from "@lib/utils/scpdyUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { emitControlDevicePulse, getControlDeviceMode } from "../utils";
import { MachineryInputEvents } from "@/features/machinery/input/events";
import { _getModeStringFromIndex } from "@/features/machinery/input/mode";

const KEYPAD_ENTITY_TYPE_ID = "lc:scpdy_keypad";

mc.world.afterEvents.playerInteractWithEntity.subscribe(({ player, target: keypad }) => {
	if (keypad.typeId !== KEYPAD_ENTITY_TYPE_ID) return;
	if (keypad.getProperty("lc:is_on") === true) return;

	const o5Clearance = getKeypadO5Clearance(keypad);

	if (o5Clearance && getClearanceLevel(player) < 6) {
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.misc.o5PermissionRequired",
		});
		playIncorrectBuzzer(keypad, player);
		return;
	}

	keypadInteractionAsync(player, keypad).catch(() => {
		player.sendMessage({ translate: "scpdy.msg.misc.somethingWentWrong" });
	});
});

async function keypadInteractionAsync(player: mc.Player, keypad: mc.Entity): Promise<void> {
	const formData = new ModalFormData()
		.title({ translate: "scpdy.form.keypad.use.title" })
		.label({ translate: "scpdy.form.keypad.use.note" })
		.textField(
			{ translate: "scpdy.form.keypad.use.passwordField.label" },
			{ translate: "scpdy.form.keypad.use.passwordField.placeholder" },
		)
		.submitButton({ translate: "scpdy.form.keypad.use.submitButton" });

	const hint = getKeypadHint(keypad);
	if (hint.trim() !== "") {
		formData.label({ translate: "scpdy.form.keypad.use.hint", with: [hint] });
	}

	const response = await formData.show(player);

	if (!keypad.isValid) return;

	if (response.canceled) return;
	if (!response.formValues) return;

	const enteredPassword = String(response.formValues[1]);
	const realPassword = getKeypadPassword(keypad);

	if (enteredPassword !== realPassword) {
		player.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.misc.accessDenied" });
		playIncorrectBuzzer(keypad, player);
		return;
	}

	player.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.misc.accessGranted" });
	keypad.dimension.playSound("scpdy.interact.keypad.correct", keypad.location, {
		volume: 1.2,
	});

	turnOn(keypad, player);
}

function turnOn(keypad: mc.Entity, player: mc.Player): void {
	keypad.triggerEvent("turn_on");

	MachineryInputEvents.emit("onActivate", {
		mode: _getModeStringFromIndex(getControlDeviceMode(keypad)),
		dimension: keypad.dimension,
		location: keypad.location,
		entity: keypad,
		clearanceLevel: getKeypadO5Clearance(keypad) ? 6 : -1,
		pulseDirection: rotationToDirection({ x: 0, y: Number(keypad.getProperty("lc:rotation_y")) }),
		source: player,
	});
}

function playIncorrectBuzzer(keypad: mc.Entity, player: mc.Player): void {
	const loudBuzzer = getKeypadLoudIncorrectBuzzer(keypad);
	if (loudBuzzer) {
		keypad.dimension.playSound("scpdy.interact.keypad.incorrect_loud", keypad.location, {
			volume: 1.5,
		});

		player.runCommand("camerashake add @s 0.16 0.9 rotational");
	} else {
		keypad.dimension.playSound("scpdy.interact.keypad.incorrect", keypad.location, {
			volume: 1.1,
		});
	}
}

function getKeypadSourceId(keypad: mc.Entity): string | undefined {
	const sourceId = keypad.getDynamicProperty("sourceId");
	if (typeof sourceId !== "string") return;
	return sourceId;
}

function setKeypadSourceId(keypad: mc.Entity, value?: string): void {
	keypad.setDynamicProperty("sourceId", value);
}

export function getKeypadPassword(keypad: mc.Entity): string {
	return String(keypad.getDynamicProperty("password"));
}

export function setKeypadPassword(keypad: mc.Entity, value: string): void {
	keypad.setDynamicProperty("password", value);
}

export function getKeypadHint(keypad: mc.Entity): string {
	return String(keypad.getDynamicProperty("hint"));
}

export function setKeypadHint(keypad: mc.Entity, value: string): void {
	keypad.setDynamicProperty("hint", value);
}

export function getKeypadLoudIncorrectBuzzer(keypad: mc.Entity): boolean {
	return keypad.getDynamicProperty("loudIncorrectBuzzer") === true;
}

export function setKeypadLoudIncorrectBuzzer(keypad: mc.Entity, value?: boolean): void {
	keypad.setDynamicProperty("loudIncorrectBuzzer", value);
}

export function getKeypadO5Clearance(keypad: mc.Entity): boolean {
	return keypad.getDynamicProperty("o5Clearance") === true;
}

export function setKeypadO5Clearance(keypad: mc.Entity, value?: boolean): void {
	keypad.setDynamicProperty("o5Clearance", value);
}

export function attachNewKeypadEntityTo(block: mc.Block, blockFace: mc.Direction, source?: mc.Player): mc.Entity {
	const location = vec3.getRelativeLocation(
		block.bottomCenter(),
		{
			x: 0,
			y: 0.15,
			z: -0.617,
		},
		blockFace,
	);

	const entity = block.dimension.spawnEntity(KEYPAD_ENTITY_TYPE_ID, location);

	const rot = directionToRotation(reversedDirection(blockFace));

	entity.setProperty("lc:rotation_y", rot.y);

	setKeypadSourceId(entity, source?.id);

	return entity;
}

mc.world.afterEvents.entityDie.subscribe(
	({ deadEntity: keypad }) => {
		removeKeypad(keypad);
	},
	{ entityTypes: [KEYPAD_ENTITY_TYPE_ID] },
);

mc.world.afterEvents.entityHitEntity.subscribe(
	({ damagingEntity, hitEntity: keypad }) => {
		if (keypad.typeId !== KEYPAD_ENTITY_TYPE_ID) return;
		if (!keypad.isValid) return;
		if (!(damagingEntity instanceof mc.Player)) return;

		if (damagingEntity.getGameMode() !== mc.GameMode.creative && getKeypadSourceId(keypad) !== damagingEntity.id)
			return;

		keypad.dimension.playSound("scpdy.misc.computer.hit", keypad.location);
	},
	{ entityTypes: ["minecraft:player"] },
);

function removeKeypad(keypad: mc.Entity): void {
	try {
		if (mc.world.gameRules.doMobLoot) {
			const placerItem = new mc.ItemStack("lc:scpdy_keypad_placer");
			keypad.dimension.spawnItem(placerItem, keypad.location);
		}

		keypad.remove();
	} catch {}
}
