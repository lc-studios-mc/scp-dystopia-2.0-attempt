import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:entity_remover", {
		onHitEntity(arg) {
			const source = arg.attackingEntity;
			if (!(source instanceof mc.Player)) return;

			if (source.playerPermissionLevel < mc.PlayerPermissionLevel.Operator) {
				source.onScreenDisplay.setActionBar({ translate: "scpdy.misc.only_op_may_use_this_item" });
				return;
			}

			try {
				arg.hitEntity.remove();
			} catch (error) {
				source.onScreenDisplay.setActionBar(`§c${error}`);
			}
		},
	});
});
