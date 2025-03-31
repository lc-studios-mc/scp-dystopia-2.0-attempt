import * as mc from "@minecraft/server";

type PlayerLoopCallback = (player: mc.Player, extraArgs: PlayerLoopCallbackExtraArgs) => void;

type PlayerLoopCallbackExtraArgs = {
	readonly healthComp: mc.EntityHealthComponent;
	readonly equippableComp: mc.EntityEquippableComponent;
	readonly mainhandSlot: mc.ContainerSlot;
	readonly offhandSlot: mc.ContainerSlot;
	readonly inventoryComp: mc.EntityInventoryComponent;
	readonly inventoryContainer: mc.Container;
};

const LISTENERS = new Set<PlayerLoopCallback>();
const CALLBACK_EXTRA_ARGS_CACHE = new Map<mc.Player, PlayerLoopCallbackExtraArgs>();

mc.world.beforeEvents.playerLeave.subscribe(({ player }) => {
	CALLBACK_EXTRA_ARGS_CACHE.delete(player,);
},);

mc.world.afterEvents.worldLoad.subscribe(() => {
	mc.system.runInterval(loop, 1,);
},);

function loop(): void {
	const players = mc.world.getPlayers();

	for (let i = 0; i < players.length; i++) {
		const player = players[i]!;

		for (const callback of LISTENERS) {
			callback(player, getOrCreateCallbackExtraArgs(player,),);
		}
	}
}

function getOrCreateCallbackExtraArgs(player: mc.Player): PlayerLoopCallbackExtraArgs {
	const cache = CALLBACK_EXTRA_ARGS_CACHE.get(player,);

	if (cache) return cache;

	const healthComp = player.getComponent("health",)!;
	const inventoryComp = player.getComponent("inventory",)!;
	const equippableComp = player.getComponent("equippable",)!;

	const inventoryContainer = inventoryComp.container!;

	const mainhandSlot = equippableComp.getEquipmentSlot(mc.EquipmentSlot.Mainhand,);
	const offhandSlot = equippableComp.getEquipmentSlot(mc.EquipmentSlot.Offhand,);

	const obj: PlayerLoopCallbackExtraArgs = {
		healthComp,
		inventoryComp,
		inventoryContainer,
		equippableComp,
		mainhandSlot,
		offhandSlot,
	};

	CALLBACK_EXTRA_ARGS_CACHE.set(player, obj,);

	return obj;
}

export function subscribe(callback: PlayerLoopCallback): void {
	LISTENERS.add(callback,);
}

export function unsubscribe(callback: PlayerLoopCallback): boolean {
	return LISTENERS.delete(callback,);
}
