import * as mc from "@minecraft/server";

/**
 * Checks if the player is in Creative or Spectator game mode.
 * @param player - The player to check.
 * @returns `true` if the player is in Creative or Spectator mode, otherwise `false`.
 */
export function isCreativeOrSpectator(player: mc.Player): boolean {
	if (!player.isValid) return false;
	const gameMode = player.getGameMode();
	return gameMode === mc.GameMode.Creative || gameMode === mc.GameMode.Spectator;
}

interface ConsumeHandItemOptions {
	/** An optional filter function to determine if the item can be consumed. */
	filter?: (itemStack: mc.ItemStack) => boolean;
	/** The maximum number of items to consume. Defaults to `1`. */
	max?: number;
}

/**
 * Consumes items from the player's main hand slot based on the provided filter and maximum amount.
 * @param player - The player whose item is to be consumed.
 * @param options - Options such as the filter and the maximum amount.
 * @returns The number of items successfully consumed.
 */
export function consumeHandItem(player: mc.Player, options?: ConsumeHandItemOptions): number {
	if (!player.isValid) return 0;

	const equippable = player.getComponent("equippable");
	if (!equippable) return 0;

	const mainhandSlot = equippable.getEquipmentSlot(mc.EquipmentSlot.Mainhand);
	const mainhandItemStack = mainhandSlot.getItem();
	if (!mainhandItemStack) return 0;

	if (!options?.filter?.(mainhandItemStack)) return 0;

	let amount = mainhandItemStack.amount;
	let consumed = 0;

	const max = options.max ?? 1;
	for (let i = 0; i < max; i++) {
		if (amount <= 0) break;

		amount--;
		consumed++;
	}

	if (amount > 1) {
		mainhandItemStack.amount = amount;
		mainhandSlot.setItem(mainhandItemStack);
	} else {
		mainhandSlot.setItem(undefined);
	}

	return consumed;
}
