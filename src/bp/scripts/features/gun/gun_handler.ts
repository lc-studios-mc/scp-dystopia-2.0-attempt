import { gunDamageStrategiesById } from "./strategies/damage_strategies";
import * as mc from "@minecraft/server";
import DefaultDamageStrategy from "./strategies/default_damage_strategy";
import type { GunConfig, GunStats, GunTimelineArgs } from "./types";
import type { GunDamageStrategy } from "./strategies/types";
import { AttachmentContext } from "../gun_attachment/attachment_context";
import { GunMagContext } from "./gun_mag_context";
import { consumeAmmoInContainer, getAmmoCountInContainer } from "../ammo/ammo";
import {
	console,
	HookedItem,
	randf,
	resolveRangeFloat,
	Timeline,
	Vec3,
	type HookedItemContext,
} from "@lc-studios-mc/scripting-utils";
import { fireBullet } from "./bullet";

export class GunHandler extends HookedItem {
	readonly config: GunConfig;
	readonly stats: GunStats;
	readonly damageStrategy: GunDamageStrategy;
	readonly attachmentContext: AttachmentContext;

	adsTick = 0;

	state: GunStateBase;
	pickupTimeline?: Timeline<GunTimelineArgs>;
	fireTimeline?: Timeline<GunTimelineArgs>;
	nextFireAnimCooldownIndex = 0;

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

