import { AttachmentContext } from "@/features/gun_attachment/attachment_context";
import {
	addCameraShake,
	getEntityHeadFrontLocation,
	HookedItemState,
	ItemHookRegistry,
	randf,
	StateDrivenHookedItem,
	Timeline,
	Vec3,
	type HookedItemContext,
} from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";
import { consumeAmmoInContainer, getAmmoCountInContainer } from "../ammo/ammo";
import { fireBullet } from "../bullets";
import { createBasicBulletDamageFunction } from "@/features/bullets/damage_functions";
import { createBasicBulletHitBlockHandler } from "@/features/bullets/hit_block_handlers";
import { createBasicBulletHitEntityHandler } from "@/features/bullets/hit_entity_handlers";
import { MagContext } from "./shared/mag_context";
import {
	applyConditionalAdsSlowness,
	displayAmmoCountOfBasicMagFedGun,
	spawnCartridgeEjectionParticle,
} from "./shared/utils";

const gunItemType = "lc:scpdy_gun_m17";
const magItemType = "lc:scpdy_gun_m17_mag";
const compatibleAttachments: Record<string, string[]> = {};
const attachmentSlotTypes = Array.from(Object.keys(compatibleAttachments));
const muzzleOffset = { x: 0.13, z: 1.0 };
const muzzleOffsetAds = { y: 0.07, z: 1.2 };
const muzzleFlashParticleId = "lc:scpdy_muzzle_flash_particle";
const muzzleSmokeParticleId = "lc:scpdy_muzzle_smoke_emitter";
const ejectionOffset = { x: 0.2, y: 0.06, z: 0.5 };
const ejectionOffsetAds = { x: 0.05, y: 0.06, z: 0.7 };
const ejectionParticleId = "lc:scpdy_bullet_casing_drop_var0_particle";
const onHitBlock = createBasicBulletHitBlockHandler();
const onHitEntity = createBasicBulletHitEntityHandler({
	damageFunction: createBasicBulletDamageFunction(4, true),
	damageCause: mc.EntityDamageCause.override,
	removeKnockbackWithReversedForce: true,
});

ItemHookRegistry.register(gunItemType, (ctx) => new Gun(ctx));

class Gun extends StateDrivenHookedItem {
	override state: HookedItemState<Gun>;
	readonly aimSwayDuration = 4;
	attachmentContext: AttachmentContext;
	magContext?: MagContext;
	inventoryAmmoCount = 0;
	adsTick = 0;
	nextFireAnimCooldownIndex = 0;

	constructor(ctx: HookedItemContext) {
		super(ctx);

		this.attachmentContext = new AttachmentContext({
			itemStack: this.initialItemStack,
			slotTypes: attachmentSlotTypes,
		});

		this.magContext = MagContext.findMag(this.inventory.container, magItemType);

		this.state = new PickupState(this);
		this.state.onEnter();
	}

	get isAds(): boolean {
		return this.adsTick >= this.aimSwayDuration;
	}

	get isAdsSwayInProgress(): boolean {
		return this.adsTick > 0 && this.adsTick < this.aimSwayDuration;
	}

	get canReload(): boolean {
		if (!this.magContext) return false;
		if (this.magContext.expendedAmmoCount <= 0) return false;
		if (this.inventoryAmmoCount <= 0) return false;
		return true;
	}

	private updateMagContext(): void {
		if (this.magContext && this.magContext.isValid) return;
		this.magContext = MagContext.findMag(this.inventory.container, magItemType);
	}

	private updateAmmoCountInInventory(): void {
		this.inventoryAmmoCount = this.magContext
			? getAmmoCountInContainer(this.inventory.container, this.magContext.ammoType)
			: 0;
	}

	private updateAdsInfo(): void {
		const isInStateThatPreventsAds =
			this.state instanceof PickupState || this.state instanceof ReloadState || this.state instanceof TacReloadState;

		const shouldAds = this.player.isSneaking && !isInStateThatPreventsAds;

		if (shouldAds && this.adsTick < this.aimSwayDuration) {
			this.adsTick++;
		}

		if (!shouldAds && this.adsTick > 0) {
			this.adsTick--;
		}
	}

