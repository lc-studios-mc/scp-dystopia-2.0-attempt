import * as mc from "@minecraft/server";

export const UNKNOWN_BREEZE_ENTITY_TYPE = "lc:scpdy_unknown_breeze";
export const UNKNOWN_CORE_ENTITY_TYPE = "lc:scpdy_unknown_core";
export const UNKNOWN_GOLEM_ENTITY_TYPE = "lc:scpdy_unknown_golem";
export const UNKNOWN_SPIDER_ENTITY_TYPE = "lc:scpdy_unknown_spider";
export const UNKNOWN_ZOMBIE_ENTITY_TYPE = "lc:scpdy_unknown_zombie";

const UNKNOWN_RACE_MOB_TYPES: string[] = [
	UNKNOWN_BREEZE_ENTITY_TYPE,
	UNKNOWN_CORE_ENTITY_TYPE,
	UNKNOWN_GOLEM_ENTITY_TYPE,
	UNKNOWN_SPIDER_ENTITY_TYPE,
	UNKNOWN_ZOMBIE_ENTITY_TYPE,
];

export function isUnknownRace(entity: mc.Entity): boolean {
	return UNKNOWN_RACE_MOB_TYPES.includes(entity.typeId);
}
