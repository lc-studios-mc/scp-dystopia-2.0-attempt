import * as mc from "@minecraft/server";

export interface ExtendedItemEventHandlers {
	onCreate?(): void;
	onDelete?(): void;
	onTick?(currentItemStack: mc.ItemStack): void;
	canUse?(e: mc.ItemStartUseAfterEvent): boolean;
	onStartUse?(e: mc.ItemStartUseAfterEvent): void;
	onStopUse?(e: mc.ItemStopUseAfterEvent): void;
	onHitBlock?(e: mc.EntityHitBlockAfterEvent): void;
	onHitEntity?(e: mc.EntityHitEntityAfterEvent): void;
}

export interface ExtendedItemHandler extends ExtendedItemEventHandlers {
	readonly extender: ItemExtender;
	readonly args: ExtendedItemHandlerArgs;
	elapsedTick: number;
	isUsing: boolean;
	deleteOnNextTick?: boolean;
}

export interface ExtendedItemHandlerArgs {
	readonly player: mc.Player;
	readonly equippable: mc.EntityEquippableComponent;
	readonly health: mc.EntityHealthComponent;
	readonly initialSlotIndex: number;
	readonly initialItemStack: mc.ItemStack;
}

export interface ItemExtender {
	itemType: string;
	createHandler(args: ExtendedItemHandlerArgs): ExtendedItemHandler;
}

const itemExtendersByItemType = new Map<string, ItemExtender>();

export function addItemExtender(itemExtender: ItemExtender): void {
	if (itemExtendersByItemType.has(itemExtender.itemType))
		throw new Error(`An ItemExtender for item type '${itemExtender.itemType}' is already added.`);

	itemExtendersByItemType.set(itemExtender.itemType, itemExtender);
}

const extendedItemHandlersByPlayer = new Map<mc.Player, ExtendedItemHandler>();

// Loop on every player in the world each tick
mc.world.afterEvents.worldLoad.subscribe(() => {
	mc.system.runInterval(() => {
		const players = mc.world.getPlayers();
		for (let i = 0; i < players.length; i++) {
			const player = players[i]!;
			onTickPlayer(player);
		}
	}, 1);
});

function onTickPlayer(player: mc.Player): void {
	const equippable = player.getComponent("equippable")!;
	const health = player.getComponent("health")!;
	const isAlive = health.currentValue >= 0;

	let handlerForThisTick: ExtendedItemHandler | undefined = undefined;

	const lastHandler = extendedItemHandlersByPlayer.get(player);
	handlerForThisTick = lastHandler;

	const currentItemStack = equippable.getEquipment(mc.EquipmentSlot.Mainhand);

	const isHoldingSameItem =
		lastHandler?.extender.itemType === currentItemStack?.typeId &&
		lastHandler?.args.initialSlotIndex === player.selectedSlotIndex;

	const extenderForCurrentItem = isHoldingSameItem
		? lastHandler.extender
		: currentItemStack === undefined
			? undefined
			: itemExtendersByItemType.get(currentItemStack.typeId);

	const shouldDeleteHandler =
		lastHandler &&
		(!isHoldingSameItem || !currentItemStack || !extenderForCurrentItem || lastHandler?.deleteOnNextTick || !isAlive);

	if (shouldDeleteHandler) {
		extendedItemHandlersByPlayer.delete(player);
		handlerForThisTick = undefined;

		lastHandler.onDelete?.();
	}

	const shouldCreateNewHandler =
		!isHoldingSameItem && currentItemStack && extenderForCurrentItem !== undefined && isAlive;

	if (shouldCreateNewHandler) {
		const newHandler = extenderForCurrentItem.createHandler({
			player,
			equippable: equippable,
			health: health,
			initialSlotIndex: player.selectedSlotIndex,
			initialItemStack: currentItemStack,
		});

		extendedItemHandlersByPlayer.set(player, newHandler);
		handlerForThisTick = newHandler;

		newHandler.onCreate?.();
	}

	if (!handlerForThisTick) return;

	handlerForThisTick.onTick?.(currentItemStack!);
	handlerForThisTick.elapsedTick = Math.floor(handlerForThisTick.elapsedTick + 1);
}

mc.world.afterEvents.itemStartUse.subscribe((e) => {
	const extendedItemHandler = extendedItemHandlersByPlayer.get(e.source);
	if (!extendedItemHandler) return;

	const canUse = extendedItemHandler.canUse?.(e) ?? true;
	if (!canUse) return;

	extendedItemHandler.isUsing = true;
	extendedItemHandler.onStartUse?.(e);
});

mc.world.afterEvents.itemStopUse.subscribe((e) => {
	if (!e.itemStack) return;

	const extendedItemHandler = extendedItemHandlersByPlayer.get(e.source);
	if (!extendedItemHandler) return;

	extendedItemHandler.isUsing = false;
	extendedItemHandler.onStopUse?.(e);
});

mc.world.afterEvents.entityHitBlock.subscribe(
	(e) => {
		if (!(e.damagingEntity instanceof mc.Player)) return;

		const extendedItemHandler = extendedItemHandlersByPlayer.get(e.damagingEntity);
		if (!extendedItemHandler) return;

		extendedItemHandler.onHitBlock?.(e);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.afterEvents.entityHitEntity.subscribe(
	(e) => {
		if (!(e.damagingEntity instanceof mc.Player)) return;

		const extendedItemHandler = extendedItemHandlersByPlayer.get(e.damagingEntity);
		if (!extendedItemHandler) return;

		extendedItemHandler.onHitEntity?.(e);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.beforeEvents.playerLeave.subscribe(({ player }) => {
	const extendedItemHandler = extendedItemHandlersByPlayer.get(player);
	if (!extendedItemHandler) return;

	extendedItemHandlersByPlayer.delete(player);

	extendedItemHandler.onDelete?.();
});
