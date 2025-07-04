import { gunDamageStrategiesById } from "./strategies/damage_strategies";
import * as mc from "@minecraft/server";
import DefaultDamageStrategy from "./strategies/default_damage_strategy";
import type { GunConfig, GunStats, GunTimelineArgs } from "./types";
import type { GunDamageStrategy } from "./strategies/types";
import { AttachmentContext } from "../gun_attachment/attachment_context";
import { GunMagContext } from "./gun_mag_context";
import { getAmmoCountInContainer } from "../ammo/ammo";
import {
	console,
	HookedItem,
	resolveRangeFloat,
	Timeline,
	Vec3,
	type HookedItemContext,
} from "@lc-studios-mc/scripting-utils";

export class GunHandler extends HookedItem {
	readonly config: GunConfig;
	readonly stats: GunStats;
	readonly damageStrategy: GunDamageStrategy;
	readonly attachmentContext: AttachmentContext;
	readonly inventoryContainer: mc.Container;

	state: GunStateBase;
	pickupTimeline?: Timeline<GunTimelineArgs>;
	fireTimeline?: Timeline<GunTimelineArgs>;
	reloadTimeline?: Timeline<GunTimelineArgs>;
	tacReloadTimeline?: Timeline<GunTimelineArgs>;

	magContext?: GunMagContext;
	ammoCountInInventory = 0;

	constructor(context: HookedItemContext, config: GunConfig) {
		super(context);
		this.config = config;
		this.stats = config.stats;

		let damageStrategy = gunDamageStrategiesById.get(config.stats.damageStrategyId);
		if (!damageStrategy) {
			damageStrategy = new DefaultDamageStrategy();
			console.error(`Unknown gun damage strategy: ${config.stats.damageStrategyId}. Falling back to default.`);
		}
		this.damageStrategy = damageStrategy;

		this.attachmentContext = new AttachmentContext({
			itemStack: this.initialItemStack,
			slotTypes: Array.from(Object.keys(config.attachmentConfig?.compatibleAttachmentIds ?? {})),
		});

		this.inventoryContainer = this.player.getComponent("inventory")!.container;

		this.state = new PickupState(this);
		this.state.onEnter();
	}

	changeState(newState: GunStateBase): void {
		this.state.onExit();
		this.state = newState;
		this.state.onEnter();
	}

	getFaceFrontLocation(): mc.Vector3 {
		return Vec3.add(this.player.getHeadLocation(), this.player.getViewDirection());
	}

	startItemCooldown(category: string, duration = 2): void {
		this.player.startItemCooldown(`scpdy_gun_${this.config.id}_${category}`, duration);
	}

	shakeCamera(intensity: number, seconds: number, mode: "positional" | "rotational" = "rotational"): void {
		this.player.runCommand(`camerashake add @s ${intensity} ${seconds} ${mode}`);
	}

	playSound(entryId: string): void {
		const entry = this.config.sounds[entryId];
		if (!entry) return;

		this.dimension.playSound(entry.id, this.getFaceFrontLocation(), {
			pitch: entry.pitch ? resolveRangeFloat(entry.pitch) : undefined,
			volume: entry.volume ? resolveRangeFloat(entry.volume) : undefined,
		});
	}

	private updateMagContext(): void {
		if (this.magContext && this.magContext.isValid) return;
		this.magContext = GunMagContext.findMag(this.inventoryContainer, this.config.ammo.magType);
	}

	private updateAmmoCountInInventory(): void {
		if (!this.magContext) {
			this.ammoCountInInventory = 0;
			return;
		}

		this.ammoCountInInventory = getAmmoCountInContainer(this.inventoryContainer, this.magContext.ammoType);
	}

	showAmmoDisplay(gray = false): void {
		if (!this.magContext) {
			this.player.onScreenDisplay.setActionBar({ translate: "scpdy.gun.noMag" });
			return;
		}

		const magAmmoString = this.magContext.createRemainingAmmoDisplayString(!gray);
		const color = gray ? "§8" : "";

		const finalString = `${color}${magAmmoString} [${this.ammoCountInInventory}]`;

		this.player.onScreenDisplay.setActionBar(finalString);
	}

	override onDelete(): void {}

	override onTick(currentItemStack: mc.ItemStack): void {
		if (!this.attachmentContext.lastEditTimeEquals(currentItemStack)) {
			this.deleteOnNextTick = true; // Attachment updates must trigger handler refresh to avoid conflicts
			return;
		}

		this.updateMagContext();
		this.updateAmmoCountInInventory();

		this.state.tickFromHandler();

		this.magContext?.apply();
	}

	override canUse(e: mc.ItemStartUseAfterEvent): boolean {
		return this.state.canUse(e);
	}

	override onStartUse(e: mc.ItemStartUseAfterEvent): void {
		this.state.onStartUse(e);
	}

	override onStopUse(e: mc.ItemStopUseAfterEvent): void {
		this.state.onStopUse(e);
	}

	override onHitBlock(e: mc.EntityHitBlockAfterEvent): void {
		this.state.onHitBlock(e);
	}

	override onHitEntity(e: mc.EntityHitEntityAfterEvent): void {
		this.state.onHitEntity(e);
	}
}

abstract class GunStateBase {
	currentTick = 0;

	constructor(public readonly g: GunHandler) {}

	onEnter(): void {}
	onExit(): void {}

	tickFromHandler(): void {
		this.onTick();
		this.currentTick++;
	}
	onTick(): void {}

	canUse(e: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}
	onStartUse(e: mc.ItemStartUseAfterEvent): void {}
	onStopUse(e: mc.ItemStopUseAfterEvent): void {}
	onHitBlock(e: mc.EntityHitBlockAfterEvent): void {}
	onHitEntity(e: mc.EntityHitEntityAfterEvent): void {}
}

class PickupState extends GunStateBase {
	ticksUntilComplete = 0;

	override onEnter(): void {
		this.ticksUntilComplete = this.g.stats.pickupDuration;
		this.g.startItemCooldown("pickup", this.ticksUntilComplete);

		this.g.pickupTimeline?.reset();

		if (!this.g.pickupTimeline && this.g.config.timelines.pickup) {
			this.g.pickupTimeline = new Timeline(this.ticksUntilComplete, this.g.config.timelines.pickup);
		}
	}

	override onExit(): void {
		this.g.startItemCooldown("pickup", 0);
	}

	override onTick(): void {
		this.g.pickupTimeline?.process(this.currentTick, {
			currentTick: this.currentTick,
			handler: this.g,
		});

		if (this.ticksUntilComplete > 0) {
			this.ticksUntilComplete--;
			this.g.showAmmoDisplay(true);
			return;
		}

		this.g.changeState(new IdleState(this.g));
	}
}

class IdleState extends GunStateBase {
	override onTick(): void {
		this.g.showAmmoDisplay();
	}
}

class FireState extends GunStateBase {}

class ReloadState extends GunStateBase {}
