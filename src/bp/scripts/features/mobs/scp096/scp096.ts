import { SCP173_ENTITY_TYPE } from "@/features/mobs/scp173/shared";
import * as mc from "@minecraft/server";
import { SCP096_1_TAG, SCP096_ENTITY_TYPE } from "./shared";
import { config } from "@/features/config/config";
import { randf, randi, Vec3 } from "@lc-studios-mc/scripting-utils";

function onUpdateScp096(scp096Entity: mc.Entity): void {
	const scp096State = scp096Entity.getProperty("lc:state") as number;
	const healthComp = scp096Entity.getComponent("health")!;
	const target = scp096Entity.target;

	scp096Entity.addEffect("speed", 20, {
		amplifier: scp096State === 2 ? 23 : 18,
		showParticles: false,
	});

	if (healthComp.currentValue < healthComp.effectiveMax - 700) {
		healthComp.setCurrentValue(healthComp.effectiveMax - 699);
	} else if (healthComp.currentValue < healthComp.effectiveMax) {
		const healAmount = scp096State === 0 ? 4 : 1;
		const newHealth = Math.floor(healthComp.currentValue + healAmount);

		healthComp.setCurrentValue(newHealth);
	}

	if (!target) return;

	target.addTag(SCP096_1_TAG);

	if (scp096State !== 2) return;

	const dirToTarget = Vec3.sub(target.location, scp096Entity.location);

	let yRotation = Math.atan2(dirToTarget.x, dirToTarget.z) * (180 / Math.PI);

	if (yRotation > 180) {
		yRotation -= 360;
	} else if (yRotation < -180) {
		yRotation += 360;
	}

	scp096Entity.setProperty("lc:chase_body_y_rotation", -yRotation);

	const distanceBetweenTarget = Vec3.distance(scp096Entity.location, target.location);

	if (distanceBetweenTarget < 2.9 && target.typeId === "minecraft:wither") {
		target.applyDamage(33, {
			cause: mc.EntityDamageCause.entityAttack,
			damagingEntity: scp096Entity,
		});

		onScp096HitWither(scp096Entity, target);
	}

	// Stuck checker below

	let ticksUntilNextLocCheck = Number(scp096Entity.getDynamicProperty("ticksUntilNextLocCheck") ?? 0);

	if (ticksUntilNextLocCheck === undefined) {
		ticksUntilNextLocCheck = 2;
	}

	if (ticksUntilNextLocCheck <= 0) {
		let lastCheckedLoc = scp096Entity.getDynamicProperty("lastCheckedLoc");
		if (!Vec3.isVector3(lastCheckedLoc)) lastCheckedLoc = Vec3.zero;

		if (lastCheckedLoc) {
			const dist = Vec3.distance(
				{
					x: scp096Entity.location.x,
					y: 0,
					z: scp096Entity.location.z,
				},
				{
					x: lastCheckedLoc.x,
					y: 0,
					z: lastCheckedLoc.z,
				},
			);

			const detectedStuck = dist < 0.8;

			if (detectedStuck) {
				onDetectedScp096Stuck(scp096Entity);
			}
		}

		scp096Entity.setDynamicProperty("lastCheckedLoc", scp096Entity.location);

		ticksUntilNextLocCheck = randi(1, 3);
	}

	scp096Entity.setDynamicProperty("ticksUntilNextLocCheck", ticksUntilNextLocCheck - 1);
}

