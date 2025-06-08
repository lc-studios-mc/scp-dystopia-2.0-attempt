import * as mc from "@minecraft/server";
import { showConfigEditorForm } from "./config";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.customCommandRegistry.registerCommand(
		{
			name: "scpdy:configeditor",
			description: "Shows the SCP: Dystopia addon config editor form",
			permissionLevel: mc.CommandPermissionLevel.Host,
			optionalParameters: [
				{
					name: "target",
					type: mc.CustomCommandParamType.PlayerSelector,
				},
			],
		},
		(origin, players) => {
			const targets = Array.isArray(players) ? players : [origin.sourceEntity];
			let showCount = 0;

			for (const target of targets) {
				if (!(target instanceof mc.Player)) continue;

				mc.system.run(() => {
					showConfigEditorForm(target);
				});

				showCount++;
			}

			if (showCount > 0) {
				return {
					status: mc.CustomCommandStatus.Success,
					message: `Successfully showed the config editor form to ${showCount} players.`,
				};
			}

			return {
				status: mc.CustomCommandStatus.Failure,
				message: "Target player must be specified.",
			};
		},
	);
});
