import { getRelativeBlock } from "@lib/utils/blockUtils";
import { reversedDirection } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { PWR_NODE_ENTITY_TYPE_ID, PWR_NODE_PLACER_ITEM_TYPE_ID } from "./shared";

function onUpdatePwrNode(pwrNode: mc.Entity): void {
	if (!pwrNode.isValid) return;

	const attachedTo = getBlockAttachedTo(pwrNode);

	if (!attachedTo) {
		killPwrNode(pwrNode);
		return;
	}

	const parent = getParentNode(pwrNode);
	const hasParent = parent !== undefined;
	let wasPowerComingFromParent = getPowerWasComingFromParent(pwrNode);

	if (!hasParent) {
		if (wasPowerComingFromParent) {
			setPowerWasComingFromParent(pwrNode, undefined);
		}

		wasPowerComingFromParent = false;
	} else if (parent !== null && !getPowered(parent)) {
		setPowerWasComingFromParent(pwrNode, undefined);
		wasPowerComingFromParent = false;
	}

	const shouldBePowered = wasPowerComingFromParent ||
		attachedTo.typeId === "minecraft:redstone_block";

	setPowered(pwrNode, shouldBePowered);

	const shouldSendPowerToChilds = !isAttachedToUnlitLamp(pwrNode, attachedTo);

	const childs = getChildNodes(pwrNode);

	for (let i = 0; i < childs.length; i++) {
		const child = childs[i];

		if (child == null) continue;

		setPowerWasComingFromParent(child, shouldSendPowerToChilds);
	}
}

export function connectNodes(from: mc.Entity, to: mc.Entity): boolean {
	if (!isPwrNode(from)) return false;
	if (!isPwrNode(to)) return false;
	if (from === to) return false;
	if (vec3.distance(from.location, to.location) > 50) return false;

	const parentOfFrom = getParentNode(from);

	if (parentOfFrom === to) return false;

	const parentOfTo = getParentNode(to);

	if (parentOfTo !== undefined) return false;
	if (parentOfTo === from) return false;

	const childsOfFrom = getChildNodes(from);

	if (childsOfFrom.includes(to)) return false;

	childsOfFrom.push(to);

	setChildNodes(from, childsOfFrom);

	setParentNode(to, from);

	return true;
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

function killPwrNode(pwrNode: mc.Entity, damager?: mc.Player, isDamagerCreative = false): void {
	try {
		removeParentNodeOf(pwrNode);

		removeChildNodesOf(pwrNode);

		if (!isDamagerCreative) isDamagerCreative = damager?.getGameMode() === mc.GameMode.creative;

		if (!isDamagerCreative && mc.world.gameRules.doMobLoot) {
			const loot = new mc.ItemStack(PWR_NODE_PLACER_ITEM_TYPE_ID);
			pwrNode.dimension.spawnItem(loot, pwrNode.location);
		}

		pwrNode.remove();
	} catch {}
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

function isPwrNode(entity: unknown): entity is mc.Entity {
	if (entity == null) return false;
	if (!(entity instanceof mc.Entity)) return false;
	return entity.typeId === PWR_NODE_ENTITY_TYPE_ID;
}

export function isAttachedToUnlitLamp(
	pwrNode: mc.Entity,
	attachedTo = getBlockAttachedTo(pwrNode),
): boolean {
	if (!attachedTo) return false;

	return attachedTo.typeId === "minecraft:redstone_lamp" ||
		attachedTo.typeId.startsWith("minecraft:") && attachedTo.typeId.endsWith("copper_bulb") &&
			attachedTo.permutation.getState("lit") === false;
}

async function interactionAsync(pwrNode: mc.Entity, player: mc.Player): Promise<void> {
	const parent = getParentNode(pwrNode);
	const childs = getChildNodes(pwrNode);

	const parentLabelWith = parent === undefined ? "0/0" : `${parent !== null ? "1" : "0"}/1`;
	const childsLabelWidth = `${childs.filter(x => x !== null).length}/${childs.length}`;

	const response = await new ActionFormData()
		.title({ translate: "scpdy.form.pwrNodeInfo.title" })
		.body({ translate: "scpdy.form.pwrNodeInfo.body" })
		.label(
			{ translate: "scpdy.form.pwrNodeInfo.parentInfo", with: [parentLabelWith] },
		)
		.label(
			{ translate: "scpdy.form.pwrNodeInfo.childsInfo", with: [childsLabelWidth] },
		)
		.button({ translate: "scpdy.form.pwrNodeInfo.rmParentButton" })
		.button({ translate: "scpdy.form.pwrNodeInfo.rmChildsButton" })
		.show(player);

	if (response.canceled) return;

	if (response.selection === 0) {
		removeParentNodeOf(pwrNode);
	} else if (response.selection === 1) {
		removeChildNodesOf(pwrNode);
	}
}

function removeParentNodeOf(pwrNode: mc.Entity): void {
	const parent = getParentNode(pwrNode);

	if (parent) {
		const childsOfParent = getChildNodes(parent);
		const indexOfRemoved = childsOfParent.indexOf(pwrNode);

		if (indexOfRemoved !== -1) {
			childsOfParent.splice(indexOfRemoved, 1);
			setChildNodes(parent, childsOfParent);
		}
	}

	setParentNode(pwrNode, undefined);
	setPowerWasComingFromParent(pwrNode, undefined);
}

function removeChildNodesOf(pwrNode: mc.Entity): void {
	for (const child of getChildNodes(pwrNode)) {
		if (child == null) continue;
		setParentNode(child, undefined);
		setPowerWasComingFromParent(child, undefined);
	}

	setChildNodes(pwrNode, undefined);
}

// #region world event listeners

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity: pwrNode }) => {
	onUpdatePwrNode(pwrNode);
}, {
	entityTypes: [PWR_NODE_ENTITY_TYPE_ID],
	eventTypes: ["pwr_node:update_script"],
});

