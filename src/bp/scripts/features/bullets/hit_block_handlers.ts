import { config } from "@/features/config/config";
import { Vec3 } from "@lc-studios-mc/scripting-utils";
import type { BulletHitBlockHandler } from ".";
import {
	playBulletHitSound,
	spawnBulletHitParticle,
	spawnBulletHole,
	spawnBulletTraceParticle,
} from "./effects";

export const createBasicBulletHitBlockHandler = (opts?: {
	disableBulletHole?: boolean;
	disableBulletTrace?: boolean;
}): BulletHitBlockHandler => {
	return (instance, e) => {
		// This may result in "unloaded chunk" error
		try {
			if (!e.getBlockHit().block.isValid) return;
		} catch {
			return;
		}

		spawnBulletHitParticle(e.dimension, e.location, e.hitVector);
		playBulletHitSound(e.dimension, e.location);

		if (!opts?.disableBulletHole && !config.disableBulletHoles) {
			const bulletHoleLocation = new Vec3(e.hitVector).scale(-1).scale(0.03).add(e.location);
			spawnBulletHole(e.dimension, bulletHoleLocation, e.getBlockHit().face);
		}

		if (!opts?.disableBulletTrace) {
			const srcLoc = instance.options.muzzleLocation ?? instance.options.origin;
			spawnBulletTraceParticle(
				e.dimension,
				e.location,
				Vec3.normalize(Vec3.sub(e.location, srcLoc)),
				Vec3.distance(e.location, srcLoc) / 2,
			);
		}
	};
};
