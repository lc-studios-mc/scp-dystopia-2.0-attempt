import * as mc from "@minecraft/server";
import { removeBlastDoorAtBlock } from "@server/blastDoor/blastDoor";

function onPlayerDestroy(arg: mc.BlockComponentPlayerDestroyEvent): void {
	removeBlastDoorAtBlock(arg.block);
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:blast_door_dummy", {
		onPlayerDestroy,
	});
});
