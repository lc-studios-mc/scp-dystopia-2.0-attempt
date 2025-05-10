import { clamp } from "@/utils/math";
import { world, type Player, type RawMessage, type Vector3 } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

interface DynamicPropertyAccess {
	getDynamicProperty: (id: string) => string | boolean | number | Vector3 | undefined;
	setDynamicProperty: (id: string, value?: string | boolean | Vector3 | number) => void;
}

type Text = string | RawMessage;

type DropdownChoiceRecord = Record<string, { text: Text }>;
type DropdownChoiceArray = { name: string; text: Text }[];

export class ConfigBuilder<Data = {}> {
	private elements: (
		| {
				type: "toggle";
				name: string;
				get: () => boolean;
				set: (value: boolean) => void;
				reset: () => void;
				defaultValue: boolean;
				label: Text;
				tooltip?: Text;
		  }
		| {
				type: "slider";
				name: string;
				get: () => number;
				set: (value: number) => void;
				reset: () => void;
				minValue: number;
				maxValue: number;
				defaultValue: number;
				valueStep: number;
				label: Text;
				tooltip?: Text;
		  }
		| {
				type: "textField";
				name: string;
				get: () => string;
				set: (value: string) => void;
				reset: () => void;
				defaultValue: string;
				placeholderText: Text;
				label: Text;
				tooltip?: Text;
		  }
		| {
				type: "dropdown";
				name: string;
				get: () => string;
				getIndex: () => number;
				set: (value: string) => void;
				setIndex: (value: number) => void;
				reset: () => void;
				choiceArray: DropdownChoiceArray;
				defaultValue: string;
				defaultValueIndex: number;
				label: Text;
				tooltip?: Text;
		  }
		| { type: "header"; text: Text }
		| { type: "label"; text: Text }
		| { type: "divider" }
	)[] = [];

	constructor(private readonly readAndWriteTo: DynamicPropertyAccess) {}

	toggle<Name extends string>(name: Name, label: Text, defaultValue = false, tooltip?: Text) {
		this.elements.push({
			type: "toggle",
			name,
			get: () => {
				const value = this.getDynamicProperty(name);
				return typeof value === "boolean" ? value : defaultValue;
			},
			set: (valueArg) => {
				const value = valueArg === defaultValue ? undefined : valueArg;
				this.setDynamicProperty(name, value);
			},
			reset: () => {
				this.setDynamicProperty(name, undefined);
			},
			defaultValue,
			label,
			tooltip,
		});

		return this as ConfigBuilder<
			Data & {
				[P in Name]: boolean;
			}
		>;
	}

	slider<Name extends string>(
		name: Name,
		label: Text,
		minValue = 0,
		maxValue = 1,
		defaultValue = 0,
		valueStep = 1,
		tooltip?: Text,
	) {
		const fixValue = (valueArg: number): number => {
			const value = Math.round(valueArg / valueStep) * valueStep;
			return clamp(value, minValue, maxValue);
		};

		const fixedDefaultValue = fixValue(defaultValue);

		this.elements.push({
			type: "slider",
			name,
			get: () => {
				const value = this.getDynamicProperty(name);
				return typeof value === "number" ? fixValue(value) : fixedDefaultValue;
			},
			set: (valueArg) => {
				const fixedValueArg = fixValue(valueArg);
				const value = fixedValueArg === fixedDefaultValue ? undefined : fixedValueArg;
				this.setDynamicProperty(name, value);
			},
			reset: () => {
				this.setDynamicProperty(name, undefined);
			},
			minValue,
			maxValue,
			defaultValue,
			valueStep,
			label,
			tooltip,
		});

		return this as ConfigBuilder<
			Data & {
				[P in Name]: number;
			}
		>;
	}

	textField<Name extends string>(
		name: Name,
		label: Text,
		placeholderText: Text,
		defaultValue = "",
		tooltip?: Text,
	) {
		this.elements.push({
			type: "textField",
			name,
			get: () => {
				const value = this.getDynamicProperty(name);
				return typeof value === "string" ? value : defaultValue;
			},
			set: (valueArg) => {
				const value = valueArg === defaultValue ? undefined : valueArg;
				this.setDynamicProperty(name, value);
			},
			reset: () => {
				this.setDynamicProperty(name, undefined);
			},
			defaultValue,
			placeholderText,
			label,
			tooltip,
		});

		return this as ConfigBuilder<
			Data & {
				[P in Name]: string;
			}
		>;
	}

