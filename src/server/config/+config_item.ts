import * as mc from "@minecraft/server";
import { showConfigEditorForm } from "@server/config/configData";

function onUse(arg: mc.ItemComponentUseEvent): void {
	const player = arg.source;

	if (!player.isOp()) {
		// Config editor is only for players with operator-level permissions

		player.sendMessage({ translate: "scpdy.msg.config.onlyOpCanUse" });
		player.playSound("note.bass");
		return;
	}

	showConfigEditorForm(player);
}

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:config_item", {
		onUse,
	});
});