function onDetectedScp096Stuck(scp096Entity: mc.Entity): void {
	const dirToTarget = Vec3.normalize(Vec3.sub(scp096Entity.target!.location, Vec3.add(scp096Entity.location, Vec3.up)));

	const isNearInXZ =
		Vec3.distance(
			{
				x: scp096Entity.location.x,
				y: 0,
				z: scp096Entity.location.z,
			},
			{
				x: scp096Entity.target!.location.x,
				y: 0,
				z: scp096Entity.target!.location.z,
			},
		) < 10.0;

	if (scp096Entity.location.y > scp096Entity.target!.location.y - 3) {
		if (mc.world.gameRules.mobGriefing && !config.disableDestructiveScp096Behavior) {
			scp096Entity.runCommand("setblock ~ ~-1 ~ air destroy");
			scp096Entity.runCommand("setblock ~1 ~-1 ~ air destroy");
			scp096Entity.runCommand("setblock ~-1 ~-1 ~ air destroy");
			scp096Entity.runCommand("setblock ~ ~-1 ~1 air destroy");
			scp096Entity.runCommand("setblock ~ ~-1 ~-1 air destroy");

			scp096Entity.runCommand("setblock ~1 ~-1 ~-1 air destroy");
			scp096Entity.runCommand("setblock ~-1 ~-1 ~1 air destroy");
			scp096Entity.runCommand("setblock ~-1 ~-1 ~1 air destroy");
			scp096Entity.runCommand("setblock ~1 ~-1 ~-1 air destroy");
		}
	} else if (scp096Entity.location.y < scp096Entity.target!.location.y + 3) {
		if (isNearInXZ && scp096Entity.location.y < 350) {
			mc.system.run(() => {
				scp096Entity.addEffect("levitation", 5, {
					amplifier: 17,
					showParticles: false,
				});

				scp096Entity.addEffect("slow_falling", 20, {
					amplifier: 1,
					showParticles: false,
				});
			});
		}

		if (mc.world.gameRules.mobGriefing && !config.disableDestructiveScp096Behavior) {
			const raycastHit = scp096Entity.dimension.getBlockFromRay(scp096Entity.location, dirToTarget, {
				maxDistance: 10,
			});

			if (raycastHit) {
				const locStr = Vec3.stringify(raycastHit.block.center(), 1);
				const locStr2 = Vec3.stringify(Vec3.add(raycastHit.block.center(), Vec3.up), 1);
				scp096Entity.runCommand(`setblock ${locStr} air destroy`);
				scp096Entity.runCommand(`setblock ${locStr2} air destroy`);
			}

			mc.system.run(() => {
				scp096Entity.runCommand("setblock ~ ~2 ~ air destroy");
				scp096Entity.runCommand("setblock ~ ~3 ~ air destroy");
				scp096Entity.runCommand("setblock ~1 ~2 ~ air destroy");
				scp096Entity.runCommand("setblock ~-1 ~2 ~ air destroy");
				scp096Entity.runCommand("setblock ~ ~1 ~2 air destroy");
				scp096Entity.runCommand("setblock ~ ~1 ~-2 air destroy");

				scp096Entity.runCommand("setblock ~1 ~2 ~-1 air destroy");
				scp096Entity.runCommand("setblock ~-1 ~2 ~1 air destroy");
				scp096Entity.runCommand("setblock ~-1 ~2 ~1 air destroy");
				scp096Entity.runCommand("setblock ~1 ~2 ~-1 air destroy");
			});
		}
	}

	if (mc.world.gameRules.mobGriefing && !config.disableDestructiveScp096Behavior) {
		scp096Entity.runCommand("setblock ~ ~ ~ air destroy");
		scp096Entity.runCommand("setblock ~ ~1 ~ air destroy");

		scp096Entity.runCommand("setblock ~1 ~ ~ air destroy");
		scp096Entity.runCommand("setblock ~1 ~1 ~ air destroy");

		scp096Entity.runCommand("setblock ~-1 ~ ~ air destroy");
		scp096Entity.runCommand("setblock ~-1 ~1 ~ air destroy");

		scp096Entity.runCommand("setblock ~ ~ ~1 air destroy");
		scp096Entity.runCommand("setblock ~ ~1 ~1 air destroy");

		scp096Entity.runCommand("setblock ~ ~ ~-1 air destroy");
		scp096Entity.runCommand("setblock ~ ~1 ~-1 air destroy");
	}

	scp096Entity.dimension.spawnParticle("minecraft:wind_explosion_emitter", scp096Entity.location);

	const smokeParticleVarMap = new mc.MolangVariableMap();

	smokeParticleVarMap.setVector3("direction", dirToTarget);

	scp096Entity.dimension.spawnParticle(
		"lc:scpdy_scp096_leap_smoke_emitter",
		scp096Entity.location,
		smokeParticleVarMap,
	);

	scp096Entity.applyImpulse(Vec3.changeDir(Vec3.scale(Vec3.forward, 2), dirToTarget));
}

