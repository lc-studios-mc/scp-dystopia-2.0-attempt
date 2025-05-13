import { getModifiedDamageNumber } from "@lib/utils/entityUtils";
import { randomFloat, randomInt } from "@lib/utils/mathUtils";
import { ensureType } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

const SCP001P_ENTITY_TYPE = "lc:scpdy_scp001_proto";
const SCP001P_SINGULARITY_ENTITY_TYPE = "lc:scpdy_scp001_proto_singularity";

function testLeadBlockingRay(dimension: mc.Dimension, from: mc.Vector3, dir: mc.Vector3): boolean {
	return (
		dimension.getBlockFromRay(from, dir, {
			includeTypes: ["lc:scpdy_cst_lead_block"],
			maxDistance: 128,
		}) !== undefined
	);
}

function onUpdate(scp001Entity: mc.Entity): void {
	const isWeakened = scp001Entity.getProperty("lc:is_weakened") === true;
	const target = scp001Entity.target;

	if (!target || isWeakened) {
		scp001Entity.setProperty("lc:is_mouth_opened", false);
		return;
	}

	const dirToTarget = vec3.normalize(vec3.sub(scp001Entity.target.location, scp001Entity.location));

	const isLeadBlockingRay = testLeadBlockingRay(scp001Entity.dimension, scp001Entity.location, dirToTarget);

	scp001Entity.setProperty("lc:is_mouth_opened", !isLeadBlockingRay && !isWeakened);

	const ticksUntilSigularity = ensureType(scp001Entity.getDynamicProperty("ticksUntilSingularity"), "number") ?? 0;

	scp001Entity.setDynamicProperty(
		"ticksUntilSingularity",
		ticksUntilSigularity > 0 ? ticksUntilSigularity - 1 : target.isOnGround ? randomInt(20, 30) : randomInt(5, 10),
	);

	if (isLeadBlockingRay) return;
	if (ticksUntilSigularity > 0) return;

	// Singularity event

	const sigularityLoc = target.location;

	scp001Entity.tryTeleport(sigularityLoc, {
		keepVelocity: false,
		dimension: target.dimension,
		facingLocation: target.location,
	});

	scp001Entity.dimension.playSound("scpdy.scp001_proto.jumpscare", sigularityLoc, {
		volume: 1.5,
	});

	scp001Entity.dimension.playSound("scpdy.scp001_proto.singularity", sigularityLoc, {
		volume: 2.0,
		pitch: randomFloat(0.9, 1.1),
	});

	scp001Entity.dimension.spawnEntity(SCP001P_SINGULARITY_ENTITY_TYPE, vec3.add(target.location, vec3.UP));

	target.applyDamage(12, {
		cause: mc.EntityDamageCause.fall,
	});
}

function onAttack(scp001Entity: mc.Entity): void {
	const isWeakened = scp001Entity.getProperty("lc:is_weakened") === true;

	let attackLoc: mc.Vector3;

	if (scp001Entity.target) {
		attackLoc = vec3.add(
			scp001Entity.getHeadLocation(),
			vec3.normalize(vec3.sub(scp001Entity.target.location, scp001Entity.location)),
		);
	} else {
		attackLoc = vec3.add(scp001Entity.getHeadLocation(), scp001Entity.getViewDirection());
	}

	const entitiesToAttack = scp001Entity.dimension.getEntities({
		closest: isWeakened ? 3 : 10,
		location: attackLoc,
		maxDistance: 2.7,
		excludeFamilies: ["inanimate", "scp001_proto"],
	});

	if (entitiesToAttack.length <= 0) {
		scp001Entity.dimension.playSound("scpdy.misc.woosh", attackLoc);
		return;
	}

	scp001Entity.dimension.playSound("scpdy.misc.monster.attack", attackLoc, {
		pitch: randomFloat(0.9, 1.1),
		volume: 1.4,
	});

	for (let i = 0; i < entitiesToAttack.length; i++) {
		const entity = entitiesToAttack[i]!;

		let damage = isWeakened ? 6 : 9;
		damage = getModifiedDamageNumber(damage, entity);

		const appliedDamage = entity.applyDamage(damage, {
			cause: mc.EntityDamageCause.override,
			damagingEntity: scp001Entity,
		});

		if (appliedDamage && i === 0) {
			entity.dimension.spawnParticle("minecraft:critical_hit_emitter", attackLoc);
		}
	}
}

