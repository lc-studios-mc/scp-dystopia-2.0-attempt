import type { ItemStack } from "@minecraft/server";
import type { AttachmentConfig } from "./types";
import { attachmentConfigsById } from "./configs/attachment_configs";
import { console } from "@lc-studios-mc/scripting-utils";

export type AttachmentContextArgs = {
	itemStack?: ItemStack;
	slotTypes?: string[];
};

export class AttachmentContext {
	private map = new Map<string, AttachmentConfig | null>();
	private lastEditTime: number = 0;

	constructor(args: AttachmentContextArgs) {
		if (args.slotTypes) {
			for (const slotType of args.slotTypes) {
				this.map.set(slotType, null);
			}
		}

		if (!args.itemStack) return;

		const lastEditTimeItemStack = args.itemStack.getDynamicProperty("lastAttachmentEditTime");
		if (typeof lastEditTimeItemStack === "number") this.lastEditTime = lastEditTimeItemStack;

		// Set values on this.map with given Item Stack
		for (const propId of args.itemStack.getDynamicPropertyIds()) {
			if (!propId.startsWith("gunatt:")) continue;

			const slotType = propId.split(":")[1];
			if (typeof slotType !== "string") continue;

			const attId = args.itemStack.getDynamicProperty(propId);
			if (typeof attId !== "string") {
				this.map.set(slotType, null);
				continue;
			}

			const att = attachmentConfigsById.get(attId);
			if (!att) {
				console.error(`Unknown attachment: ${attId}`);
				continue;
			}

			this.map.set(slotType, att);
		}
	}

	set(slotType: string, attachment?: AttachmentConfig): void {
		this.map.set(slotType, attachment ?? null);
		this.lastEditTime = Date.now();
	}

	get(slotType: string): AttachmentConfig | undefined {
		const value = this.map.get(slotType);
		if (value) return value;
	}

	createArray(): AttachmentConfig[] {
		return Array.from(this.map.values()).filter((att) => att != null);
	}

	createRecord(): Record<string, AttachmentConfig> {
		const record: Record<string, AttachmentConfig> = {};

		for (const [slotType, att] of this.map) {
			if (!att) continue;
			record[slotType] = att;
		}

		return record;
	}

	createRecordNullable(): Record<string, AttachmentConfig | null> {
		return Object.fromEntries(this.map.entries());
	}

	apply(itemStack: ItemStack): void {
		for (const [slotType, att] of this.map) {
			const value = att ? att.id : "";
			itemStack.setDynamicProperty(`gunatt:${slotType}`, value);
		}

		itemStack.setDynamicProperty("lastAttachmentEditTime", this.lastEditTime);
	}

	lastEditTimeEquals(another: AttachmentContext | ItemStack): boolean {
		if (another instanceof AttachmentContext) return this.lastEditTime === another.lastEditTime;

		const lastEditTimeItemStack = another.getDynamicProperty("lastAttachmentEditTime") ?? 0;
		return this.lastEditTime === lastEditTimeItemStack;
	}
}
