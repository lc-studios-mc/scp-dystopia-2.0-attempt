import * as mc from "@minecraft/server";
import "./+mag";
import { getContainerSlot } from "@lib/utils/miscUtils";

export type EquipMagArgs = {
  player: mc.Player;
  inventoryContainer: mc.Container;
  offhandSlot: mc.ContainerSlot;
  magItemTypeId: string;
  force?: boolean;
};

export function equipMag(args: EquipMagArgs): boolean {
  const { player, inventoryContainer, offhandSlot, magItemTypeId, force } = args;

  if (offhandSlot.hasItem() && offhandSlot.typeId === magItemTypeId) return true;

  const magItemSlot = getContainerSlot(inventoryContainer, (slot) => {
    return slot.hasItem() && slot.typeId === magItemTypeId;
  });

  if (!magItemSlot) return false;

  const offhandItem = offhandSlot.getItem();

  if (!force && offhandItem && !offhandItem.hasTag("scpdy:mag")) return false;

  if (offhandItem) {
    mc.system.run(() => {
      player.getComponent("inventory")?.container?.addItem(offhandItem);
    });
  }

  const magItem = magItemSlot.getItem()!;
  offhandSlot.setItem(magItem);
  magItemSlot.setItem();

  player.dimension.playSound("scpdy.gun.magazine.equip", player.location);

  return true;
}
