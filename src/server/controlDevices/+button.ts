import * as mc from "@minecraft/server";
import { onActivateControlDevice, onInteractControlDeviceWithWrench } from "./shared";
import { isHoldingWrench } from "@lib/utils/scpdyUtils";

function beforeOnPlayerPlace(arg: mc.BlockComponentPlayerPlaceBeforeEvent): void {
  if (!arg.player) return;

  arg.player.onScreenDisplay.setActionBar({
    translate: "scpdy.actionHint.controlDevice.changeMode0",
  });

  if (arg.player.addTag("scpdy_read_button_mode_tip")) {
    arg.player.sendMessage({
      translate: "scpdy.msg.controlDevice.modeTip",
    });
  }
}

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
  const { block, dimension, player } = arg;

  if (!player) return;

  if (isHoldingWrench(player)) {
    onInteractControlDeviceWithWrench(block, player);
    return;
  }

  const ticksUntilPowerOff = block.permutation.getState("lc:ticks_until_power_off") as number;

  if (ticksUntilPowerOff > 0) return;

  block.setPermutation(block.permutation.withState("lc:ticks_until_power_off", 5));

  dimension.playSound("scpdy.interact.button.click", block.center());

  if (!onActivateControlDevice(block, player)) {
    player.onScreenDisplay.setActionBar({
      translate: "scpdy.actionHint.misc.accessDenied",
    });
  }
}

function onTick(arg: mc.BlockComponentTickEvent): void {
  const { block } = arg;

  const ticksUntilPowerOff = block.permutation.getState("lc:ticks_until_power_off") as number;

  if (ticksUntilPowerOff <= 0) return;

  const newValue = ticksUntilPowerOff - 1;

  block.setPermutation(block.permutation.withState("lc:ticks_until_power_off", newValue));
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
  event.blockComponentRegistry.registerCustomComponent("scpdy:button", {
    beforeOnPlayerPlace,
    onPlayerInteract,
    onTick,
  });
});
