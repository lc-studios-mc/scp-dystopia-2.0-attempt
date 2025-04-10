import * as mc from "@minecraft/server";
import { PWR_NODE_ENTITY_TYPE_ID } from "./shared";

export function placePwrNode(
	dimension: mc.Dimension,
	location: mc.Vector3,
	direction: mc.Direction,
): void {
	dimension.playSound("place.iron", location, { pitch: 0.8, volume: 1.05 });

	const pwrNode = dimension.spawnEntity(PWR_NODE_ENTITY_TYPE_ID, location);

	setDirection(pwrNode, direction);
}

// #region get/set functions

function getDirection(pwrNode: mc.Entity): mc.Direction {
	const value = pwrNode.getDynamicProperty("attachedDirection");
	if (typeof value !== "string" || !(value in mc.Direction)) return mc.Direction.Up; // Up as fallback
	return value as mc.Direction;
}

function setDirection(pwrNode: mc.Entity, direction: mc.Direction) {
	pwrNode.setDynamicProperty("attachedDirection", direction);

	let rotX = 0;
	let rotY = 0;

	switch (direction) {
		default:
		case mc.Direction.Up:
			break;
		case mc.Direction.Down:
			rotX = 180;
			break;
		case mc.Direction.North:
			rotX = -90;
			break;
		case mc.Direction.South:
			rotX = 90;
			break;
		case mc.Direction.West:
			rotX = 90;
			rotY = 90;
			break;
		case mc.Direction.East:
			rotX = 90;
			rotY = -90;
			break;
	}

	pwrNode.setProperty("lc:rot_x", rotX);
	pwrNode.setProperty("lc:rot_y", rotY);
}

// #endregion
