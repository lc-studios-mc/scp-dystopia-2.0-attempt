import type { AttachmentContext } from "@/features/gun_attachment/attachment_context";
import { console, randf, resolveRangeFloat, Vec3 } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";

export type BulletInstance = {
	readonly options: FireBulletOptions;
	readonly projectile: mc.Entity;
	hitEntityCount: number;
	isValid: boolean;
};

export type BulletHitBlockHandler = (
	instance: BulletInstance,
	event: mc.ProjectileHitBlockAfterEvent,
) => void;

export type BulletHitEntityHandler = (
	instance: BulletInstance,
	event: mc.ProjectileHitEntityAfterEvent,
	hitEntity: mc.Entity,
) => void;

export type FireBulletOptions = {
	attachmentContext: AttachmentContext;
	dimension: mc.Dimension;
	direction: mc.Vector3;
	origin: mc.Vector3;
	projectileType: string;
	source: mc.Player;
	flyForce?: number;
	muzzleLocation?: mc.Vector3;
	quantity?: number;
	uncertainy?: number;
	onHitBlock: BulletHitBlockHandler;
	onHitEntity: BulletHitEntityHandler;
};

const bulletInstancesById = new Map<string, BulletInstance>();

const fireBulletProjectile = (opts: FireBulletOptions): void => {
	const uncertainy = opts.uncertainy === undefined ? 0 : randf(-opts.uncertainy, opts.uncertainy);

	const force = resolveRangeFloat(opts.flyForce);

	const bulletDirection = new Vec3(opts.direction).rotateDeg(Vec3.random(-1, 1), uncertainy);

	const impulse = new Vec3(Vec3.forward).scale(force).changeDir(bulletDirection);

	const projectile = opts.dimension.spawnEntity(opts.projectileType, opts.origin);

	projectile.applyImpulse(impulse);

	bulletInstancesById.set(projectile.id, {
		options: opts,
		hitEntityCount: 0,
		isValid: true,
		projectile,
	});
};

export const fireBullet = (opts: FireBulletOptions): void => {
	const quantity = opts.quantity ?? 1;

	for (let i = 0; i < quantity; i++) {
		fireBulletProjectile(opts);
	}
};

mc.world.afterEvents.projectileHitBlock.subscribe((e) => {
	if (!e.projectile.isValid) return;

	const bulletInstance = bulletInstancesById.get(e.projectile.id);
	if (!bulletInstance) return;
	if (!bulletInstance.isValid) return;

	try {
		bulletInstance.options.onHitBlock(bulletInstance, e);
	} catch (error) {
		console.warn("Error in custom bullet block hit callback:", error);
		bulletInstance.isValid = false;
	}
});

mc.world.afterEvents.projectileHitEntity.subscribe((e) => {
	if (!e.projectile.isValid) return;

	const bulletInstance = bulletInstancesById.get(e.projectile.id);
	if (!bulletInstance) return;
	if (!bulletInstance.isValid) return;

	const hitEntity = e.getEntityHit().entity;
	if (!hitEntity) return;
	if (!hitEntity.isValid) return;
	if (hitEntity === bulletInstance.options.source) return;

	try {
		bulletInstance.options.onHitEntity(bulletInstance, e, hitEntity);
	} catch (error) {
		console.warn("Error in custom bullet entity hit callback:", error);
		bulletInstance.isValid = false;
	}
});
