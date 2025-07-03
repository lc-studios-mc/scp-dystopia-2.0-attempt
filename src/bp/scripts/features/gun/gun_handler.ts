import { console } from "@lc-studios-mc/scripting-utils";
import { gunDamageStrategiesById } from "./strategies/damage_strategies";
import * as itemExtender from "@/features/item_extender";
import * as mc from "@minecraft/server";
import DefaultDamageStrategy from "./strategies/default_damage_strategy";
import type { GunConfig } from "./types";
import type { GunDamageStrategy } from "./strategies/types";
import { AttachmentContext } from "../gun_attachment/attachment_context";

export class GunHandler implements itemExtender.ExtendedItemHandler {
	extender: itemExtender.ItemExtender;
	args: itemExtender.ExtendedItemHandlerArgs;
	elapsedTick = 0;
	isUsing = false;
	deleteOnNextTick = false;

	readonly cfg: GunConfig;
	readonly damageStrategy: GunDamageStrategy;
	readonly attachmentContext: AttachmentContext;

	constructor(args: itemExtender.ExtendedItemHandlerArgs, extender: itemExtender.ItemExtender, cfg: GunConfig) {
		this.args = args;
		this.extender = extender;
		this.cfg = cfg;

		let damageStrategy = gunDamageStrategiesById.get(cfg.stats.damageStrategyId);
		if (!damageStrategy) {
			damageStrategy = new DefaultDamageStrategy();
			console.error(`Unknown gun damage strategy: ${cfg.stats.damageStrategyId}. Falling back to default.`);
		}
		this.damageStrategy = damageStrategy;

		this.attachmentContext = new AttachmentContext({
			itemStack: args.initialItemStack,
			slotTypes: cfg.attachmentConfig?.compatibleAttachmentIds,
		});
	}

	// TODO: Implement GunHandler

	onCreate(): void {}

	onDelete(): void {}

	onTick(currentItemStack: mc.ItemStack): void {
		if (!this.attachmentContext.lastEditTimeEquals(currentItemStack)) {
			this.deleteOnNextTick = true; // Attachment updates must trigger handler refresh to avoid conflicts
			return;
		}
	}

	canUse(e: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}

	onStartUse(e: mc.ItemStartUseAfterEvent): void {}

	onStopUse(e: mc.ItemStopUseAfterEvent): void {}

	onHitBlock(e: mc.EntityHitBlockAfterEvent): void {}

	onHitEntity(e: mc.EntityHitEntityAfterEvent): void {}
}
