import { getEntitiesInAllDimensions, getModifiedDamageNumber } from "@lib/utils/entityUtils";
import { clamp } from "@lib/utils/mathUtils";
import { spawnBulletRicochetParticle } from "@lib/utils/scpdyUtils";
import * as vec3 from "@lib/utils/vec3";
import { CONFIG } from "@logic/config/config";
import * as mc from "@minecraft/server";

const BULLET_TYPE_OBJ = {
	default: "lc:scpdy_scriptable_bullet",
	large: "lc:scpdy_scriptable_bullet_large",
} as const;

export type BulletType = keyof typeof BULLET_TYPE_OBJ;

type OnBulletHitBlockEventSpawnRicochet = {
	type: "spawnRicochet";
};

type OnBulletHitBlockEventRemoveBullet = {
	type: "removeBullet";
};

type OnBulletHitBlockEventCallback = {
	type: "callback";
	callback: (event: mc.ProjectileHitBlockAfterEvent, sharedState: FlyingBulletSharedState) => void;
};

export type OnBulletHitBlockEvent = (
	| OnBulletHitBlockEventRemoveBullet
	| OnBulletHitBlockEventCallback
	| OnBulletHitBlockEventSpawnRicochet
) & {
	condition?: (event: mc.ProjectileHitBlockAfterEvent, sharedState: FlyingBulletSharedState) => boolean;
};

type OnBulletHitEntityEventSpawnRicochet = {
	type: "spawnRicochet";
};

type OnBulletHitEntityEventDamage = {
	type: "damageEntity";
	damage: number;
	damageCause: mc.EntityDamageCause;
	canDamageBeModified?: boolean;
	knockbackPower?: number;
};

type OnBulletHitEntityEventRemoveBullet = {
	type: "removeBullet";
};

type OnBulletHitEntityEventCallback = {
	type: "callback";
	callback: (
		event: mc.ProjectileHitEntityAfterEvent,
		hitEntity: mc.Entity,
		sharedState: FlyingBulletSharedState,
	) => void;
};

export type OnBulletHitEntityEvent = (
	| OnBulletHitEntityEventDamage
	| OnBulletHitEntityEventRemoveBullet
	| OnBulletHitEntityEventCallback
	| OnBulletHitEntityEventSpawnRicochet
) & {
	condition?: (
		event: mc.ProjectileHitEntityAfterEvent,
		hitEntity: mc.Entity,
		sharedState: FlyingBulletSharedState,
	) => boolean;
};

export type ShootOptions = {
	initialLocation: mc.Vector3;
	initialRotation?: number;
	initialVelocity: mc.Vector3;
	dimension: mc.Dimension;
	sourceEntity?: mc.Entity;
	onHitEntity?: OnBulletHitEntityEvent[];
	onHitBlock?: OnBulletHitBlockEvent[];
};

export type FlyingBulletSharedState = {
	hitBlockCount: number;
	hitEntityCount: number;
	stopCurrentEventSequence: boolean;
};

type FlyingBulletInfo = {
	bulletType: BulletType;
	shootOptions: ShootOptions;
	isInvalid: boolean;
	sharedState: FlyingBulletSharedState;
};

const FLYING_BULLET_MAP = new Map<string, FlyingBulletInfo>();

export function shootBullet(bulletType: BulletType, shootOptions: ShootOptions): void {
	const entity = shootOptions.dimension.spawnEntity(BULLET_TYPE_OBJ[bulletType], shootOptions.initialLocation, {
		initialRotation: shootOptions.initialRotation,
	});

	entity.applyImpulse(shootOptions.initialVelocity);

	FLYING_BULLET_MAP.set(entity.id, {
		bulletType,
		shootOptions,
		isInvalid: false,
		sharedState: {
			hitBlockCount: 0,
			hitEntityCount: 0,
			stopCurrentEventSequence: false,
		},
	});
}

