import * as mc from "@minecraft/server";
import { PWR_NODE_ENTITY_TYPE_ID, PWR_NODE_PLACER_ITEM_TYPE_ID } from "./shared";

function onUpdatePwrNode(pwrNode: mc.Entity): void {
}

export function placePwrNode(
	dimension: mc.Dimension,
	location: mc.Vector3,
	direction: mc.Direction,
): void {
	dimension.playSound("place.iron", location, { pitch: 0.8, volume: 1.05 });

	const pwrNode = dimension.spawnEntity(PWR_NODE_ENTITY_TYPE_ID, location);

	setDirection(pwrNode, direction);
}

function removePwrNode(pwrNode: mc.Entity, damager?: mc.Player, isDamagerCreative = false): void {
	if (!pwrNode.isValid) return;

	if (!isDamagerCreative) isDamagerCreative = damager?.getGameMode() === mc.GameMode.creative;

	if (!isDamagerCreative && mc.world.gameRules.doMobLoot) {
		const loot = new mc.ItemStack(PWR_NODE_PLACER_ITEM_TYPE_ID);
		pwrNode.dimension.spawnItem(loot, pwrNode.location);
	}

	pwrNode.remove();
}

function resetPwrNodeUpdateTimer(pwrNode: mc.Entity): void {
	switch (mc.system.serverSystemInfo.memoryTier) {
		default:
		case mc.MemoryTier.SuperLow:
		case mc.MemoryTier.Low:
			pwrNode.triggerEvent("pwr_node:add_script_update_timer:slow");
			break;
		case mc.MemoryTier.Mid:
		case mc.MemoryTier.High:
			pwrNode.triggerEvent("pwr_node:add_script_update_timer:mid");
			break;
		case mc.MemoryTier.SuperHigh:
			pwrNode.triggerEvent("pwr_node:add_script_update_timer:fast");
			break;
	}
}

// #region world event listeners

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity: pwrNode }) => {
	onUpdatePwrNode(pwrNode);
}, {
	entityTypes: [PWR_NODE_ENTITY_TYPE_ID],
	eventTypes: ["pwr_node:update_script"],
});

mc.world.afterEvents.entitySpawn.subscribe(({ entity }) => {
	if (entity.typeId !== PWR_NODE_ENTITY_TYPE_ID) return;
	resetPwrNodeUpdateTimer(entity);
});

mc.world.afterEvents.entityLoad.subscribe(({ entity }) => {
	if (entity.typeId !== PWR_NODE_ENTITY_TYPE_ID) return;
	resetPwrNodeUpdateTimer(entity);
});

mc.world.afterEvents.entityHurt.subscribe(({ damageSource, hurtEntity: pwrNode }) => {
	const damager = damageSource?.damagingEntity instanceof mc.Player
		? damageSource.damagingEntity
		: undefined;

	if (!damager) return;
	if (damager.getGameMode() !== mc.GameMode.creative) return;

	removePwrNode(pwrNode, damager, true);
}, {
	entityTypes: [PWR_NODE_ENTITY_TYPE_ID],
});

mc.world.afterEvents.entityDie.subscribe(({ damageSource, deadEntity: pwrNode }) => {
	const damager = damageSource?.damagingEntity instanceof mc.Player
		? damageSource.damagingEntity
		: undefined;

	removePwrNode(pwrNode, damager);
}, {
	entityTypes: [PWR_NODE_ENTITY_TYPE_ID],
});

// #endregion

// #region get/set functions

function getDirection(pwrNode: mc.Entity): mc.Direction {
	const value = pwrNode.getDynamicProperty("attachedDirection");
	if (typeof value !== "string" || !(value in mc.Direction)) return mc.Direction.Up; // Up as fallback
	return value as mc.Direction;
}

function setDirection(pwrNode: mc.Entity, direction: mc.Direction) {
	pwrNode.setDynamicProperty("attachedDirection", direction);

	let rotX = 0;
	let rotY = 0;

	switch (direction) {
		default:
		case mc.Direction.Up:
			break;
		case mc.Direction.Down:
			rotX = 180;
			break;
		case mc.Direction.North:
			rotX = -90;
			break;
		case mc.Direction.South:
			rotX = 90;
			break;
		case mc.Direction.West:
			rotX = 90;
			rotY = 90;
			break;
		case mc.Direction.East:
			rotX = 90;
			rotY = -90;
			break;
	}

	pwrNode.setProperty("lc:rot_x", rotX);
	pwrNode.setProperty("lc:rot_y", rotY);
}

// #endregion
