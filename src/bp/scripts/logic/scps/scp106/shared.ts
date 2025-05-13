import * as mc from "@minecraft/server";
import * as vec3 from "@lib/utils/vec3";

export type HideContext = "combat" | "retreat";

export const SCP106_ENTITY_TYPE_ID = "lc:scpdy_scp106";
export const SCP106_TRAIL_ENTITY_TYPE_ID = "lc:scpdy_scp106_trail";

export const SCP106_STATE = {
	default: 0,
	diving: 10,
	hidden: 20,
	emergingSlow: 30,
	emergingFast: 40,
	throwingRight: 50,
	throwingLeft: 60,
	retreating: 100,
} as const;

export function calculateCombatEmergeLocation(
	scp106: mc.Entity,
	targetArg?: mc.Entity,
): mc.Vector3 {
	const target = targetArg ?? scp106.target;

	if (!target) {
		const block = scp106.dimension.getTopmostBlock({
			x: scp106.location.x,
			z: scp106.location.z,
		});

		if (!block) return { x: scp106.location.x, y: scp106.location.y + 0.6, z: scp106.location.z };

		return block.above()?.bottomCenter() ?? scp106.location;
	}

	const test = (loc: mc.Vector3): mc.Vector3 | undefined => {
		try {
			const block1 = scp106.dimension.getBlockBelow(loc, { maxDistance: 5 });
			if (!block1) return;
			if (!block1.isSolid) return;

			const block2 = block1.above();
			if (!block2) return;
			if (!block2.isAir) return;

			return block2.bottomCenter();
		} catch {}
	};

	const targetLoc = target.location;

	return (
		test(vec3.add(targetLoc, { x: 1, y: 0, z: 0 })) ??
		test(vec3.add(targetLoc, { x: 0, y: 0, z: 1 })) ??
		test(vec3.add(targetLoc, { x: -1, y: 0, z: 0 })) ??
		test(vec3.add(targetLoc, { x: 0, y: 0, z: -1 })) ??
		targetLoc
	);
}

export function getState(scp106: mc.Entity): number {
	return Number(scp106.getProperty("lc:state"));
}

export function setState(scp106: mc.Entity, value: number): void {
	scp106.setProperty("lc:state", value);
}

export function getCorrosionRight(scp106: mc.Entity): boolean {
	return scp106.getProperty("lc:corrosion_right") === true;
}

export function setCorrosionRight(scp106: mc.Entity, value: boolean): void {
	scp106.setProperty("lc:corrosion_right", value);
}

export function getCorrosionLeft(scp106: mc.Entity): boolean {
	return scp106.getProperty("lc:corrosion_left") === true;
}

export function setCorrosionLeft(scp106: mc.Entity, value: boolean): void {
	scp106.setProperty("lc:corrosion_left", value);
}

export function getCorrosionAcquisitionCooldown(scp106: mc.Entity): number {
	const value = Number(scp106.getDynamicProperty("corrosionAcquisitionCooldown"));
	return isNaN(value) ? 0 : value;
}

export function setCorrosionAcquisitionCooldown(scp106: mc.Entity, value: number): void {
	scp106.setDynamicProperty("corrosionAcquisitionCooldown", value);
}

export function getCorrosionThrowCooldown(scp106: mc.Entity): number {
	const value = Number(scp106.getDynamicProperty("corrosionThrowCooldown"));
	return isNaN(value) ? 0 : value;
}

export function setCorrosionThrowCooldown(scp106: mc.Entity, value: number): void {
	scp106.setDynamicProperty("corrosionThrowCooldown", value);
}

export function getLastLocation(scp106: mc.Entity) {
	return scp106.getDynamicProperty("lastLocation") as mc.Vector3 | undefined;
}

export function setLastLocation(scp106: mc.Entity, value?: mc.Vector3): void {
	scp106.setDynamicProperty("lastLocation", value);
}

export function getStuckDuration(scp106: mc.Entity): number {
	const value = Number(scp106.getDynamicProperty("stuckDuration"));
	return isNaN(value) ? 0 : value;
}

export function setStuckDuration(scp106: mc.Entity, value: number): void {
	scp106.setDynamicProperty("stuckDuration", value);
}

export function getHideContext(scp106: mc.Entity) {
	return scp106.getDynamicProperty("hideContext") as HideContext | undefined;
}

export function setHideContext(scp106: mc.Entity, value?: HideContext): void {
	scp106.setDynamicProperty("hideContext", value);
}

export function getHidingTick(scp106: mc.Entity): number {
	const value = Number(scp106.getDynamicProperty("hidingTick"));
	return isNaN(value) ? 0 : value;
}

export function setHidingTick(scp106: mc.Entity, value: number): void {
	scp106.setDynamicProperty("hidingTick", value);
}
