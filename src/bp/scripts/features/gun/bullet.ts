import * as mc from "@minecraft/server";
import type { GunStats } from "./types";
import type { AttachmentContext } from "../gun_attachment/attachment_context";
import { console, randf, resolveRangeFloat, resolveRangeInt, Vec3 } from "@lc-studios-mc/scripting-utils";
import type { GunDamageStrategy } from "./strategies/types";
import { playBulletHitSound, spawnBulletHitParticle, spawnBulletHole } from "./bullet_effects";

type FireBulletArgs = {
	source: mc.Player;
	dimension: mc.Dimension;
	origin: mc.Vector3;
	direction: mc.Vector3;
	isAds: boolean;
	gunStats: GunStats;
	attachmentContext: AttachmentContext;
	damageStrategy: GunDamageStrategy;
};

interface BulletInstance {
	args: FireBulletArgs;
	hitsUntilRemoval: number;
	invalid: boolean;
	projectile: mc.Entity;
}

const bulletInstancesById = new Map<string, BulletInstance>();

const fireBulletProjectile = (args: FireBulletArgs): void => {
	const uncertainy = resolveRangeFloat(
		args.isAds ? args.gunStats.bulletUncertainyAds : args.gunStats.bulletUncertainyHipfire,
	);

	const force = resolveRangeFloat(args.isAds ? args.gunStats.bulletForceAds : args.gunStats.bulletForceHipfire);

	const bulletDirection = new Vec3(args.direction).rotateDeg(Vec3.random(), uncertainy);

	const impulse = new Vec3(Vec3.forward).scale(force).changeDir(bulletDirection);

	const projectile = args.dimension.spawnEntity(args.gunStats.bulletEntityType, args.origin);

	projectile.applyImpulse(impulse);

	bulletInstancesById.set(projectile.id, {
		args,
		hitsUntilRemoval: resolveRangeInt(args.gunStats.bulletMaxEntityHits),
		invalid: false,
		projectile,
	});
};

export const fireBullet = (args: FireBulletArgs): void => {
	const quantity = resolveRangeInt(args.gunStats.bulletQuantity);

	for (let i = 0; i < quantity; i++) {
		fireBulletProjectile(args);
	}
};

mc.world.afterEvents.projectileHitBlock.subscribe((e) => {
	if (!e.projectile.isValid) return;

	const bulletInstance = bulletInstancesById.get(e.projectile.id);
	if (!bulletInstance) return;
	if (bulletInstance.invalid) return;

	try {
		spawnBulletHitParticle(e.dimension, e.location, e.hitVector);
		playBulletHitSound(e.dimension, e.location);

		const shouldCreateBulletHole = bulletInstance.args.gunStats.bulletCreateHole;

		if (shouldCreateBulletHole) {
			const bulletHoleLocation = new Vec3(e.hitVector).scale(-1).scale(0.03).add(e.location);
			spawnBulletHole(e.dimension, bulletHoleLocation, e.getBlockHit().face);
		}

		e.projectile.remove();
	} catch (error) {
		console.warn(`Error on custom bullet hit block: ${error}`);
	}
});

mc.world.afterEvents.projectileHitEntity.subscribe((e) => {
	if (!e.projectile.isValid) return;

	const bulletInstance = bulletInstancesById.get(e.projectile.id);
	if (!bulletInstance) return;
	if (bulletInstance.invalid) return;

	const hitEntity = e.getEntityHit().entity;
	if (!hitEntity) return;
	if (!hitEntity.isValid) return;
	if (hitEntity === bulletInstance.args.source) return;
	if (hitEntity instanceof mc.Player && !mc.world.gameRules.pvp) return;

	spawnBulletHitParticle(e.dimension, e.location, e.hitVector);

	const isHeadshot = Vec3.distance(e.location, hitEntity.getHeadLocation()) <= 0.46;
	const traveledDistance = Vec3.distance(e.location, bulletInstance.args.origin);

	let damaged = false;

	try {
		const damage = bulletInstance.args.damageStrategy.calculateDamage({
			attachmentContext: bulletInstance.args.attachmentContext,
			gunStats: bulletInstance.args.gunStats,
			hitEntity,
			isHeadshot,
			traveledDistance,
		});

		damaged = hitEntity.applyDamage(damage, {
			cause: bulletInstance.args.gunStats.bulletDamageCause,
			damagingEntity: bulletInstance.args.source,
		});

		bulletInstance.hitsUntilRemoval--;

		if (bulletInstance.hitsUntilRemoval <= 0) {
			bulletInstance.invalid = true;
			e.projectile.remove();
		}
	} catch (error) {
		console.warn(`Error on custom bullet hit entity: ${error}`);
	}

	if (!damaged) return;

	// Headshot sound
	if (isHeadshot) {
		const hitLoc = hitEntity.getHeadLocation();
		e.dimension.playSound("scpdy.gun.headshot", hitLoc, {
			volume: 1.7,
		});
	}

	// Hitmarker sounds
	bulletInstance.args.source.playSound("scpdy.gun.hitmarker", {
		pitch: isHeadshot ? 1.2 : randf(0.98, 1.03),
	});
});
