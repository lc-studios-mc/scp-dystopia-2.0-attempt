import { randf } from "@/utils/math";
import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";
import { spawnSmallBloodSplashParticle } from "./gore";

const GIB_CHOP_ENTITY_TYPE = "lc:scpdy_gib_chop";
const GIB_HEAD_ENTITY_TYPE = "lc:scpdy_gib_head";
const GIB_LIMB_ENTITY_TYPE = "lc:scpdy_gib_limb";

export function spawnGibChop(dimension: mc.Dimension, location: mc.Vector3): void {
	location = vec3.add(location, {
		x: randf(-0.15, 0.15),
		y: randf(0.0, 0.15),
		z: randf(-0.15, 0.15),
	});

	const gib = dimension.spawnEntity(GIB_CHOP_ENTITY_TYPE, location);

	gib.setProperty("lc:yaw", randf(-180, 180));

	gib.applyImpulse({
		x: randf(-0.1, 0.1),
		y: randf(0.3, 0.41),
		z: randf(-0.1, 0.1),
	});
}

export function spawnGibHead(dimension: mc.Dimension, location: mc.Vector3): void {
	const gib = dimension.spawnEntity(GIB_HEAD_ENTITY_TYPE, location);

	gib.setProperty("lc:yaw", randf(-180, 180));

	gib.applyImpulse({
		x: randf(-0.12, 0.12),
		y: randf(0.1, 0.15),
		z: randf(-0.12, 0.12),
	});
}

export function spawnGibLimb(dimension: mc.Dimension, location: mc.Vector3): void {
	location = vec3.add(location, {
		x: randf(-0.15, 0.15),
		y: randf(0.0, 0.15),
		z: randf(-0.15, 0.15),
	});

	const gib = dimension.spawnEntity(GIB_LIMB_ENTITY_TYPE, location);

	gib.setProperty("lc:yaw", randf(-180, 180));

	gib.applyImpulse({
		x: randf(-0.2, 0.2),
		y: randf(0.2, 0.4),
		z: randf(-0.2, 0.2),
	});
}

mc.world.afterEvents.entityDie.subscribe(
	(e) => {
		try {
			e.deadEntity.remove();
		} catch {}
	},
	{
		entityTypes: [GIB_CHOP_ENTITY_TYPE, GIB_LIMB_ENTITY_TYPE],
	},
);

mc.world.afterEvents.playerInteractWithEntity.subscribe((e) => {
	if (e.target.typeId === GIB_CHOP_ENTITY_TYPE) {
		e.player.addEffect("absorption", 15 * mc.TicksPerSecond, { amplifier: 1 });
		e.player.addEffect("saturation", 2, { amplifier: 1, showParticles: false });

		spawnSmallBloodSplashParticle(e.target.dimension, vec3.midpoint(e.target.location, e.player.getHeadLocation()));
		e.player.dimension.playSound("random.eat", e.player.getHeadLocation());
		e.target.remove();
	} else if (e.target.typeId === GIB_LIMB_ENTITY_TYPE) {
		e.player.addEffect("regeneration", 4 * mc.TicksPerSecond, { amplifier: 2 });
		e.player.addEffect("saturation", 2, { amplifier: 1, showParticles: false });

		spawnSmallBloodSplashParticle(e.target.dimension, vec3.midpoint(e.target.location, e.player.getHeadLocation()));
		e.player.dimension.playSound("random.eat", e.player.getHeadLocation());
		e.target.remove();
	} else if (e.target.typeId === GIB_HEAD_ENTITY_TYPE) {
		e.player.dimension.spawnItem(new mc.ItemStack("lc:scpdy_throwable_head"), e.player.getHeadLocation());
		e.player.dimension.playSound("random.pop", e.player.getHeadLocation(), { pitch: 1.3, volume: 0.7 });
		e.target.remove();
	}
});
