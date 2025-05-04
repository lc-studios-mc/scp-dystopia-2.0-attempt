import { spawnBulletRicochetParticle } from "@lib/utils/scpdyUtils";
import * as vec3 from "@lib/utils/vec3";
import { world } from "@minecraft/server";

function isBlockBreakable(type: string): boolean {
	if (type === "lc:scpdy_bulletproof_glass") return false;
	if (type.endsWith("glass")) return true;
	if (type.endsWith("glass_pane")) return true;
	if (type.endsWith("sign")) return true;
	return false;
}

world.afterEvents.entitySpawn.subscribe((event) => {
	if (!event.entity.typeId.startsWith("lc:scpdy_bullet")) return;

	event.entity.dimension.spawnParticle("lc:scpdy_muzzle_flash_particle", event.entity.location);
	event.entity.dimension.spawnParticle("lc:scpdy_muzzle_smoke_emitter", event.entity.location);
});

world.afterEvents.projectileHitBlock.subscribe((event) => {
	if (!event.projectile.typeId.startsWith("lc:scpdy_bullet")) return;

	if (
		event.dimension.getPlayers({ location: event.location, closest: 1, maxDistance: 40 })[0] !==
		undefined
	) {
		spawnBulletRicochetParticle(event.dimension, event.location, event.hitVector);
	}

	const hitBlock = event.getBlockHit().block;

	if (!world.gameRules.mobGriefing) return;
	if (!isBlockBreakable(hitBlock.typeId)) return;

	event.dimension.runCommand(`setblock ${vec3.toString2(hitBlock.location)} air destroy`);
});
