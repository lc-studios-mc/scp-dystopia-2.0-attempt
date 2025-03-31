import { isEntityDead } from "@lib/utils/entityUtils";
import * as vec3 from "@lib/utils/vec3";
import { spawnGoreExplosion } from "@logic/gore/gibs";
import { SCP096_ENTITY_TYPE } from "@logic/scps/scp096/shared";
import { SCP173_ENTITY_TYPE } from "@logic/scps/scp173/shared";
import * as mc from "@minecraft/server";
import { getHumanMobLootData, HumanMobLootData } from "./loot";
import { HUMAN_MOB_TYPE_ARRAY } from "./shared";

function onHumanMobDie(
	entity: mc.Entity,
	damage: number,
	cause: mc.EntityDamageCause,
	lootData: HumanMobLootData,
	damagingEntity?: mc.Entity,
): void {
	if (mc.world.gameRules.doMobLoot) {
		for (const itemStack of lootData.getItemStacks()) {
			entity.dimension.spawnItem(itemStack, entity.location);
		}
	}

	const isDamageBig = damage > Math.min(30, entity.getComponent("health")!.effectiveMax);

	const isExplosionDamage = [
		mc.EntityDamageCause.entityExplosion,
		mc.EntityDamageCause.blockExplosion,
	].includes(cause);

	const shouldGoreExplode = damagingEntity?.typeId !== SCP173_ENTITY_TYPE &&
		(isDamageBig || isExplosionDamage || damagingEntity?.typeId === SCP096_ENTITY_TYPE);

	if (shouldGoreExplode) {
		spawnGoreExplosion(entity.dimension, vec3.add(entity.location, vec3.UP));
		entity.remove();
		return;
	}

	entity.triggerEvent("human:turn_into_corpse");
}

mc.world.afterEvents.entityHurt.subscribe(
	(event) => {
		if (event.damageSource.cause === mc.EntityDamageCause.selfDestruct) return;

		const lootData = getHumanMobLootData(event.hurtEntity.typeId);

		if (!lootData) return;
		if (!isEntityDead(event.hurtEntity)) return;

		onHumanMobDie(
			event.hurtEntity,
			event.damage,
			event.damageSource.cause,
			lootData,
			event.damageSource.damagingEntity,
		);
	},
	{
		entityTypes: HUMAN_MOB_TYPE_ARRAY,
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		spawnGoreExplosion(event.entity.dimension, event.entity.location);
		event.entity.remove();
	},
	{
		entityTypes: HUMAN_MOB_TYPE_ARRAY,
		eventTypes: ["human:gib"],
	},
);
