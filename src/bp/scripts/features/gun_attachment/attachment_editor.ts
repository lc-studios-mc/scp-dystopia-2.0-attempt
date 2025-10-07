import { console, findContainerSlot, findItemStack } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { AttachmentContext } from "./attachment_context";
import { getSupportedAttachments, supportsAttachments } from "./attachment_support";
import { attachmentConfigsById } from "./configs";
import type { AttachmentConfig } from "./shared";

// Types
type AttachmentEditorElement = {
	attachments: {
		attachmentConfig: AttachmentConfig;
		alreadyAttached: boolean;
		isAvailable: boolean;
		shouldConsumeItem: boolean;
	}[];
	defaultIndex: number;
};

type AttachmentEditorConfig = {
	attachmentContext: AttachmentContext;
	elementsBySlotType: Map<string, AttachmentEditorElement>;
};

type EditorOptions = {
	itemStack: mc.ItemStack;
	isCreativeMode?: boolean;
	inventoryContainer?: mc.Container;
};

// Constants
const EDITOR_MESSAGES = {
	HOLD_ITEM: "scpdy.attachment_workbench.hold_item",
	ITEM_NO_SUPPORT: "scpdy.attachment_workbench.item_does_not_support_attachments",
	SOMETHING_WRONG: "scpdy.misc.text.somethingWentWrong",
	CANCELED: "scpdy.attachment_editor.canceled",
	UNAVAILABLE: "scpdy.attachment_editor.x_is_unavailable",
} as const;

const FORM_KEYS = {
	TITLE: "scpdy.attachment_editor",
	SUBMIT: "scpdy.attachment_editor.apply",
	ABOUT: "scpdy.attachment_editor.about",
	DEFAULT: "scpdy.attachment_editor.default",
} as const;

// Utility functions
const hasAttachmentItemInInventory = (
	container: mc.Container | undefined,
	itemType: string,
): boolean => {
	return (
		(container?.isValid && findItemStack(container, (x) => x.typeId === itemType) !== undefined) ===
		true
	);
};

const isAttachmentAvailable = (
	alreadyAttached: boolean,
	itemType: string | undefined,
	isCreativeMode: boolean,
	inventoryContainer: mc.Container | undefined,
): boolean => {
	if (alreadyAttached) return true;
	if (!itemType) return true;
	if (isCreativeMode) return true;
	return hasAttachmentItemInInventory(inventoryContainer, itemType);
};

const createAttachmentElement = (
	slotType: string,
	attIds: string[],
	context: AttachmentContext,
	options: EditorOptions,
): AttachmentEditorElement => {
	const element: AttachmentEditorElement = {
		attachments: [],
		defaultIndex: -1,
	};

	for (const attId of attIds) {
		const attConfig = attachmentConfigsById.get(attId);
		if (!attConfig) {
			console.error(`Unknown attachment: ${attId}`);
			continue;
		}

		const alreadyAttached = context.get(slotType) === attConfig;
		const isAvailable = isAttachmentAvailable(
			alreadyAttached,
			attConfig.itemType,
			options.isCreativeMode ?? false,
			options.inventoryContainer,
		);

		if (alreadyAttached) {
			if (element.defaultIndex !== -1) {
				console.error("Multiple attachments already attached to the same slot");
			}
			element.defaultIndex = element.attachments.length;
		}

		element.attachments.push({
			attachmentConfig: attConfig,
			alreadyAttached,
			isAvailable,
			shouldConsumeItem: attConfig.itemType !== undefined,
		});
	}

	return element;
};

const createAttachmentEditorConfig = (
	options: EditorOptions,
): AttachmentEditorConfig | undefined => {
	const supportedAtts = getSupportedAttachments(options.itemStack);

	if (!supportedAtts) {
		console.warn(`Item Stack '${options.itemStack}' does not support attachments.`);
		return undefined;
	}

	const context = new AttachmentContext(options.itemStack);
	const elementsBySlotType = new Map<string, AttachmentEditorElement>();

	for (const [slotType, attIds] of Object.entries(supportedAtts)) {
		const element = createAttachmentElement(slotType, attIds, context, options);
		elementsBySlotType.set(slotType, element);
	}

	return {
		attachmentContext: context,
		elementsBySlotType,
	};
};

// Form creation helpers
const createDropdownItems = (
	attachments: AttachmentEditorElement["attachments"],
): mc.RawMessage[] => {
	const items: mc.RawMessage[] = attachments.map((att) => ({
		rawtext: [
			{ text: att.isAvailable ? "" : "§c" },
			{ translate: att.attachmentConfig.localizationKey },
		],
	}));

	items.unshift({ translate: FORM_KEYS.DEFAULT });
	return items;
};

const buildForm = (config: AttachmentEditorConfig): ModalFormData => {
	const formData = new ModalFormData()
		.title({ translate: FORM_KEYS.TITLE })
		.submitButton({ translate: FORM_KEYS.SUBMIT })
		.label({ translate: FORM_KEYS.ABOUT })
		.divider();

	for (const [slotType, element] of config.elementsBySlotType) {
		const dropdownItems = createDropdownItems(element.attachments);

		formData.dropdown({ translate: `scpdy.gun.att.slot.${slotType}` }, dropdownItems, {
			defaultValueIndex: element.defaultIndex + 1,
		});
	}

	return formData;
};