function onScp096HitWither(scp096Entity: mc.Entity, wither: mc.Entity): void {
	const dimension = scp096Entity.dimension;

	const raycastHit = dimension.getBlockFromRay(
		wither.getHeadLocation(),
		{
			x: 0,
			y: -1,
			z: 0,
		},
		{
			maxDistance: 11,
		},
	);

	let witherStunLocation: mc.Vector3;

	if (!raycastHit) {
		witherStunLocation = {
			x: wither.location.x,
			y: wither.location.y - 9,
			z: wither.location.z,
		};
	} else {
		witherStunLocation = Vec3.add(raycastHit.block.bottomCenter(), Vec3.up);
	}

	wither.teleport(witherStunLocation);

	let ticksUntilStunEnd = 20;

	const stunRunId = mc.system.runInterval(() => {
		try {
			if (ticksUntilStunEnd <= 0) {
				mc.system.clearRun(stunRunId);
				return;
			}

			wither.teleport(witherStunLocation);

			ticksUntilStunEnd -= 1;
		} catch {
			mc.system.clearRun(stunRunId);
		}
	}, 1);
}

function emitScp096AttackParticle(dimension: mc.Dimension, location: mc.Vector3, playSound: boolean): void {
	dimension.spawnParticle("minecraft:critical_hit_emitter", Vec3.add(location, Vec3.up));

	if (!playSound) return;

	dimension.playSound("scpdy.scp096.attack", location, {
		volume: 8.0,
	});
}

function onScp096Attack(scp096Entity: mc.Entity): void {
	const target = scp096Entity.target;

	if (!target) return;

	const targetDist = Vec3.distance(target.location, scp096Entity.location);

	if (targetDist > 7) return;

	if (target.isOnGround) {
		scp096Entity.setDynamicProperty("ticksUntilNextLocCheck", 13); // Delay stuck checker
	}

	emitScp096AttackParticle(target.dimension, target.location, true);

	target.getComponent("rideable")?.ejectRiders();

	const targetHealthComp = target.getComponent("health");

	let targetHealthCurrent = 1;
	let targetHealthMax = 2;

	if (targetHealthComp) {
		targetHealthCurrent = targetHealthComp.currentValue;
		targetHealthMax = targetHealthComp.effectiveMax;
	}

	const targetHealthBeforeAttack = targetHealthCurrent;
	const dmg = Math.floor(Math.max(34, targetHealthMax / randf(10, 12)));

	let damagedTarget = false;

	damagedTarget = target.applyDamage(dmg, {
		cause: mc.EntityDamageCause.override,
		damagingEntity: scp096Entity,
	});

	if (!damagedTarget) {
		damagedTarget = targetHealthCurrent < targetHealthBeforeAttack;
	}

	if (target.typeId === "minecraft:wither") {
		onScp096HitWither(target, target);
		return;
	}

	if (!damagedTarget) {
		const particleLoc: mc.Vector3 = {
			x: target.location.x,
			y: target.location.y + 0.7,
			z: target.location.z,
		};

		function explode(entity: mc.Entity): void {
			entity.dimension.playSound("scpdy.gore.explode", entity.location, { volume: 1.6 });
			entity.dimension.spawnParticle("lc:scpdy_blood_splash_emitter", particleLoc);
			entity.dimension.spawnParticle("lc:scpdy_body_explosion_particle", particleLoc);

			if (entity.typeId === "minecraft:ender_dragon") {
				entity.kill();
			} else {
				entity.remove();
			}
		}

		const attackFailCount = Number(target.getDynamicProperty("scp096AttackFailCount") ?? 0);

		if (attackFailCount > 69) {
			explode(target);
			return;
		}

		target.setDynamicProperty("scp096AttackFailCount", attackFailCount + 1);
	}
}

