import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:kill_target_on_hit", {
		onHitEntity(arg) {
			try {
				arg.hitEntity.kill();
			} catch {}
		},
	});
});
