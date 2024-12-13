import * as mc from "@minecraft/server";

function isConnecTable(block?: mc.Block): boolean {
  if (!block) return false;
  return block.hasTag("connec_table");
}

function updateConnections(
  block: mc.Block,
  permutation: mc.BlockPermutation,
  isDestroyed: boolean,
): void {}

function onPlace(arg: mc.BlockComponentOnPlaceEvent): void {
  updateConnections(arg.block, arg.block.permutation, false);
}

function onPlayerDestroy(arg: mc.BlockComponentPlayerDestroyEvent): void {
  updateConnections(arg.block, arg.destroyedBlockPermutation, true);
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.blockComponentRegistry.registerCustomComponent("scpdy:connec_table", {
    onPlace,
    onPlayerDestroy,
  });
});
