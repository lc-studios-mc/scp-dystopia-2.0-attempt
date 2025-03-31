import { CONFIG } from "@logic/config/configData";
import * as mc from "@minecraft/server";
import { SCP173_ENTITY_TYPE } from "./shared";

const BLINK_START_TICK = 50;
const CAMERA_FADE_START_TICK = 52;
const TIMER_WRAP_TICK = 58;

const BLINK_CAMERA_FADE_OPTIONS: mc.CameraFadeOptions = {
	fadeColor: { red: 0.02, green: 0.02, blue: 0.02 },
	fadeTime: {
		fadeInTime: 0.05,
		holdTime: 0.5,
		fadeOutTime: 0.11,
	},
};

const SCP173_EQO_REUSE: mc.EntityQueryOptions = {
	type: SCP173_ENTITY_TYPE,
	closest: 1,
	maxDistance: 30,
};

let blinkTimer = 0;

export function isBlinkTime(): boolean {
	return blinkTimer >= BLINK_START_TICK;
}

function updateBlinkTimer(): void {
	if (blinkTimer >= TIMER_WRAP_TICK) {
		blinkTimer = 0;
		return;
	}

	blinkTimer++;
}

function playerCameraBlinking(): void {
	if (blinkTimer !== CAMERA_FADE_START_TICK) return;

	const players = mc.world.getPlayers();

	if (players.length <= 0) return;

	for (let i = 0; i < players.length; i++) {
		const player = players[i]!;

		if (player.getGameMode() === mc.GameMode.creative) continue;

		SCP173_EQO_REUSE.location = player.location;

		const scp173 = player.dimension.getEntities(SCP173_EQO_REUSE,)[0];

		if (!scp173) continue;
		if (!scp173.target) continue;

		// Blink

		player.camera.fade(BLINK_CAMERA_FADE_OPTIONS,);
	}
}

mc.world.afterEvents.worldLoad.subscribe(() => {
	mc.system.runInterval(() => {
		updateBlinkTimer();

		if (CONFIG.blinkingCameraFade) {
			playerCameraBlinking();
		}
	}, 2,);
},);
