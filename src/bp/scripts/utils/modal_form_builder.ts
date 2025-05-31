import type { RawMessage } from "@minecraft/server";
import {
	ModalFormData,
	type ModalFormDataDropdownOptions,
	type ModalFormDataSliderOptions,
	type ModalFormDataTextFieldOptions,
	type ModalFormDataToggleOptions,
	type ModalFormResponse,
} from "@minecraft/server-ui";

/** Utility type to prettify and flatten a type for better intellisense. */
type Prettify<T> = {
	[K in keyof T]: T[K];
} & {}; // https://youtu.be/lraHlXpuhKs?feature=shared&t=420

/** Represents a string or a Minecraft RawMessage. */
type Text = string | RawMessage;

/** Represents a single element in a modal form. */
type ModalFormElement =
	| { type: "divider" }
	| { type: "header"; text: Text }
	| { type: "label"; text: Text }
	| { type: "toggle"; id: string; label: Text; options?: ModalFormDataToggleOptions }
	| { type: "textField"; id: string; label: Text; placeholderText: Text; options?: ModalFormDataTextFieldOptions }
	| {
			type: "slider";
			id: string;
			label: Text;
			minimumValue: number;
			maximumValue: number;
			options?: ModalFormDataSliderOptions;
	  }
	| { type: "dropdown"; id: string; label: Text; items: Text[]; options?: ModalFormDataDropdownOptions };

/**
 * A builder class for creating Minecraft modal forms with a fluent API.
 * @template T The resulting form value object type.
 */
export class ModalFormBuilder<T extends Record<string, boolean | number | string> = {}> {
	private elements: ModalFormElement[] = [];
	private title?: Text;
	private submitButton?: Text;

	constructor() {}

	/**
	 * Sets the form's title.
	 * @param text
	 * @returns Unchanged ModalFormBuilder
	 */
	setTitle(text: Text) {
		this.title = text;
		return this;
	}

	/**
	 * Sets the submit button text.
	 * @param text
	 * @returns Unchanged ModalFormBuilder
	 */
	setSubmitButton(text: Text) {
		this.submitButton = text;
		return this;
	}

	/**
	 * Adds a visual divider to the form.
	 * @returns ModalFormBuilder with updated type
	 */
	addDivider() {
		this.elements.push({ type: "divider" });
		return this;
	}

	/**
	 * Adds a header to the form.
	 * @param text
	 * @returns ModalFormBuilder with updated type
	 */
	addHeader(text: Text) {
		this.elements.push({
			type: "header",
			text,
		});
		return this;
	}

	/**
	 * Adds a label to the form.
	 * @param text
	 * @returns ModalFormBuilder with updated type
	 */
	addLabel(text: Text) {
		this.elements.push({
			type: "label",
			text,
		});
		return this;
	}

	/**
	 * Adds a toggle (boolean) input to the form.
	 * @template Id
	 * @param id
	 * @param label
	 * @param options
	 * @returns ModalFormBuilder with updated type
	 */
	addToggle<Id extends string>(id: Id, label: Text, options?: ModalFormDataToggleOptions) {
		this.elements.push({
			type: "toggle",
			id,
			label,
			options,
		});
		return this as ModalFormBuilder<Prettify<T & { [K in Id]: boolean }>>;
	}

	/**
	 * Adds a text field input to the form.
	 * @param id
	 * @param label
	 * @param placeholderText
	 * @param options
	 * @returns ModalFormBuilder with updated type
	 */
	addTextField<Id extends string>(id: Id, label: Text, placeholderText: Text, options?: ModalFormDataTextFieldOptions) {
		this.elements.push({
			type: "textField",
			id,
			label,
			placeholderText,
			options,
		});
		return this as ModalFormBuilder<Prettify<T & { [K in Id]: string }>>;
	}

	/**
	 * Adds a slider (number) input to the form.
	 * @param id
	 * @param label
	 * @param minimumValue
	 * @param maximumValue
	 * @param options
	 * @returns ModalFormBuilder with updated type
	 */
	addSlider<Id extends string>(
		id: Id,
		label: Text,
		minimumValue: number,
		maximumValue: number,
		options?: ModalFormDataSliderOptions,
	) {
		this.elements.push({
			type: "slider",
			id,
			label,
			minimumValue,
			maximumValue,
			options,
		});
		return this as ModalFormBuilder<Prettify<T & { [K in Id]: number }>>;
	}

	/**
	 * Adds a dropdown input to the form.
	 * @template Id
	 * @param id
	 * @param label
	 * @param items
	 * @param options
	 * @returns ModalFormBuilder with updated type
	 */
	addDropdown<Id extends string>(id: Id, label: Text, items: Text[], options?: ModalFormDataDropdownOptions) {
		this.elements.push({
			type: "dropdown",
			id,
			label,
			items,
			options,
		});
		return this as ModalFormBuilder<Prettify<T & { [K in Id]: number }>>;
	}

	/**
	 * Finalizes the form and returns the ModalFormData and response parsers.
	 * @returns An object containing the form data, and the functions to parse responses.
	 */
	done() {
		const formData = new ModalFormData();

		if (this.title != undefined) formData.title(this.title);
		if (this.submitButton != undefined) formData.submitButton(this.submitButton);

		for (const e of this.elements) {
			switch (e.type) {
				case "divider":
					formData.divider();
					break;
				case "header":
					formData.header(e.text);
					break;
				case "label":
					formData.header(e.text);
					break;
				case "toggle":
					formData.toggle(e.label, e.options);
					break;
				case "slider":
					formData.slider(e.label, e.minimumValue, e.maximumValue, e.options);
					break;
				case "textField":
					formData.textField(e.label, e.placeholderText, e.options);
					break;
				case "dropdown":
					formData.dropdown(e.label, e.items, e.options);
					break;
			}
		}

		const parseResponse = (response: ModalFormResponse) => {
			if (response.canceled) throw new Error("Form was canceled.");
			if (!response.formValues) throw new Error("Form values are undefined.");

			const finalObject: Record<string, boolean | number | string> = {};

			for (let i = 0; i < response.formValues.length; i++) {
				const formValue = response.formValues[i];
				const e = this.elements[i];
				if (!e) throw new Error(`Element of index ${i} was not found... This was not supposed to happen!!!`);
				switch (e.type) {
					case "divider":
						break;
					case "header":
						break;
					case "label":
						break;
					case "toggle":
						finalObject[e.id] = Boolean(formValue);
						break;
					case "slider":
						finalObject[e.id] = Number(formValue);
						break;
					case "textField":
						finalObject[e.id] = String(formValue);
						break;
					case "dropdown":
						finalObject[e.id] = Number(formValue);
						break;
				}
			}

			if (Object.keys(finalObject).length !== this.elements.length) throw new Error("What the fuck!?");

			return finalObject as T;
		};

		const safeParseResponse = (response: ModalFormResponse) => {
			try {
				return parseResponse(response);
			} catch {
				return undefined;
			}
		};

		return {
			formData,
			/**
			 * Parses a ModalFormResponse and returns the form values as an object.
			 * @param response
			 * @throws {Error} If the form was canceled or values are missing.
			 */
			parseResponse,
			/**
			 * Safely parses a ModalFormResponse, returning undefined on error.
			 * @param response
			 */
			safeParseResponse,
		};
	}
}
