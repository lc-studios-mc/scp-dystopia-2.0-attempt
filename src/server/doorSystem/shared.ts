import * as mc from "@minecraft/server";

export function dropDoorItem(
  doorTypeId: string,
  dimension: mc.Dimension,
  location: mc.Vector3,
  destroyer?: mc.Player,
): void {
  if (!mc.world.gameRules.doTileDrops) return;
  if (destroyer && destroyer.getGameMode() === mc.GameMode.creative) return;

  const itemStack = new mc.ItemStack(doorTypeId, 1);

  dimension.spawnItem(itemStack, location);
}
