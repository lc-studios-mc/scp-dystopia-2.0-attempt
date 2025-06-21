import * as mc from "@minecraft/server";
import { spawnBloodExplosionParticle } from "@/features/gore/gore";
import { randf } from "@/utils/math";
import * as vec3 from "@/utils/vec3";

const THROWN_HEAD_ENTITY_TYPE = "lc:scpdy_thrown_head";

mc.world.afterEvents.projectileHitBlock.subscribe((e) => {
	if (e.projectile.typeId !== THROWN_HEAD_ENTITY_TYPE) return;

	explode(e.dimension, e.location, e.hitVector);
});

mc.world.afterEvents.projectileHitEntity.subscribe((e) => {
	if (e.projectile.typeId !== THROWN_HEAD_ENTITY_TYPE) return;

	explode(e.dimension, e.location, e.hitVector);

	const hitEntity = e.getEntityHit().entity;

	if (!hitEntity) return;

	try {
		hitEntity.addEffect("nausea", 80);
		hitEntity.triggerEvent("lc:become_dazed");
	} catch {}
});

function explode(dim: mc.Dimension, loc: mc.Vector3, dir: mc.Vector3): void {
	const particleLoc = vec3.sub(loc, dir);

	spawnBloodExplosionParticle(dim, particleLoc);

	dim.playSound("scpdy.gore.impact", loc, {
		pitch: randf(0.9, 1.1),
		volume: 1.12,
	});
}
