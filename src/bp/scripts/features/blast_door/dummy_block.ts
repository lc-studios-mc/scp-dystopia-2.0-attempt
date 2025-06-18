import { removeBlastDoorAtBlock } from "./blast_door";
import * as mc from "@minecraft/server";

function onPlayerBreak(arg: mc.BlockComponentPlayerBreakEvent): void {
	removeBlastDoorAtBlock(arg.block);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:blast_door_dummy", {
		onPlayerBreak,
	});
});
