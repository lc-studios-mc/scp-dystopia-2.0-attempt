import * as mc from "@minecraft/server";
import { SCP106_ENTITY_TYPE_ID, SCP106_TRAIL_ENTITY_TYPE_ID } from "./shared";

mc.system.afterEvents.scriptEventReceive.subscribe(
	(event) => {
		if (!event.sourceEntity) return;
		if (!event.sourceEntity.isValid) return;
		if (event.sourceEntity.typeId !== SCP106_TRAIL_ENTITY_TYPE_ID) return;

		onUpdate(event.sourceEntity);
	},
	{
		namespaces: ["scpdy_scp106_trail"],
	},
);

function onUpdate(entity: mc.Entity): void {
	entity.dimension.spawnParticle("lc:scpdy_scp106_trail_emitter", entity.location);

	const entities = entity.dimension.getEntities({
		closest: 10,
		maxDistance: 0.8,
		location: entity.location,
		excludeFamilies: ["inanimate"],
		excludeTypes: [SCP106_TRAIL_ENTITY_TYPE_ID, SCP106_ENTITY_TYPE_ID],
	});

	for (const entity of entities) {
		try {
			entity.addEffect("wither", 60, { amplifier: 0 });
		} catch {}
	}
}
