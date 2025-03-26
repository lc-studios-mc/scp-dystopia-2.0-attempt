import * as mc from "@minecraft/server";
import * as vec3 from "@lib/utils/vec3";
import { spawnGoreExplosion } from "@logic/gore/gibs";
import { randomInt } from "@lib/utils/mathUtils";

export const SCP427_1_ENTITY_TYPE = "lc:scpdy_scp427_1";

export function chainsawStun(scp427_1: mc.Entity): void {
	if (scp427_1.typeId !== SCP427_1_ENTITY_TYPE) return;

	const chainsawStunTick = scp427_1.getProperty("lc:chainsaw_stun_tick") as number;

	if (chainsawStunTick <= 0) {
		scp427_1.triggerEvent("scp427_1:become_stunned_by_chainsaw");
	}

	scp427_1.setProperty("lc:chainsaw_stun_tick", 10);
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		const { entity } = event;

		const itemStack = new mc.ItemStack("lc:scpdy_scp427_1_flesh_raw", randomInt(1, 3));

		entity.dimension.spawnItem(itemStack, entity.location);

		spawnGoreExplosion(entity.dimension, vec3.add(entity.location, vec3.UP));
		entity.remove();
	},
	{
		entityTypes: [SCP427_1_ENTITY_TYPE],
		eventTypes: ["gib"],
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		const { entity } = event;

		if (!entity.isValid) return;
		if (vec3.length(entity.getVelocity()) > 1.5) return;

		const chainsawStunTick = entity.getProperty("lc:chainsaw_stun_tick") as number;

		if (chainsawStunTick > 0) return;

		if (!entity.target) return;

		const dist = vec3.distance(entity.target.location, entity.location);
		const impulse = vec3.mul(vec3.sub(entity.target.location, entity.location), dist / 8);

		entity.applyImpulse(impulse);
	},
	{
		entityTypes: [SCP427_1_ENTITY_TYPE],
		eventTypes: ["scp427_1:on_target_inside_melee_range"],
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		const { entity } = event;

		const chainsawStunTick = entity.getProperty("lc:chainsaw_stun_tick") as number;

		if (chainsawStunTick === 1) {
			entity.triggerEvent("scp427_1:become_free");
			entity.setProperty("lc:chainsaw_stun_tick", 0);
		} else if (chainsawStunTick > 1) {
			entity.setProperty("lc:chainsaw_stun_tick", chainsawStunTick - 1);
		}
	},
	{
		entityTypes: [SCP427_1_ENTITY_TYPE],
		eventTypes: ["scp427_1:decrease_chainsaw_stun_tick"],
	},
);