function onScp096Die(oldScp096Entity: mc.Entity, damageSource: mc.EntityDamageSource): void {
	if (damageSource.cause === mc.EntityDamageCause.selfDestruct) return;
	if (damageSource.damagingEntity?.typeId === SCP173_ENTITY_TYPE) return;

	const dimension = oldScp096Entity.dimension;
	const location = oldScp096Entity.location;
	const velocity = oldScp096Entity.getVelocity();
	const hadTarget = oldScp096Entity.target !== undefined;
	const oldHealthComp = oldScp096Entity.getComponent("health")!;
	const newHealthWhenRevive = oldHealthComp.effectiveMax - 1000;
	const wasFaceHidden = oldScp096Entity.getProperty("lc:is_face_hidden") === true;

	oldScp096Entity.remove();

	let newScp096Type = SCP096_ENTITY_TYPE;

	const newScp096Entity = dimension.spawnEntity(newScp096Type, location, {
		spawnEvent: hadTarget ? "scp096:spawn_angry" : undefined,
	});

	newScp096Entity.applyImpulse(velocity);
	newScp096Entity.getComponent("health")!.setCurrentValue(newHealthWhenRevive);

	newScp096Entity.setProperty("lc:is_face_hidden", wasFaceHidden);

	if (damageSource.damagingEntity) {
		const damagerDist = Vec3.distance(damageSource.damagingEntity.location, oldScp096Entity.location);

		if (damagerDist < 5) {
			damageSource.damagingEntity.applyDamage(randi(350, 400), {
				cause: mc.EntityDamageCause.entityAttack,
				damagingEntity: newScp096Entity,
			});
		}
	}
}

function isCreativeOrSpectator(entity: mc.Entity): boolean {
	return entity instanceof mc.Player && [mc.GameMode.Creative, mc.GameMode.Spectator].includes(entity.getGameMode());
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		event.entity.dimension.playSound("scpdy.scp096.triggered_scream", event.entity.location, {
			volume: 10.0,
		});
	},
	{
		entityTypes: [SCP096_ENTITY_TYPE],
		eventTypes: ["scp096:target_acquired_while_calm"],
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		onScp096Attack(event.entity);
	},
	{
		entityTypes: [SCP096_ENTITY_TYPE],
		eventTypes: ["scp096:on_attack"],
	},
);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		event.entity.remove();
	},
	{
		entityTypes: [SCP096_ENTITY_TYPE],
		eventTypes: ["scp096:force_remove"],
	},
);

mc.system.afterEvents.scriptEventReceive.subscribe(
	(event) => {
		if (event.id !== "scpdy:scp096_update") return;
		if (!event.sourceEntity) return;
		if (event.sourceEntity.typeId !== SCP096_ENTITY_TYPE) return;

		onUpdateScp096(event.sourceEntity);
	},
	{
		namespaces: ["scpdy"],
	},
);

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		onScp096Die(event.deadEntity, event.damageSource);
	},
	{
		entityTypes: [SCP096_ENTITY_TYPE],
	},
);

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		event.deadEntity.removeTag(SCP096_1_TAG);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.afterEvents.entityHurt.subscribe(
	(event) => {
		if (!event.damageSource.damagingEntity) return;
		if (isCreativeOrSpectator(event.damageSource.damagingEntity)) return;

		event.damageSource.damagingEntity.addTag(SCP096_1_TAG);
	},
	{
		entityTypes: [SCP096_ENTITY_TYPE],
	},
);

mc.world.afterEvents.playerGameModeChange.subscribe((event) => {
	event.player.removeTag(SCP096_1_TAG);
});
