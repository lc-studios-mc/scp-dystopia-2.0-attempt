import * as mc from "@minecraft/server";

const warn = () => {
	mc.world.sendMessage(`§c§lYou're using the SCP: Dystopia 2.0 Alpha "Ephemeral" version!`);
	mc.world.sendMessage(
		`§eThis version WILL IMMEDIATELY STOP WORKING on next Minecraft content drop (big update).`,
	);
	mc.world.sendMessage(
		`§eConsider using the "Distilled" version which is not experimental, ` +
			`meaning it will (probably) work forever but with the loss of certain features...`,
	);
	mc.world.sendMessage(`§ePlease do not ask for updates.`);
	mc.world.getPlayers().forEach((player) => player.playSound("note.pling"));
};

mc.world.afterEvents.worldLoad.subscribe(() => {
	mc.system.runTimeout(warn, 200);
});
