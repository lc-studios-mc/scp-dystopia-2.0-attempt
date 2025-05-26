import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

type CardinalDirection = "north" | "south" | "east" | "west";

const TOILET_RIDEABLE_ENTITY_TYPE = "lc:scpdy_toilet_rideable";

const FART_SOUND_ORDER: string[] = [
	"scpdy.misc.fart_1",
	"scpdy.misc.fart_2",
	"scpdy.misc.fart_3",
	"scpdy.misc.fart_4",
	"scpdy.misc.fart_5",
	"scpdy.misc.fart_6",
	"scpdy.misc.fart_7",
	"scpdy.misc.fart_8",
	"scpdy.misc.fart_1",
];

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		onUpdateToiletRideableEntity(event.entity);
	},
	{
		entityTypes: [TOILET_RIDEABLE_ENTITY_TYPE],
		eventTypes: ["toilet_rideable:update_script"],
	},
);

function onUpdateToiletRideableEntity(entity: mc.Entity): void {
	if (!entity.isValid) return;

	const rider = entity.getComponent("rideable")!.getRiders()[0];

	if (!rider) return;

	const lastRiderPitch = entity.getDynamicProperty("lastRiderPitch");
	const currentRiderPitch = rider.getRotation().x;

	const emitFart =
		typeof lastRiderPitch === "number" &&
		((lastRiderPitch < 80 && currentRiderPitch > 80) || (lastRiderPitch > -80 && currentRiderPitch < -80));

	if (emitFart) {
		const fartCount = (entity.getDynamicProperty("fartCount") as number) ?? 0;

		const fartSoundId = FART_SOUND_ORDER[fartCount];

		if (typeof fartSoundId === "string") {
			entity.dimension.playSound(fartSoundId, entity.location, {
				volume: 1.1,
			});
		}

		if (fartCount === 4) {
			rider.removeEffect("poison");
			rider.removeEffect("fatal_poison");
		} else if (fartCount === 8) {
			rider.addEffect("regeneration", 80, {
				amplifier: 1,
			});
		}

		entity.setDynamicProperty("fartCount", fartCount + 1);
	}

	entity.setDynamicProperty("lastRiderPitch", currentRiderPitch);
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		onToiletRideableEntityLostRider(event.entity);
	},
	{
		entityTypes: [TOILET_RIDEABLE_ENTITY_TYPE],
		eventTypes: ["toilet_rideable:on_lost_rider"],
	},
);

function onToiletRideableEntityLostRider(entity: mc.Entity): void {
	const fartCount = (entity.getDynamicProperty("fartCount") as number) ?? 0;

	if (fartCount > 0) {
		if (fartCount < 5) {
			entity.dimension.playSound("scpdy.misc.toilet_flush.normal", entity.location, {
				volume: 1.1,
			});
		} else {
			entity.dimension.playSound("scpdy.misc.toilet_flush.hard", entity.location, {
				volume: 1.2,
			});
		}
	}

	entity.remove();
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:toilet", {
		onPlayerInteract,
	});
});

function onPlayerInteract(arg: mc.BlockComponentPlayerInteractEvent): void {
	const { block, dimension, player } = arg;

	if (!player) return;

	const center = block.center();

	if (vec3.distance(center, player.location) > 2.5) {
		player.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.furniture.toilet.tooFar" });
		return;
	}

	const isLidOpen = block.permutation.getState("lc:is_lid_open") === true;

	const sitLoc = { x: center.x, y: center.y - 0.26, z: center.z };

	const rideableEntityExists =
		dimension.getEntities({
			type: TOILET_RIDEABLE_ENTITY_TYPE,
			closest: 1,
			maxDistance: 0.5,
			location: sitLoc,
		}).length > 0;

	if (rideableEntityExists) return;

	if (!player.isSneaking) {
		// Open/Close lid

		block.setPermutation(block.permutation.withState("lc:is_lid_open", !isLidOpen));
		dimension.playSound(isLidOpen ? "close.bamboo_wood_trapdoor" : "open.bamboo_wood_trapdoor", center, { pitch: 1.2 });

		if (!isLidOpen) {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.furniture.toilet.sitHint",
			});
		}

		return;
	}

	// Sitting

	if (!isLidOpen) return;

	const blockDirection = block.permutation.getState("minecraft:cardinal_direction") as CardinalDirection;

	let rideableEntitySpawnEvent: string;

	switch (blockDirection) {
		case "north":
			rideableEntitySpawnEvent = `toilet_rideable:r180`;
			break;
		case "east":
			rideableEntitySpawnEvent = `toilet_rideable:r270`;
			break;
		case "west":
			rideableEntitySpawnEvent = `toilet_rideable:r90`;
			break;
		default:
			rideableEntitySpawnEvent = "minecraft:entity_spawned";
			break;
	}

	const rideableEntity = dimension.spawnEntity(TOILET_RIDEABLE_ENTITY_TYPE, sitLoc, {
		spawnEvent: rideableEntitySpawnEvent,
	});

	rideableEntity.getComponent("rideable")!.addRider(player);

	mc.system.runTimeout(() => {
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.furniture.toilet.fartHint",
		});
	}, 40);
}
