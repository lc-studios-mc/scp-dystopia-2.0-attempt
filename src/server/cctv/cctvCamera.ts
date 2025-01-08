import * as mc from "@minecraft/server";
import * as math from "@lib/utils/mathUtils";
import { CAMERA_ENTITY_TYPE } from "./shared";

export function getHeadRotation(cctvCamera: mc.Entity): mc.Vector2 {
  const x = cctvCamera.getProperty("lc:head_rotation_x") as number;
  const y = cctvCamera.getProperty("lc:head_rotation_y") as number;

  return { x, y };
}

export function setHeadRotation(cctvCamera: mc.Entity, value: mc.Vector2): void {
  const x = math.clamp(value.x, -180.0, 180.0);
  const y = math.clamp(value.y, -180.0, 180.0);

  cctvCamera.setProperty("lc:head_rotation_x", x);
  cctvCamera.setProperty("lc:head_rotation_y", y);
}

mc.world.afterEvents.entityLoad.subscribe((event) => {
  if (event.entity.typeId !== CAMERA_ENTITY_TYPE) return;
  event.entity.setProperty("lc:is_active", false);
});
