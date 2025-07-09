import { Vec3 } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";

export const spawnBulletHole = (dimension: mc.Dimension, location: mc.Vector3, face: mc.Direction): void => {
	let type: string;
	switch (face) {
		case mc.Direction.Down:
		case mc.Direction.Up:
			type = "lc:scpdy_bullet_hole_particle_xz";
			break;
		case mc.Direction.North:
		case mc.Direction.South:
			type = "lc:scpdy_bullet_hole_particle_xy";
			break;
		case mc.Direction.East:
		case mc.Direction.West:
			type = "lc:scpdy_bullet_hole_particle_yz";
			break;
	}

	dimension.spawnParticle(type, location);
};

export const playBulletHitSound = (dimension: mc.Dimension, location: mc.Vector3): void => {
	dimension.playSound("scpdy.gun.bullet_hit_block", location, {
		volume: 1.5,
	});
};

export const spawnBulletHitParticle = (dimension: mc.Dimension, location: mc.Vector3, direction?: mc.Vector3): void => {
	const particleMolangVarMap = new mc.MolangVariableMap();
	const dir = direction ?? Vec3.zero;
	particleMolangVarMap.setVector3("direction", Vec3.scale(dir, -1));

	dimension.spawnParticle("minecraft:basic_crit_particle", location, particleMolangVarMap);
};
