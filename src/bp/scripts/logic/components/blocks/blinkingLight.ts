import * as mc from "@minecraft/server";

function onTick(arg: mc.BlockComponentTickEvent): void {
	const isLit = arg.block.permutation.getState("lc:is_lit",) === true;

	if (isLit) {
		arg.dimension.playSound("scpdy.misc.small_light.off", arg.block.center(),);
	} else {
		arg.dimension.playSound("scpdy.misc.small_light.on", arg.block.center(),);
	}

	arg.block.setPermutation(arg.block.permutation.withState("lc:is_lit", !isLit,),);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:blinking_light", {
		onTick,
	},);
},);