		this.state = new PickupState(this);
		this.state.onEnter();
	}

	get isAds(): boolean {
		return this.adsTick >= this.stats.adsSwayDuration;
	}

	get isAdsSwayInProgress(): boolean {
		return this.adsTick > 0 && this.adsTick < this.stats.adsSwayDuration;
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

	getMuzzleLocation(): mc.Vector3 {
		const hipfireOffset = Vec3.create(this.stats.muzzleOffset);
		const adsOffset = Vec3.create(this.stats.muzzleOffsetAds);

		const offset = this.isAds
			? adsOffset
			: this.isAdsSwayInProgress
				? Vec3.midpoint(hipfireOffset, adsOffset)
				: hipfireOffset;

		const relativeToHead = Vec3.getRelativeToHead(
			this.player.getHeadLocation(),
			this.player.getViewDirection(),
			offset,
		);

		const final = Vec3.add(relativeToHead, Vec3.scale(this.player.getVelocity(), 0.4));

		return final;
	}

	getEjectionLocation(): mc.Vector3 {
		const hipfireOffset = Vec3.create(this.stats.ejectionOffset);
		const adsOffset = Vec3.create(this.stats.ejectionOffsetAds);

		const offset = this.isAds
			? adsOffset
			: this.isAdsSwayInProgress
				? Vec3.midpoint(hipfireOffset, adsOffset)
				: hipfireOffset;

		const relativeToHead = Vec3.getRelativeToHead(
			this.player.getHeadLocation(),
			this.player.getViewDirection(),
			offset,
		);

		const final = Vec3.add(relativeToHead, Vec3.scale(this.player.getVelocity(), 0.4));

		return final;
	}

	emitMuzzleFlash(): void {
		if (!this.stats.muzzleFlashParticleId) return;

		const location = this.getMuzzleLocation();
		this.dimension.spawnParticle(this.stats.muzzleFlashParticleId, location);
	}

	emitMuzzleSmoke(): void {
		if (!this.stats.muzzleSmokeParticleId) return;

		const location = this.getMuzzleLocation();
		this.dimension.spawnParticle(this.stats.muzzleSmokeParticleId, location);
	}

	emitEjection(): void {
		if (!this.stats.ejectionParticleId) return;

		const particleLoc = this.getEjectionLocation();

		const viewDirection = this.player.getViewDirection();
		const rightDirection = Vec3.cross(viewDirection, Vec3.up);

		const particleDirection = Vec3.add(
			Vec3.add(
				Vec3.scale(viewDirection, -randf(1.3, 1.5)), // Go backwards
				Vec3.scale(rightDirection, randf(0.6, 0.7)), // Go right
			),
			Vec3.fromPartial({
				x: randf(-0.1, 0.1),
				y: randf(1.1, 1.3), // Go up
				z: randf(-0.1, 0.1),
			}),
		);

		const molangVarMap = new mc.MolangVariableMap();
		molangVarMap.setFloat("speed", randf(5, 6));
		molangVarMap.setVector3("direction", particleDirection);

		this.dimension.spawnParticle(this.stats.ejectionParticleId, particleLoc, molangVarMap);
	}

	private updateMagContext(): void {
		if (this.magContext && this.magContext.isValid) return;
		this.magContext = GunMagContext.findMag(this.inventory.container, this.config.ammo.magType);
	}

	private updateAmmoCountInInventory(): void {
		if (!this.magContext) {
			this.ammoCountInInventory = 0;
			return;
		}

		this.ammoCountInInventory = getAmmoCountInContainer(this.inventory.container, this.magContext.ammoType);
	}

	private updateAdsInfo(): void {
		const isInStateThatPreventsAds = this.state instanceof PickupState || this.state instanceof ReloadState;

		const shouldAds = this.player.isSneaking && !isInStateThatPreventsAds;

		if (shouldAds && this.adsTick < this.stats.adsSwayDuration) {
			this.adsTick++;
		}

		if (!shouldAds && this.adsTick > 0) {
			this.adsTick--;
		}
	}

	private applyAdsSlowness(): void {
		if (!this.isAds) return;
		if (this.stats.adsSlownessAmplifier < 0) return;

		this.player.addEffect("slowness", 4, {
			amplifier: this.stats.adsSlownessAmplifier,
			showParticles: false,
		});
	}

	private updateCrosshair(): void {
		const show = (this.stats.showCrosshairHipfire && !this.isAds) || (this.stats.showCrosshairAds && this.isAds);
		const visibility = show ? mc.HudVisibility.Reset : mc.HudVisibility.Hide;

		this.player.onScreenDisplay.setHudVisibility(visibility, [mc.HudElement.Crosshair]);
	}

	private resetCrosshair(): void {
		this.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Crosshair]);
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

	canReload(): boolean {
		if (!this.magContext) return false;
		if (this.magContext.expendedAmmoCount <= 0) return false;
		if (this.ammoCountInInventory <= 0) return false;

		return true;
	}

	override onDelete(): void {
		try {
			// This will throw error if the player is leaving the world
			this.resetCrosshair();
		} catch {}
	}

	override onTick(currentItemStack: mc.ItemStack): void {
		if (!this.attachmentContext.lastEditTimeEquals(currentItemStack)) {
			this.deleteOnNextTick = true; // Attachment updates must trigger handler refresh to avoid conflicts
			return;
		}

		this.updateMagContext();
		this.updateAmmoCountInInventory();
		this.updateAdsInfo();
		this.updateCrosshair();

		this.state.tickFromHandler();

		this.magContext?.apply();
		this.applyAdsSlowness();
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

		this.g.playSound("pickup");

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

		if (!this.g.magContext) return;
		if (!this.g.isUsing) return;

		if (!this.g.magContext.isEmpty && this.g.stats.fireFullAuto) {
			this.g.changeState(new FireState(this.g));
		}

		if (this.g.magContext.isEmpty && this.g.canReload()) {
			this.g.changeState(new ReloadState(this.g, false));
		}
	}

	override onStartUse(e: mc.ItemStartUseAfterEvent): void {
		if (!this.g.magContext) return;
		if (this.g.magContext.isEmpty) {
			if (this.g.ammoCountInInventory <= 0) this.g.playSound("dryfire");
			return;
		}

		if (this.g.stats.fireFullAuto) return;

		this.g.playSound("click");
		this.g.changeState(new FireState(this.g));
	}

	override onHitBlock(e: mc.EntityHitBlockAfterEvent): void {
		if (!this.g.magContext) return;
		if (!this.g.canReload()) return;

		this.g.changeState(new ReloadState(this.g, !this.g.magContext.isEmpty));
	}
}

class FireState extends GunStateBase {
	ticksUntilComplete = 20;

	get fireTick(): number {
		return this.g.stats.fireDuration - this.ticksUntilComplete;
	}

