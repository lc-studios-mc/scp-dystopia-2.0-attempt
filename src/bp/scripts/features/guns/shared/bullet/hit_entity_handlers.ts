import * as mc from "@minecraft/server";
import type { BulletHitEntityHandler } from ".";
import { spawnBulletHitParticle } from "./effects";
import { randf, Vec3 } from "@lc-studios-mc/scripting-utils";
import type { BulletDamageFunction } from "./damage_functions";

export const createBasicBulletHitEntityHandler = (opts: {
	damageFunction: BulletDamageFunction;
	damageCause: mc.EntityDamageCause;
	removeKnockbackWithReversedForce?: boolean;
	maxPenetrations?: number;
	disableHeadshotSound?: boolean;
	disableHitmarkerSound?: boolean;
}): BulletHitEntityHandler => {
	return (instance, e, hitEntity) => {
		if (hitEntity instanceof mc.Player && !mc.world.gameRules.pvp) return;

		spawnBulletHitParticle(e.dimension, e.location, e.hitVector);

		const isHeadshot = Vec3.distance(e.location, hitEntity.getHeadLocation()) <= 0.46;
		const traveledDistance = Vec3.distance(e.location, instance.options.origin);

		let damaged = false;

		try {
			const damage = opts.damageFunction({
				options: instance.options,
				hitEntity,
				isHeadshot,
				traveledDistance,
			});

			damaged = hitEntity.applyDamage(damage, {
				cause: opts.damageCause,
				damagingEntity: instance.options.source,
			});
		} catch (error) {}

		// Try to remove knockback by applying reversed force
		if (damaged && opts.removeKnockbackWithReversedForce) {
			// Reference: https://gist.github.com/xDefcon/cf649567165734ab54795ab49d33ba6e#file-config-yml-L37
			const baseForceHorizontal = 0.4;

			const flatDirToSource = new Vec3(instance.options.source.location)
				.sub({ ...hitEntity.location, y: instance.options.source.location.y })
				.normalize();

			const force = Vec3.changeDir({ x: 0, y: 0, z: baseForceHorizontal }, flatDirToSource);

			hitEntity.applyKnockback(
				{
					x: force.x,
					z: force.z,
				},
				-0,
			);
		}

		instance.hitEntityCount++;
		if (instance.hitEntityCount >= (opts.maxPenetrations ?? 1)) {
			instance.isValid = false;
			e.projectile.remove();
		}

		if (!damaged) return;

		if (isHeadshot && !opts.disableHeadshotSound) {
			const hitLoc = hitEntity.getHeadLocation();
			e.dimension.playSound("scpdy.gun.headshot", hitLoc, {
				volume: 1.7,
			});
		}

		if (!opts.disableHitmarkerSound) {
			instance.options.source.playSound("scpdy.gun.hitmarker", {
				pitch: isHeadshot ? 1.2 : randf(0.98, 1.03),
			});
		}
	};
};
