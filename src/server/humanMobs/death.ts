import * as mc from "@minecraft/server";
import { getHumanMobLootData, HumanMobLootData } from "./loot";
import { isEntityDead } from "@lib/utils/entityUtils";
import { spawnGoreExplosion } from "@server/gore/gibs";
import * as vec3 from "@lib/utils/vec3";
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

  const isOverkill = damage > entity.getComponent("health")!.effectiveMax;
  const explode =
    cause === mc.EntityDamageCause.entityExplosion || cause === mc.EntityDamageCause.blockExplosion;

  if (isOverkill || explode || damagingEntity?.matches({ families: ["scp096"] })) {
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
