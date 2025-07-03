import * as mc from "@minecraft/server";
import type { GunDamageStrategyArgs, GunDamageStrategy } from "./types";
import { utils } from "@lc-studios-mc/scripting-utils";

export default class implements GunDamageStrategy {
	calculateDamage(args: GunDamageStrategyArgs): number {
		let damage = args.gunStats.baseProjectileDamage;

		if (args.isHeadshot) {
			damage *= 2;
		}

		let damageMultiplier = 1.0;
		for (const attachment of Object.values(args.attachmentContext.createArray())) {
			if (attachment.stats.damageMultiplier === undefined) continue;
			damageMultiplier *= attachment.stats.damageMultiplier;
		}
		damage *= damageMultiplier;

		if (args.gunStats.projectileDamageReduction) {
			damage = utils.calculateFinalDamage(args.hitEntity, damage, mc.EntityDamageCause.projectile);
		}

		return Math.floor(damage);
	}
}
