import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

export function getRiseLocation(scp106: mc.Entity): mc.Vector3 {
	if (!scp106.target) {
		return vec3.add(scp106.location, vec3.UP);
	}

	const targetLoc = scp106.target.location;

	const result =
		getRiseLocationBelow(scp106.dimension, {
			x: targetLoc.x + 1,
			y: targetLoc.y,
			z: targetLoc.z,
		}) ??
		getRiseLocationBelow(scp106.dimension, {
			x: targetLoc.x - 1,
			y: targetLoc.y + 0.2,
			z: targetLoc.z,
		}) ??
		getRiseLocationBelow(scp106.dimension, {
			x: targetLoc.x,
			y: targetLoc.y + 0.2,
			z: targetLoc.z + 1,
		}) ??
		getRiseLocationBelow(scp106.dimension, {
			x: targetLoc.x,
			y: targetLoc.y + 0.2,
			z: targetLoc.z - 1,
		});

	return result ?? targetLoc;
}

function getRiseLocationBelow(dimension: mc.Dimension, location: mc.Vector3): mc.Vector3 | null {
	const block = dimension.getBlockBelow(location, { maxDistance: 3 })?.above();
	if (!block) return null;
	if (!block.isAir) return null;
	return block.bottomCenter();
}
