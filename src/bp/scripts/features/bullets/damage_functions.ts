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

		let damageMultiplier = 1.0;
		for (const attachment of Object.values(ctx.options.attachmentContext.array)) {
			if (attachment.stats.damageMultiplier === undefined) continue;
			damageMultiplier *= attachment.stats.damageMultiplier;
		}
		damage *= damageMultiplier;

		if (reduceDamage) {
			damage = calculateFinalDamage(ctx.hitEntity, damage, mc.EntityDamageCause.projectile);
		}

		return Math.floor(damage);
	};
};
