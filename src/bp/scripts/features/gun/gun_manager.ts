import * as mc from "@minecraft/server";
import * as itemExtender from "@/features/item_extender";
import { gunConfigsById } from "./configs/gun_configs";
import { GunHandler } from "./gun_handler";

mc.world.afterEvents.worldLoad.subscribe(() => {
	for (const cfg of gunConfigsById.values()) {
		itemExtender.addItemExtender({
			itemType: cfg.itemType,
			createHandler(args) {
				return new GunHandler(args, this, cfg);
			},
		});
	}
});
