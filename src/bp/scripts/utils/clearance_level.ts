import * as mc from "@minecraft/server";

/**
 * Gets the clearance level of an ItemStack.
 * @param itemStack - The ItemStack to check.
 * @returns Clearance level number, `-1` if none or invalid.
 */
export function getClearanceLevel(itemStack: mc.ItemStack): number {
	if (itemStack.hasTag("lc:keycard_o5")) return 6;
	if (itemStack.hasTag("lc:keycard_lvl5")) return 5;
	if (itemStack.hasTag("lc:keycard_lvl4")) return 4;
	if (itemStack.hasTag("lc:keycard_lvl3")) return 3;
	if (itemStack.hasTag("lc:keycard_lvl2")) return 2;
	if (itemStack.hasTag("lc:keycard_lvl1")) return 1;
	if (itemStack.hasTag("lc:keycard_lvl0")) return 0;

	// SCP: Classified Addon compatibility
	if (itemStack.typeId.startsWith("sra")) {
		switch (itemStack.typeId) {
			case "scp:cf_o5_keycard":
			case "sra:classified_o5_keycard":
				return 6;
			case "scp:cf_omni_keycard":
			case "scp:cf_lvl_5_keycard":
			case "sra:classified_omni_keycard":
			case "sra:classified_lvl_5_keycard":
				return 5;
			case "scp:cf_lvl_4_keycard":
			case "sra:classified_lvl_4_keycard":
				return 4;
			case "scp:cf_lvl_3_keycard":
			case "sra:classified_lvl_3_keycard":
				return 3;
			case "scp:cf_lvl_2_keycard":
			case "sra:classified_lvl_2_keycard":
				return 2;
			case "scp:cf_lvl_1_keycard":
			case "sra:classified_lvl_1_keycard":
				return 1;
			case "scp:cf_lvl_0_keycard":
			case "sra:containment_box_keycard":
				return 0;
			default:
				return -1;
		}
	}

	return -1;
}

/**
 * Gets the clearance level of an entity, determined by factors like roles or keycards.
 * @param target - The entity to check.
 * @returns Clearance level number, `-1` if none or invalid.
 */
export function getEntityClearanceLevel(target: mc.Entity): number {
	if (!target.isValid) return -1;

	if (target instanceof mc.Player) {
		const equippable = target.getComponent("equippable");
		if (!equippable) return -1;

		const mainhandItemStack = equippable.getEquipment(mc.EquipmentSlot.Mainhand);
		if (!mainhandItemStack) return -1;

		return getClearanceLevel(mainhandItemStack);
	}

	return -1;
}
