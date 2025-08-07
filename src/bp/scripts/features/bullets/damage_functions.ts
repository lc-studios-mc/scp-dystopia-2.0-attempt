import { calculateFinalDamage, resolveRangeInt } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";
import type { FireBulletOptions } from ".";

export type BulletDamageContext = {
	options: FireBulletOptions;
	hitEntity: mc.Entity;
	isHeadshot: boolean;
	traveledDistance: number;
};

export type BulletDamageFunction = (ctx: BulletDamageContext) => number;

export const createBasicBulletDamageFunction = (
	baseDamage: number,
	reduceDamage: boolean,
): BulletDamageFunction => {
	return (ctx) => {
		let damage = resolveRangeInt(baseDamage);

		if (ctx.isHeadshot) {
			damage *= 2;
		}

		if (reduceDamage) {
			damage = calculateFinalDamage(ctx.hitEntity, damage, mc.EntityDamageCause.projectile);
		}

		return Math.floor(damage);
	};
};
