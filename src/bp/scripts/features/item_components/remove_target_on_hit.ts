import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:remove_target_on_hit", {
		onHitEntity(arg) {
			if (arg.hitEntity.typeId === "minecraft:player") {
				arg.hitEntity.kill();
				return;
			}

			try {
				arg.hitEntity.remove();
			} catch {}
		},
	});
});
