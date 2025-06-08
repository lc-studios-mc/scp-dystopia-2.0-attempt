import * as mc from "@minecraft/server";
import { areObjectsEqual } from "./misc";

/**
 * Compares two Item Stacks. Amounts are not taken into account.
 * @param a - Item Stack A.
 * @param b - Item Stack B.
 * @returns Whether Item Stack A and B are the same.
 */
export function compareItemStack(a: mc.ItemStack, b: mc.ItemStack): boolean {
	if (a.typeId !== b.typeId) return false;
	if (a.nameTag !== b.nameTag) return false;
	if (!areObjectsEqual(a.getLore(), b.getLore())) return false;

	try {
		if (a.getDynamicPropertyTotalByteCount() !== b.getDynamicPropertyTotalByteCount()) return false;

		const aProps = a.getDynamicPropertyIds().map((id) => a.getDynamicProperty(id));
		const bProps = b.getDynamicPropertyIds().map((id) => b.getDynamicProperty(id));

		if (!areObjectsEqual(aProps, bProps)) return false;
	} catch {}

	return true;
}
