import * as mc from "@minecraft/server";
import * as vec3 from "@lib/utils/vec3";
import { AdvancedItem, AdvancedItemBaseConstructorArgs } from "@server/advancedItem/AdvancedItem";
import { registerAdvancedItemProfile } from "@server/advancedItem/profileRegistry";
import { equipMag } from "./mag";
import { getAmmoType, getTotalAmmoCount, removeAmmo } from "@server/ammo/ammo";
import { getAmmoDisplayText } from "./shared";
import { shootBullet } from "./bullet";
import * as commonBulletHitEvents from "./commonBulletHitEvents";
import { randomFloat } from "@lib/utils/mathUtils";
import { CONFIG } from "@server/config/configData";

/**
 * Set of variables to use during bolt cycle
 */
type BoltCycleData = {
	tick: number;
};

/**
 * Set of variables to use during reload
 */
type ReloadData = {
	tick: number;
	tac: boolean;
};

type TPAnimationVariables = {
	isADS: boolean;
	wasADS: boolean;
	ticksUntilADSTransitionEnd: number;
	ticksUntilStopADS: number;
	ticksUntilSpecialAnimTimeEnd: number;
};

const MAG_ITEM_TYPE_ID = "lc:scpdy_gun_t5000_mag";

const PICK_DURATION = 15; // Total amount of tick required for item picking to finish
const AIM_DURATION = 5; // Total amount of tick required for entering ADS (aiming-down-sights) state

// Item cooldown IDs, used to trigger attachable animation
const COOLDOWN_IDS = {
	pick: "scpdy_gun_t5000_pick",
	shoot: "scpdy_gun_t5000_shoot",
	boltCycle: "scpdy_gun_t5000_bolt_cycle",
	reload: "scpdy_gun_t5000_reload",
	reloadTac: "scpdy_gun_t5000_reload_tac",
} as const;

registerAdvancedItemProfile({
	itemTypeId: "lc:scpdy_gun_t5000",
	createInstance: (args) => new T5000(args),
});

/**
 * T-5000 sniper rifle
 */
class T5000 extends AdvancedItem {
	private readonly playerInventoryContainer: mc.Container;
	private aimTick = 0;
	private boltCycleData?: BoltCycleData;
	private reloadData?: ReloadData;

	private tpAnimVars: TPAnimationVariables = {
		isADS: false,
		wasADS: false,
		ticksUntilADSTransitionEnd: 0,
		ticksUntilStopADS: 0,
		ticksUntilSpecialAnimTimeEnd: 0,
	};

	/**
	 * Enabling this flag will start gun reload on next tick if it meets condition
	 */
	private tryReloadingNextTick = false;

