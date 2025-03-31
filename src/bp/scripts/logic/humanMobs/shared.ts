import * as mc from "@minecraft/server";

export const HUMAN_MOB_TYPES = {
	f_tro: "lc:scpdy_f_tro",
	f_mtf_epsilon11: "lc:scpdy_f_mtf_epsilon11",
} as const;

export const HUMAN_MOB_TYPE_ARRAY = Array.from(Object.values(HUMAN_MOB_TYPES,),);

export const HUMAN_MOB_CORPSE_TYPES = {
	f_tro_dead: "lc:scpdy_f_tro_dead",
	f_mtf_epsilon11_dead: "lc:scpdy_f_mtf_epsilon11_dead",
} as const;

export const HUMAN_MOB_CORPSE_TYPE_ARRAY = Array.from(Object.values(HUMAN_MOB_CORPSE_TYPES,),);

const DAMAGE_CAUSES_IGNORE_BODY_EXPLOSION = new Set<mc.EntityDamageCause>([
	mc.EntityDamageCause.selfDestruct,
	mc.EntityDamageCause.lava,
	mc.EntityDamageCause.magma,
	mc.EntityDamageCause.fireTick,
	mc.EntityDamageCause.drowning,
	mc.EntityDamageCause.freezing,
	mc.EntityDamageCause.magic,
	mc.EntityDamageCause.suffocation,
	mc.EntityDamageCause.wither,
	mc.EntityDamageCause.soulCampfire,
	mc.EntityDamageCause.campfire,
],);

export function canDamageCauseBodyExplosion(damageCause: mc.EntityDamageCause): boolean {
	return !DAMAGE_CAUSES_IGNORE_BODY_EXPLOSION.has(damageCause,);
}
