import { console } from "@lc-studios-mc/scripting-utils";
import type { ItemStack } from "@minecraft/server";
import { getSupportedAttachments } from "./attachment_support";
import { attachmentConfigsById } from "./configs";
import { type AttachmentConfig, type AttachmentStats, defaultAttachmentStats } from "./shared";

export class AttachmentContext {
	private _lastEditTime: number = 0;
	private _map = new Map<string, AttachmentConfig | null>();

	constructor(itemStack?: ItemStack) {
		if (!itemStack) return;

		const supportedAtts = getSupportedAttachments(itemStack);
		if (!supportedAtts) {
			console.error(`Item Stack of type ${itemStack} does support attachments.`);
			return;
		}

		const lastEditTimeItemStack = itemStack.getDynamicProperty("lastAttachmentEditTime");
		if (typeof lastEditTimeItemStack === "number") this._lastEditTime = lastEditTimeItemStack;

		for (const [slotType, attIds] of Object.entries(supportedAtts)) {
			const propId = `attachment:${slotType}`;
			const propValue = itemStack.getDynamicProperty(propId);

			let value: AttachmentConfig | null = null;

			if (typeof propValue === "string") {
				if (!attIds.includes(propValue)) {
					console.warn(
						`Already-attached attachment '${propValue}' is incompatible with ${itemStack.typeId}. It has been ignored.`,
					);
					continue;
				}

				const att = attachmentConfigsById.get(propValue);
				if (!att) console.error(`Unknown attachment: ${propValue}`);

				value = att ?? null;
			} else {
				value = null;
			}

			this._map.set(slotType, value);
		}
	}

	get lastEditTime(): number {
		return this._lastEditTime;
	}

	get map(): ReadonlyMap<string, AttachmentConfig | null> {
		return this._map;
	}

	get array(): readonly AttachmentConfig[] {
		return Array.from(this._map.values()).filter(att => att != null);
	}

	get(slotType: string): AttachmentConfig | undefined {
		const value = this.map.get(slotType);
		if (value) return value;
	}

	set(slotType: string, attachment?: AttachmentConfig): void {
		this._map.set(slotType, attachment ?? null);
		this._lastEditTime = Date.now();
	}

	clear(): void {
		this._map.clear();
		this._lastEditTime = 0;
	}

	createCombinedStats(): AttachmentStats {
		let stats: AttachmentStats = { ...defaultAttachmentStats };

		for (const att of this.map.values()) {
			if (att == null) continue;
			const overrides = att.stats;

			if (overrides.uncertainyMultiplierAds !== undefined) {
				stats.uncertainyMultiplierAds *= overrides.uncertainyMultiplierAds;
			}

			if (overrides.uncertainyMultiplierHipfire !== undefined) {
				stats.uncertainyMultiplierHipfire *= overrides.uncertainyMultiplierHipfire;
			}

			if (overrides.adsSlownessAmplifierAdd !== undefined) {
				stats.adsSlownessAmplifierAdd += overrides.adsSlownessAmplifierAdd;
			}

			if (overrides.markGunAsSuppressed) {
				stats.markGunAsSuppressed = true;
			}
		}

		return stats;
	}

	apply(itemStack: ItemStack): void {
		const supportedAtts = getSupportedAttachments(itemStack);
		if (!supportedAtts) {
			console.error(`Cannot apply attachment context to Item Stack of type ${itemStack} does not support attachments.`);
			return;
		}

		for (const [slotType, att] of this.map) {
			if (att == null) {
				itemStack.setDynamicProperty(`attachment:${slotType}`, undefined);
			} else {
				if (!supportedAtts[slotType]?.includes(att.id)) {
					console.warn(`New attachment '${att.id}' is incompatible with ${itemStack.typeId}. It has been ignored.`);
					continue;
				}

				itemStack.setDynamicProperty(`attachment:${slotType}`, att.id);
			}
		}

		itemStack.setDynamicProperty("lastAttachmentEditTime", this.lastEditTime);
	}

	compareLastEditTime(another: AttachmentContext | ItemStack): boolean {
		if (another instanceof AttachmentContext) return this.lastEditTime === another.lastEditTime;

		const lastEditTimeItemStack = another.getDynamicProperty("lastAttachmentEditTime") ?? 0;
		return this.lastEditTime === lastEditTimeItemStack;
	}

	createItemLore(): string[] {
		const array: string[] = [];

		for (const [slotType, att] of this.map) {
			if (att == null) continue;
			array.push(`${slotType.toUpperCase()}: ${att.name}`);
		}

		return array;
	}
}
