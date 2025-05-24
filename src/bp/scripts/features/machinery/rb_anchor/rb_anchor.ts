import * as mc from "@minecraft/server";

const RB_ANCHOR_ENTITY_TYPE = "lc:scpdy_rb_anchor";
const RB_PLACEHOLDER_BLOCK_TYPE = "lc:scpdy_rb_placeholder";

export function spawnOrReactivateRbAnchor(block: mc.Block, sexTilDeath = 5): boolean {
	if (block.typeId !== RB_PLACEHOLDER_BLOCK_TYPE) return false;

	block.setType("minecraft:redstone_block");

	const alrExistingRbAnchor = block.dimension.getEntities({
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
}

function getSexTilDeath(rbAnchor: mc.Entity): number {
	return Number(rbAnchor.getProperty("lc:sex_til_death"));
}

function setSexTilDeath(rbAnchor: mc.Entity, value: number): void {
	rbAnchor.setProperty("lc:sex_til_death", value);
}

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

function deactivateAt(dimension: mc.Dimension, location: mc.Vector3): void {
	const block = dimension.getBlock(location);

	if (!block) return;

	if (block.typeId !== "minecraft:redstone_block") return;

	block.setType(RB_PLACEHOLDER_BLOCK_TYPE);
}
