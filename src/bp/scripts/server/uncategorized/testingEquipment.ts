import * as mc from "@minecraft/server";

function giveCombatEquipment(player: mc.Player): void {
	const armorHead = new mc.ItemStack("minecraft:diamond_helmet");

	{
		const enchantable = armorHead.getComponent("enchantable");

		enchantable?.addEnchantment({
			level: 1,
			type: new mc.EnchantmentType("mending"),
		});

		enchantable?.addEnchantment({
			level: 3,
			type: new mc.EnchantmentType("unbreaking"),
		});

		enchantable?.addEnchantment({
			level: 4,
			type: new mc.EnchantmentType("protection"),
		});
	}

	const armorChest = new mc.ItemStack("minecraft:diamond_chestplate");

	{
		const enchantable = armorChest.getComponent("enchantable");

		enchantable?.addEnchantment({
			level: 1,
			type: new mc.EnchantmentType("mending"),
		});

		enchantable?.addEnchantment({
			level: 3,
			type: new mc.EnchantmentType("unbreaking"),
		});

		enchantable?.addEnchantment({
			level: 4,
			type: new mc.EnchantmentType("blast_protection"),
		});
	}

	const armorLegs = new mc.ItemStack("minecraft:diamond_leggings");

	{
		const enchantable = armorLegs.getComponent("enchantable");

		enchantable?.addEnchantment({
			level: 1,
			type: new mc.EnchantmentType("mending"),
		});

		enchantable?.addEnchantment({
			level: 3,
			type: new mc.EnchantmentType("unbreaking"),
		});

		enchantable?.addEnchantment({
			level: 4,
			type: new mc.EnchantmentType("projectile_protection"),
		});

		enchantable?.addEnchantment({
			level: 2,
			type: new mc.EnchantmentType("swift_sneak"),
		});
	}

	const armorFeet = new mc.ItemStack("minecraft:diamond_boots");

	{
		const enchantable = armorFeet.getComponent("enchantable");

		enchantable?.addEnchantment({
			level: 1,
			type: new mc.EnchantmentType("mending"),
		});

		enchantable?.addEnchantment({
			level: 3,
			type: new mc.EnchantmentType("unbreaking"),
		});

		enchantable?.addEnchantment({
			level: 4,
			type: new mc.EnchantmentType("fire_protection"),
		});

		enchantable?.addEnchantment({
			level: 4,
			type: new mc.EnchantmentType("feather_falling"),
		});
	}

	// Give

	const equippable = player.getComponent("equippable")!;

	equippable.setEquipment(mc.EquipmentSlot.Head, armorHead);
	equippable.setEquipment(mc.EquipmentSlot.Chest, armorChest);
	equippable.setEquipment(mc.EquipmentSlot.Legs, armorLegs);
	equippable.setEquipment(mc.EquipmentSlot.Feet, armorFeet);
}

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
	if (event.id !== "scpdy:get_testing_armors") return;
	if (!event.sourceEntity) return;
	if (!(event.sourceEntity instanceof mc.Player)) return;

	giveCombatEquipment(event.sourceEntity);
});
