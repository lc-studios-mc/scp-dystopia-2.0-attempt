import { system } from "@minecraft/server";
import { showConfigEditorForm } from "./config";

system.beforeEvents.startup.subscribe((e) => {
	e.itemComponentRegistry.registerCustomComponent("scpdy:config_editor_item", {
		onUse(arg) {
			showConfigEditorForm(arg.source);
		},
	});
});
