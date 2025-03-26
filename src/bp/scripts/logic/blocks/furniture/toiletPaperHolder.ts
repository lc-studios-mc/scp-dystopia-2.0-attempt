import * as mc from "@minecraft/server";

const TOILET_PAPER_ROLL_ITEM_TYPE = "lc:scpdy_toilet_paper_roll";

function onPlayerInteract({
	block,
	player,
	dimension,
}: mc.BlockComponentPlayerInteractEvent): void {
	if (!player) return;

	const holderHasPaperRoll = block.permutation.getState("lc:has_paper_roll") === true;

	if (holderHasPaperRoll) {
		if (!mc.world.gameRules.doTileDrops) return;

		const dropItemStack = new mc.ItemStack(TOILET_PAPER_ROLL_ITEM_TYPE, 1);
		dimension.spawnItem(dropItemStack, block.bottomCenter());

		block.setPermutation(block.permutation.withState("lc:has_paper_roll", false));
		dimension.playSound("random.pop", block.center(), { pitch: 0.6 });
		return;
	}

	const equippableComp = player.getComponent("equippable");
	if (!equippableComp) return;

	const playerMainhandItemStack = equippableComp.getEquipment(mc.EquipmentSlot.Mainhand);

	if (!playerMainhandItemStack) return;
	if (playerMainhandItemStack.typeId !== TOILET_PAPER_ROLL_ITEM_TYPE) return;

	if (playerMainhandItemStack.amount === 1) {
		equippableComp.setEquipment(mc.EquipmentSlot.Mainhand, undefined);
	} else {
		playerMainhandItemStack.amount--;
		equippableComp.setEquipment(mc.EquipmentSlot.Mainhand, playerMainhandItemStack);
	}

	block.setPermutation(block.permutation.withState("lc:has_paper_roll", true));

	dimension.playSound("step.chiseled_bookshelf", block.center(), { pitch: 0.9 });
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:toilet_paper_holder", {
		onPlayerInteract,
	});
});
