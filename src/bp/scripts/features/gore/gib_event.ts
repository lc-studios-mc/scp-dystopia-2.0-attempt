import * as mc from "@minecraft/server";
import { spawnGoreExplosion } from "./gibs";
import * as vec3 from "@/utils/vec3";

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
			spawnGoreExplosion(entity.dimension, location);
			entity.remove();
		} catch {}
	},
	{
		eventTypes: ["lc:gib"],
	},
);
