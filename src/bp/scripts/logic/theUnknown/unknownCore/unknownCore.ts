import { getModifiedDamageNumber } from "@lib/utils/entityUtils";
import { randomFloat } from "@lib/utils/mathUtils";
import { ensureType } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import {
	UNKNOWN_BREEZE_ENTITY_TYPE,
	UNKNOWN_CORE_ENTITY_TYPE,
	UNKNOWN_GOLEM_ENTITY_TYPE,
	UNKNOWN_SPIDER_ENTITY_TYPE,
	UNKNOWN_ZOMBIE_ENTITY_TYPE,
} from "../shared";
import { METEORITE_ENTITY_TYPE } from "./meteorite";

const PROP_ID = {
	stage: "lc:stage",
	s1State: "lc:s1_state",
	s2State: "lc:s2_state",
	s3State: "lc:s3_state",
	canBeDamaged: "lc:can_be_damaged",
} as const;

const STAGE_STATE_IDX = {
	s1: {
		fireball: 10,
		shield: 20,
		toS2: 100,
	},
	s2: {
		plasmaRapid: 10,
		plasmaPowerful: 20,
		summonAllies: 30,
		exposeEye: 40,
		toS3: 100,
	},
	s3: {
		swordSlash1: 10,
		swordSlash2: 20,
		fireball: 30,
		exposeEye: 40,
		fireMeteorites: 50,
		summonAllies: 60,
		heal: 70,
		plasmaUltra: 80,
		defeat: 100,
	},
} as const;

namespace CombatStateArrays {
	export const S2_1: (number | `setDelay_${number}`)[] = [
		STAGE_STATE_IDX.s2.exposeEye,
		"setDelay_1",
		STAGE_STATE_IDX.s2.summonAllies,
		STAGE_STATE_IDX.s2.plasmaPowerful,
		STAGE_STATE_IDX.s2.plasmaRapid,
		STAGE_STATE_IDX.s2.plasmaRapid,
		"setDelay_1",
		STAGE_STATE_IDX.s2.exposeEye,
		"setDelay_1",
		STAGE_STATE_IDX.s2.plasmaPowerful,
		STAGE_STATE_IDX.s2.plasmaRapid,
		STAGE_STATE_IDX.s2.plasmaRapid,
		"setDelay_1",
	];

	export const S2_2: (number | `setDelay_${number}`)[] = [
		STAGE_STATE_IDX.s2.summonAllies,
		STAGE_STATE_IDX.s2.plasmaPowerful,
		STAGE_STATE_IDX.s2.plasmaPowerful,
		STAGE_STATE_IDX.s2.plasmaRapid,
		STAGE_STATE_IDX.s2.plasmaRapid,
		STAGE_STATE_IDX.s2.plasmaRapid,
		"setDelay_3",
		STAGE_STATE_IDX.s2.exposeEye,
		"setDelay_1",
		STAGE_STATE_IDX.s2.plasmaPowerful,
		STAGE_STATE_IDX.s2.plasmaPowerful,
		STAGE_STATE_IDX.s2.plasmaRapid,
		STAGE_STATE_IDX.s2.plasmaRapid,
		STAGE_STATE_IDX.s2.plasmaRapid,
		"setDelay_3",
		STAGE_STATE_IDX.s2.exposeEye,
		"setDelay_1",
	];

	export const S3_1: (number | `setDelay_${number}`)[] = [
		STAGE_STATE_IDX.s3.summonAllies,
		STAGE_STATE_IDX.s3.swordSlash1,
		STAGE_STATE_IDX.s3.swordSlash2,
		STAGE_STATE_IDX.s3.fireball,
		"setDelay_3",
		STAGE_STATE_IDX.s3.exposeEye,
		"setDelay_1",
		STAGE_STATE_IDX.s3.swordSlash1,
		STAGE_STATE_IDX.s3.swordSlash2,
		STAGE_STATE_IDX.s3.fireball,
		"setDelay_3",
		STAGE_STATE_IDX.s3.exposeEye,
		"setDelay_1",
	];

