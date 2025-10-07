import { config } from "@/features/config/config";
import { getBlockRaycastHitLocation } from "@/utils/direction";
import { randf, randi } from "@/utils/math";
import { isVector3 } from "@/utils/vec3";
import * as vec3 from "@/utils/vec3";
import * as mc from "@minecraft/server";
import { spawnGibChop, spawnGibHead, spawnGibLimb } from "./gibs";

const BLOOD_EXPLOSION_PARTICLE_ID = "lc:scpdy_blood_explosion_particle";
const BLOOD_SPLASH_SMALL_PARTICLE_ID = "lc:scpdy_blood_splash_small_particle";
const BLOOD_IMMEDIATE_FLY_PARTICLE_ID = "lc:scpdy_blood_immediate_fly_particle";
const BLOOD_MIST_PARTICLE_ID = "lc:scpdy_blood_mist_emitter";
const BLOOD_STAIN_1_XY_PARTICLE_ID = "lc:scpdy_blood_stain_1_particle_xy";
const BLOOD_STAIN_1_XZ_PARTICLE_ID = "lc:scpdy_blood_stain_1_particle_xz";
const BLOOD_STAIN_1_YZ_PARTICLE_ID = "lc:scpdy_blood_stain_1_particle_yz";
const BLOOD_STAIN_2_XY_PARTICLE_ID = "lc:scpdy_blood_stain_2_particle_xy";
const BLOOD_STAIN_2_XZ_PARTICLE_ID = "lc:scpdy_blood_stain_2_particle_xz";
const BLOOD_STAIN_2_YZ_PARTICLE_ID = "lc:scpdy_blood_stain_2_particle_yz";

export type SpawnGoreOpts = {
	dimension: mc.Dimension;
	location: mc.Vector3;
	disableSkullGib?: boolean;
	disableExtraGibs?: boolean;
};

export function spawnGoreExplosion(opts: SpawnGoreOpts): void {
	const dim = opts.dimension;
	const origin = opts.location;

	dim.playSound("scpdy.gore.explode", origin, {
		pitch: randf(0.97, 1.03),
		volume: 1.1,
	});

	spawnBloodExplosionParticle(dim, origin);

	const noExpensive = config.disableExpensiveGoreEffects;

	if (!noExpensive) {
		dim.spawnParticle("lc:scpdy_small_flesh_piece_burst_emitter", origin);
	}

	dim.spawnParticle(BLOOD_MIST_PARTICLE_ID, origin);

	if (!noExpensive && !opts.disableExtraGibs) {
		spawnGibHead(dim, origin);

		mc.system.runTimeout(() => {
			spawnGibLimb(dim, origin);
		}, 1);

		mc.system.runTimeout(() => {
			spawnGibChop(dim, origin);
		}, 2);

		mc.system.runTimeout(() => {
			if (Math.random() > 0.5) {
				spawnGibChop(dim, origin);
			} else {
				spawnGibLimb(dim, origin);
			}
		}, 3);
	}

	if (noExpensive) return;

	const immediateSplatterAmount = randi(8, 12);

	for (let i = 0; i < immediateSplatterAmount; i++) {
		let dir: mc.Vector3;
		if (i > 6) {
			dir = {
				x: randf(-1, 1),
				y: randf(-0.2, 0.3),
				z: randf(-1, 1),
			};
		} else if (i > 3) {
			dir = {
				x: randf(-0.8, 0.8),
				y: 1,
				z: randf(-0.8, 0.8),
			};
		} else {
			dir = {
				x: randf(-0.6, 0.6),
				y: -1,
				z: randf(-0.6, 0.6),
			};
		}

		const raycastHit = dim.getBlockFromRay(origin, dir, {
			includePassableBlocks: false,
			includeLiquidBlocks: false,
			maxDistance: 7.6,
		});

		spawnBloodImmediateFlyParticle(dim, origin, dir);

		if (!raycastHit) continue;

		const hitLoc = vec3.add(raycastHit.block.location, raycastHit.faceLocation);

		mc.system.runTimeout(
			() => {
				const bloodStainLoc = vec3.add(
					hitLoc,
					vec3.scale(vec3.normalize(vec3.sub(origin, hitLoc)), 0.04),
				);

				spawnBloodStain(dim, bloodStainLoc, raycastHit.face);

				if (raycastHit.face === mc.Direction.Up) return;
				if (Math.random() > 0.6) return;

				const fleshDripLoc = vec3.add(
					hitLoc,
					vec3.scale(vec3.normalize(vec3.sub(origin, hitLoc)), 0.1),
				);

				dim.spawnParticle("lc:scpdy_small_flesh_piece_drip_emitter", fleshDripLoc);
			},
			Math.round(vec3.distance(origin, hitLoc)),
		);
	}
}