	dropdown<Name extends string, Choices extends DropdownChoiceRecord>(
		name: Name,
		label: Text,
		choices: Choices,
		defaultValue?: keyof Choices,
		tooltip?: Text,
	) {
		const choicesObjEntries = Object.entries(choices);
		const choiceArray: DropdownChoiceArray = [];

		for (const [k, v] of choicesObjEntries) {
			choiceArray.push({ name: k, text: v.text });
		}

		if (choiceArray.length <= 0) return this;

		const defaultValueIndex = choiceArray.findIndex((choice) => choice.name === defaultValue);

		this.elements.push({
			type: "dropdown",
			name,
			get: () => {
				const indexProp = this.getDynamicProperty(name);
				const index = typeof indexProp === "number" ? indexProp : defaultValueIndex;
				const value = choiceArray[index]?.name ?? String(defaultValue);
				return value;
			},
			getIndex: () => {
				const indexProp = this.getDynamicProperty(name);
				const index = typeof indexProp === "number" ? indexProp : defaultValueIndex;
				return index;
			},
			set: (valueArg) => {
				const foundIndex = choiceArray.findIndex((choice) => choice.name === valueArg);
				const index = foundIndex !== -1 ? foundIndex : defaultValueIndex;
				const result = index === defaultValueIndex ? undefined : index;
				this.setDynamicProperty(name, result);
			},
			setIndex: (indexArg) => {
				const result = indexArg === defaultValueIndex ? undefined : indexArg;
				this.setDynamicProperty(name, result);
			},
			reset: () => {
				this.setDynamicProperty(name, undefined);
			},
			choiceArray,
			defaultValue: String(defaultValue),
			defaultValueIndex,
			label,
			tooltip,
		});

		return this as ConfigBuilder<
			Data & {
				[P in Name]: keyof Choices;
			}
		>;
	}

	header(text: Text) {
		this.elements.push({ type: "header", text });
	}

	label(text: Text) {
		this.elements.push({ type: "label", text });
	}

	divider() {
		this.elements.push({ type: "divider" });
	}

	build(): Data {
		const o: Record<string, unknown> = {};

		for (const element of this.elements) {
			switch (element.type) {
				case "toggle":
				case "slider":
				case "textField":
				case "dropdown":
					Object.defineProperty(o, element.name, {
						get() {
							return element.get();
						},
						set(v) {
							// @ts-expect-error
							return element.set(v);
						},
						configurable: false,
						enumerable: true,
					});
					break;
			}
		}

		return o as Data;
	}

	resetAllOptions(): void {
		for (const element of this.elements) {
			switch (element.type) {
				case "toggle":
				case "slider":
				case "textField":
				case "dropdown":
					element.reset();
					break;
			}
		}
	}

	private getDynamicProperty(id: string) {
		try {
			return this.readAndWriteTo.getDynamicProperty(`config__${id}`);
		} catch {
			return undefined;
		}
	}

	private setDynamicProperty(id: string, value?: boolean | string | number): void {
		try {
			this.readAndWriteTo.setDynamicProperty(`config__${id}`, value);
		} catch {}
	}

	async showEditorForm(target: Player): Promise<void> {
		const formData = new ModalFormData()
			.title({ translate: "scpdy.config.text.editorFormTitle" })
			.label({ translate: "scpdy.config.text.editorFormExplanation" })
			.submitButton({ translate: "scpdy.misc.text.saveAndExit" });

		// Add "Reset" option
		formData.divider();
		formData.toggle(
			{ translate: "scpdy.config.text.editorFormResetToggle.label" },
			{
				defaultValue: false,
				tooltip: { translate: "scpdy.config.text.editorFormResetToggle.tooltip" },
			},
		);
		formData.divider();

		const handlers: (((value: string | number | boolean | undefined) => void) | null)[] = [
			null, // Label
			null, // Divider
			null, // Reset toggle
			null, // Divider
		];

		for (const element of this.elements) {
			switch (element.type) {
				case "divider":
					formData.divider();
					handlers.push(null);
					break;

				case "header":
					formData.header(element.text);
					handlers.push(null);
					break;

				case "label":
					formData.label(element.text);
					handlers.push(null);
					break;

				case "toggle":
					formData.toggle(element.label, {
						defaultValue: element.get(),
						tooltip: element.tooltip,
					});
					handlers.push((value) => {
						if (typeof value !== "boolean") return;
						element.set(value);
					});
					break;

				case "slider":
					formData.slider(element.label, element.minValue, element.maxValue, {
						valueStep: element.valueStep,
						defaultValue: element.get(),
						tooltip: element.tooltip,
					});
					handlers.push((value) => {
						if (typeof value !== "number") return;
						element.set(value);
					});
					break;

				case "textField":
					formData.textField(element.label, element.placeholderText, {
						defaultValue: element.get(),
						tooltip: element.tooltip,
					});
					handlers.push((value) => {
						if (typeof value !== "string") return;
						element.set(value);
					});
					break;

				case "dropdown":
					formData.dropdown(
						element.label,
						element.choiceArray.map((x) => x.text),
						{
							defaultValueIndex: element.getIndex(),
							tooltip: element.tooltip,
						},
					);
					handlers.push((value) => {
						if (typeof value !== "number") return;
						element.setIndex(value);
					});
					break;
			}
		}

		const response = await formData.show(target);

		if (response.canceled) return;
		if (!response.formValues) return;

		for (let i = 0; i < response.formValues.length; i++) {
			const formValue = response.formValues[i];

			// If "Reset" option is true
			if (i === 2 && formValue === true) {
				this.resetAllOptions();
				target.sendMessage({ translate: "scpdy.config.text.messageOnReset" });
				return;
			}

			const handler = handlers[i];

			handler?.(formValue);
		}

		target.sendMessage({ translate: "scpdy.config.text.messageOnSaveAndExit" });
	}
}