	override onEnter(): void {
		super.onEnter();

		this.ticksUntilComplete = this.g.stats.fireDuration;

		this.fire();

		this.g.fireTimeline?.reset();

		if (!this.g.fireTimeline && this.g.config.timelines.fire) {
			this.g.fireTimeline = new Timeline(this.g.stats.fireDuration, this.g.config.timelines.fire);
		}

		this.processTimeline();
	}

	override onTick(): void {
		this.processTimeline();

		this.g.showAmmoDisplay();

		if (this.ticksUntilComplete > 0) {
			this.ticksUntilComplete--;
			return;
		}

		if (this.g.isUsing && this.g.stats.fireFullAuto && !this.g.magContext?.isEmpty) {
			this.ticksUntilComplete = this.g.stats.fireDuration;
			this.g.fireTimeline?.reset();
			this.processTimeline();
			this.fire();
			return;
		}

		this.g.changeState(new IdleState(this.g));
	}

	private processTimeline(): void {
		this.g.fireTimeline?.process(this.fireTick, {
			handler: this.g,
			currentTick: this.currentTick,
		});
	}

	private fire(): void {
		this.g.playSound("fire");

		// Start item cooldown to trigger animation
		if (this.g.nextFireAnimCooldownIndex === 0) {
			this.g.startItemCooldown("fire_1", Math.max(2, this.g.stats.fireDuration));
			this.g.startItemCooldown("fire_2", 0);
			this.g.nextFireAnimCooldownIndex = 1;
		} else {
			this.g.startItemCooldown("fire_2", Math.max(2, this.g.stats.fireDuration));
			this.g.startItemCooldown("fire_1", 0);
			this.g.nextFireAnimCooldownIndex = 0;
		}

		// Mag-related
		if (this.g.magContext) {
			this.g.magContext.consumeAmmo(1);
			this.g.magContext.apply();

			if (this.g.magContext.isEmpty) {
				this.g.playSound("dryfire");
			} else if (this.g.magContext.isLow) {
				this.g.playSound("rattle");
			}
		}

		// Fire bullet
		fireBullet({
			source: this.g.player,
			dimension: this.g.player.dimension,
			muzzleLocation: this.g.getMuzzleLocation(),
			origin: Vec3.add(this.g.player.getHeadLocation(), { x: 0, y: 0.1, z: 0 }),
			direction: this.g.player.getViewDirection(),
			isAds: this.g.isAds,
			gunStats: this.g.config.stats,
			attachmentContext: this.g.attachmentContext,
			damageStrategy: this.g.damageStrategy,
		});
	}
}

class ReloadState extends GunStateBase {
	tac: boolean;
	ticksUntilComplete = 20;

	private timeline?: Timeline<GunTimelineArgs>;

	constructor(g: GunHandler, tac: boolean) {
		super(g);
		this.tac = tac;
	}

	override onEnter(): void {
		const duration = this.tac ? this.g.stats.tacReloadDuration : this.g.stats.reloadDuration;
		this.ticksUntilComplete = duration;

		const timelineRecord = this.tac ? this.g.config.timelines.tacReload : this.g.config.timelines.reload;

		if (timelineRecord) {
			this.timeline = new Timeline(duration, timelineRecord);
		}

		this.g.startItemCooldown(this.tac ? "reload_tac" : "reload", this.ticksUntilComplete);
	}

	override onTick(): void {
		this.g.player.onScreenDisplay.setActionBar({ translate: "scpdy.gun.reloading" });

		this.timeline?.process(this.currentTick, {
			currentTick: this.currentTick,
			handler: this.g,
		});

		if (this.ticksUntilComplete > 0) {
			this.ticksUntilComplete--;
			return;
		}

		this.g.changeState(new IdleState(this.g));

		if (!this.g.magContext) return;

		const consumed = consumeAmmoInContainer(
			this.g.inventory.container,
			this.g.magContext.ammoType,
			this.g.magContext.expendedAmmoCount,
		);

		this.g.magContext.remainingAmmoCount += consumed;
	}
}
