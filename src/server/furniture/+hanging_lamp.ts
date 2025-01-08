import * as mc from "@minecraft/server";

const HANGING_LAMP_TYPE_ID = "lc:scpdy_hanging_lamp";

function updateHangingLamp(block: mc.Block, isFirst = true): void {
  const blockAbove = block.above();
  const blockBelow = block.below();

  if (block.typeId === HANGING_LAMP_TYPE_ID) {
    block.setPermutation(
      block.permutation
        .withState("lc:show_base", blockAbove?.typeId !== HANGING_LAMP_TYPE_ID)
        .withState("lc:is_extension", blockBelow?.typeId === HANGING_LAMP_TYPE_ID),
    );
  }

  if (!isFirst) return;

  if (blockAbove) updateHangingLamp(blockAbove, false);

  if (blockBelow) updateHangingLamp(blockBelow, false);
}

function onPlace(arg: mc.BlockComponentOnPlaceEvent): void {
  updateHangingLamp(arg.block);
}

function onPlayerDestroy(arg: mc.BlockComponentPlayerDestroyEvent): void {
  updateHangingLamp(arg.block);
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.blockComponentRegistry.registerCustomComponent("scpdy:hanging_lamp", {
    onPlace,
    onPlayerDestroy,
  });
});
