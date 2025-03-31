import * as mc from "@minecraft/server";
import { isBlinkTime } from "./blinking";
import { SCP173_ENTITY_TYPE } from "./shared";

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		if (!event.entity.isValid) return;

		const isMobile = event.entity.getProperty("lc:is_mobile",) === true;

		if (isBlinkTime()) {
			if (!isMobile) {
				event.entity.triggerEvent("scp173:become_mobile",);
			}
			return;
		}

		const isLookedAtBase = event.entity.getProperty("lc:is_looked_at_base",) === true;

		if (isLookedAtBase && isMobile) {
			event.entity.triggerEvent("scp173:become_immobile",);
		} else if (!isLookedAtBase && !isMobile) {
			event.entity.triggerEvent("scp173:become_mobile",);
		}
	},
	{
		entityTypes: [SCP173_ENTITY_TYPE],
		eventTypes: ["scp173:update_script"],
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		event.entity.target?.applyDamage(45451919, {
			cause: mc.EntityDamageCause.override,
			damagingEntity: event.entity,
		},);

		event.entity.dimension.playSound("scpdy.scp173.attack", event.entity.location, {
			volume: 1.2,
		},);
	},
	{
		entityTypes: [SCP173_ENTITY_TYPE],
		eventTypes: ["scp173:attack_target"],
	},
);