mc.world.afterEvents.projectileHitBlock.subscribe((hitEvent) => {
	const flyingBulletInfo = FLYING_BULLET_MAP.get(hitEvent.projectile.id);

	if (!flyingBulletInfo) return;

	if (flyingBulletInfo.isInvalid) {
		try {
			hitEvent.projectile.remove();
		} catch {}

		return;
	}

	try {
		flyingBulletInfo.sharedState.stopCurrentEventSequence = false;
		flyingBulletInfo.sharedState.hitBlockCount++;

		const events = flyingBulletInfo.shootOptions.onHitBlock;

		if (!events) return;

		for (let i = 0; i < events.length; i++) {
			const event = events[i]!;

			if (event.condition !== undefined) {
				if (!event.condition(hitEvent, flyingBulletInfo.sharedState)) continue;
			}

			if (flyingBulletInfo.sharedState.stopCurrentEventSequence) return;

			if (event.type === "callback") {
				event.callback(hitEvent, flyingBulletInfo.sharedState);
			} else if (event.type === "removeBullet") {
				hitEvent.projectile.remove();
				flyingBulletInfo.isInvalid = true;
				return;
			} else if (event.type === "spawnRicochet") {
				spawnBulletRicochetParticle(hitEvent.dimension, hitEvent.location, hitEvent.hitVector);
			}
		}
	} catch (err) {
		flyingBulletInfo.isInvalid = true;
		hitEvent.projectile.remove();
		throw err;
	}
});

mc.world.afterEvents.projectileHitEntity.subscribe((hitEvent) => {
	const flyingBulletInfo = FLYING_BULLET_MAP.get(hitEvent.projectile.id);

	if (!flyingBulletInfo) return;

	if (flyingBulletInfo.isInvalid) {
		try {
			hitEvent.projectile.remove();
		} catch {}

		return;
	}

	try {
		flyingBulletInfo.sharedState.stopCurrentEventSequence = false;

		const hitEntity = hitEvent.getEntityHit().entity;

		if (!hitEntity) return;
		if (hitEntity === flyingBulletInfo.shootOptions.sourceEntity) return;

		flyingBulletInfo.sharedState.hitEntityCount++;

		const events = flyingBulletInfo.shootOptions.onHitEntity;

		if (!events) return;

		for (let i = 0; i < events.length; i++) {
			const event = events[i]!;

			if (event.condition !== undefined) {
				if (!event.condition(hitEvent, hitEntity, flyingBulletInfo.sharedState)) continue;
			}

			if (flyingBulletInfo.sharedState.stopCurrentEventSequence) return;

			if (event.type === "callback") {
				event.callback(hitEvent, hitEntity, flyingBulletInfo.sharedState);
			} else if (event.type === "removeBullet") {
				hitEvent.projectile.remove();
				flyingBulletInfo.isInvalid = true;
				return;
			} else if (event.type === "damageEntity") {
				const oldVelocity = hitEntity.getVelocity();
				const damage =
					event.canDamageBeModified === true
						? Math.max(1, getModifiedDamageNumber(event.damage, hitEntity))
						: event.damage;

				hitEntity.applyDamage(damage, {
					cause: event.damageCause,
					damagingEntity: flyingBulletInfo.shootOptions.sourceEntity,
				});

				if (CONFIG.disableKnockbackOfCertainBullets) {
					hitEntity.clearVelocity();

					const revelo: mc.Vector3 = {
						x: clamp(oldVelocity.x / 3, -0.5, 0.5),
						y: 0,
						z: clamp(oldVelocity.z / 3, -0.5, 0.5),
					};

					hitEntity.applyImpulse(revelo);

					if (event.knockbackPower === undefined) continue;

					const impulse = vec3.chain(vec3.FORWARD).scale(event.knockbackPower).changeDir(hitEvent.hitVector).done();

					hitEntity.applyImpulse(impulse);
				}
			} else if (event.type === "spawnRicochet") {
				spawnBulletRicochetParticle(hitEvent.dimension, hitEvent.location, hitEvent.hitVector);
			}
		}
	} catch (err) {
		flyingBulletInfo.isInvalid = true;
		hitEvent.projectile.remove();
		throw err;
	}
});

mc.world.afterEvents.worldLoad.subscribe(() => {
	const scriptableBullets = getEntitiesInAllDimensions({
		families: ["scriptable_bullet"],
	});

	for (let i = 0; i < scriptableBullets.length; i++) {
		const bullet = scriptableBullets[i]!;
		bullet.remove();
	}
});

mc.world.afterEvents.entityLoad.subscribe((event) => {
	if (!FLYING_BULLET_MAP.has(event.entity.id)) return;
	event.entity.remove();
});

mc.world.afterEvents.entityRemove.subscribe((event) => {
	FLYING_BULLET_MAP.delete(event.removedEntityId);
});
