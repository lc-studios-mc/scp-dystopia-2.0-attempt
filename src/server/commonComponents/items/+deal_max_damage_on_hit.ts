import * as mc from "@minecraft/server";

function onHitEntity(arg: mc.ItemComponentHitEntityEvent): void {
  try {
    const maxHealth = arg.hitEntity.getComponent("health")?.effectiveMax;

    arg.hitEntity.applyDamage(maxHealth ?? 99999999, {
      cause: mc.EntityDamageCause.override,
    });
  } catch {}
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent("scpdy:deal_max_damage_on_hit", {
    onHitEntity,
  });
});
