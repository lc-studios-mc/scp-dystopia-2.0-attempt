import * as mc from "@minecraft/server";

function onHitEntity(arg: mc.ItemComponentHitEntityEvent): void {
  if (arg.hitEntity.typeId === "minecraft:player") {
    arg.hitEntity.kill();
    return;
  }

  try {
    arg.hitEntity.remove();
  } catch {}
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent("scpdy:remove_target_on_hit", {
    onHitEntity,
  });
});
