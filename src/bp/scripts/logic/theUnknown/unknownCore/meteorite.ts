import { randomFloat } from "@lib/utils/mathUtils";
import { ensureType } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

export const METEORITE_ENTITY_TYPE = "lc:scpdy_unknown_core_meteorite";

function getFallLocation(meteorite: mc.Entity): mc.Vector3 {
	const fallbackFallLoc =
		ensureType(meteorite.getDynamicProperty("fallbackFallLoc",), "Vector3",) ?? meteorite.location;

	const targetEntityId = ensureType(meteorite.getDynamicProperty("targetEntityId",), "string",);

	if (targetEntityId === undefined) return fallbackFallLoc;

	const target = mc.world.getEntity(targetEntityId,);

	if (!target) return fallbackFallLoc;

	let velocity = target.getVelocity();

	const velocityLength = vec3.length(velocity,);

	velocity.y = 0;
	velocity = vec3.normalize(velocity,);
	velocity = vec3.mul(velocity, velocityLength * randomFloat(3, 10,),);

	const fallLocXZ = vec3.add(
		vec3.add(target.location, velocity,),
		vec3.mul(vec3.random(), randomFloat(-3, 3,),),
	);

	const raycastHit = meteorite.dimension.getBlockFromRay(
		{
			x: fallLocXZ.x,
			y: 330,
			z: fallLocXZ.z,
		},
		vec3.DOWN,
		{
			excludeTypes: ["minecraft:barrier"],
			maxDistance: 500,
		},
	);

	if (!raycastHit) {
		return target.location;
	}

	return vec3.add(raycastHit.block.location, raycastHit.faceLocation,);
}

function onSpawnDebug(meteorite: mc.Entity): void {
	const nearestPlayer = meteorite.dimension.getPlayers({
		closest: 1,
		location: meteorite.location,
	},)[0];

	if (!nearestPlayer) return;

	meteorite.setDynamicProperty("targetEntityId", nearestPlayer.id,);
}

function onStartFallDelayTimer(meteorite: mc.Entity): void {
	const fallLoc = getFallLocation(meteorite,);

	meteorite.tryTeleport(fallLoc,);
	meteorite.dimension.spawnParticle("lc:scpdy_unknown_core_meteorite_marker_particle", fallLoc,);
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		switch (event.eventId) {
			case "unknown_core_meteorite:spawn_debug":
				onSpawnDebug(event.entity,);
				break;
			case "unknown_core_meteorite:start_fall_delay_timer":
				onStartFallDelayTimer(event.entity,);
				break;
		}
	},
	{
		entityTypes: [METEORITE_ENTITY_TYPE],
	},
);
