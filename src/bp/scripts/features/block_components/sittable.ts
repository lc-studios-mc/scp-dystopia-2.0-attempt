import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

type CardinalDirection = "north" | "south" | "east" | "west";

const SITTABLE_ANCHOR_TYPE = "lc:scpdy_sittable_anchor";

const onPlayerInteract = (
	arg: mc.BlockComponentPlayerInteractEvent,
	arg1: mc.CustomComponentParameters,
): void => {
	const { block, dimension, player } = arg;
	const params = arg1.params as any;

	if (!player) return;

	const center = block.center();

	if (vec3.distance(center, player.location) > 2.5) {
		if (block.hasTag("chair")) {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.furniture.chair.tooFar",
			});
		}

		return;
	}

	const height = typeof params.height === "number" ? params.height : center.y - 0.2;
	const sitLoc = {
		x: center.x,
		y: height,
		z: center.z,
	};

	const sittableAnchorAlreadyExists = dimension.getEntities({
		type: SITTABLE_ANCHOR_TYPE,
		closest: 1,
		maxDistance: 0.5,
		location: sitLoc,
	}).length > 0;

	if (sittableAnchorAlreadyExists) return;

	const blockDirection = block.permutation.getState(
		"minecraft:cardinal_direction",
	) as CardinalDirection;

	let sittableAnchorSpawnEvent: string;

	switch (blockDirection) {
		case "north":
			sittableAnchorSpawnEvent = `sittable_anchor:r180`;
			break;
		case "east":
			sittableAnchorSpawnEvent = `sittable_anchor:r270`;
			break;
		case "west":
			sittableAnchorSpawnEvent = `sittable_anchor:r90`;
			break;
		default:
			sittableAnchorSpawnEvent = "minecraft:entity_spawned";
			break;
	}

	const sittableAnchor = dimension.spawnEntity(SITTABLE_ANCHOR_TYPE, sitLoc, {
		spawnEvent: sittableAnchorSpawnEvent,
	});

	mc.system.run(() => {
		const rideable = sittableAnchor.getComponent("rideable");

		if (!rideable) return;

		rideable.addRider(player);
	});
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:sittable", {
		onPlayerInteract,
	});
});
