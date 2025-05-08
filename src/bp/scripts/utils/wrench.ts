import * as mc from "@minecraft/server";

/**
 * @param player - The player.
 * @param checkOffhand - Check off-hand as well.
 * @returns Whether the player is holding a wrench (or an item that can be used as wrench) in their hand.
 */
export function isHoldingWrench(player: mc.Player, checkOffhand = true): boolean {
	if (!player.isValid) return false;

	const equippable = player.getComponent("equippable");
	if (!equippable) return false;

	const test = (itemStack?: mc.ItemStack): boolean => {
		if (!itemStack) return false;
		if (itemStack.hasTag("lc:wrench")) return true;

		// SCP: Classified Addon compatibility
		if (itemStack.typeId === "sra:hammer") return true;

		return false;
	};

	if (test(equippable.getEquipment(mc.EquipmentSlot.Mainhand))) return true;
	if (checkOffhand && test(equippable.getEquipment(mc.EquipmentSlot.Offhand))) return true;

	return false;
}
