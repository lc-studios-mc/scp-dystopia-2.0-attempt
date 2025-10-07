import * as mc from "@minecraft/server";

const warn = () => {
	if (mc.world.getDynamicProperty("anal") !== undefined) return;

	mc.world.sendMessage(`§c§lYou're using the SCP: Dystopia 2.0 Alpha "Distilled" version!`);
	mc.world.sendMessage(
		`§eThis version is very buggy, but it probably won't be obliterated by a future Minecraft update.`,
	);
	mc.world.sendMessage(`§ePlease do not ask for updates.`);
	mc.world.sendMessage(
		`§eAlso do not report bugs found in this version because we published it knowing it's buggy.`,
	);
	mc.world.getPlayers().forEach((player) => player.playSound("note.bass"));

	mc.world.setDynamicProperty("anal", 69);
};

mc.world.afterEvents.worldLoad.subscribe(() => {
	mc.system.runTimeout(warn, 200);
});
