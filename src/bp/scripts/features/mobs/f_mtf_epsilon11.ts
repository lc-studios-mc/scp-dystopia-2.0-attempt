import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";
import { calculateAutoFragGrenadePath, throwAutoFragGrenade } from "@/features/throwables/auto_frag_grenade";

const STATE = {
	idle: 0,
	gunAndMelee: 10,
	throwingFragGrenade: 11,
	chasingTargetToContain: 20,
	containingTarget: 21,
} as const;

const MTF_ENTITY_TYPE = "lc:scpdy_f_mtf_epsilon11";
const FAMILY_CAN_CONTAIN = "mtf_epsilon11_can_contain";

// Update script
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;
		onUpdate(entity);
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:update_script"],
	},
);

// On target is inside the nearby range
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;

		const currentState = getState(entity);

		if (currentState === STATE.gunAndMelee) {
			entity.triggerEvent("lc:switch_to_melee_combat");
		} else if (currentState === STATE.chasingTargetToContain) {
			setState(entity, STATE.containingTarget);
			entity.triggerEvent("lc:start_containing_target");
		}
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:on_target_inside_nearby_range"],
	},
);

// On target is outside the nearby range
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;

		const currentState = getState(entity);

		if (currentState === STATE.gunAndMelee) {
			entity.triggerEvent("lc:switch_to_ranged_combat");
			entity.triggerEvent("lc:add_frag_grenade_throw_timer");
		}
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:on_target_outside_nearby_range"],
	},
);

// On frag grenade throw timer end
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;

		const currentState = getState(entity);

		if (currentState !== STATE.gunAndMelee)
			throw new Error("Frag grenade throw timer was ended during unexpected state.");

		if (!entity.target) return;
		if (vec3.distance(entity.location, entity.target.location) > 28) return;

		const fragGrenadePath = calculateAutoFragGrenadePath(
			entity.dimension,
			vec3.add(entity.location, vec3.UP),
			entity.target.location,
		);

		if (!fragGrenadePath) return;

		setState(entity, STATE.throwingFragGrenade);
		entity.triggerEvent("lc:start_throwing_frag_grenade");
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:on_frag_grenade_throw_timer_end"],
	},
);

// Throw frag grenade
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;

		const currentState = getState(entity);
		if (currentState !== STATE.throwingFragGrenade)
			throw new Error("Frag grenade event was invoked during unexpected state.");

		if (!entity.target) return;

		entity.dimension.playSound("scpdy.frag_grenade.throw", entity.getHeadLocation());

		const fragGrenade = throwAutoFragGrenade({
			dimension: entity.dimension,
			from: vec3.add(entity.location, vec3.UP),
			goal: entity.target.location,
			source: entity,
		});

		fragGrenade.triggerEvent("lc:set_family:scpf");
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:throw_frag_grenade"],
	},
);

// On end throwing frag grenade
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;

		const currentState = getState(entity);
		if (currentState !== STATE.throwingFragGrenade)
			throw new Error("Frag grenade event was invoked during unexpected state.");

		setState(entity, STATE.gunAndMelee);
		entity.triggerEvent("lc:add_frag_grenade_throw_timer");
		entity.triggerEvent("lc:switch_to_ranged_combat");

		mc.system.run(() => {
			onUpdate(entity);
		});
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:on_end_throwing_frag_grenade"],
	},
);

// Contain target
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;

		const currentState = getState(entity);
		if (currentState !== STATE.containingTarget)
			throw new Error("Contain target event was invoked during unexpected state.");

		if (!entity.target) return;
		if (vec3.distance(entity.location, entity.target.location) > 3) return;

		try {
			entity.target.triggerEvent("lc:contain");
		} catch {}
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:contain_target"],
	},
);

// On end containing target
mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity }) => {
		if (!entity.isValid) return;

		const currentState = getState(entity);
		if (currentState !== STATE.containingTarget)
			throw new Error("Contain target event was invoked during unexpected state.");

		setState(entity, STATE.idle);
		entity.triggerEvent("lc:remove_combat_component_groups");
		entity.triggerEvent("lc:stop_anger");

		mc.system.runTimeout(() => {
			onUpdate(entity);
		});
	},
	{
		entityTypes: [MTF_ENTITY_TYPE],
		eventTypes: ["lc:on_end_containing_target"],
	},
);

function onUpdate(entity: mc.Entity): void {
	const currentState = getState(entity);
	const canChangeState = currentState !== STATE.throwingFragGrenade && currentState !== STATE.containingTarget;

	const hasTarget = entity.target !== undefined;

	if (!canChangeState) return;

	if (!hasTarget) {
		// Exit combat
		setState(entity, STATE.idle);
		entity.triggerEvent("lc:remove_combat_component_groups");
		entity.triggerEvent("lc:stop_anger");
		return;
	}

	const canContainTarget = canContain(entity.target);

	const nextState = canContainTarget ? STATE.chasingTargetToContain : STATE.gunAndMelee;

	if (currentState === nextState) return;

	entity.triggerEvent("lc:remove_combat_component_groups"); // This might prevent potential bugs with component groups from the last combat

	if (nextState === STATE.gunAndMelee) {
		entity.triggerEvent("lc:switch_to_ranged_combat");
		entity.triggerEvent("lc:start_anger");
		entity.triggerEvent("lc:add_frag_grenade_throw_timer");
	} else if (nextState === STATE.chasingTargetToContain) {
		entity.triggerEvent("lc:start_chasing_target");
	}

	setState(entity, nextState);
}

function getState(entity: mc.Entity): number {
	return Number(entity.getProperty("lc:state"));
}

function setState(entity: mc.Entity, value: number): void {
	entity.setProperty("lc:state", value);
}

function canContain(target: mc.Entity): boolean {
	return (
		target.matches({ families: [FAMILY_CAN_CONTAIN] }) ||
		target.matches({
			families: ["scpdy_scp096"],
			propertyOptions: [
				{
					propertyId: "lc:is_face_hidden",
					value: false,
				},
			],
		})
	);
}
