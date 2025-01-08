import * as mc from "@minecraft/server";

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent("scpdy:dont_get_durability_damage_on_hit", {
    onBeforeDurabilityDamage(arg) {
      arg.durabilityDamage = 0;
    },
  });
});
