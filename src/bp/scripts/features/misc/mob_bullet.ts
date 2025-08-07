import {
	playBulletHitSound,
	spawnBulletHitParticle,
	spawnBulletHole,
	spawnBulletTraceParticle,
} from "@/features/bullets/effects";
import { config } from "@/features/config/config";
import { Vec3 } from "@lc-studios-mc/scripting-utils";
import * as vec3 from "@lib/utils/vec3";
import { world } from "@minecraft/server";

const isBlockBreakable = (type: string): boolean => {
	if (type === "lc:scpdy_bulletproof_glass") return false;
	if (type.endsWith("glass")) return true;
	if (type.endsWith("glass_pane")) return true;
	if (type.endsWith("sign")) return true;
	return false;
};

world.afterEvents.entitySpawn.subscribe((e) => {
	if (!e.entity.typeId.startsWith("lc:scpdy_bullet")) return;

	e.entity.dimension.spawnParticle("lc:scpdy_muzzle_flash_particle", e.entity.location);
	e.entity.dimension.spawnParticle("lc:scpdy_muzzle_smoke_emitter", e.entity.location);
});

world.afterEvents.projectileHitBlock.subscribe((e) => {
	if (!e.projectile.typeId.startsWith("lc:scpdy_bullet")) return;

	spawnBulletHitParticle(e.dimension, e.location, e.hitVector);
	playBulletHitSound(e.dimension, e.location);

	if (Math.random() > 0.5) {
		spawnBulletTraceParticle(
			e.dimension,
			e.location,
			e.hitVector,
			e.source?.location ? Vec3.distance(e.source.location, e.location) / 2 : 3,
		);
	}

	const createBulletHole = !config.disableBulletHoles;
	if (createBulletHole) {
		const bulletHoleLocation = new Vec3(e.hitVector).scale(-1).scale(0.03).add(e.location);
		spawnBulletHole(e.dimension, bulletHoleLocation, e.getBlockHit().face);
	}

	const hitBlock = e.getBlockHit().block;

	if (!world.gameRules.mobGriefing) return;
	if (!isBlockBreakable(hitBlock.typeId)) return;

	e.dimension.runCommand(`setblock ${vec3.toString2(hitBlock.location)} air destroy`);
});
