import * as mc from "@minecraft/server";

function beforeOnPlayerPlace(arg: mc.BlockComponentPlayerPlaceBeforeEvent): void {
  arg.cancel = true;
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.blockComponentRegistry.registerCustomComponent("scpdy:cannot_be_placed_by_player", {
    beforeOnPlayerPlace,
  });
});
