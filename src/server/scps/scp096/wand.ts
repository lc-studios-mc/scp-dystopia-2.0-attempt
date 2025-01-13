import * as mc from "@minecraft/server";
import { getEntityName } from "@lib/utils/entityUtils";
import { SCP096_1_TAG } from "./shared";

function onUse(arg: mc.ItemComponentUseEvent): void {
	const player = arg.source;

	const raycastHit = player.getEntitiesFromViewDirection({
		maxDistance: 100,
	})[0];

	if (!raycastHit) {
		player.playSound("note.bass");
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.scp096_1_wand.noValidEntity",
		});
		return;
	}

	if (raycastHit.entity.addTag(SCP096_1_TAG)) {
		player.playSound("note.hat");
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.scp096_1_wand.taggedEntity",
			with: {
				rawtext: [getEntityName(raycastHit.entity)],
			},
		});
	} else {
		player.playSound("note.bass");
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.scp096_1_wand.entityAlreadyTagged",
		});
	}
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:scp096_1_wand", {
		onUse,
	});
});