export function spawnBloodExplosionParticle(dimension: mc.Dimension, location: mc.Vector3): void {
	dimension.spawnParticle(BLOOD_EXPLOSION_PARTICLE_ID, location);
}

export function spawnSmallBloodSplashParticle(dimension: mc.Dimension, location: mc.Vector3): void {
	dimension.spawnParticle(BLOOD_SPLASH_SMALL_PARTICLE_ID, location);
}

export function spawnBloodImmediateFlyParticle(
	dimension: mc.Dimension,
	location: mc.Vector3,
	dir: mc.Vector3,
): void {
	const vars = new mc.MolangVariableMap();
	vars.setVector3("direction", dir);

	dimension.spawnParticle(BLOOD_IMMEDIATE_FLY_PARTICLE_ID, location, vars);
}

export function spawnBloodStain(
	dimension: mc.Dimension,
	location: mc.Vector3,
	face: mc.Direction,
): void {
	const altVariant = Math.random() > 0.5;

	let type: string;
	switch (face) {
		case mc.Direction.Down:
		case mc.Direction.Up:
			type = altVariant ? BLOOD_STAIN_2_XZ_PARTICLE_ID : BLOOD_STAIN_1_XZ_PARTICLE_ID;
			break;
		case mc.Direction.North:
		case mc.Direction.South:
			type = altVariant ? BLOOD_STAIN_2_XY_PARTICLE_ID : BLOOD_STAIN_1_XY_PARTICLE_ID;
			break;
		case mc.Direction.East:
		case mc.Direction.West:
			type = altVariant ? BLOOD_STAIN_2_YZ_PARTICLE_ID : BLOOD_STAIN_1_YZ_PARTICLE_ID;
			break;
	}

	const vars = new mc.MolangVariableMap();
	const size = randf(0.2, 0.3);
	vars.setFloat("size_x", size);
	vars.setFloat("size_y", size);

	dimension.spawnParticle(type, location, vars);
}

mc.system.beforeEvents.startup.subscribe((e) => {
	e.customCommandRegistry.registerCommand(
		{
			name: "scpdy:gore_test",
			description: "Spawns gore effect",
			permissionLevel: mc.CommandPermissionLevel.Any,
			optionalParameters: [
				{
					name: "location",
					type: mc.CustomCommandParamType.Location,
				},
			],
		},
		(origin, locationParam) => {
			const location =
				locationParam ?? origin.sourceEntity?.getHeadLocation() ?? origin.sourceBlock?.center();

			if (!isVector3(location)) return;

			const dimension = origin.sourceEntity?.dimension ?? origin.sourceBlock?.dimension;
			if (!dimension) return;

			mc.system.run(() => {
				spawnGoreExplosion({
					dimension,
					location,
				});
			});

			return {
				status: mc.CustomCommandStatus.Success,
				message: "Successfully sent a request to spawn gore effect",
			};
		},
	);
});

mc.world.afterEvents.entityHurt.subscribe((e) => {
	if (!e.hurtEntity.isValid) return;
	if (!e.hurtEntity.matches({ families: ["gibbable_on_death"] })) return;

	const health = e.hurtEntity.getComponent("health");
	if (!health) return;
	if (health.currentValue > 0) return;

	const doesDamageCausePreventGib =
		e.damageSource.cause === mc.EntityDamageCause.selfDestruct ||
		e.damageSource.cause === mc.EntityDamageCause.void ||
		e.damageSource.cause === mc.EntityDamageCause.fire ||
		e.damageSource.cause === mc.EntityDamageCause.fireTick ||
		e.damageSource.cause === mc.EntityDamageCause.campfire;

	if (doesDamageCausePreventGib) return;

	const isExplosionDamage =
		e.damageSource.cause === mc.EntityDamageCause.blockExplosion ||
		e.damageSource.cause === mc.EntityDamageCause.entityExplosion;

	const instantGib = e.hurtEntity.matches({ families: ["instant_gib_on_death"] });

	const isBigDamage = Math.max(15, health.effectiveMax) <= e.damage;

	const doGib = isExplosionDamage || instantGib || isBigDamage;

	if (doGib) {
		try {
			e.hurtEntity.triggerEvent("lc:gib");
		} catch {}
		return;
	}

	tryTransformIntoCorpseOrGib(e.hurtEntity);
});

function tryTransformIntoCorpseOrGib(entity: mc.Entity): void {
	try {
		entity.triggerEvent("lc:transform_into_dead");
	} catch {
		try {
			entity.triggerEvent("lc:gib");
		} catch {}
	}
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		try {
			const location = vec3.midpoint(entity.location, entity.getHeadLocation());
			spawnGoreExplosion({
				dimension: entity.dimension,
				location,
			});
			entity.remove();
		} catch {}
	},
	{
		eventTypes: ["lc:gib"],
	},
);
