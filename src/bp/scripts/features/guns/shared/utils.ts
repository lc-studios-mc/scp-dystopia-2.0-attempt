import { randf, Vec3 } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";
import type { MagContext } from "./mag_context";

export const displayAmmoCountOfBasicMagFedGun = (opts: {
	player: mc.Player;
	inventoryAmmoCount: number;
	magContext?: MagContext;
}): void => {
	if (!opts.magContext) {
		opts.player.onScreenDisplay.setActionBar({ translate: "scpdy.gun.noMag" });
		return;
	}

	const leftAmmoColor = opts.magContext.remainingAmmoCount <= 0
		? "§c"
		: opts.magContext.expendedAmmoCount > 0
		? "§e"
		: "";
	const leftAmmoText = opts.magContext.remainingAmmoCount;
	const rightAmmoText = opts.magContext.remainingAmmoCount + opts.inventoryAmmoCount;
	const final = `${leftAmmoColor}${leftAmmoText} §8| §7${rightAmmoText}`;

	opts.player.onScreenDisplay.setActionBar(final);
};

export const applyConditionalAdsSlowness = (
	player: mc.Player,
	isAds: boolean,
	amplifier: number,
	reduceIfMoving = true,
): void => {
	if (!isAds) return;
	if (amplifier < 0) return;

	const movementVector = player.inputInfo.getMovementVector();
	const isPlayerMoving = Math.sqrt(movementVector.x ** 2 + movementVector.y ** 2) > 0;
	const modifiedAmplifier = isPlayerMoving && reduceIfMoving ? Math.min(3, amplifier) : amplifier;

	player.addEffect("slowness", 4, {
		amplifier: modifiedAmplifier,
		showParticles: false,
	});
};

export const spawnCartridgeEjectionParticle = (opts: {
	particleId: string;
	dimension: mc.Dimension;
	location: mc.Vector3;
	viewDirection: mc.Vector3;
}): void => {
	const rightDirection = Vec3.cross(opts.viewDirection, Vec3.up);

	const particleDirection = Vec3.add(
		Vec3.add(
			Vec3.scale(opts.viewDirection, -randf(1.3, 1.5)), // Go backwards
			Vec3.scale(rightDirection, randf(0.6, 0.7)), // Go right
		),
		Vec3.fromPartial({
			x: randf(-0.1, 0.1),
			y: randf(1.1, 1.3), // Go up
			z: randf(-0.1, 0.1),
		}),
	);

	const molangVarMap = new mc.MolangVariableMap();
	molangVarMap.setFloat("speed", randf(5, 6));
	molangVarMap.setVector3("direction", particleDirection);

	opts.dimension.spawnParticle(opts.particleId, opts.location, molangVarMap);
};
