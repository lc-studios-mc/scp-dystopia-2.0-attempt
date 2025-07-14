import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:not_usable_for_now_msg", {
		onUse(arg) {
			arg.source.sendMessage({
				translate: "scpdy.msg.misc.itemNotUsableForNow",
			});
		},
	});
});
