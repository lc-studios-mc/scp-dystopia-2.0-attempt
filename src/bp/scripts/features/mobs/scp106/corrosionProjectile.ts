import * as mc from "@minecraft/server";
import { SCP106_ENTITY_TYPE_ID } from "./shared";

const CORROSION_PROJECTILE_ENTITY_TYPE_ID = "lc:scpdy_corrosion_projectile";

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		try {
			explode(entity, entity.location);
		} catch {}
	},
	{
		entityTypes: [CORROSION_PROJECTILE_ENTITY_TYPE_ID],
		eventTypes: ["bom"],
	},
);

mc.world.afterEvents.projectileHitEntity.subscribe((event) => {
	if (event.projectile.typeId !== CORROSION_PROJECTILE_ENTITY_TYPE_ID) return;
	if (!event.projectile.isValid) return;
	try {
		explode(event.projectile, event.location, event.getEntityHit().entity, event.source);
	} catch {}
});

mc.world.afterEvents.projectileHitBlock.subscribe((event) => {
	if (event.projectile.typeId !== CORROSION_PROJECTILE_ENTITY_TYPE_ID) return;
	if (!event.projectile.isValid) return;
	try {
		explode(event.projectile, event.location);
	} catch {}
});

function explode(
	projectile: mc.Entity,
	location: mc.Vector3,
	hitEntity?: mc.Entity,
	source?: mc.Entity,
): void {
	projectile.dimension.spawnParticle("lc:scpdy_corrosion_burst_emitter", location);

	try {
		const damage = mc.world.getDifficulty() === mc.Difficulty.Hard ? 9 : 6;

		if (hitEntity && hitEntity.typeId !== SCP106_ENTITY_TYPE_ID) {
			hitEntity.applyDamage(damage, {
				cause: mc.EntityDamageCause.override,
				damagingProjectile: projectile,
				damagingEntity: source,
			});

			hitEntity.addEffect("blindness", 140, { amplifier: 0 });
		}
	} catch {}

	const entities = projectile.dimension.getEntities({
		closest: 10,
		location: location,
		maxDistance: 2.4,
		excludeTypes: [SCP106_ENTITY_TYPE_ID, CORROSION_PROJECTILE_ENTITY_TYPE_ID],
	});

	for (let i = 0; i < entities.length; i++) {
		const entity = entities[i]!;

		try {
			entity.addEffect("wither", 100, { amplifier: 1 });
		} catch {}
	}

	projectile.remove();
}