	export const S3_2: (number | `setDelay_${number}`)[] = [
		STAGE_STATE_IDX.s3.summonAllies,
		STAGE_STATE_IDX.s3.plasmaUltra,
		STAGE_STATE_IDX.s3.swordSlash1,
		STAGE_STATE_IDX.s3.swordSlash2,
		STAGE_STATE_IDX.s3.fireball,
		"setDelay_3",
		STAGE_STATE_IDX.s3.exposeEye,
		"setDelay_1",
		STAGE_STATE_IDX.s3.fireMeteorites,
		STAGE_STATE_IDX.s3.exposeEye,
		"setDelay_1",
		STAGE_STATE_IDX.s3.plasmaUltra,
		STAGE_STATE_IDX.s3.swordSlash1,
		STAGE_STATE_IDX.s3.swordSlash2,
		STAGE_STATE_IDX.s3.fireball,
		"setDelay_3",
		STAGE_STATE_IDX.s3.exposeEye,
		"setDelay_1",
	];

	export const S3_3: (number | `setDelay_${number}`)[] = [
		STAGE_STATE_IDX.s3.summonAllies,
		STAGE_STATE_IDX.s3.fireMeteorites,
		STAGE_STATE_IDX.s3.plasmaUltra,
		"setDelay_1",
		STAGE_STATE_IDX.s3.exposeEye,
		STAGE_STATE_IDX.s3.swordSlash1,
		STAGE_STATE_IDX.s3.swordSlash2,
		STAGE_STATE_IDX.s3.fireball,
		"setDelay_1",
		STAGE_STATE_IDX.s3.exposeEye,
		STAGE_STATE_IDX.s3.swordSlash1,
		STAGE_STATE_IDX.s3.swordSlash2,
		STAGE_STATE_IDX.s3.fireball,
		"setDelay_1",
	];
}

export function getDifficulty(unknownCore: mc.Entity): mc.Difficulty {
	const difficulty = unknownCore.getProperty("lc:difficulty",) as mc.Difficulty;
	return difficulty;
}

export function getStageState(unknownCore: mc.Entity, stage: number): number {
	const stageState = stage === 1
		? (unknownCore.getProperty("lc:s1_state",) as number)
		: stage === 2
		? (unknownCore.getProperty("lc:s2_state",) as number)
		: stage === 3
		? (unknownCore.getProperty("lc:s3_state",) as number)
		: 0;

	return stageState;
}

function updateLocationLock(unknownCore: mc.Entity): void {
	const locationLock = ensureType(unknownCore.getDynamicProperty("locationLock",), "Vector3",);

	if (!locationLock) return;

	const dist = vec3.distance(locationLock, unknownCore.location,);

	if (dist <= 0.1) return;

	unknownCore.tryTeleport(locationLock, {
		keepVelocity: false,
	},);
}

function getNextCombatBehaviorTick(unknownCore: mc.Entity): number {
	return (
		ensureType(unknownCore.getDynamicProperty("ticksUntilDecideNextCombatBehavior",), "number",) ??
			0
	);
}

function setNextCombatBehaviorTick(unknownCore: mc.Entity, value?: number) {
	unknownCore.setDynamicProperty("ticksUntilDecideNextCombatBehavior", value,);
}

