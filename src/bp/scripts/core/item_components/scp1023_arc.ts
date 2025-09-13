import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:scp1023_arc", {
		onHitEntity(arg) {
			try {
				arg.hitEntity.applyDamage(694581019072, {
					cause: mc.EntityDamageCause.override,
					damagingEntity: arg.attackingEntity,
				});
			} catch {}
		},
	});
});
