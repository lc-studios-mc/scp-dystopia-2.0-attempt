import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:pwr_node_connector", {
		onUse,
	});
});

function onUse(arg: mc.ItemComponentUseEvent): void {
}
