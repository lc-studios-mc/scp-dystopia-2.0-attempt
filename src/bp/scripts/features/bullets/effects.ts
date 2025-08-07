import { Vec3 } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";

export const spawnBulletHole = (
	dimension: mc.Dimension,
	location: mc.Vector3,
	face: mc.Direction,
): void => {
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

export const spawnBulletTraceParticle = (
	dimension: mc.Dimension,
	location: mc.Vector3,
	direction: mc.Vector3,
	sizeY: number,
): void => {
	const molangVars = new mc.MolangVariableMap();
	molangVars.setVector3("direction", direction);
	molangVars.setFloat("size_y", sizeY);

	dimension.spawnParticle("lc:scpdy_bullet_trace_particle", location, molangVars);
};

export const spawnBulletHitParticle = (
	dimension: mc.Dimension,
	location: mc.Vector3,
	direction: mc.Vector3,
): void => {
	const molangVars = new mc.MolangVariableMap();
	molangVars.setVector3("direction", Vec3.scale(direction, -1));

	dimension.spawnParticle("minecraft:basic_crit_particle", location, molangVars);
};
