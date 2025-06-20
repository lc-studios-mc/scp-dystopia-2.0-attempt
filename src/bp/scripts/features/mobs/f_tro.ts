import * as mc from "@minecraft/server";

const TRO_ENTITY_TYPE = "lc:scpdy_f_tro";

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;
		if (Number(entity.getComponent("health")?.currentValue) <= 0) return;

		const target = entity.target;
		if (!target) return;

		entity.triggerEvent("lc:start_anger");
		entity.triggerEvent("lc:start_combat:gun_and_melee");
	},
	{
		entityTypes: [TRO_ENTITY_TYPE],
		eventTypes: ["lc:on_target_acquired"],
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;
		if (Number(entity.getComponent("health")?.currentValue) <= 0) return;

		entity.triggerEvent("lc:stop_anger");
		entity.triggerEvent("lc:stop_combat");
	},
	{
		entityTypes: [TRO_ENTITY_TYPE],
		eventTypes: ["lc:on_target_escape"],
	},
);
