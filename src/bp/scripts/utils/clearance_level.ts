import * as mc from "@minecraft/server";

/**
 * Gets the clearance level of an ItemStack.
 * @param itemStack - The ItemStack to check.
 * @returns Clearance level number, `-1` if none or invalid.
 */
export function getClearanceLevel(itemStack?: mc.ItemStack): number {
	if (!itemStack) return -1;

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
		const inventory = target.getComponent("inventory");
		if (inventory) {
			for (let i = 0; i < inventory.container.size; i++) {
				const slot = inventory.container.getSlot(i);

				// SCP-005 can bypass most security locks (without holding it)
				const foundScp005 = slot.hasItem() && slot.typeId === "lc:scpdy_scp005";
				if (foundScp005) return 6;
			}
		}

		const equippable = target.getComponent("equippable");
		if (equippable) {
			const mainhandCl = getClearanceLevel(equippable.getEquipment(mc.EquipmentSlot.Mainhand));
			const offhandCl = getClearanceLevel(equippable.getEquipment(mc.EquipmentSlot.Offhand));
			const maxCl = Math.max(mainhandCl, offhandCl);
			if (maxCl !== -1) return maxCl;
		}

		return -1;
	}

	return -1;
}
