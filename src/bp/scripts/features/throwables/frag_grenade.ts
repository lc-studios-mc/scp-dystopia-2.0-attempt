import { ensureType } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

const FRAG_GRENADE_ITEM_TYPE = "lc:scpdy_frag_grenade";
const FRAG_GRENADE_THROWN_ENTITY_TYPE = "lc:scpdy_player_frag_grenade_thrown";
const FRAG_GRENADE_DROPPED_ENTITY_TYPE = "lc:scpdy_player_frag_grenade_dropped";

const throwFragGrenade = (player: mc.Player, ticksSinceRemovedPin: number): void => {
	const playerHeadLoc = player.getHeadLocation();

	if (ticksSinceRemovedPin >= 100) {
		player.applyDamage(37, {
			cause: mc.EntityDamageCause.entityExplosion,
			damagingEntity: player,
		});
		player.dimension.spawnEntity(FRAG_GRENADE_DROPPED_ENTITY_TYPE, playerHeadLoc, {
			spawnEvent: "frag_grenade:explode",
		});
		return;
	}

	player.dimension.playSound("scpdy.frag_grenade.throw", playerHeadLoc, { volume: 1.1 });

	const throwForceMultiplierMax = player.isSneaking ? 0.9 : 1.9;
	const throwForceMultiplier = Math.min(throwForceMultiplierMax, Math.max(1.0, ticksSinceRemovedPin / 10));

	const impulse = vec3.chain(vec3.FORWARD).mul(throwForceMultiplier).changeDir(player.getViewDirection()).done();

	const grenadeEntity = player.dimension.spawnEntity(FRAG_GRENADE_THROWN_ENTITY_TYPE, playerHeadLoc);

	grenadeEntity.setDynamicProperty("sourcePlayerId", player.id);

	const ticksUntilExplode = Math.floor(Math.max(0, 40 - ticksSinceRemovedPin / 1.75));

	if (ticksUntilExplode > 0) {
		grenadeEntity.applyImpulse(impulse);
	}

	grenadeEntity.setProperty("lc:ticks_until_explode", ticksUntilExplode);
};

const turnThrownFragGrenadeIntoDropped = (thrownGrenadeEntity: mc.Entity, keepVelocity: boolean): void => {
	if (!thrownGrenadeEntity.isValid) return;

	thrownGrenadeEntity.dimension.playSound("scpdy.frag_grenade.hit", thrownGrenadeEntity.location, {
		volume: 1.15,
	});

	const ticksUntilExplode = thrownGrenadeEntity.getProperty("lc:ticks_until_explode") as number;

	if (ticksUntilExplode <= 0) {
		thrownGrenadeEntity.triggerEvent("frag_grenade:explode");
		return;
	}

	const sourcePlayerId = thrownGrenadeEntity.getDynamicProperty("sourcePlayerId");
	const thrownGrenadeVelocity = thrownGrenadeEntity.getVelocity();

	const droppedGrenadeEntity = thrownGrenadeEntity.dimension.spawnEntity(FRAG_GRENADE_DROPPED_ENTITY_TYPE, {
		x: thrownGrenadeEntity.location.x,
		y: thrownGrenadeEntity.location.y + 0.1,
		z: thrownGrenadeEntity.location.z,
	});

	if (keepVelocity) {
		droppedGrenadeEntity.applyImpulse({
			x: thrownGrenadeVelocity.x,
			y: 0,
			z: thrownGrenadeVelocity.z,
		});
	}

	droppedGrenadeEntity.applyImpulse({
		x: 0,
		y: -thrownGrenadeVelocity.y * 0.5,
		z: 0,
	});

	droppedGrenadeEntity.setProperty("lc:ticks_until_explode", ticksUntilExplode);
	droppedGrenadeEntity.setDynamicProperty("sourcePlayerId", sourcePlayerId);

	thrownGrenadeEntity.remove();
};

mc.world.afterEvents.projectileHitBlock.subscribe((event) => {
	if (event.projectile.typeId !== FRAG_GRENADE_THROWN_ENTITY_TYPE) return;
	turnThrownFragGrenadeIntoDropped(event.projectile, true);
});

mc.world.afterEvents.projectileHitEntity.subscribe((event) => {
	if (event.projectile.typeId !== FRAG_GRENADE_THROWN_ENTITY_TYPE) return;
	if (!event.projectile.isValid) return;

	const hitEntity = event.getEntityHit().entity;

	if (hitEntity && hitEntity.typeId === FRAG_GRENADE_THROWN_ENTITY_TYPE) return;

	const sourcePlayerId = ensureType(event.projectile.getDynamicProperty("sourcePlayerId"), "string");

	if (sourcePlayerId !== undefined && sourcePlayerId === hitEntity?.id) return;

	turnThrownFragGrenadeIntoDropped(event.projectile, false);

	if (hitEntity) {
		hitEntity.applyDamage(2, {
			cause: mc.EntityDamageCause.entityAttack,
			damagingEntity: sourcePlayerId !== undefined ? mc.world.getEntity(sourcePlayerId) : undefined,
		});
	}
});

mc.world.afterEvents.itemStartUse.subscribe((event) => {
	if (event.itemStack.typeId !== FRAG_GRENADE_ITEM_TYPE) return;

	const player = event.source;

	if (player.getItemCooldown("scpdy_frag_grenade_throw") > 0) return;

	player.setDynamicProperty("isThrowingFragGrenade", true);

	const throwTriggerIndex = ensureType(player.getDynamicProperty("nextFragGrenadeThrowTriggerIndex"), "number") ?? 0;

	player.startItemCooldown(`scpdy_frag_grenade_use_trigger_${throwTriggerIndex + 1}`, 2);

	const nextThrowTriggerIndex = throwTriggerIndex === 0 ? 1 : 0;

	player.setDynamicProperty("nextFragGrenadeThrowTriggerIndex", nextThrowTriggerIndex);
});

mc.world.afterEvents.itemStopUse.subscribe((event) => {
	if (!event.itemStack) return;
	if (event.itemStack.typeId !== FRAG_GRENADE_ITEM_TYPE) return;

	const player = event.source;

	if (player.getDynamicProperty("isThrowingFragGrenade") === false) return;

	player.setDynamicProperty("isThrowingFragGrenade", false);

	const equippableComp = player.getComponent("equippable");

	if (!equippableComp) return;

	const mainhandSlot = equippableComp.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	if (!mainhandSlot.hasItem()) return;
	if (mainhandSlot.typeId !== FRAG_GRENADE_ITEM_TYPE) return;

	const heldTicks = 72000 - event.useDuration; // (3600 * 20) - useDuration

	player.startItemCooldown("scpdy_frag_grenade_throw", 3);

	if (heldTicks <= 9) {
		player.playSound("scpdy.frag_grenade.pull");
	}

	throwFragGrenade(player, Math.floor(Math.max(0, heldTicks - 10)));

	if (player.getGameMode() === mc.GameMode.Creative) return;

	mc.system.runTimeout(() => {
		if (mainhandSlot.typeId !== FRAG_GRENADE_ITEM_TYPE) {
			player.runCommand(`clear @s ${FRAG_GRENADE_ITEM_TYPE} 0 1`);
			return;
		}

		if (mainhandSlot.amount > 1) {
			mainhandSlot.amount--;
		} else {
			mainhandSlot.setItem();
		}
	}, 1);
});
