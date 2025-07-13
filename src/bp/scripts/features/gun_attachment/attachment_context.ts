import type { ItemStack } from "@minecraft/server";
import type { AttachmentConfig, AttachmentStats } from "./types";
import { attachmentConfigsById } from "./configs";
import { console } from "@lc-studios-mc/scripting-utils";

export type AttachmentContextArgs = {
	itemStack?: ItemStack;
	slotTypes?: string[];
};

export class AttachmentContext {
	readonly lastEditTime: number = 0;
	readonly map: ReadonlyMap<string, AttachmentConfig | null> = new Map();
	readonly array: readonly AttachmentConfig[] = [];

	constructor(args: AttachmentContextArgs) {
		const map = new Map<string, AttachmentConfig | null>();
		const array: AttachmentConfig[] = [];

		if (args.slotTypes) {
			for (const slotType of args.slotTypes) {
				map.set(slotType, null);
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
				map.set(slotType, null);
				continue;
			}

			const att = attachmentConfigsById.get(attId);
			if (!att) {
				console.error(`Unknown attachment: ${attId}`);
				continue;
			}

			map.set(slotType, att);
			array.push(att);
		}

		this.map = map;
		this.array = array;
	}

	get(slotType: string): AttachmentConfig | undefined {
		const value = this.map.get(slotType);
		if (value) return value;
	}

	combineStats(): Required<AttachmentStats> {
		const base: Required<AttachmentStats> = {
			damageMultiplier: 1,
			markGunAsSuppressed: false,
		};

		const final = this.array.reduce((acc, currentOverride) => {
			return { ...acc, ...currentOverride };
		}, base);

		return final;
	}

	apply(itemStack: ItemStack): void {
		for (const [slotType, att] of this.map) {
			const value = att ? att.id : "";
			itemStack.setDynamicProperty(`gunatt:${slotType}`, value);
		}

		itemStack.setDynamicProperty("lastAttachmentEditTime", this.lastEditTime);
	}

	compareLastEditTime(another: AttachmentContext | ItemStack): boolean {
		if (another instanceof AttachmentContext) return this.lastEditTime === another.lastEditTime;

		const lastEditTimeItemStack = another.getDynamicProperty("lastAttachmentEditTime") ?? 0;
		return this.lastEditTime === lastEditTimeItemStack;
	}
}