function onSingularityInhale(singularityEntity: mc.Entity): void {
	const inhaleLives = singularityEntity.getProperty("lc:inhale_lives") as number;

	if (inhaleLives === 0) {
		singularityEntity.remove();
		return;
	}

	singularityEntity.setProperty("lc:inhale_lives", inhaleLives - 1);

	const origin = singularityEntity.location;

	const entitiesToInhale = singularityEntity.dimension.getEntities({
		maxDistance: 18,
		closest: 15,
		location: origin,
		excludeFamilies: ["blood", "scp001_proto", "scp001_proto_singularity"],
	});

	for (let i = 0; i < entitiesToInhale.length; i++) {
		const entity = entitiesToInhale[i]!;

		if (entity.typeId === "minecraft:ender_dragon") return;

		const dist = vec3.distance(entity.location, origin);
		const dir = vec3.sub(origin, entity.location);
		const dirNormalized = vec3.normalize(dir);
		const force = vec3.mul(dirNormalized, 1.2 - dist / 18);

		if (inhaleLives === 1) {
			entity.addEffect("poison", 200, {
				amplifier: 1,
			});
		}

		if (entity instanceof mc.Player) {
			entity.runCommand("camerashake add @s 0.2 0.3 positional");

			if ([mc.GameMode.creative, mc.GameMode.spectator].includes(entity.getGameMode())) continue;
		}

		entity.applyImpulse(force);
	}
}

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
	if (!event.sourceEntity) return;

	switch (event.sourceEntity.typeId) {
		case SCP001P_ENTITY_TYPE:
			if (event.id === "scpdy:scp001_proto_script_update") {
				onUpdate(event.sourceEntity);
			}
			break;
		case SCP001P_SINGULARITY_ENTITY_TYPE:
			if (event.id === "scpdy:scp001_proto_singularity_inhale") {
				onSingularityInhale(event.sourceEntity);
			}
			break;
	}
});

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		onAttack(event.entity);
	},
	{
		entityTypes: [SCP001P_ENTITY_TYPE],
		eventTypes: ["scp001_proto:on_attack"],
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		event.entity.getComponent("health")!.setCurrentValue(100);
	},
	{
		entityTypes: [SCP001P_ENTITY_TYPE],
		eventTypes: ["scp001_proto:get_back_from_neutralized"],
	},
);

mc.world.afterEvents.entitySpawn.subscribe((event) => {
	if (event.entity.typeId === SCP001P_ENTITY_TYPE) {
		event.entity.setDynamicProperty("ticksUntilSingularity", 20);
	} else if (event.entity.typeId === SCP001P_SINGULARITY_ENTITY_TYPE) {
		event.entity.dimension.spawnParticle("lc:scpdy_singularity_energy_emitter", event.entity.location);
	}
});

mc.world.afterEvents.entityHurt.subscribe(
	(event) => {
		const ticksUntilSigularity =
			ensureType(event.hurtEntity.getDynamicProperty("ticksUntilSingularity"), "number") ?? 0;

		if (ticksUntilSigularity <= 6) return;

		event.hurtEntity.setDynamicProperty(
			"ticksUntilSingularity",
			Math.max(6, ticksUntilSigularity - Math.max(5, Math.floor(event.damage * 0.5))),
		);
	},
	{
		entityTypes: [SCP001P_ENTITY_TYPE],
	},
);

mc.world.afterEvents.entityDie.subscribe((event) => {
	const scp001Entity = event.damageSource.damagingEntity;

	if (!scp001Entity) return;
	if (scp001Entity.typeId !== SCP001P_ENTITY_TYPE) return;

	const deadEntityHealthComp = event.deadEntity.getComponent("health");

	if (!deadEntityHealthComp) return;

	const scp001HealthComp = scp001Entity.getComponent("health")!;

	const healAmount = scp001HealthComp.currentValue + Math.min(2, Math.floor(deadEntityHealthComp.effectiveMax / 20));

	const newHealth = Math.min(scp001HealthComp.effectiveMax, healAmount);

	scp001HealthComp.setCurrentValue(newHealth);

	const molangVarMap = new mc.MolangVariableMap();

	molangVarMap.setFloat("particle_amount", Math.min(1, Math.max(5, Math.floor(healAmount * 0.5))));

	scp001Entity.dimension.spawnParticle("lc:scpdy_heal_emitter", scp001Entity.location, molangVarMap);
});