function decideNextCombatBehavior(unknownCore: mc.Entity, stage: number): void {
	const healthComp = unknownCore.getComponent("health",)!;

	switch (stage) {
		case 1: {
			const didGuard = unknownCore.getDynamicProperty("s1_didGuard",) === true;

			if (
				!didGuard &&
				Math.random() > 0.5 &&
				healthComp.currentValue < healthComp.effectiveMax / 2
			) {
				unknownCore.setProperty(PROP_ID.s1State, STAGE_STATE_IDX.s1.shield,);
				unknownCore.setDynamicProperty("s1_didGuard", true,);

				setNextCombatBehaviorTick(unknownCore, 2,);

				break;
			}

			unknownCore.setProperty(PROP_ID.s1State, STAGE_STATE_IDX.s1.fireball,);
			unknownCore.setDynamicProperty("s1_didGuard", undefined,);

			break;
		}
		case 2: {
			const decisionCountPropId = healthComp.currentValue < healthComp.effectiveMax / 2
				? "s2MidCombatDecisionCount"
				: "s2CombatDecisionCount";

			const decisionCount =
				ensureType(unknownCore.getDynamicProperty(decisionCountPropId,), "number",) ?? 0;

			const combatStateArray = healthComp.currentValue < healthComp.effectiveMax / 2
				? CombatStateArrays.S2_2
				: CombatStateArrays.S2_1;

			const nextThing = combatStateArray[decisionCount % combatStateArray.length];

			unknownCore.setDynamicProperty(decisionCountPropId, decisionCount + 1,);

			if (typeof nextThing === "string") {
				if (nextThing.startsWith("setDelay",)) {
					const delay = +nextThing[nextThing.length - 1]!;

					setNextCombatBehaviorTick(unknownCore, delay,);
				} else {
					throw new Error(`Unrecognized next behavior: ${nextThing}`,);
				}

				return;
			}

			if (nextThing === STAGE_STATE_IDX.s2.summonAllies) {
				const nearbyAllies = unknownCore.dimension.getEntities({
					closest: 6,
					maxDistance: 20,
					location: unknownCore.location,
					families: ["the_unknown"],
					excludeTypes: [UNKNOWN_CORE_ENTITY_TYPE],
				},);

				if (nearbyAllies.length < 5) {
					unknownCore.setProperty(PROP_ID.s2State, STAGE_STATE_IDX.s2.summonAllies,);
				} else {
					unknownCore.setProperty(PROP_ID.s2State, STAGE_STATE_IDX.s2.plasmaRapid,);
				}

				return;
			}

			unknownCore.setProperty(PROP_ID.s2State, nextThing ?? 0,);

			break;
		}
		case 3: {
			const decisionCountPropId = healthComp.currentValue < healthComp.effectiveMax / 5
				? "s3LowCombatDecisionCount"
				: healthComp.currentValue < healthComp.effectiveMax / 2
				? "s3MidCombatDecisionCount"
				: "s3CombatDecisionCount";

			const decisionCount =
				ensureType(unknownCore.getDynamicProperty(decisionCountPropId,), "number",) ?? 0;

			const combatStateArray = healthComp.currentValue < healthComp.effectiveMax / 5
				? CombatStateArrays.S3_3
				: healthComp.currentValue < healthComp.effectiveMax / 2
				? CombatStateArrays.S3_2
				: CombatStateArrays.S3_1;

			const nextThing = combatStateArray[decisionCount % combatStateArray.length];

			unknownCore.setDynamicProperty(decisionCountPropId, decisionCount + 1,);

			if (typeof nextThing === "string") {
				if (nextThing.startsWith("setDelay",)) {
					const delay = +nextThing[nextThing.length - 1]!;

					setNextCombatBehaviorTick(unknownCore, delay,);
				} else {
					throw new Error(`Unrecognized next behavior: ${nextThing}`,);
				}

				return;
			}

			if (nextThing === STAGE_STATE_IDX.s3.summonAllies) {
				const nearbyAllies = unknownCore.dimension.getEntities({
					closest: 11,
					maxDistance: 20,
					location: unknownCore.location,
					families: ["the_unknown"],
					excludeTypes: [UNKNOWN_CORE_ENTITY_TYPE],
				},);

				if (nearbyAllies.length < 10) {
					unknownCore.setProperty(PROP_ID.s3State, STAGE_STATE_IDX.s3.summonAllies,);
				} else {
					unknownCore.setProperty(PROP_ID.s3State, STAGE_STATE_IDX.s3.swordSlash1,);
				}

				return;
			}

			unknownCore.setProperty(PROP_ID.s3State, nextThing ?? 0,);

			break;
		}
	}
}

