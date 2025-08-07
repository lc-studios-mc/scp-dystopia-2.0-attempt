import { console, isRecordObject } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";

const COMPONENT_ID = "scpdy:attachment_support";

export const getSupportedAttachments = (itemStack: mc.ItemStack): Record<string, string[]> | undefined => {
	const attSupportComponent = itemStack.getComponent(COMPONENT_ID);
	if (!attSupportComponent) return undefined;

	const params = attSupportComponent.customComponentParameters.params;
	if (!isRecordObject(params)) {
		console.error(`${COMPONENT_ID} component of ${itemStack.typeId} contains invalid parameters.`);
		return undefined;
	}

	const final: Record<string, string[]> = {};

	for (const [slotType, attachmentIds] of Object.entries(params)) {
		if (!Array.isArray(attachmentIds)) {
			final[slotType] = [];
			console.error(`Parameter value of ${COMPONENT_ID} component must be an array.`);
			continue;
		}

		final[slotType] = attachmentIds.map(value => String(value));
	}

	return final;
};

export const supportsAttachments = (itemStack: mc.ItemStack): boolean => {
	const compatibility = itemStack.getComponent(COMPONENT_ID);
	return compatibility != undefined;
};

mc.system.beforeEvents.startup.subscribe((e) => {
	// Data-only component
	e.itemComponentRegistry.registerCustomComponent(COMPONENT_ID, {});
});
