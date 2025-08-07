import * as mc from "@minecraft/server";

const isArmed = (mob: mc.Entity): boolean => mob.getProperty("lc:is_armed") === true;

export const getMobEquippedWeaponId = (mob: mc.Entity): string | undefined => {
	switch (mob.typeId) {
		case "lc:scpdy_f_classd":
		case "lc:scpdy_f_researcher":
			return isArmed(mob) ? "m17" : undefined;
		default:
			return undefined;
	}
};
