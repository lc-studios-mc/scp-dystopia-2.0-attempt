import { getRelativeBlock } from "@lib/utils/blockUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { placePwrNode } from ".";
import { PWR_NODE_ENTITY_TYPE_ID, PWR_NODE_PLACER_ITEM_TYPE_ID } from "./shared";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:pwr_node_placer", {
		onUseOn,
	});
});

function onUseOn(arg: mc.ItemComponentUseOnEvent): void {
	const player = arg.source;
	if (!(player instanceof mc.Player)) return;

	if (!arg.block.isSolid) return; // pwr_node shouldn't be attached to a non-solid block

	let anotherNodeExists;
	try {
		anotherNodeExists = arg.block.dimension.getEntities({
			type: PWR_NODE_ENTITY_TYPE_ID,
			location: getRelativeBlock(arg.block, arg.blockFace)?.center(),
			maxDistance: 0.5,
			closest: 1,
		}).length > 0;
	} catch {
		return;
	}

	if (anotherNodeExists) return;

	let spawnLoc;
	try {
		spawnLoc = getSpawnLocation(arg.block, arg.blockFace);
	} catch {
		return;
	}

	const blockAtSpawnLoc = arg.block.dimension.getBlock(spawnLoc);

	if (blockAtSpawnLoc && !blockAtSpawnLoc.isAir) return;

	const mainhandSlot = player.getComponent("equippable")?.getEquipmentSlot(
		mc.EquipmentSlot.Mainhand,
	);

	if (!mainhandSlot) return;
	if (!mainhandSlot.hasItem() || mainhandSlot.typeId !== PWR_NODE_PLACER_ITEM_TYPE_ID) return;

	try {
		placePwrNode(arg.block.dimension, spawnLoc, arg.blockFace);
	} catch {
		return;
	}

	if (player.getGameMode() === mc.GameMode.creative) return; // Don't consume placer item in creative mode

	if (mainhandSlot.amount > 1) {
		mainhandSlot.amount--;
	} else {
		mainhandSlot.setItem(undefined);
	}
}

function getSpawnLocation(attachTo: mc.Block, dir: mc.Direction): mc.Vector3 {
	const origin = getRelativeBlock(attachTo, dir);

	if (!origin) throw new Error("Unexpected undefined block");

	switch (dir) {
		case mc.Direction.Up:
			return origin.bottomCenter();
		case mc.Direction.Down:
			return vec3.add(origin.center(), {
				x: 0,
				y: -0.14,
				z: 0,
			});
		case mc.Direction.North:
			return vec3.add(origin.bottomCenter(), {
				x: 0,
				y: 0.183,
				z: 0.185,
			});
		case mc.Direction.South:
			return vec3.add(origin.bottomCenter(), {
				x: 0,
				y: 0.183,
				z: -0.185,
			});
		case mc.Direction.West:
			return vec3.add(origin.bottomCenter(), {
				x: 0.185,
				y: 0.183,
				z: 0,
			});
		case mc.Direction.East:
			return vec3.add(origin.bottomCenter(), {
				x: -0.185,
				y: 0.183,
				z: 0,
			});
	}
}
