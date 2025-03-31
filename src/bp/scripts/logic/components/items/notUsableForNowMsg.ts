import * as mc from "@minecraft/server";

function onUse(arg: mc.ItemComponentUseEvent): void {
	arg.source.sendMessage({
		translate: "scpdy.msg.misc.itemNotUsableForNow",
	});
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:not_usable_for_now_msg", {
		onUse,
	});
});