	private updateCrosshair(): void {
		const showCrosshairWhenAds = false;
		const showCrosshairWhenHipfire = true;
		const show = (showCrosshairWhenHipfire && !this.isAds) || (showCrosshairWhenAds && this.isAds);
		const visibility = show ? mc.HudVisibility.Reset : mc.HudVisibility.Hide;

		this.player.onScreenDisplay.setHudVisibility(visibility, [mc.HudElement.Crosshair]);
	}

	playSoundAtHeadFrontLocation(id: string, options?: mc.WorldSoundOptions): void {
		this.dimension.playSound(id, getEntityHeadFrontLocation(this.player), options);
	}

	startItemCooldown(id: string, duration = 2): void {
		this.player.startItemCooldown(`scpdy_gun_m17_${id}`, duration);
	}

	getItemCooldown(id: string): number {
		return this.player.getItemCooldown(`scpdy_gun_m17_${id}`);
	}

	getMuzzleLocation(): mc.Vector3 {
		const hipfireOffset = Vec3.create(muzzleOffset);
		const adsOffset = Vec3.create(muzzleOffsetAds);

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
		const hipfireOffset = Vec3.create(ejectionOffset);
		const adsOffset = Vec3.create(ejectionOffsetAds);

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

	enterReloadState(): void {
		if (!this.magContext) return;

		const doTacReload = !this.magContext.isEmpty;
		this.changeState(new (doTacReload ? TacReloadState : ReloadState)(this));
	}

	reloadMag(): void {
		if (!this.magContext) return;

		const consumed = consumeAmmoInContainer(
			this.inventory.container,
			this.magContext.ammoType,
			this.magContext.expendedAmmoCount,
		);

		this.magContext.remainingAmmoCount += consumed;
	}

	override onDelete(): void {
		try {
			this.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Crosshair]);
		} catch {}

		super.onDelete();
	}

	override onTick(currentItemStack: mc.ItemStack): void {
		if (!this.attachmentContext.compareLastEditTime(currentItemStack)) {
			this.deleteOnNextTick = true; // Attachment modification must trigger refresh to avoid potential bugs
			return;
		}

		this.updateMagContext();
		this.updateAmmoCountInInventory();
		this.updateAdsInfo();
		this.updateCrosshair();
		applyConditionalAdsSlowness(this.player, this.isAds, 0);

		super.onTick(currentItemStack);

		this.magContext?.apply();
	}
}

class PickupState extends HookedItemState<Gun> {
	ticksUntilComplete = 5;

	override onEnter(): void {
		this.owner.startItemCooldown("pickup", 2);
		this.owner.playSoundAtHeadFrontLocation("scpdy.gun.unholster_1", {
			pitch: randf(0.96, 1.1),
		});
	}

	override onTick(_currentItemStack: mc.ItemStack): void {
		if (this.ticksUntilComplete > 0) {
			this.ticksUntilComplete--;
			return;
		}

		this.owner.changeState(new IdleState(this.owner));
	}
}

class IdleState extends HookedItemState<Gun> {
	override onTick(_currentItemStack: mc.ItemStack): void {
		displayAmmoCountOfBasicMagFedGun(this.owner);

		if (!this.owner.isUsing) return;
		if (!this.owner.magContext) return;
		if (this.owner.getItemCooldown("auto_fire_prevent") > 0) return;

		if (this.owner.magContext.isEmpty) {
			if (this.owner.canReload) {
				this.owner.enterReloadState();
			}
			return;
		}

		this.owner.startItemCooldown("auto_fire_prevent", 5);
		this.owner.changeState(new FireState(this.owner));
	}

	override onStartUse(_e: mc.ItemStartUseAfterEvent): void {
		if (!this.owner.magContext) return;

		if (!this.owner.magContext.isEmpty) {
			this.owner.startItemCooldown("auto_fire_prevent", 9);
			this.owner.changeState(new FireState(this.owner));
			return;
		}

		if (!this.owner.canReload) {
			this.owner.playSoundAtHeadFrontLocation("scpdy.gun.dryfire", { volume: 1.5 });
			return;
		}

		this.owner.enterReloadState();
	}

	override onHitBlock(_e: mc.EntityHitBlockAfterEvent): void {
		if (!this.owner.magContext) return;
		if (!this.owner.canReload) return;

		this.owner.enterReloadState();
	}
}

