import * as mc from "@minecraft/server";
import { gunConfigsById } from "./configs/gun_configs";
import { GunHandler } from "./gun_handler";
import { ItemHookRegistry } from "@lc-studios-mc/scripting-utils";

mc.world.afterEvents.worldLoad.subscribe(() => {
	for (const cfg of gunConfigsById.values()) {
		ItemHookRegistry.register(cfg.itemType, (ctx) => new GunHandler(ctx, cfg));
	}
});
