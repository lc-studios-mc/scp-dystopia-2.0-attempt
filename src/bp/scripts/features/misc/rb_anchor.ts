import * as mc from "@minecraft/server";
import { InputDeviceEvents } from "@/features/input_devices/events";
import { getRelativeBlockAtDirection } from "@lc-studios-mc/scripting-utils";

const RB_ANCHOR_ENTITY_TYPE = "lc:scpdy_rb_anchor";
const RB_PLACEHOLDER_BLOCK_TYPE = "lc:scpdy_rb_placeholder";

const getSexTilDeath = (rbAnchor: mc.Entity): number => {
	return Number(rbAnchor.getProperty("lc:sex_til_death"));
};

const setSexTilDeath = (rbAnchor: mc.Entity, value: number): void => {
	rbAnchor.setProperty("lc:sex_til_death", value);
};

const deactivateAt = (dimension: mc.Dimension, location: mc.Vector3): void => {
	const block = dimension.getBlock(location);

	if (!block) return;

	if (block.typeId !== "minecraft:redstone_block") return;

	block.setType(RB_PLACEHOLDER_BLOCK_TYPE);
};

const spawnOrReactivateRbAnchor = (block: mc.Block, sexTilDeath = 5): boolean => {
	if (block.typeId !== RB_PLACEHOLDER_BLOCK_TYPE) return false;

	block.setType("minecraft:redstone_block");

	const alrExistingRbAnchor = block.dimension.getEntities({
		type: RB_ANCHOR_ENTITY_TYPE,
		maxDistance: 1,
		location: block.center(),
		closest: 1,
	})[0];

	if (alrExistingRbAnchor) {
		setSexTilDeath(alrExistingRbAnchor, sexTilDeath);
		return true;
	}

	const newRbAnchor = block.dimension.spawnEntity(RB_ANCHOR_ENTITY_TYPE, block.center());

	setSexTilDeath(newRbAnchor, sexTilDeath);

	return true;
};

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	({ entity: rbAnchor }) => {
		const sexTilDeath = getSexTilDeath(rbAnchor);

		if (sexTilDeath <= 0) {
			deactivateAt(rbAnchor.dimension, rbAnchor.location);
			rbAnchor.remove();
			return;
		}

		setSexTilDeath(rbAnchor, sexTilDeath - 1);
	},
	{
		eventTypes: ["lc:update_script"],
		entityTypes: [RB_ANCHOR_ENTITY_TYPE],
	},
);

InputDeviceEvents.on("onActivate", (data) => {
	if (data.mode !== "placeRbBehind" && data.mode !== "placeRbBelow") return;

	const block = data.block ?? data.dimension.getBlock(data.location);

	if (!block) return;
	if (!data.pulseDirection) return;

	if (data.mode === "placeRbBehind") {
		const block2 = getRelativeBlockAtDirection(block, data.pulseDirection, 2);

		if (!block2) return;

		spawnOrReactivateRbAnchor(block2, data.rbLifespan);
		return;
	}

	if (data.mode === "placeRbBelow") {
		const block2 = block.below(3);

		if (!block2) return;

		spawnOrReactivateRbAnchor(block2, data.rbLifespan);
	}
});
