import { getRelativeBlockAtDirection } from "@/utils/direction";
import { MachineryInputEvents } from "../input/events";
import { spawnOrReactivateRbAnchor } from "./rb_anchor";

MachineryInputEvents.on("onActivate", (data) => {
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
