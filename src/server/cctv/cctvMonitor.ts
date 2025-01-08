import * as mc from "@minecraft/server";
import { Player as UiPlayer } from "@minecraft/server-ui/node_modules/@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import * as vec3 from "@lib/utils/vec3";
import * as cctvServerMod from "./cctvServer";
import { removeCctvUsage, setCctvUsage } from "./tick";
import { ensureType } from "@lib/utils/miscUtils";
import {
  LINKER_ITEM_TYPE,
  MONITOR_ENTITY_TYPE,
  SERVER_ENTITY_TYPE,
  TABLET_ITEM_TYPE,
} from "./shared";

export function getCctvServerId(cctvMonitor: mc.Entity): string | undefined {
  return ensureType(cctvMonitor.getDynamicProperty("serverId"), "string");
}

export function setCctvServerId(cctvMonitor: mc.Entity, cctvServerId?: string): void {
  cctvMonitor.setDynamicProperty("serverId", cctvServerId);
}

function onSelectCameraToUse(
  player: mc.Player,
  cctvServer: mc.Entity,
  cctvCamera: mc.Entity,
  cctvMonitor: mc.Entity,
): void {
  function stopCondition(): boolean {
    try {
      if (player.getComponent("health")!.currentValue <= 0) return true;
      if (cctvServer.getComponent("health")!.currentValue <= 0) return true;
      if (cctvCamera.getComponent("health")!.currentValue <= 0) return true;
      if (cctvMonitor.getComponent("health")!.currentValue <= 0) return true;
      if (vec3.distance(player.location, cctvMonitor.location) > 3) return true;
      if (player.isSneaking) return true;

      return false;
    } catch {
      return true;
    }
  }

  setCctvUsage({
    player,
    cctvServer,
    cctvCamera,
    stopCondition,
  });
}

async function showCameraList(
  player: mc.Player,
  cctvServer: mc.Entity,
  cctvMonitor: mc.Entity,
): Promise<void> {
  const cameraRefs = cctvServerMod.getCameraRefs(cctvServer);

  const cameraListForm = new ActionFormData()
    .title({
      translate: "scpdy.form.cctvMonitor.chooseCamera.title",
    })
    .body({
      translate: "scpdy.form.cctvMonitor.chooseCamera.body",
      with: [cameraRefs.length.toString()],
    });

  const buttons: { label: mc.RawMessage; callback: () => Promise<void> }[] = [];

  for (let cameraRefIndex = 0; cameraRefIndex < cameraRefs.length; cameraRefIndex++) {
    const cameraRef = cameraRefs[cameraRefIndex]!;
    const cameraEntity = mc.world.getEntity(cameraRef.entityId);

    if (!cameraEntity || cameraEntity.dimension.id !== cctvServer.dimension.id) {
      buttons.push({
        label: {
          translate: "scpdy.form.cctvMonitor.chooseCamera.button.cameraElementError",
          with: [cameraRefIndex.toString()],
        },
        async callback() {
          player.sendMessage({
            translate: "scpdy.msg.cctvMonitor.cameraUnavailable",
          });
        },
      });
    } else {
      buttons.push({
        label: {
          translate: "scpdy.form.cctvMonitor.chooseCamera.button.cameraElement",
          with: [
            cameraRefIndex.toString(),
            cameraEntity.nameTag.trim()
              ? cameraEntity.nameTag
              : `${vec3.toString(vec3.round(cameraEntity.location))}`,
          ],
        },
        async callback() {
          onSelectCameraToUse(player, cctvServer, cameraEntity, cctvMonitor);
        },
      });
    }
  }

  buttons.push({
    label: {
      translate: "scpdy.form.cctvMonitor.failedToGetServer.removeLinkButton",
    },
    async callback() {
      setCctvServerId(cctvMonitor, undefined);

      removeCctvUsage(player);

      player.sendMessage({ translate: "scpdy.msg.cctvMonitor.removedServerLink" });
    },
  });

  for (const button of buttons) {
    cameraListForm.button(button.label);
  }

  const response = await cameraListForm.show(<UiPlayer>player);

  if (response.canceled || response.selection === undefined) {
    return;
  }

  await buttons[response.selection]!.callback();
}

function onInteract(player: mc.Player, cctvMonitor: mc.Entity): void {
  if (vec3.distance(player.location, cctvMonitor.location) > 3) {
    player.sendMessage({
      translate: "scpdy.msg.cctvMonitor.tooFarFromMonitor",
    });
    return;
  }

  const cctvServerId = getCctvServerId(cctvMonitor);

  if (cctvServerId === undefined) {
    new ActionFormData()
      .title({ translate: "scpdy.form.cctvMonitor.notLinkedToServer.title" })
      .body({ translate: "scpdy.form.cctvMonitor.notLinkedToServer.body" })
      .button({ translate: "scpdy.form.misc.close" })
      .show(<UiPlayer>player);

    return;
  }

  const cctvServer = mc.world.getEntity(cctvServerId);

  if (!cctvServer || cctvServer.typeId !== SERVER_ENTITY_TYPE) {
    new ActionFormData()
      .title({ translate: "scpdy.form.cctvMonitor.failedToGetServer.title" })
      .body({ translate: "scpdy.form.cctvMonitor.failedToGetServer.body" })
      .button({ translate: "scpdy.form.cctvMonitor.failedToGetServer.removeLinkButton" })
      .show(<UiPlayer>player)
      .then((response) => {
        if (response.canceled) return;

        if (response.selection === 0) {
          setCctvServerId(cctvMonitor);

          player.sendMessage({ translate: "scpdy.msg.cctvMonitor.removedServerLink" });
        }
      });

    return;
  }

  showCameraList(player, cctvServer, cctvMonitor);
}

mc.world.afterEvents.playerInteractWithEntity.subscribe((event) => {
  if (event.target.typeId !== MONITOR_ENTITY_TYPE) return;
  if (event.itemStack?.typeId === LINKER_ITEM_TYPE) return;
  if (event.itemStack?.typeId === TABLET_ITEM_TYPE) return;
  if (event.player.isSneaking) return;
  onInteract(event.player, event.target);
});