function onUpdate(unknownCore: mc.Entity): void {
	updateLocationLock(unknownCore,);

	const target = unknownCore.target;

	if (!target) return;

	const dirToTarget = vec3.sub(target.location, unknownCore.location,);

	let yRotation = Math.atan2(dirToTarget.x, dirToTarget.z,) * (180 / Math.PI);

	if (yRotation > 180) {
		yRotation -= 360;
	} else if (yRotation < -180) {
		yRotation += 360;
	}

	unknownCore.setProperty("lc:combat_y_body_rot", -yRotation,);

	const stage = unknownCore.getProperty(PROP_ID.stage,) as number;

	const stageState = getStageState(unknownCore, stage,);

	if (stageState !== 0) return; // If stage state is not 0, do not tick combat behavior timer.

	let ticksLeft = getNextCombatBehaviorTick(unknownCore,);

	if (ticksLeft === 0) {
		decideNextCombatBehavior(unknownCore, stage,);
		return;
	}

	const next = ticksLeft > 0 ? ticksLeft - 1 : 0;

	setNextCombatBehaviorTick(unknownCore, next,);
}

function resetHealth(unknownCore: mc.Entity): void {
	const healthComp = unknownCore.getComponent("health",);

	if (!healthComp) return;

	healthComp.setCurrentValue(healthComp.effectiveMax,);
}

function onFatalDamage(unknownCore: mc.Entity): void {
	unknownCore.getComponent("health",)?.setCurrentValue(1,);

	const stage = unknownCore.getProperty(PROP_ID.stage,) as number;

	switch (stage) {
		case 1:
			unknownCore.setProperty(PROP_ID.s1State, STAGE_STATE_IDX.s1.toS2,);
			break;
		case 2:
			unknownCore.setProperty(PROP_ID.s2State, STAGE_STATE_IDX.s2.toS3,);
			break;
		case 3:
			unknownCore.setProperty(PROP_ID.s3State, STAGE_STATE_IDX.s3.defeat,);
			break;
	}

	setNextCombatBehaviorTick(unknownCore, 3,);
}

function summonAlliesS2(unknownCore: mc.Entity): void {
	const difficulty = getDifficulty(unknownCore,);

	const ally1Pos = vec3.add(unknownCore.location, { x: 0, y: 0, z: 1 },);
	const ally1 = unknownCore.dimension.spawnEntity(UNKNOWN_ZOMBIE_ENTITY_TYPE, ally1Pos,);
	ally1.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);

	const ally2Pos = vec3.add(unknownCore.location, { x: 0, y: 0, z: -1 },);
	const ally2 = unknownCore.dimension.spawnEntity(UNKNOWN_BREEZE_ENTITY_TYPE, ally2Pos,);
	ally2.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);

	if (difficulty <= mc.Difficulty.Easy) return;

	const ally3Pos = vec3.add(unknownCore.location, { x: 1, y: 0, z: 0 },);
	const ally3 = unknownCore.dimension.spawnEntity(UNKNOWN_GOLEM_ENTITY_TYPE, ally3Pos,);
	ally3.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);

	if (difficulty <= mc.Difficulty.Normal) return;

	const ally4Pos = vec3.add(unknownCore.location, { x: -1, y: 0, z: 0 },);
	const ally4 = unknownCore.dimension.spawnEntity(UNKNOWN_SPIDER_ENTITY_TYPE, ally4Pos,);
	ally4.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);
}

function summonAlliesS3(unknownCore: mc.Entity): void {
	const difficulty = getDifficulty(unknownCore,);

	const ally1Pos = vec3.add(unknownCore.location, { x: 0, y: 0, z: 1 },);
	const ally1 = unknownCore.dimension.spawnEntity(UNKNOWN_ZOMBIE_ENTITY_TYPE, ally1Pos,);
	ally1.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);

	const ally2Pos = vec3.add(unknownCore.location, { x: 0, y: 0, z: -1 },);
	const ally2 = unknownCore.dimension.spawnEntity(UNKNOWN_ZOMBIE_ENTITY_TYPE, ally2Pos,);
	ally2.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);

	if (difficulty <= mc.Difficulty.Easy) return;

	const ally3Pos = vec3.add(unknownCore.location, { x: 1, y: 0, z: 0 },);
	const ally3 = unknownCore.dimension.spawnEntity(UNKNOWN_BREEZE_ENTITY_TYPE, ally3Pos,);
	ally3.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);

	const ally4Pos = vec3.add(unknownCore.location, { x: -1, y: 0, z: 0 },);
	const ally4 = unknownCore.dimension.spawnEntity(UNKNOWN_GOLEM_ENTITY_TYPE, ally4Pos,);
	ally4.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);

	if (difficulty <= mc.Difficulty.Normal) return;

	const ally5Pos = vec3.add(unknownCore.location, { x: -1, y: 0, z: 1 },);
	const ally5 = unknownCore.dimension.spawnEntity(UNKNOWN_SPIDER_ENTITY_TYPE, ally5Pos,);
	ally5.setDynamicProperty("parentUnknownCoreId", unknownCore.id,);
}

