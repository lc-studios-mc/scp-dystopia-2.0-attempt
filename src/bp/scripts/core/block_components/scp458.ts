import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("scpdy:scp458", {
		onPlayerInteract({ block, player }) {
			if (!player) return;

			const isOpen = block.permutation.getState("scpdy:is_open");

			block.setPermutation(block.permutation.withState("scpdy:is_open", !isOpen));

			if (isOpen) return;

			// Spawn pizza slice when opened
			const pizzaSliceItem = new mc.ItemStack("scpdy:pizza_slice", 1);
			block.dimension.spawnItem(pizzaSliceItem, block.bottomCenter());

			block.dimension.playSound("random.pop", block.center());
		},
	});
});
