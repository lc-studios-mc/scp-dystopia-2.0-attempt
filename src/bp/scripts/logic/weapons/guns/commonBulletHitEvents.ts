import * as vec3 from "@lib/utils/vec3";
import { OnBulletHitBlockEvent } from "./bullet";

export const BREAK_GLASS_AND_END_SEQUENCE: OnBulletHitBlockEvent = {
	type: "callback",
	condition(event, sharedState) {
		const hitBlock = event.getBlockHit().block;

		if (hitBlock.typeId === "minecraft:glass") return true;
		if (hitBlock.typeId === "minecraft:glass_pane") return true;
		if (
			hitBlock.typeId.startsWith("minecraft:") &&
			(hitBlock.typeId.endsWith("stained_glass") ||
				hitBlock.typeId.endsWith("stained_glass_pane"))
		) {
			return true;
		}

		return false;
	},
	callback(event, sharedState) {
		const hitBlock = event.getBlockHit().block;
		const xyz = vec3.toString2(hitBlock.location);

		event.dimension.runCommand(`setblock ${xyz} air destroy`);

		sharedState.stopCurrentEventSequence = true;

		event.projectile.remove();
	},
} as const;
