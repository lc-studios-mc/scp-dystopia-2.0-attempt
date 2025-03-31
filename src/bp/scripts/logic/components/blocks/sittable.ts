import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

type CardinalDirection = "north" | "south" | "east" | "west";

const SITTABLE_ANCHOR_TYPE = "lc:scpdy_sittable_anchor";

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const { block, dimension, player } = arg;

	if (!player) return;

	const center = block.center();

	if (vec3.distance(center, player.location,) > 2.5) {
		if (block.hasTag("chair",)) {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.furniture.chair.tooFar",
			},);
		}

		return;
	}

	const sitLoc = {
		x: center.x,
		y: center.y - 0.2,
		z: center.z,
	};

	const sittableAnchorAlreadyExists = dimension.getEntities({
		type: SITTABLE_ANCHOR_TYPE,
		closest: 1,
		maxDistance: 0.5,
		location: sitLoc,
	},).length > 0;

	if (sittableAnchorAlreadyExists) return;

	const blockDirection = block.permutation.getState(
		"minecraft:cardinal_direction",
	) as CardinalDirection;

	let sittableAnchorTypeId: string;

	switch (blockDirection) {
		case "north":
			sittableAnchorTypeId = `${SITTABLE_ANCHOR_TYPE}<sittable_anchor:r180>`;
			break;
		case "east":
			sittableAnchorTypeId = `${SITTABLE_ANCHOR_TYPE}<sittable_anchor:r270>`;
			break;
		case "west":
			sittableAnchorTypeId = `${SITTABLE_ANCHOR_TYPE}<sittable_anchor:r90>`;
			break;
		default:
			sittableAnchorTypeId = `${SITTABLE_ANCHOR_TYPE}`;
			break;
	}

	const sittableAnchor = dimension.spawnEntity(sittableAnchorTypeId, sitLoc,);

	mc.system.run(() => {
		const rideable = sittableAnchor.getComponent("rideable",);

		if (!rideable) return;

		rideable.addRider(player,);
	},);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:sittable", {
		onPlayerInteract,
	},);
},);
