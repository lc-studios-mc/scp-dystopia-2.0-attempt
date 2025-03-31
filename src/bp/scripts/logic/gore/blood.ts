import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { BLOOD_ENTITY_TYPE } from "./shared";

export function spreadBlood(dimension: mc.Dimension, location: mc.Vector3, fast?: boolean): void {
	let spawnLoc: mc.Vector3;

	const raycastHit = dimension.getBlockFromRay(location, vec3.DOWN, { maxDistance: 10 });

	if (raycastHit) {
		spawnLoc = vec3.add(raycastHit.block.location, raycastHit.faceLocation);
		spawnLoc = vec3.add(spawnLoc, { x: 0, y: 0.05, z: 0 });
	} else {
		spawnLoc = {
			x: location.x,
			y: location.y - 9.5,
			z: location.z,
		};
	}

	const bloodEntity = dimension.spawnEntity(BLOOD_ENTITY_TYPE, spawnLoc);

	if (fast === true) {
		bloodEntity.triggerEvent("blood:start_spreading_fast");
	} else {
		bloodEntity.triggerEvent("blood:start_spreading_slow");
	}
}

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		event.deadEntity.remove();
	},
	{
		entityTypes: [BLOOD_ENTITY_TYPE],
	},
);
