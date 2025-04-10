import * as mc from "@minecraft/server";

export const PWR_NODE_ENTITY_TYPE_ID = "lc:scpdy_pwr_node";

export function placePwrNode(
	dimension: mc.Dimension,
	location: mc.Vector3,
	direction: mc.Direction,
): void {
	dimension.playSound("place.iron", location, { pitch: 0.8, volume: 1.05 });
}
