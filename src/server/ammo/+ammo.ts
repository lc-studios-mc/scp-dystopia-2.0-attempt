import * as mc from "@minecraft/server";
import { getAmmoTypeInfo, getAmmoType } from "./ammo";

function onUse(arg: mc.ItemComponentUseEvent): void {
  const ammoItemStack = arg.itemStack;

  if (!ammoItemStack) return;

  const ammoType = getAmmoType(ammoItemStack);

  if (!ammoType) throw new Error(`Ammo type of ${ammoItemStack.typeId} is undefined.`);

  const ammoTypeInfo = getAmmoTypeInfo(ammoType);
  const equippable = arg.source.getComponent("equippable");

  if (!equippable) return;

  const loadableItemStack = equippable.getEquipment(mc.EquipmentSlot.Offhand);

  if (!loadableItemStack || !loadableItemStack.hasTag("scpdy:ammo_loadable")) {
    arg.source.onScreenDisplay.setActionBar({
      translate: "scpdy.actionHint.ammo.noLoadableInOffhand",
    });
    return;
  }

  const loadableAmmoType = getAmmoType(loadableItemStack);

  if (!loadableAmmoType) throw new Error(`Ammo type of ${loadableItemStack.typeId} is undefined.`);

  if (loadableAmmoType !== ammoType) {
    arg.source.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.ammo.wrongAmmoType" });
    return;
  }

  const loadableDurability = loadableItemStack.getComponent("durability");

  if (!loadableDurability) throw new Error("Durability component of loadable item is missing.");

  if (loadableDurability.damage <= 0) {
    arg.source.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.ammo.fullyLoaded" });
    return;
  }

  // Load ammo

  const loadAmount = Math.min(
    ammoTypeInfo.maxBatchLoad,
    ammoItemStack.amount,
    loadableDurability.damage,
  );

  loadableDurability.damage -= loadAmount;

  equippable.setEquipment(mc.EquipmentSlot.Offhand, loadableItemStack);

  if (ammoItemStack.amount - loadAmount > 1) {
    ammoItemStack.amount -= loadAmount;
    equippable.setEquipment(mc.EquipmentSlot.Mainhand, ammoItemStack);
  } else {
    equippable.setEquipment(mc.EquipmentSlot.Mainhand, undefined);
  }

  const fullyLoaded = loadableDurability.damage <= 0;

  if (fullyLoaded) {
    arg.source.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.ammo.fullyLoaded" });
  } else {
    const currentLoad = loadableDurability.maxDurability - loadableDurability.damage;
    const displayText = `${currentLoad} / ${loadableDurability.maxDurability}`;
    arg.source.onScreenDisplay.setActionBar(displayText);
  }

  arg.source.dimension.playSound(ammoTypeInfo.loadSoundId, arg.source.getHeadLocation());
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent("scpdy:ammo", {
    onUse,
  });
});
