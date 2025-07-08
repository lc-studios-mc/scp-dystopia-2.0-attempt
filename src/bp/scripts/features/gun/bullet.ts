import * as mc from "@minecraft/server";
import type { GunStats } from "./types";
import type { AttachmentContext } from "../gun_attachment/attachment_context";
import { console, randf, resolveRangeFloat, resolveRangeInt, Vec3 } from "@lc-studios-mc/scripting-utils";
import type { GunDamageStrategy } from "./strategies/types";

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

const spawnBulletHole = (dimension: mc.Dimension, location: mc.Vector3, face: mc.Direction): void => {
	let type: string;
	switch (face) {
		case mc.Direction.Down:
		case mc.Direction.Up:
			type = "lc:scpdy_bullet_hole_particle_xz";
			break;
		case mc.Direction.North:
		case mc.Direction.South:
			type = "lc:scpdy_bullet_hole_particle_xy";
			break;
		case mc.Direction.East:
		case mc.Direction.West:
			type = "lc:scpdy_bullet_hole_particle_yz";
			break;
	}

	dimension.spawnParticle(type, location);
};

const spawnBulletHitBlockVisualEffects = (
	dimension: mc.Dimension,
	location: mc.Vector3,
	direction?: mc.Vector3,
): void => {
	dimension.playSound("scpdy.projectile.bullet.ricochet", location, {
		volume: 1.3,
	});

	const particleMolangVarMap = new mc.MolangVariableMap();
	const dir = direction ?? Vec3.zero;
	particleMolangVarMap.setVector3("direction", Vec3.scale(dir, -1));

	dimension.spawnParticle("minecraft:basic_crit_particle", location, particleMolangVarMap);
};

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
		spawnBulletHitBlockVisualEffects(e.dimension, e.location, e.hitVector);

		if (bulletInstance.args.gunStats.bulletCreateHole) {
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
