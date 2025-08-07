import * as mc from "@minecraft/server";
import { ConfigBuilder } from "./ConfigBuilder";

const builder = new ConfigBuilder(mc.world);

const configInternal = builder
	// Define config properties with method chain
	.toggle(
		"disableExpensiveGoreEffects",
		{ translate: "scpdy.config.disableExpensiveGoreEffects" },
		false,
		{
			translate: "scpdy.config.disableExpensiveGoreEffects.tooltip",
		},
	)
	.toggle("disableDestructiveScp096Behavior", {
		translate: "scpdy.config.disableDestructiveScp096Behavior",
	})
	.toggle("disableBlackScreenWhileBlinking", {
		translate: "scpdy.config.disableBlackScreenWhileBlinking",
	})
	.toggle("disableBulletHoles", { translate: "scpdy.config.disableBulletHoles" })
	.build();

export const config: Readonly<typeof configInternal> = configInternal;

export const showConfigEditorForm = (target: mc.Player) => builder.showEditorForm(target);