class FireState extends HookedItemState<Gun> {
	ticksUntilComplete = 1;

	override onEnter(): void {
		this.fire();
		this.owner.changeState(new IdleState(this.owner));
	}

	private fire(): void {
		this.owner.playSoundAtHeadFrontLocation("scpdy.gun.m17.fire", {
			volume: 2.0,
			pitch: randf(0.93, 1.07),
		});

		if (this.owner.nextFireAnimCooldownIndex === 0) {
			this.owner.startItemCooldown("fire_1", 2);
			this.owner.startItemCooldown("fire_2", 0);
			this.owner.nextFireAnimCooldownIndex = 1;
		} else {
			this.owner.startItemCooldown("fire_2", 2);
			this.owner.startItemCooldown("fire_1", 0);
			this.owner.nextFireAnimCooldownIndex = 0;
		}

		if (this.owner.magContext) {
			this.owner.magContext.consumeAmmo(1);
			this.owner.magContext.apply();

			if (this.owner.magContext.isEmpty) {
				this.owner.playSoundAtHeadFrontLocation("scpdy.gun.dryfire", {
					volume: 1.5,
				});
			} else if (this.owner.magContext.isLow) {
				this.owner.playSoundAtHeadFrontLocation("scpdy.gun.rattle", {
					volume: 1.5,
				});
			}
		}

		fireBullet({
			attachmentContext: this.owner.attachmentContext,
			dimension: this.owner.dimension,
			direction: this.owner.player.getViewDirection(),
			flyForce: 15,
			muzzleLocation: this.owner.getMuzzleLocation(),
			origin: Vec3.add(this.owner.player.getHeadLocation(), { x: 0, y: 0.1, z: 0 }),
			projectileType: "lc:scpdy_custom_bullet",
			quantity: 1,
			source: this.owner.player,
			uncertainy: this.owner.isAds ? 0.2 : 1.3,
			onHitBlock,
			onHitEntity,
		});

		this.owner.dimension.spawnParticle(muzzleFlashParticleId, this.owner.getMuzzleLocation());
		this.owner.dimension.spawnParticle(muzzleSmokeParticleId, this.owner.getMuzzleLocation());

		spawnCartridgeEjectionParticle({
			dimension: this.owner.dimension,
			location: this.owner.getEjectionLocation(),
			particleId: ejectionParticleId,
			viewDirection: this.owner.player.getViewDirection(),
		});
	}
}

class ReloadState extends HookedItemState<Gun> {
	timeline = new Timeline<null>(19, {
		0.2: () => this.owner.playSoundAtHeadFrontLocation("scpdy.gun.mag_remove_1"),
		0.4: () => this.owner.playSoundAtHeadFrontLocation("scpdy.gun.mag_add_1"),
		0.6: () => {
			this.owner.playSoundAtHeadFrontLocation("scpdy.gun.load_1");
			addCameraShake(this.owner.player, 0.02, 0.04, "rotational");
		},
		1.0: () => {
			this.owner.reloadMag();
			this.owner.changeState(new IdleState(this.owner));
		},
	});

	override onEnter(): void {
		this.owner.startItemCooldown("reload", this.timeline.getDuration());
	}

	override onTick(_currentItemStack: mc.ItemStack): void {
		this.timeline.process(this.currentTick, null);
	}
}

class TacReloadState extends HookedItemState<Gun> {
	timeline = new Timeline<null>(14, {
		0.1: () => this.owner.playSoundAtHeadFrontLocation("scpdy.gun.mag_remove_1"),
		0.4: () => this.owner.playSoundAtHeadFrontLocation("scpdy.gun.mag_add_1"),
		0.5: () => {
			addCameraShake(this.owner.player, 0.02, 0.04, "rotational");
		},
		1.0: () => {
			this.owner.reloadMag();
			this.owner.changeState(new IdleState(this.owner));
		},
	});

	override onEnter(): void {
		this.owner.startItemCooldown("reload_tac", this.timeline.getDuration());
	}

	override onTick(_currentItemStack: mc.ItemStack): void {
		this.timeline.process(this.currentTick, null);
	}
}
