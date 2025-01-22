import { Player, system, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Player as UiPlayer } from "@minecraft/server-ui/node_modules/@minecraft/server";

export type ConfigData = {
	disableGore: boolean;
	advanced096Movement: boolean;
	blinkingCameraFade: boolean;
	bulletManipulatesTargetVelocity: boolean;
	gunTacReloadOption: number;
};

class _ConfigData implements ConfigData {
	reset(): void {
		this.disableGore = false;
		this.advanced096Movement = true;
		this.blinkingCameraFade = true;
		this.bulletManipulatesTargetVelocity = true;
		this.gunTacReloadOption = 2;
	}

	get disableGore(): boolean {
		return world.getDynamicProperty("scpdyConfig_disableGore") === true;
	}

	set disableGore(value: boolean | undefined) {
		world.setDynamicProperty("scpdyConfig_disableGore", value);
	}

	get advanced096Movement(): boolean {
		return world.getDynamicProperty("scpdyConfig_advanced096Movement") === true;
	}

	set advanced096Movement(value: boolean | undefined) {
		world.setDynamicProperty("scpdyConfig_advanced096Movement", value);
	}

	get blinkingCameraFade(): boolean {
		return world.getDynamicProperty("scpdyConfig_blinkingCameraFade") === true;
	}

	set blinkingCameraFade(value: boolean | undefined) {
		world.setDynamicProperty("scpdyConfig_blinkingCameraFade", value);
	}

	get bulletManipulatesTargetVelocity(): boolean {
		return world.getDynamicProperty("scpdyConfig_bulletManipulatesTargetVelocity") === true;
	}

	set bulletManipulatesTargetVelocity(value: boolean | undefined) {
		world.setDynamicProperty("scpdyConfig_bulletManipulatesTargetVelocity", value);
	}

	get gunTacReloadOption(): number {
		return world.getDynamicProperty("scpdyConfig_gunTacReloadTrigger") as number;
	}

	set gunTacReloadOption(value: number | undefined) {
		world.setDynamicProperty("scpdyConfig_gunTacReloadTrigger", value);
	}
}

const _CONFIG = new _ConfigData();

/**
 * Used to access config properties.
 */
export const CONFIG: ConfigData = _CONFIG;

export async function showConfigEditorForm(player: Player): Promise<void> {
	player.playSound("random.pop");

	const response = await new ModalFormData()
		.title({ translate: "scpdy.form.config.title" })
		.submitButton({ translate: "scpdy.form.config.submitButton" })

		// Set properties

		.toggle({ translate: "scpdy.form.config.prop.disableGore" }, _CONFIG.disableGore)
		.toggle(
			{ translate: "scpdy.form.config.prop.advanced096Movement" },
			_CONFIG.advanced096Movement,
		)
		.toggle({ translate: "scpdy.form.config.prop.blinkingCameraFade" }, _CONFIG.blinkingCameraFade)
		.toggle(
			{ translate: "scpdy.form.config.prop.bulletManipulatesTargetVelocity" },
			_CONFIG.bulletManipulatesTargetVelocity,
		)
		.dropdown(
			{ translate: "scpdy.form.config.prop.gunTacReloadTrigger" },
			[
				{ translate: "scpdy.form.config.prop.gunTacReloadTrigger.0" },
				{ translate: "scpdy.form.config.prop.gunTacReloadTrigger.1" },
				{ translate: "scpdy.form.config.prop.gunTacReloadTrigger.2" },
			],
			_CONFIG.gunTacReloadOption,
		)

		// Show

		.show(<UiPlayer>player);

	if (response.canceled) return;
	if (!response.formValues) return;

	_CONFIG.disableGore = response.formValues[0] === true;
	_CONFIG.advanced096Movement = response.formValues[1] === true;
	_CONFIG.blinkingCameraFade = response.formValues[2] === true;
	_CONFIG.bulletManipulatesTargetVelocity = response.formValues[3] === true;
	_CONFIG.gunTacReloadOption = response.formValues[4] as number;

	player.sendMessage({ translate: "scpdy.msg.config.saved" });
}

const isNotFirstTimeLoad = world.getDynamicProperty("isNotFirstTimeLoad") === true;

if (!isNotFirstTimeLoad) {
	_CONFIG.reset();
	world.setDynamicProperty("isNotFirstTimeLoad", true);
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
	if (event.id !== "scpdy:reset_config") return;
	_CONFIG.reset();
});