mc.world.afterEvents.playerInteractWithEntity.subscribe(({ target, player }) => {
	if (target.typeId !== PWR_NODE_ENTITY_TYPE_ID) return;

	interactionAsync(target, player)
		.catch(() => {
			player.sendMessage({ translate: "scpdy.msg.misc.somethingWentWrong" });
		});
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

	killPwrNode(pwrNode, damager, true);
}, {
	entityTypes: [PWR_NODE_ENTITY_TYPE_ID],
});

mc.world.afterEvents.entityDie.subscribe(({ damageSource, deadEntity: pwrNode }) => {
	const damager = damageSource?.damagingEntity instanceof mc.Player
		? damageSource.damagingEntity
		: undefined;

	killPwrNode(pwrNode, damager);
}, {
	entityTypes: [PWR_NODE_ENTITY_TYPE_ID],
});

// #endregion

// #region get/set functions

function getBlockAttachedTo(
	pwrNode: mc.Entity,
	direction?: mc.Direction,
): mc.Block | undefined {
	const dir = reversedDirection(direction ?? getDirection(pwrNode));
	const origin = pwrNode.dimension.getBlock(pwrNode.location);
	if (!origin) return;

	const attachedTo = getRelativeBlock(origin, dir, 1);
	if (!attachedTo) return;
	if (!attachedTo.isSolid) return;

	return attachedTo;
}

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

export function getPowered(pwrNode: mc.Entity): boolean {
	return pwrNode.getProperty("lc:is_powered") === true;
}

function setPowered(pwrNode: mc.Entity, value: boolean) {
	const isPoweredNow = getPowered(pwrNode);

	if (isPoweredNow && !value) {
		pwrNode.triggerEvent("pwr_node:power_off");
	} else if (!isPoweredNow && value) {
		pwrNode.triggerEvent("pwr_node:power_on");
	}
}

function getPowerWasComingFromParent(pwrNode: mc.Entity): boolean {
	return pwrNode.getDynamicProperty("wasPowerComingFromParent") === true;
}

function setPowerWasComingFromParent(pwrNode: mc.Entity, value?: boolean): void {
	pwrNode.setDynamicProperty("wasPowerComingFromParent", value);
}

function getParentNode(pwrNode: mc.Entity): mc.Entity | undefined | null {
	const entityId = getParentNodeId(pwrNode);

	if (typeof entityId !== "string") return undefined;

	let entity;
	try {
		entity = mc.world.getEntity(entityId);
	} catch {
		return null;
	}

	if (!isPwrNode(entity)) return null;

	return entity;
}

function setParentNode(pwrNode: mc.Entity, parent?: mc.Entity | null): void {
	setParentNodeId(pwrNode, parent?.id);
}

function getParentNodeId(pwrNode: mc.Entity): string | undefined {
	const value = pwrNode.getDynamicProperty("parent");
	return typeof value === "string" ? value : undefined;
}

function setParentNodeId(pwrNode: mc.Entity, value?: string): void {
	pwrNode.setDynamicProperty("parent", value);
}

export function getChildNodes(pwrNode: mc.Entity): (mc.Entity | null)[] {
	const childCount = pwrNode.getDynamicProperty("childCount");

	if (typeof childCount !== "number" || childCount <= 0) return [];

	const array: (mc.Entity | null)[] = [];

	for (let i = 0; i < childCount; i++) {
		const entityId = pwrNode.getDynamicProperty(`child_${i}`);

		if (typeof entityId !== "string") continue;

		let entity;
		try {
			entity = mc.world.getEntity(entityId);
		} catch {
			array.push(null);
			continue;
		}

		if (!isPwrNode(entity)) {
			array.push(null);
			continue;
		}

		if (getParentNodeId(entity) !== pwrNode.id) {
			array.push(null);
			continue;
		}

		array.push(entity);
	}

	return array;
}

function setChildNodes(pwrNode: mc.Entity, array?: (mc.Entity | null)[]): void {
	if (!array || array.length <= 0) {
		pwrNode.setDynamicProperty("childCount", undefined);
		return;
	}

	pwrNode.setDynamicProperty("childCount", array.length);

	for (let i = 0; i < array.length; i++) {
		const child = array[i];
		pwrNode.setDynamicProperty(`child_${i}`, child?.id);
	}
}

// #endregion