function onSwingSword(unknownCore: mc.Entity): void {
	const target = unknownCore.target;

	if (!target) return;

	const dist = vec3.distance(unknownCore.location, target.location,);

	if (dist > 3.8) return;

	target.applyDamage(getModifiedDamageNumber(13, target,), {
		cause: mc.EntityDamageCause.override,
		damagingEntity: unknownCore,
	},);
}

function fireMeteorite(unknownCore: mc.Entity): void {
	const meteoriteEntity = unknownCore.dimension.spawnEntity(
		METEORITE_ENTITY_TYPE,
		unknownCore.location,
	);

	meteoriteEntity.setDynamicProperty("targetEntityId", unknownCore.target?.id,);

	const fallbackFallLoc = unknownCore.target
		? vec3.add(unknownCore.target.location, vec3.mul(vec3.random(), randomFloat(-2, 2,),),)
		: vec3.add(unknownCore.location, vec3.mul(vec3.random(), randomFloat(-10, 10,),),);

	meteoriteEntity.setDynamicProperty("fallbackFallLoc", fallbackFallLoc,);
}

function onDefeat(unknownCore: mc.Entity): void {
	const childAllies = unknownCore.dimension.getEntities({
		families: ["the_unknown"],
		excludeTypes: [UNKNOWN_CORE_ENTITY_TYPE],
		maxDistance: 100,
		location: unknownCore.location,
	},);

	for (const childAlly of childAllies) {
		const parentUnknownCoreId = childAlly.getDynamicProperty("parentUnknownCoreId",);

		if (typeof parentUnknownCoreId !== "string") continue;
		if (parentUnknownCoreId !== unknownCore.id) continue;

		childAlly.kill();
	}

	mc.system.run(() => {
		unknownCore.remove();
	},);
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
	if (event.entity.typeId !== UNKNOWN_CORE_ENTITY_TYPE) return;

	switch (event.eventId) {
		case "unknown_core:set_can_be_damaged:true":
			event.entity.removeTag("scpdy_ignore_slasher_capture",);
			break;
		case "unknown_core:set_can_be_damaged:false":
			event.entity.addTag("scpdy_ignore_slasher_capture",);
			break;
		case "unknown_core:reset_health":
			resetHealth(event.entity,);
			break;
		case "unknown_core:script_update":
			onUpdate(event.entity,);
			break;
		case "unknown_core:on_fatal_damage":
			onFatalDamage(event.entity,);
			break;
		case "unknown_core:on_defeat":
			onDefeat(event.entity,);
			break;
		case "unknown_core:s2:summon_allies":
			summonAlliesS2(event.entity,);
			break;
		case "unknown_core:s3:summon_allies":
			summonAlliesS3(event.entity,);
			break;
		case "unknown_core:s3:on_swing_sword":
			onSwingSword(event.entity,);
			break;
		case "unknown_core:s3:fire_meteorite":
			fireMeteorite(event.entity,);
			break;
	}
},);

mc.world.afterEvents.entitySpawn.subscribe((event) => {
	if (event.entity.typeId !== UNKNOWN_CORE_ENTITY_TYPE) return;

	const locationLock: mc.Vector3 = {
		x: Math.floor(event.entity.location.x,) + 0.5,
		y: event.entity.location.y,
		z: Math.floor(event.entity.location.z,) + 0.5,
	};

	event.entity.tryTeleport(locationLock,);
	event.entity.setDynamicProperty("locationLock", locationLock,);
},);
