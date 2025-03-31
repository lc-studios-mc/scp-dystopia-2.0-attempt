import * as mc from "@minecraft/server";
import * as vec3 from "./vec3";

/**
 * @returns Whether the player.json modification done by SCP: Dystopia is available.
 */
export function isPlayerModificationAvailable(player: mc.Player): boolean {
	return player.getProperty("lc:is_modified_by_scpdy",) === true;
}

function getClearanceLevel_itemStack(itemStack: mc.ItemStack): number {
	if (itemStack.hasTag("lc:keycard_o5",)) return 6;
	if (itemStack.hasTag("lc:keycard_lvl5",)) return 5;
	if (itemStack.hasTag("lc:keycard_lvl4",)) return 4;
	if (itemStack.hasTag("lc:keycard_lvl3",)) return 3;
	if (itemStack.hasTag("lc:keycard_lvl2",)) return 2;
	if (itemStack.hasTag("lc:keycard_lvl1",)) return 1;
	if (itemStack.hasTag("lc:keycard_lvl0",)) return 0;

	if (itemStack.typeId.startsWith("sra",)) {
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

function getClearanceLevel_player(player: mc.Player): number {
	const equippable = player.getComponent("equippable",);

	if (!equippable) return -1;

	const mainhandItem = equippable.getEquipment(mc.EquipmentSlot.Mainhand,);

	if (mainhandItem) {
		const mainhandKeyLvl = getClearanceLevel(mainhandItem,);

		if (mainhandKeyLvl >= 0) return mainhandKeyLvl;
	}

	const offhandItem = equippable.getEquipment(mc.EquipmentSlot.Offhand,);

	if (!offhandItem) return -1;

	const offhandKeyLvl = getClearanceLevel(offhandItem,);

	return offhandKeyLvl;
}

/**
 * @returns Clearance level of the given item stack, -1 if none.
 */
export function getClearanceLevel(itemStack: mc.ItemStack): number;

/**
 * @returns Clearance level of the player, -1 if none.
 */
export function getClearanceLevel(player: mc.Player): number;

export function getClearanceLevel(value: mc.ItemStack | mc.Player): number {
	if (value instanceof mc.ItemStack) {
		return getClearanceLevel_itemStack(value,);
	} else {
		return getClearanceLevel_player(value,);
	}
}

/**
 * @returns Whether the given item stack can be used as wrench.
 */
export function isWrench(itemStack?: mc.ItemStack): boolean {
	if (!itemStack) return false;
	if (itemStack.hasTag("lc:wrench",)) return true;
	if (itemStack.typeId === "sra:hammer") return true;

	return false;
}

/**
 * @returns Whether the player is holding an item that can be used as wrench.
 */
export function isHoldingWrench(player: mc.Player): boolean {
	const equippable = player.getComponent("minecraft:equippable",);

	if (!equippable) return false;

	let itemStack = equippable.getEquipment(mc.EquipmentSlot.Mainhand,);

	if (!isWrench(itemStack,)) {
		itemStack = equippable.getEquipment(mc.EquipmentSlot.Offhand,);

		if (!isWrench(itemStack,)) {
			return false;
		}
	}

	return true;
}

export function spawnBulletRicochetParticle(
	dimension: mc.Dimension,
	location: mc.Vector3,
	direction?: mc.Vector3,
): void {
	dimension.playSound("scpdy.projectile.bullet.ricochet", location,);

	const dir = direction ?? vec3.ZERO;

	const particleMolangVarMap = new mc.MolangVariableMap();

	particleMolangVarMap.setVector3("direction", vec3.mul(dir, -1,),);

	dimension.spawnParticle("minecraft:basic_crit_particle", location, particleMolangVarMap,);
}
