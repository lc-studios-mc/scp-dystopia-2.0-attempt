import { EventEmitter } from "@/utils/EventEmitter";
import * as mc from "@minecraft/server";

export interface PlayerRelatedData {
	/** Tbe player entity */
	readonly player: mc.Player;
	/** Health component of the player entity */
	readonly health: mc.EntityHealthComponent;
	/** Equippable component of the player entity */
	readonly equippable: mc.EntityEquippableComponent;
	/** Inventory component of the player entity */
	readonly inventory: mc.EntityInventoryComponent;
}

export const PlayerLoopEvent = new EventEmitter<{
	onTick: PlayerRelatedData;
}>();

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
	if (!player.isValid) return;

	const health = player.getComponent("health");
	if (!health) throw new Error("Failed to get player health component");

	const equippable = player.getComponent("equippable");
	if (!equippable) throw new Error("Failed to get player equippable component");

	const inventory = player.getComponent("inventory");
	if (!inventory) throw new Error("Failed to get player inventory component");

	PlayerLoopEvent.emit("onTick", {
		player,
		health,
		equippable,
		inventory,
	});
}
