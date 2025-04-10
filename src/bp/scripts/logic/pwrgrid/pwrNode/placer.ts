import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:pwr_node_placer", {
		onUseOn,
	});
});

function onUseOn(arg: mc.ItemComponentUseOnEvent): void {
}
