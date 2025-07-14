import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:change_block_type_on_tick", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	onTick({ block }, arg1) {
		const params = arg1.params as any;

		const newType = String(params.newType).trim();

		if (newType === "") return;

		const oldPermutation = block.permutation;

		block.setType(newType);

		// @ts-expect-error
		console.log(`Converted ${oldPermutation.type.id} at ${vec3.toString(block)} to ${newType}`);
	},
};
