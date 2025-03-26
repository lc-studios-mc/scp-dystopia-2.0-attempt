import * as mc from "@minecraft/server";
import * as vec3 from "@lib/utils/vec3";

type BeamType = "swing" | "slash";

const PARAM = {
	swingBeamForce: 4.3,
	swingBeamIndirectHitRadius: 1.1,
	swingBeamIndirectDamage: 3,
	swingBeamDirectDamage: 6,

	slashBeamForce: 2.35,
	slashBeamIndirectHitRadius: 1.4,
	slashBeamIndirectDamage: 4,
	slashBeamDirectDamage: 14,
} as const;

const SWING_BEAM_TYPE_ID = "lc:scpdy_slasher_beam_swing";
const SLASH_BEAM_TYPE_ID = "lc:scpdy_slasher_beam_slash";

const setRotation = (beamEntity: mc.Entity, value: mc.Vector3): void => {
	beamEntity.setProperty("lc:rotation_x", value.x);
	beamEntity.setProperty("lc:rotation_y", value.y);
	beamEntity.setProperty("lc:rotation_z", value.z);
};

const setBeamSource = (beamEntity: mc.Entity, player: mc.Player): void => {
	beamEntity.setDynamicProperty("sourceId", player.id);
};

const getBeamSource = (beamEntity: mc.Entity): mc.Player | undefined => {
	try {
		const id = beamEntity.getDynamicProperty("sourceId");
		if (typeof id !== "string") return;

		const entity = mc.world.getEntity(id);
		if (!entity) return;
		if (!(entity instanceof mc.Player)) return;

		return entity;
	} catch {
		return undefined;
	}
};

const applyIndirectDamageAt = (
	location: mc.DimensionLocation,
	type: BeamType,
	source?: mc.Player,
	excludeFromIndirectDamage?: mc.Entity[],
): void => {
	const nearbyEntities = location.dimension.getEntities({
		closest: 5,
		maxDistance: type === "swing" ? 2 : 3,
		location: location,
	});

	for (let i = 0; i < nearbyEntities.length; i++) {
		const entity = nearbyEntities[i]!;

		if (entity === source) continue;
		if (excludeFromIndirectDamage?.includes(entity)) continue;

		entity.applyDamage(
			type === "swing" ? PARAM.swingBeamIndirectDamage : PARAM.slashBeamIndirectDamage,
			{
				cause: mc.EntityDamageCause.entityAttack,
				damagingEntity: source,
			},
		);
	}
};

const spawnHitParticleAt = (location: mc.DimensionLocation): void => {
	location.dimension.spawnParticle("lc:scpdy_slasher_beam_hit_emitter", location);
};

const hitAndRemoveBeamEntity = (
	beamEntity: mc.Entity,
	type: BeamType,
	hitLoc: mc.Vector3,
	source?: mc.Player,
	excludeFromIndirectDamage?: mc.Entity[],
) => {
	try {
		beamEntity.clearVelocity();
		applyIndirectDamageAt(
			Object.assign(hitLoc, { dimension: beamEntity.dimension }),
			type,
			source,
			excludeFromIndirectDamage,
		);
	} finally {
		spawnHitParticleAt(Object.assign(hitLoc, { dimension: beamEntity.dimension }));
		beamEntity.remove();
	}
};

const isGlassBlock = (block?: mc.Block): block is mc.Block => {
	if (!block) return false;
	if (block.typeId === "minecraft:glass") return true;
	if (block.typeId === "minecraft:glass_pane") return true;
	if (
		block.typeId.startsWith("minecraft:") &&
		(block.typeId.endsWith("stained_glass") || block.typeId.endsWith("stained_glass_pane"))
	)
		return true;

	return false;
};

const breakGlassVertically = (block?: mc.Block): void => {
	if (!mc.world.gameRules.mobGriefing) return;
	if (!block) return;

	const tryToBreakGlassAt = (location: mc.Vector3): boolean => {
		if (!isGlassBlock(block.dimension.getBlock(location))) return false;

		const xyzString = vec3.toString2(location);

		mc.system.run(() => {
			block.dimension.runCommand(`setblock ${xyzString} air destroy`);
		});

		return true;
	};

	if (!tryToBreakGlassAt({ x: block.x, y: block.y, z: block.z })) return;
	tryToBreakGlassAt({ x: block.x, y: block.y - 1, z: block.z });
	tryToBreakGlassAt({ x: block.x, y: block.y + 1, z: block.z });
};

