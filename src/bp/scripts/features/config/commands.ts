import * as mc from "@minecraft/server";
import { showConfigEditorForm } from "./config";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.customCommandRegistry.registerCommand(
		{
			name: "scpdy:show_config_editor",
			description: "Shows the SCP: Dystopia addon config editor form to a player",
			permissionLevel: mc.CommandPermissionLevel.Host,
			optionalParameters: [
				{
					name: "target",
					type: mc.CustomCommandParamType.PlayerSelector,
				},
			],
		},
		(origin, args) => {
			const target = args?.[0] ?? origin.sourceEntity;

			if (!(target instanceof mc.Player)) {
				return {
					status: mc.CustomCommandStatus.Failure,
					message: "Target player must be specified",
				};
			}

			mc.system.run(() => {
				showConfigEditorForm(target);
			});

			return {
				status: mc.CustomCommandStatus.Success,
				message: `Successfully sent a request to show the config editor form to ${target.name}`,
			};
		},
	);
});
