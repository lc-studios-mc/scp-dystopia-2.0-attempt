import { randomInt } from "@lib/utils/mathUtils";
import * as mc from "@minecraft/server";
import { HUMAN_MOB_TYPES } from "./shared";

export type HumanMobLootData = {
	readonly getItemStacks: () => mc.ItemStack[];
};

const LOOT_MAP = new Map<string, HumanMobLootData>([
	[
		HUMAN_MOB_TYPES.f_tro,
		{
			getItemStacks() {
				return [new mc.ItemStack("lc:scpdy_ammo_9mm", randomInt(7, 10))];
			},
		},
	],
	[
		HUMAN_MOB_TYPES.f_mtf_epsilon11,
		{
			getItemStacks() {
				return [new mc.ItemStack("lc:scpdy_ammo_556mm", randomInt(11, 14))];
			},
		},
	],
]);

export function getHumanMobLootData(entityTypeId: string): HumanMobLootData | undefined {
	return LOOT_MAP.get(entityTypeId);
}