export const shootSlasherSwingBeam = (player: mc.Player): void => {
	const rot = player.getRotation();
	const dir = player.getViewDirection();
	const origin = vec3.add(
		vec3.getRelativeToHead(player.getHeadLocation(), dir, {
			y: -0.17,
			z: 0.9,
		}),
		player.getVelocity(),
	);

	const blockAtOrigin = player.dimension.getBlock(origin);
	if (blockAtOrigin?.isSolid) {
		const loc = Object.assign(origin, { dimension: player.dimension });
		spawnHitParticleAt(loc);
		applyIndirectDamageAt(loc, "swing", player);
		return;
	}

	const force = vec3.chain(vec3.FORWARD).mul(PARAM.swingBeamForce).changeDir(dir).done();

	const entity = player.dimension.spawnEntity(SWING_BEAM_TYPE_ID, origin);

	setBeamSource(entity, player);

	setRotation(entity, {
		x: rot.x,
		y: rot.y,
		z: 0,
	});

	entity.applyImpulse(force);

	mc.system.runTimeout(() => {
		try {
			if (!entity.isValid) return;
			if (vec3.length(entity.getVelocity()) <= 0.1) {
				hitAndRemoveBeamEntity(
					entity,
					"swing",
					Object.assign(entity.location, { dimension: entity.dimension }),
					player,
				);
				return;
			}
			entity.setProperty("lc:is_visible", true);
		} catch {}
	}, 2);
};

export const shootSlasherSlashBeam = (player: mc.Player): void => {
	const rot = player.getRotation();
	const dir = player.getViewDirection();
	const origin = vec3.add(
		vec3.getRelativeToHead(player.getHeadLocation(), dir, {
			x: -0.1,
			y: 0,
			z: 0.9,
		}),
		vec3.mul(player.getVelocity(), 1.5),
	);

	const blockAtOrigin = player.dimension.getBlock(origin);
	if (blockAtOrigin?.isSolid) {
		const loc = Object.assign(origin, { dimension: player.dimension });
		spawnHitParticleAt(loc);
		applyIndirectDamageAt(loc, "slash", player);
		breakGlassVertically(blockAtOrigin);
		return;
	}

	const force = vec3.chain(vec3.FORWARD).mul(PARAM.slashBeamForce).changeDir(dir).done();

	const entity = player.dimension.spawnEntity(SLASH_BEAM_TYPE_ID, origin);

	setBeamSource(entity, player);

	setRotation(entity, {
		x: rot.x,
		y: rot.y,
		z: -85,
	});

	entity.applyImpulse(force);

	mc.system.runTimeout(() => {
		try {
			if (!entity.isValid) return;
			if (vec3.length(entity.getVelocity()) <= 0.1) {
				hitAndRemoveBeamEntity(
					entity,
					"slash",
					Object.assign(entity.location, { dimension: entity.dimension }),
					player,
				);
				return;
			}
			entity.setProperty("lc:is_visible", true);
		} catch {}
	}, 2);
};

mc.world.afterEvents.projectileHitEntity.subscribe((event) => {
	try {
		const isSwingBeam = event.projectile.typeId === SWING_BEAM_TYPE_ID;
		const isSlashBeam = event.projectile.typeId === SLASH_BEAM_TYPE_ID;

		if (!isSwingBeam && !isSlashBeam) return;

		if (event.projectile.getDynamicProperty("isTimedOut") === true) return;

		const source = getBeamSource(event.projectile);
		const hitEntity = event.getEntityHit().entity;

		if (source === hitEntity) return;

		event.projectile.setDynamicProperty("isTimedOut", true); // No multi-target hit

		if (hitEntity) {
			hitEntity.applyDamage(
				isSwingBeam ? PARAM.swingBeamDirectDamage : PARAM.slashBeamDirectDamage,
				{
					cause: mc.EntityDamageCause.entityAttack,
					damagingEntity: source,
				},
			);
		}

		hitAndRemoveBeamEntity(
			event.projectile,
			isSwingBeam ? "swing" : "slash",
			event.location,
			source,
			hitEntity ? [hitEntity] : undefined,
		);
	} catch {}
});

mc.world.afterEvents.projectileHitBlock.subscribe((event) => {
	try {
		const isSwingBeam = event.projectile.typeId === SWING_BEAM_TYPE_ID;
		const isSlashBeam = event.projectile.typeId === SLASH_BEAM_TYPE_ID;

		if (!isSwingBeam && !isSlashBeam) return;

		if (event.projectile.getDynamicProperty("isTimedOut") === true && event.projectile.isValid) {
			event.projectile.remove();
			return;
		}

		const source = getBeamSource(event.projectile);

		hitAndRemoveBeamEntity(
			event.projectile,
			isSwingBeam ? "swing" : "slash",
			event.location,
			source,
		);

		if (isSlashBeam) breakGlassVertically(event.getBlockHit().block);
	} catch {}
});

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		event.entity.setDynamicProperty("isTimedOut", true);
		event.entity.remove();
	},
	{
		entityTypes: [SWING_BEAM_TYPE_ID, SLASH_BEAM_TYPE_ID],
		eventTypes: ["timeout"],
	},
);