	constructor(args: AdvancedItemBaseConstructorArgs) {
		super(args);

		this.playerInventoryContainer = args.player.getComponent("inventory")!.container!;

		args.player.startItemCooldown(COOLDOWN_IDS.pick, 2);
		args.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Crosshair]);

		equipMag({
			player: this.player,
			inventoryContainer: this.playerInventoryContainer,
			offhandSlot: this.playerOffhand,
			magItemTypeId: MAG_ITEM_TYPE_ID,
			force: false,
		});

		args.player.playAnimation("animation.scpdy_player.t5000.pick");
		this.tpAnimVars.ticksUntilSpecialAnimTimeEnd = 8;
	}

	onTick(mainhandItemStack: mc.ItemStack): void {
		this.onTick_1(mainhandItemStack);
		this.onTick_TPAnim();
	}

	private onTick_TPAnim(): void {
		if (this.tpAnimVars.ticksUntilSpecialAnimTimeEnd > 0)
			this.tpAnimVars.ticksUntilSpecialAnimTimeEnd--;

		if (this.tpAnimVars.ticksUntilADSTransitionEnd > 0)
			this.tpAnimVars.ticksUntilADSTransitionEnd--;

		if (this.tpAnimVars.ticksUntilStopADS > 0) {
			this.tpAnimVars.ticksUntilStopADS--;

			if (this.tpAnimVars.ticksUntilStopADS <= 0) this.tpAnimVars.isADS = false;
			else if (!this.tpAnimVars.isADS) this.tpAnimVars.isADS = true;
		}

		if (this.tpAnimVars.isADS && !this.tpAnimVars.wasADS) {
			this.playTPAnimIfNotDuringSpecialAnimTime("animation.scpdy_player.t5000.ready_to_aim");
			this.tpAnimVars.ticksUntilADSTransitionEnd = 4;
			this.tpAnimVars.wasADS = true;
		} else if (!this.tpAnimVars.isADS && this.tpAnimVars.wasADS) {
			this.playTPAnimIfNotDuringSpecialAnimTime("animation.scpdy_player.t5000.aim_to_ready");
			this.tpAnimVars.ticksUntilADSTransitionEnd = 4;
			this.tpAnimVars.wasADS = false;
		}

		if (this.tpAnimVars.ticksUntilADSTransitionEnd <= 0) {
			this.playTPAnimIfNotDuringSpecialAnimTime(
				this.tpAnimVars.isADS
					? "animation.scpdy_player.t5000.aim"
					: "animation.scpdy_player.t5000.ready",
			);
		}
	}

	private playTPAnimIfNotDuringSpecialAnimTime(id: string): void {
		if (this.tpAnimVars.ticksUntilSpecialAnimTimeEnd > 0) return;
		this.player.playAnimation(id);
	}

	private onTick_1(mainhandItemStack: mc.ItemStack): void {
		const cdReload = this.player.getItemCooldown(COOLDOWN_IDS.reload);
		const cdReloadTac = this.player.getItemCooldown(COOLDOWN_IDS.reloadTac);
		const dontAim = cdReload > 0 || cdReloadTac > 0;

		// Update aimTick
		if (dontAim) {
			this.aimTick = this.aimTick > 0 ? this.aimTick - 1 : 0;

			if (this.tpAnimVars.isADS) this.tpAnimVars.ticksUntilStopADS = 1;
		} else {
			this.aimTick = this.player.isSneaking
				? this.aimTick < AIM_DURATION
					? this.aimTick + 1
					: AIM_DURATION
				: this.aimTick > 0
				? this.aimTick - 1
				: 0;

			if (this.tpAnimVars.ticksUntilSpecialAnimTimeEnd <= 0) {
				if (this.player.isSneaking) {
					this.tpAnimVars.isADS = true;
					this.tpAnimVars.ticksUntilStopADS = 0;
				} else if (this.tpAnimVars.isADS) {
					this.tpAnimVars.ticksUntilStopADS = 1;
				}
			}
		}

		const isADS = this.aimTick >= AIM_DURATION;

		if (isADS) {
			const movementVector = this.player.inputInfo.getMovementVector();
			const length = Math.sqrt(movementVector.x ** 2 + movementVector.y ** 2);

			this.player.addEffect("slowness", 3, {
				amplifier: length > 0.3 ? 3 : 8,
				showParticles: false,
			});
		}

		const magItemStack = this.playerOffhand.getItem();

		if (!magItemStack || magItemStack.typeId !== MAG_ITEM_TYPE_ID) {
			// Stop reload just in case if mag was removed during reload
			if (this.reloadData) {
				this.reloadData = undefined;
				this.player.startItemCooldown(COOLDOWN_IDS.reload, 0);
				this.player.startItemCooldown(COOLDOWN_IDS.reloadTac, 0);
			}

			this.player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.gun.noMagInInventory",
			});

			return;
		}

		const magAmmoType = getAmmoType(magItemStack)!;
		const magDurabilityComp = magItemStack.getComponent("durability")!;
		const magAmmoCountNow = magDurabilityComp.maxDurability - magDurabilityComp.damage;
		const invAmmoCountNow = getTotalAmmoCount(this.playerInventoryContainer, magAmmoType);

		// Display ammo count
		const ammoDisplayText = getAmmoDisplayText(
			magAmmoCountNow,
			magDurabilityComp.maxDurability,
			invAmmoCountNow,
		);
		this.player.onScreenDisplay.setActionBar(`${ammoDisplayText}`);

		if (this.currentTick < PICK_DURATION) return; // Stop here if still picking
		if (this.player.getItemCooldown(COOLDOWN_IDS.shoot) > 0) return; // Stop here if still shooting

		if (!this.boltCycleData && this.getIsBoltCycleNeeded(mainhandItemStack)) {
			this.boltCycleData = {
				tick: 0,
			};
		}

		// Update bolt cycle
		if (this.boltCycleData) {
			if (this.boltCycleData.tick === 0) {
				this.player.startItemCooldown(COOLDOWN_IDS.boltCycle, 18);

				this.player.playAnimation("animation.scpdy_player.t5000.bolt");
				this.tpAnimVars.ticksUntilSpecialAnimTimeEnd = 20;
				this.tpAnimVars.ticksUntilStopADS = 600;
			}

			if (this.boltCycleData.tick === 3) {
				this.playSoundAtHead("scpdy.gun.t5000.bolt_open");
			}

			if (this.boltCycleData.tick === 7) {
				this.player.runCommandAsync("camerashake add @s 0.025 0.08 rotational");
			}

			if (this.boltCycleData.tick === 9) {
				this.playSoundAtHead("scpdy.gun.t5000.bolt_close");
			}

			if (this.boltCycleData.tick === 12) {
				this.player.runCommandAsync("camerashake add @s 0.025 0.11 rotational");
			}

			if (this.boltCycleData.tick === 18) {
				this.boltCycleData = undefined;

				this.setIsBoltCycleNeeded(mainhandItemStack, undefined);
				this.playerMainhand.setItem(mainhandItemStack);

				return; // Finish
			}

			this.boltCycleData.tick++;

			return;
		}

		if (this.tryReloadingNextTick) {
			this.tryReloadingNextTick = false;

			if (this.reloadData) return;

			// Reload should not start if inventory ammo count is 0 or mag is full
			if (invAmmoCountNow <= 0) return;
			if (magDurabilityComp.damage <= 0) return;

			this.reloadData = {
				tac: magAmmoCountNow > 0,
				tick: 0,
			};
		}

		// Update reload
		if (this.reloadData) {
			// Cancel reload if ammo count (both mag and inventory) is 0
			if (magAmmoCountNow <= 0 && invAmmoCountNow <= 0) {
				this.reloadData = undefined;
				this.player.startItemCooldown(COOLDOWN_IDS.reload, 0);
				this.player.startItemCooldown(COOLDOWN_IDS.reloadTac, 0);
				return;
			}

			if (this.reloadData.tac) {
				if (this.reloadData.tick === 0) {
					this.player.startItemCooldown(COOLDOWN_IDS.reloadTac, 32);

					this.player.playAnimation("animation.scpdy_player.t5000.reload_tac");
					this.tpAnimVars.ticksUntilSpecialAnimTimeEnd = 32;
				}

				if (this.reloadData.tick === 6) {
					this.playSoundAtHead("scpdy.gun.t5000.mag_remove");
				}

				if (this.reloadData.tick === 18) {
					this.playSoundAtHead("scpdy.gun.t5000.mag_attach");
				}

				if (this.reloadData.tick === 20) {
					this.player.runCommandAsync("camerashake add @s 0.02 0.08 rotational");

					const reloadAmount = removeAmmo(
						this.playerInventoryContainer,
						magAmmoType,
						magDurabilityComp.damage,
					);
					magDurabilityComp.damage -= reloadAmount;
					this.playerOffhand.setItem(magItemStack);
				}

				if (this.reloadData.tick === 32) {
					this.reloadData = undefined;
					return; // Finish
				}
			} else {
				if (this.reloadData.tick === 0) {
					this.player.startItemCooldown(COOLDOWN_IDS.reload, 52);

					this.player.playAnimation("animation.scpdy_player.t5000.reload");
					this.tpAnimVars.ticksUntilSpecialAnimTimeEnd = 52;
				}

				if (this.reloadData.tick === 1) {
					this.playSoundAtHead("scpdy.gun.t5000.bolt_open");
				}

				if (this.reloadData.tick === 6) {
					this.player.runCommandAsync("camerashake add @s 0.01 0.1 rotational");
				}

				if (this.reloadData.tick === 14) {
					this.playSoundAtHead("scpdy.gun.t5000.mag_remove");
				}

				if (this.reloadData.tick === 16) {
					this.player.runCommandAsync("camerashake add @s 0.01 0.2 rotational");
				}

				if (this.reloadData.tick === 27) {
					this.playSoundAtHead("scpdy.gun.t5000.mag_attach");
				}

				if (this.reloadData.tick === 28) {
					this.player.runCommandAsync("camerashake add @s 0.015 0.1 rotational");
				}

				if (this.reloadData.tick === 36) {
					this.playSoundAtHead("scpdy.gun.t5000.bolt_close");
				}

				if (this.reloadData.tick === 39) {
					this.player.runCommandAsync("camerashake add @s 0.02 0.2 rotational");
				}

				if (this.reloadData.tick === 44) {
					const reloadAmount = removeAmmo(
						this.playerInventoryContainer,
						magAmmoType,
						magDurabilityComp.damage,
					);
					magDurabilityComp.damage -= reloadAmount;
					this.playerOffhand.setItem(magItemStack);
				}

				if (this.reloadData.tick === 52) {
					this.reloadData = undefined;
					return; // Finish
				}
			}

			this.reloadData.tick++;

			return;
		}
	}

	onRemove(): void {
		this.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Crosshair]);
		this.player.playAnimation("animation.scpdy_player.t5000.remove");
	}

	isUsable(event: mc.ItemStartUseAfterEvent): boolean {
		if (this.currentTick < PICK_DURATION) return false;
		if (this.tryReloadingNextTick) return false;
		if (this.boltCycleData) return false;
		if (this.reloadData) return false;
		if (this.getIsBoltCycleNeeded(event.itemStack)) return false;
		if (this.player.getItemCooldown(COOLDOWN_IDS.shoot) > 0) return false;

		return true;
	}

	onStartUse(event: mc.ItemStartUseAfterEvent): void {
		const equipMagResult = equipMag({
			player: this.player,
			inventoryContainer: this.playerInventoryContainer,
			offhandSlot: this.playerOffhand,
			magItemTypeId: MAG_ITEM_TYPE_ID,
			force: true,
		});

		if (!equipMagResult) return; // Mag was not found in inventory

		const magItemStack = this.playerOffhand.getItem()!;
		const magDurabilityComp = magItemStack.getComponent("durability")!;
		const magAmmoCountNow = magDurabilityComp.maxDurability - magDurabilityComp.damage;

		if (magAmmoCountNow <= 0) {
			this.tryReloadingNextTick = true;
			return;
		}

		this.shoot(this.aimTick >= AIM_DURATION);

		// Bolt cycle flag should be enabled ONLY when it is not last round
		if (magAmmoCountNow > 1) {
			this.setIsBoltCycleNeeded(event.itemStack, true);
			this.playerMainhand.setItem(event.itemStack);
		}

		// Decrement mag ammo count
		magDurabilityComp.damage++;
		this.playerOffhand.setItem(magItemStack);
	}

	onStopUse(event: mc.ItemStopUseAfterEvent): void {}

	onSwingArm(): void {
		if (CONFIG.gunTacReloadOption !== 2) return;
		if (this.tryReloadingNextTick) return;
		this.tryReloadingNextTick = true;
	}

	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {
		if (CONFIG.gunTacReloadOption !== 1) return;
		if (this.tryReloadingNextTick) return;
		this.tryReloadingNextTick = true;
	}

	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {
		if (CONFIG.gunTacReloadOption !== 1) return;
		if (this.tryReloadingNextTick) return;
		this.tryReloadingNextTick = true;
	}

	private playSoundAtHead(soundId: string, options?: mc.WorldSoundOptions): void {
		this.player.dimension.playSound(
			soundId,
			vec3.add(this.player.getHeadLocation(), this.player.getViewDirection()),
			options,
		);
	}

	private getIsBoltCycleNeeded(itemStack: mc.ItemStack): boolean {
		return itemStack.getDynamicProperty("isBoltCycleNeeded") === true;
	}

	private setIsBoltCycleNeeded(itemStack: mc.ItemStack, value?: boolean): void {
		itemStack.setDynamicProperty("isBoltCycleNeeded", value);
	}

	private getMuzzleLocation(ads: boolean): mc.Vector3 {
		// Amount of movement in each direction
		const move: Partial<mc.Vector3> = ads
			? {
					x: 0.0,
					y: -0.1,
					z: 1.3,
			  }
			: {
					x: 0.13,
					y: 0.026,
					z: 1.2,
			  };

		// Get location relative to player head
		const muzzleLoc = vec3.add(
			vec3.getRelativeToHead(this.player.getHeadLocation(), this.player.getViewDirection(), move),
			this.player.getVelocity(),
		);

		return muzzleLoc;
	}

	private shoot(ads: boolean): void {
		this.player.startItemCooldown(COOLDOWN_IDS.boltCycle, 0);
		this.player.startItemCooldown(COOLDOWN_IDS.shoot, 5);

		this.player.playAnimation("animation.scpdy_player.t5000.shoot");
		this.tpAnimVars.ticksUntilSpecialAnimTimeEnd = 9;
		this.tpAnimVars.ticksUntilStopADS = 600;

		const bulletSpread = ads
			? 0
			: (0.1 + Math.min(0.5, vec3.length(this.player.getVelocity()))) * 0.5;

		const shootBulletVelocity: mc.Vector3 = vec3
			.chain(vec3.FORWARD)
			.scale(15)
			.changeDir(this.player.getViewDirection())
			.rotateRad(vec3.random(), randomFloat(-bulletSpread, bulletSpread))
			.done();

		shootBullet("default", {
			dimension: this.player.dimension,
			initialLocation: this.player.getHeadLocation(),
			initialVelocity: shootBulletVelocity,
			sourceEntity: this.player,
			onHitBlock: [
				commonBulletHitEvents.BREAK_GLASS_AND_END_SEQUENCE,
				{
					type: "spawnRicochet",
				},
				{
					type: "removeBullet",
				},
			],
			onHitEntity: [
				{
					type: "damageEntity",
					damage: 24,
					damageCause: mc.EntityDamageCause.override,
					canDamageBeModified: true,
					knockbackPower: 1,
					condition(event, hitEntity, sharedState) {
						sharedState.stopCurrentEventSequence = true;

						if (!mc.world.gameRules.pvp && hitEntity instanceof mc.Player) return false;

						sharedState.stopCurrentEventSequence = false;

						return true;
					},
				},
				{
					type: "removeBullet",
				},
			],
		});

		const muzzleLoc = this.getMuzzleLocation(ads);

		this.player.dimension.spawnParticle("lc:scpdy_muzzle_flash_particle", muzzleLoc);

		const soundListeners = this.player.dimension.getPlayers({
			closest: 20,
			location: this.player.location,
			maxDistance: 80,
		});

		const soundOrigin = muzzleLoc;

		for (let i = 0; i < soundListeners.length; i++) {
			const listener = soundListeners[i]!;
			const dist = vec3.distance(soundOrigin, listener.location);

			if (dist < 40) {
				listener.playSound("scpdy.gun.t5000.shoot_nearby", {
					location: soundOrigin,
					volume: 3.0,
				});
			} else {
				listener.playSound("scpdy.gun.t5000.shoot_distant", {
					location: soundOrigin,
					volume: 5.0,
				});
			}
		}

		this.player.runCommandAsync("camerashake add @s 0.06 0.1 rotational");
	}
}
