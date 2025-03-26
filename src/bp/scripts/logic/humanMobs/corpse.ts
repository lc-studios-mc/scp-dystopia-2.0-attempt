import * as mc from "@minecraft/server";
import { spawnGoreExplosion } from "@logic/gore/gibs";
import { canDamageCauseBodyExplosion, HUMAN_MOB_CORPSE_TYPE_ARRAY } from "./shared";

function onCorpseEntityDie(entity: mc.Entity): void {
	spawnGoreExplosion(entity.dimension, entity.location);
	entity.remove();
}

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		if (!canDamageCauseBodyExplosion(event.damageSource.cause)) return;
		onCorpseEntityDie(event.deadEntity);
	},
	{
		entityTypes: HUMAN_MOB_CORPSE_TYPE_ARRAY,
	},
);
