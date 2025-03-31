import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { isUnknownRace } from "../shared";

mc.world.afterEvents.projectileHitEntity.subscribe((event) => {
	const hitEntity = event.getEntityHit().entity;

	if (!hitEntity) return;
	if (isUnknownRace(hitEntity,)) return;

	switch (event.projectile.typeId) {
		case "lc:scpdy_unknown_core_plasma_small": {
			hitEntity.applyDamage(2, {
				cause: mc.EntityDamageCause.override,
			},);

			hitEntity.addEffect("slowness", 40, {
				amplifier: 0,
			},);

			break;
		}
		case "lc:scpdy_unknown_core_plasma_large": {
			hitEntity.applyDamage(3, {
				cause: mc.EntityDamageCause.override,
			},);

			hitEntity.addEffect("slowness", 40, {
				amplifier: 1,
			},);

			break;
		}
		case "lc:scpdy_unknown_core_plasma_ultra": {
			hitEntity.applyDamage(2, {
				cause: mc.EntityDamageCause.override,
			},);

			hitEntity.addEffect("slowness", 100, {
				amplifier: 1,
			},);

			break;
		}
		case "lc:scpdy_unknown_core_sword_magic": {
			hitEntity.addEffect("poison", 100, {
				amplifier: 0,
			},);

			if (hitEntity instanceof mc.Player) {
				hitEntity.runCommand("stopsound @s scpdy.unknown_core.sword_magic_fly",);
			}

			break;
		}
		case "lc:scpdy_unknown_core_fireball": {
			hitEntity.addEffect("wither", 100, {
				amplifier: 1,
			},);

			break;
		}
	}
},);

mc.world.afterEvents.projectileHitBlock.subscribe((event) => {
	switch (event.projectile.typeId) {
		case "lc:scpdy_unknown_core_plasma_small":
		case "lc:scpdy_unknown_core_plasma_large":
		case "lc:scpdy_unknown_core_plasma_ultra": {
			event.projectile.remove();

			const hitInfo = event.getBlockHit();
			const hitLoc = vec3.add(hitInfo.block, hitInfo.faceLocation,);
			const particleLoc = vec3.add(hitLoc, vec3.mul(event.hitVector, -1,),);

			event.dimension.spawnParticle(
				"lc:scpdy_unknown_core_plasma_blast_small_emitter",
				particleLoc,
			);

			break;
		}
		case "lc:scpdy_unknown_core_sword_magic": {
			event.projectile.remove();

			const hitInfo = event.getBlockHit();
			const hitLoc = vec3.add(hitInfo.block, hitInfo.faceLocation,);
			const particleLoc = vec3.add(hitLoc, vec3.mul(event.hitVector, -1,),);

			event.dimension.spawnParticle("lc:scpdy_unknown_core_sword_magic_2_emitter", particleLoc,);

			break;
		}
	}
},);
