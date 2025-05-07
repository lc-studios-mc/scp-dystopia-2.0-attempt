import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// #region Internal stuff

type ToggleConfigOption = {
	type: "boolean";
	mode: "toggle";
	label?: string | mc.RawMessage;
	default: boolean;
	get: () => boolean;
	set: (value: unknown) => void;
};

type DropdownConfigOption = {
	type: "number";
	mode: "dropdown";
	label?: string | mc.RawMessage;
	choices: (string | mc.RawMessage)[];
	default: number;
	get: () => number;
	set: (value: unknown) => void;
};

type ConfigOption = ToggleConfigOption | DropdownConfigOption;

type ConfigOptionWithoutGeneratedProperties<T extends ConfigOption> = Omit<
	T,
	"type" | "mode" | "get" | "set"
>;

type ToggleConfigOptionFriendly = ConfigOptionWithoutGeneratedProperties<ToggleConfigOption>;

type DropdownConfigOptionFriendly = ConfigOptionWithoutGeneratedProperties<DropdownConfigOption>;

type ConfigBuilderElement =
	| { type: "option"; name: string; option: ConfigOption }
	| { type: "divider" }
	| { type: "header"; value: string | mc.RawMessage }
	| { type: "label"; value: string | mc.RawMessage };

type FormOptionCallback = (value: unknown) => void;

class ConfigBuilder<T = {}> {
	elements: ConfigBuilderElement[] = [];

	divider(): ConfigBuilder<T> {
		this.elements.push({ type: "divider" });
		return this;
	}

	header(value: string | mc.RawMessage): ConfigBuilder<T> {
		this.elements.push({ type: "header", value });
		return this;
	}

	label(value: string | mc.RawMessage): ConfigBuilder<T> {
		this.elements.push({ type: "label", value });
		return this;
	}

	toggle<K extends string>(
		name: K,
		option: ToggleConfigOptionFriendly,
	): ConfigBuilder<T & { [P in K]: boolean }> {
		const dynamicPropId = this.dynamicPropertyIdOf(name);

		const realOption: ToggleConfigOption = {
			...option,
			type: "boolean",
			mode: "toggle",
			get: () => {
				const value = mc.world.getDynamicProperty(dynamicPropId);
				return typeof value === "boolean" ? value : option.default;
			},
			set: (value) => {
				let newValue = undefined;
				if (typeof value === "boolean") newValue = value;
				mc.world.setDynamicProperty(dynamicPropId, newValue);
			},
		};

		this.elements.push({
			type: "option",
			name,
			option: realOption,
		});

		return this as ConfigBuilder<T & { [P in K]: boolean }>;
	}

	dropdown<K extends string>(
		name: K,
		option: DropdownConfigOptionFriendly,
	): ConfigBuilder<T & { [P in K]: number }> {
		const dynamicPropId = this.dynamicPropertyIdOf(name);

		const realOption: DropdownConfigOption = {
			...option,
			type: "number",
			mode: "dropdown",
			get: () => {
				const value = mc.world.getDynamicProperty(dynamicPropId);
				return typeof value === "number" ? value : option.default;
			},
			set: (value) => {
				let newValue = undefined;
				if (typeof value === "number") newValue = value;
				mc.world.setDynamicProperty(dynamicPropId, newValue);
			},
		};

		this.elements.push({
			type: "option",
			name,
			option: realOption,
		});

		return this as ConfigBuilder<T & { [P in K]: number }>;
	}

	dynamicPropertyIdOf(name: string): string {
		return `config_${name}`;
	}

	make(): T {
		let returnProps: any = {};

		for (const element of this.elements) {
			if (element.type !== "option") continue;

			const name = element.name;
			const option = element.option;

			Object.defineProperty(returnProps, name, {
				get() {
					return option.get();
				},
				set(value) {
					option.set(value);
				},
				enumerable: false,
				configurable: true,
			});
		}

		return returnProps as T;
	}

	resetToDefaults(): void {
		for (const element of this.elements) {
			if (element.type !== "option") continue;

			element.option.set(element.option.default);
		}
	}

	async showEditorForm(player: mc.Player): Promise<void> {
		mc.system.run(() => {
			player.playSound("random.pop");
		});

		const formData = new ModalFormData()
			.title({ translate: "scpdy.configV2.title" })
			.submitButton({ translate: "scpdy.configV2.submitButton" })
			.label({ translate: "scpdy.configV2.description" })
			.divider()
			.label({ translate: "scpdy.configV2.resetOnExit.label" })
			.toggle({ translate: "scpdy.configV2.resetOnExit.toggle" }, { defaultValue: false })
			.divider();

		const optionCallbacks: FormOptionCallback[] = [];

		for (const element of this.elements) {
			switch (element.type) {
				case "divider":
					formData.divider();
					break;
				case "header":
					formData.header(element.value);
					break;
				case "label":
					formData.label(element.value);
					break;
				case "option":
					const callback = this.addOptionToConfigEditorForm(formData, element.name, element.option);
					optionCallbacks.push(callback);
					break;
			}
		}

		const response = await formData.show(player);

		if (response.canceled) return;
		if (!response.formValues) return;

		for (let i = 0; i < response.formValues.length; i++) {
			const formValue = response.formValues[i]!;

			if (i === 0) {
				if (formValue === true) {
					this.resetToDefaults();
					return;
				}
				continue;
			}

			const optionIndex = i - 1;

			const callback = optionCallbacks[optionIndex];

			callback?.(formValue);
		}
	}

	private addOptionToConfigEditorForm(
		formData: ModalFormData,
		name: string,
		option: ConfigOption,
	): FormOptionCallback {
		const mode = option.mode;
		switch (mode) {
			case "toggle":
				formData.toggle(option.label ?? name, { defaultValue: option.get() });
				break;
			case "dropdown":
				formData.dropdown(option.label ?? name, option.choices, {
					defaultValueIndex: option.get(),
				});
				break;
			default:
				throw new Error(`Unhandled option mode: ${mode}`);
		}

		return option.set;
	}
}

// #endregion

const CONFIG_BUILDER = new ConfigBuilder()
	.toggle("disableExpensiveGoreEffects", {
		label: { translate: "scpdy.configV2.disableExpensiveGoreEffects" },
		default: false,
	})
	.toggle("disableAdvanced096Movement", {
		label: { translate: "scpdy.configV2.disableAdvancedSCP096Movement" },
		default: false,
	})
	.toggle("disableCameraFadeOnBlink", {
		label: { translate: "scpdy.configV2.disableCameraFadeOnBlink" },
		default: false,
	})
	.toggle("disableKnockbackOfCertainBullets", {
		label: { translate: "scpdy.configV2.disableKnockbackOfCertainBullets" },
		default: false,
	})
	.dropdown("gunTacReloadTrigger", {
		label: { translate: "scpdy.configV2.gunTacReloadTrigger.label" },
		choices: [
			{ translate: "scpdy.configV2.gunTacReloadTrigger.0" },
			{ translate: "scpdy.configV2.gunTacReloadTrigger.1" },
			{ translate: "scpdy.configV2.gunTacReloadTrigger.2" },
		],
		default: 2,
	});

const PROPS = CONFIG_BUILDER.make();

// Public read-only config object
export const CONFIG: Readonly<typeof PROPS> = PROPS;

export async function showConfigEditorForm(player: mc.Player): Promise<void> {
	await CONFIG_BUILDER.showEditorForm(player);
}

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
	if (event.id !== "scpdy:reset_config") return;
	CONFIG_BUILDER.resetToDefaults();
});