// Item handling
const giveOrDropItemStack = (
	player: mc.Player,
	itemStack: mc.ItemStack,
	mainhandSlot: mc.ContainerSlot,
): void => {
	if (mainhandSlot.hasItem()) {
		player.dimension.spawnItem(itemStack, player.getHeadLocation());
	} else {
		mainhandSlot.setItem(itemStack);
	}
};

const processAttachmentChange = (
	player: mc.Player,
	slotType: string,
	element: AttachmentEditorElement,
	selectedIndex: number,
	config: AttachmentEditorConfig,
	isCreativeMode: boolean,
	inventoryContainer: mc.Container,
): void => {
	const oldAtt = element.attachments[element.defaultIndex];
	const newAtt = element.attachments[selectedIndex];

	if (!newAtt) {
		// Remove attachment
		config.attachmentContext.set(slotType, undefined);

		if (oldAtt && oldAtt.attachmentConfig.itemType && !isCreativeMode) {
			const itemStack = new mc.ItemStack(oldAtt.attachmentConfig.itemType);
			mc.system.runTimeout(() => {
				player.dimension.spawnItem(itemStack, player.getHeadLocation());
			}, 1);
		}
		return;
	}

	if (newAtt.alreadyAttached) return;

	if (!newAtt.isAvailable) {
		player.sendMessage({
			translate: EDITOR_MESSAGES.UNAVAILABLE,
			with: { rawtext: [{ translate: newAtt.attachmentConfig.localizationKey }] },
		});
		return;
	}

	if (!isCreativeMode && newAtt.shouldConsumeItem) {
		const containerSlot = findContainerSlot(
			inventoryContainer,
			(x) => x.hasItem() && x.typeId === newAtt.attachmentConfig.itemType,
		);

		if (containerSlot) {
			if (containerSlot.amount > 1) {
				containerSlot.amount--;
			} else {
				containerSlot.setItem(undefined);
			}
		}
	}

	config.attachmentContext.set(slotType, newAtt.attachmentConfig);
};

const processFormResponse = (
	player: mc.Player,
	response: any,
	config: AttachmentEditorConfig,
	originalItemStack: mc.ItemStack,
	mainhandSlot: mc.ContainerSlot,
	isCreativeMode: boolean,
	inventoryContainer: mc.Container,
): void => {
	if (response.canceled || !response.formValues) {
		player.sendMessage({ translate: EDITOR_MESSAGES.CANCELED });
		giveOrDropItemStack(player, originalItemStack, mainhandSlot);
		return;
	}

	try {
		const elementsArray = Array.from(config.elementsBySlotType.entries());
		const slicedFormValues = response.formValues.slice(2);

		for (let i = 0; i < slicedFormValues.length; i++) {
			const selectedIndex = Number(slicedFormValues[i]) - 1;
			const [slotType, element] = elementsArray[i]!;
			processAttachmentChange(
				player,
				slotType,
				element,
				selectedIndex,
				config,
				isCreativeMode,
				inventoryContainer,
			);
		}

		const modifiedItemStack = originalItemStack.clone();
		config.attachmentContext.apply(modifiedItemStack);
		modifiedItemStack.setLore(config.attachmentContext.createItemLore());
		giveOrDropItemStack(player, modifiedItemStack, mainhandSlot);
	} catch (error) {
		console.error("Error processing form response:", error);
		giveOrDropItemStack(player, originalItemStack, mainhandSlot);
	}
};

// Validation helpers
const getPlayerComponents = (player: mc.Player) => {
	const equippable = player.getComponent("equippable");
	if (!equippable) throw new Error("Failed to get equippable component of player");

	const inventory = player.getComponent("inventory");
	if (!inventory) throw new Error("Failed to get inventory component of player");

	return { equippable, inventory };
};

const validateItemStack = (player: mc.Player, itemStack: mc.ItemStack | undefined): boolean => {
	if (!itemStack) {
		player.sendMessage({ translate: EDITOR_MESSAGES.HOLD_ITEM });
		return false;
	}

	if (!supportsAttachments(itemStack)) {
		player.sendMessage({ translate: EDITOR_MESSAGES.ITEM_NO_SUPPORT });
		return false;
	}

	return true;
};

// Main export
export const showAttachmentEditor = async (player: mc.Player): Promise<void> => {
	const { equippable, inventory } = getPlayerComponents(player);

	const mainhandSlot = equippable.getEquipmentSlot(mc.EquipmentSlot.Mainhand);
	const itemStack = mainhandSlot.getItem();

	if (!validateItemStack(player, itemStack)) {
		return;
	}

	const isCreativeMode = player.getGameMode() === mc.GameMode.Creative;

	const config = createAttachmentEditorConfig({
		itemStack: itemStack!,
		isCreativeMode,
		inventoryContainer: inventory.container,
	});

	if (!config) {
		player.sendMessage({ translate: EDITOR_MESSAGES.SOMETHING_WRONG });
		return;
	}

	const formData = buildForm(config);

	// Clear mainhand to avoid conflicts
	equippable.setEquipment(mc.EquipmentSlot.Mainhand, undefined);

	const response = await formData.show(player);

	processFormResponse(
		player,
		response,
		config,
		itemStack!,
		mainhandSlot,
		isCreativeMode,
		inventory.container,
	);
};
