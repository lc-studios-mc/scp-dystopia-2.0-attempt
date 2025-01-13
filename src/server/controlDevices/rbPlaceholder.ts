import { world, Block } from "@minecraft/server";

const ANCHOR_ENTITY_TYPE = "lc:scpdy_rb_placeholder_anchor";
const RB_PLACEHOLDER_BLOCK_TYPE = "lc:scpdy_rb_placeholder";

export function activateRbPlaceholder(block?: Block): boolean {
	if (!block) return false;
	if (block.typeId !== RB_PLACEHOLDER_BLOCK_TYPE) return false;

	const center = block.center();

	const existingAnchors = block.dimension.getEntities({
		type: ANCHOR_ENTITY_TYPE,
		location: center,
		maxDistance: 0.8,
	});

	for (const existingAnchor of existingAnchors) {
		existingAnchor.remove();
	}

	block.dimension.spawnEntity(ANCHOR_ENTITY_TYPE, center);

	block.setType("minecraft:redstone_block");

	return true;
}

world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
	if (event.entity.typeId !== ANCHOR_ENTITY_TYPE) return;

	if (event.eventId === "rb_placeholder_anchor:remove") {
		try {
			const block = event.entity.dimension.getBlock(event.entity.location);

			if (block && block.typeId === "minecraft:redstone_block") {
				block.setType(RB_PLACEHOLDER_BLOCK_TYPE);
			}
		} finally {
			event.entity.remove();
		}
	}
});
