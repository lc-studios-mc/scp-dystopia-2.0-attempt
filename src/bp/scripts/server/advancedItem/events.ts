import * as mc from "@minecraft/server";
import * as playerLoop from "@server/playerLoop";
import * as profileRegistry from "./profileRegistry";
import { AdvancedItem, AdvancedItemBaseConstructorArgs } from "./AdvancedItem";

type AdvancedItemWrapper = {
	fields: {
		currentTick: number;
		isBeingUsed: boolean;
	};
	advancedItem: AdvancedItem;
};

const ADVANCED_ITEM_MAP = new Map<mc.Player, AdvancedItemWrapper>();

function createAdvancedItemWrapper(
	player: mc.Player,
	profile: profileRegistry.AdvancedItemProfile,
	fieldOverrides?: Partial<AdvancedItemWrapper["fields"]>,
	playerComponents?: {
		health?: mc.EntityHealthComponent;
		equippable?: mc.EntityEquippableComponent;
		mainhandSlot?: mc.ContainerSlot;
		offhandSlot?: mc.ContainerSlot;
	},
): AdvancedItemWrapper {
	const playerHealth = playerComponents?.health ?? player.getComponent("health");

	if (!playerHealth) throw new Error("Failed to get health component of the player.");

	const playerEquippable = playerComponents?.equippable ?? player.getComponent("equippable");

	if (!playerEquippable) throw new Error("Failed to get equippable component of the player.");

	const playerMainhand =
		playerComponents?.mainhandSlot ?? playerEquippable.getEquipmentSlot(mc.EquipmentSlot.Mainhand);

	const playerOffhand =
		playerComponents?.offhandSlot ?? playerEquippable.getEquipmentSlot(mc.EquipmentSlot.Offhand);

	const wrapperFields: AdvancedItemWrapper["fields"] = {
		currentTick: fieldOverrides?.currentTick ?? 0,
		isBeingUsed: fieldOverrides?.isBeingUsed ?? false,
	};

	const baseConstructorArgs: AdvancedItemBaseConstructorArgs = {
		getCurrentTick: () => wrapperFields.currentTick,
		isBeingUsed: () => wrapperFields.isBeingUsed,
		profile,
		player,
		playerHealth,
		playerEquippable,
		playerMainhand,
		playerOffhand,
		hotbarSlotIndex: player.selectedSlotIndex,
	};

	const advancedItem = profile.createInstance(baseConstructorArgs);

	const advancedItemWrapper: AdvancedItemWrapper = {
		fields: wrapperFields,
		advancedItem,
	};

	return advancedItemWrapper;
}

function removeAdvancedItemWrapper(
	player: mc.Player,
	advancedItemWrapper?: AdvancedItemWrapper,
): boolean {
	if (!advancedItemWrapper) {
		advancedItemWrapper = ADVANCED_ITEM_MAP.get(player);
		if (!advancedItemWrapper) return false;
	}

	try {
		advancedItemWrapper.advancedItem.onRemove();
		return true;
	} finally {
		ADVANCED_ITEM_MAP.delete(player);
	}
}

playerLoop.subscribe((player) => {
	let advancedItemWrapper = ADVANCED_ITEM_MAP.get(player);

	const playerHealth =
		advancedItemWrapper?.advancedItem.playerHealth ?? player.getComponent("health")!;

	if (playerHealth.currentValue <= 0) return;

	const playerEquippable =
		advancedItemWrapper?.advancedItem.playerEquippable ?? player.getComponent("equippable")!;

	const playerMainhandItemStack = playerEquippable.getEquipment(mc.EquipmentSlot.Mainhand);

	if (!playerMainhandItemStack) {
		removeAdvancedItemWrapper(player, advancedItemWrapper);
		return;
	}

	const advancedItemProfile = profileRegistry.getAdvancedItemProfile(
		playerMainhandItemStack.typeId,
	);

	if (!advancedItemProfile) {
		removeAdvancedItemWrapper(player, advancedItemWrapper);
		return;
	}

	if (!advancedItemWrapper || !advancedItemWrapper.advancedItem.isValid(playerMainhandItemStack)) {
		removeAdvancedItemWrapper(player, advancedItemWrapper);

		advancedItemWrapper = createAdvancedItemWrapper(player, advancedItemProfile, undefined, {
			health: playerHealth,
			equippable: playerEquippable,
		});

		ADVANCED_ITEM_MAP.set(player, advancedItemWrapper);
	}

	if (advancedItemWrapper.advancedItem.playerHealth.currentValue <= 0) {
		removeAdvancedItemWrapper(player);
		return;
	}

	advancedItemWrapper.advancedItem.onTick(playerMainhandItemStack);
	advancedItemWrapper.fields.currentTick++;
});

mc.world.afterEvents.itemStartUse.subscribe((event) => {
	const advancedItemProfile = profileRegistry.getAdvancedItemProfile(event.itemStack.typeId);

	if (!advancedItemProfile) return;

	let advancedItemWrapper = ADVANCED_ITEM_MAP.get(event.source);

	if (!advancedItemWrapper || !advancedItemWrapper.advancedItem.isValid(event.itemStack)) {
		removeAdvancedItemWrapper(event.source, advancedItemWrapper);
		advancedItemWrapper = createAdvancedItemWrapper(event.source, advancedItemProfile);
		ADVANCED_ITEM_MAP.set(event.source, advancedItemWrapper);
	}

	if (!advancedItemWrapper.advancedItem.canBeUsed()) return;

	advancedItemWrapper.fields.isBeingUsed = true;
	advancedItemWrapper.advancedItem.onStartUse(event);
});

mc.world.afterEvents.itemStopUse.subscribe((event) => {
	if (!event.itemStack) return;

	const advancedItemWrapper = ADVANCED_ITEM_MAP.get(event.source);

	if (!advancedItemWrapper) return;
	if (!advancedItemWrapper.fields.isBeingUsed) return;

	advancedItemWrapper.fields.isBeingUsed = false;
	advancedItemWrapper.advancedItem.onStopUse(event);
});

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		const player = event.entity as mc.Player;
		const advancedItemWrapper = ADVANCED_ITEM_MAP.get(player);

		if (!advancedItemWrapper) return;

		advancedItemWrapper.advancedItem.onSwingArm();
	},
	{
		entityTypes: ["minecraft:player"],
		eventTypes: ["player:on_arm_swing"],
	},
);

mc.world.afterEvents.entityHitEntity.subscribe(
	(event) => {
		const player = event.damagingEntity as mc.Player;
		const advancedItemWrapper = ADVANCED_ITEM_MAP.get(player);

		if (!advancedItemWrapper) return;

		advancedItemWrapper.advancedItem.onHitEntity(event);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.afterEvents.entityHitBlock.subscribe(
	(event) => {
		const player = event.damagingEntity as mc.Player;
		const advancedItemWrapper = ADVANCED_ITEM_MAP.get(player);

		if (!advancedItemWrapper) return;

		advancedItemWrapper.advancedItem.onHitBlock(event);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		removeAdvancedItemWrapper(event.deadEntity as mc.Player);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.beforeEvents.playerLeave.subscribe((event) => {
	removeAdvancedItemWrapper(event.player);
});
