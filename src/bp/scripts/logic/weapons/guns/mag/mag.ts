import * as mc from "@minecraft/server";

function onUse(arg: mc.ItemComponentUseEvent): void {
	const { itemStack, source: player } = arg;

	if (!itemStack) return;

	if (player.getItemCooldown("scpdy_mag_swap") > 0) return;

	const equippable = player.getComponent("equippable")!;
	const mainhandItem = equippable.getEquipment(mc.EquipmentSlot.Mainhand);
	const offhandItem = equippable.getEquipment(mc.EquipmentSlot.Offhand);

	if (offhandItem) {
		mc.system.run(() => {
			equippable.setEquipment(mc.EquipmentSlot.Mainhand, offhandItem);
		});
	}

	equippable.setEquipment(mc.EquipmentSlot.Offhand, mainhandItem);
	equippable.setEquipment(mc.EquipmentSlot.Mainhand, undefined);

	player.dimension.playSound("scpdy.gun.magazine.equip", player.getHeadLocation());

	player.startItemCooldown("scpdy_mag_swap", 5);
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:mag", {
		onUse,
	});
});
