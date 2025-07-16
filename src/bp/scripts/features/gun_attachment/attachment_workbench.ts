import * as mc from "@minecraft/server";
import { showAttachmentEditor } from "./attachment_editor";

mc.system.beforeEvents.startup.subscribe((arg) => {
	arg.blockComponentRegistry.registerCustomComponent("scpdy:attachment_workbench", {
		onPlayerInteract(arg) {
			mc.system.run(() => {
				if (!arg.player?.isValid) return;
				showAttachmentEditor(arg.player);
			});
		},
	});
});
