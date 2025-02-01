import * as mc from "@minecraft/server";
import * as vec3 from "@lib/utils/vec3";
import { AdvancedItem, AdvancedItemBaseConstructorArgs } from "@server/advancedItem/AdvancedItem";
import { registerAdvancedItemProfile } from "@server/advancedItem/profileRegistry";
import { equipMag } from "./mag";
import { getAmmoType, getTotalAmmoCount, removeAmmo } from "@server/ammo/ammo";
import { getAmmoDisplayText } from "./shared";
import { randomFloat } from "@lib/utils/mathUtils";
import { shootBullet } from "./bullet";
import * as commonBulletHitEvents from "./commonBulletHitEvents";

/**
 * Set of variables to use during reload
 */
type ReloadData = {
	tick: number;
	tac: boolean;
};

const MAG_ITEM_TYPE_ID = "lc:scpdy_gun_mp5_mag";

const PICK_DURATION = 10; // Total amount of tick required for item picking to finish
const AIM_DURATION = 3; // Total amount of tick required for entering ADS (aiming-down-sights) state

// Item cooldown IDs used to trigger attachable animations
const COOLDOWN_IDS = {
	pick: "scpdy_gun_mp5sd_pick",
	shootScript: "scpdy_gun_mp5sd_shoot_script",
	shoot1: "scpdy_gun_mp5sd_shoot_1",
	shoot2: "scpdy_gun_mp5sd_shoot_2",
	reload: "scpdy_gun_mp5sd_reload",
	reloadTac: "scpdy_gun_mp5sd_reload_tac",
} as const;

/**
 * MP5-SD submachine gun
 */
class MP5SD extends AdvancedItem {
	private readonly playerInventoryContainer: mc.Container;
	private aimTick = 0;
	private reloadData?: ReloadData;
	private wasCrosshairHidden = false;
	private isUsingToShoot = false;
	private shotsFired = 0;

	/**
	 * Enabling this flag will start gun reload on next tick if it meets condition
	 */
	private tryReloadingNextTick = false;

	constructor(args: AdvancedItemBaseConstructorArgs) {
		super(args);

		this.playerInventoryContainer = args.player.getComponent("inventory")!.container!;

		args.player.startItemCooldown(COOLDOWN_IDS.pick, 2);

		equipMag({
			player: this.player,
			inventoryContainer: this.playerInventoryContainer,
			offhandSlot: this.playerOffhand,
			magItemTypeId: MAG_ITEM_TYPE_ID,
			force: false,
		});
	}

	private playSoundAtHead(soundId: string, options?: mc.WorldSoundOptions): void {
		this.player.dimension.playSound(
			soundId,
			vec3.add(this.player.getHeadLocation(), this.player.getViewDirection()),
			options,
		);
	}

	private getMuzzleLocation(ads: boolean): mc.Vector3 {
		// Amount of movement in each direction
		const move: Partial<mc.Vector3> = ads
			? {
					x: 0.0,
					y: -0.12,
					z: 1.3,
			  }
			: {
					x: 0.13,
					y: 0.0,
					z: 1.6,
			  };

		// Get location relative to player head
		const muzzleLoc = vec3.add(
			vec3.getRelativeToHead(this.player.getHeadLocation(), this.player.getViewDirection(), move),
			this.player.getVelocity(),
		);

		return muzzleLoc;
	}

	private shoot(ads: boolean) {
		const shotsFired = this.shotsFired;

		this.player.startItemCooldown(COOLDOWN_IDS.shootScript, 1.5);

		// Play shoot animation
		if (this.player.getItemCooldown(COOLDOWN_IDS.shoot1) > 0) {
			this.player.startItemCooldown(COOLDOWN_IDS.shoot1, 0);
			this.player.startItemCooldown(COOLDOWN_IDS.shoot2, 15);
		} else {
			this.player.startItemCooldown(COOLDOWN_IDS.shoot2, 0);
			this.player.startItemCooldown(COOLDOWN_IDS.shoot1, 15);
		}

		// Shoot bullet

		const bulletSpread =
			shotsFired === 1
				? 0
				: (0.01 +
						Math.min(0.15, (ads ? 0.02 : 0.03) * shotsFired) +
						Math.min(0.1, vec3.length(this.player.getVelocity()) / 4)) *
				  0.23;

		const shootBulletVelocity: mc.Vector3 = vec3
			.chain(vec3.FORWARD)
			.scale(9.3)
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
					damage: 2,
					damageCause: mc.EntityDamageCause.override,
					canDamageBeModified: true,
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

		this.player.dimension.spawnParticle("lc:scpdy_muzzle_smoke_emitter", muzzleLoc);

		// Spawn empty casing drop particle
		{
			const particleLoc = vec3.getRelativeToHead(
				this.player.getHeadLocation(),
				this.player.getViewDirection(),
				ads
					? {
							x: 0.05,
							y: 0.02,
							z: 0.67,
					  }
					: {
							x: 0.3,
							y: -0.1,
							z: 1.0,
					  },
			);

			const viewDirection = this.player.getViewDirection();
			const rightDirection = vec3.cross(viewDirection, vec3.UP); // 右方向を計算

			const particleDirection = vec3.add(
				vec3.add(
					vec3.scale(viewDirection, -randomFloat(1.3, 1.5)), // Go backwards
					vec3.scale(rightDirection, randomFloat(0.6, 0.7)), // Go right
				),
				vec3.fromPartial({
					x: randomFloat(-0.1, 0.1),
					y: randomFloat(1.1, 1.3), // Go up
					z: randomFloat(-0.1, 0.1),
				}),
			);

			const molangVarMap = new mc.MolangVariableMap();
			molangVarMap.setFloat("speed", 6);
			molangVarMap.setVector3("direction", particleDirection);

			this.player.dimension.spawnParticle(
				"lc:scpdy_bullet_casing_drop_var0_particle",
				particleLoc,
				molangVarMap,
			);
		}

		// Play sound
		this.playSoundAtHead("scpdy.gun.mp5sd.shoot", {
			volume: 1.4,
			pitch: randomFloat(0.95, 1.05),
		});

		const camShakeAmount = Math.min(0.1, 0.01 + (ads ? 0.0005 : 0.001) * this.shotsFired);
		this.player.runCommandAsync(`camerashake add @s ${camShakeAmount} 0.05 rotational`);
	}

	onTick(mainhandItemStack: mc.ItemStack): void {
		const cdReload = this.player.getItemCooldown(COOLDOWN_IDS.reload);
		const cdReloadTac = this.player.getItemCooldown(COOLDOWN_IDS.reloadTac);
		const dontAim = cdReload > 0 || cdReloadTac > 0;

		// Update aimTick
		if (dontAim) {
			this.aimTick = this.aimTick > 0 ? this.aimTick - 1 : 0;
		} else {
			this.aimTick = this.player.isSneaking
				? this.aimTick < AIM_DURATION
					? this.aimTick + 1
					: AIM_DURATION
				: this.aimTick > 0
				? this.aimTick - 1
				: 0;
		}

		const isADS = this.aimTick >= AIM_DURATION;

		if (isADS) {
			this.player.addEffect("slowness", 3, {
				amplifier: 0,
				showParticles: false,
			});

			if (!this.wasCrosshairHidden) {
				this.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [
					mc.HudElement.Crosshair,
				]);

				this.wasCrosshairHidden = true;
			}
		} else if (this.wasCrosshairHidden) {
			this.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [
				mc.HudElement.Crosshair,
			]);

			this.wasCrosshairHidden = false;
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
		if (this.player.getItemCooldown(COOLDOWN_IDS.shootScript) > 0) return; // Stop here if still shooting

		if (this.isUsingToShoot) {
			if (magAmmoCountNow <= 0) {
				this.isUsingToShoot = false;
				this.shotsFired = 0;
				this.tryReloadingNextTick = true;
				return;
			}

			if (this.player.getItemCooldown(COOLDOWN_IDS.shootScript) > 0) return;

			this.shotsFired++;
			this.shoot(isADS);

			magDurabilityComp.damage++;
			this.playerOffhand.setItem(magItemStack);

			return;
		}

		if (this.tryReloadingNextTick) {
			this.tryReloadingNextTick = false;

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
				}

				if (this.reloadData.tick === 4) {
					this.player.runCommandAsync("camerashake add @s 0.01 0.2 rotational");

					this.playSoundAtHead("scpdy.gun.mp5sd.mag_remove", { volume: 1.2 });
				}

				if (this.reloadData.tick === 18) {
					this.player.runCommandAsync("camerashake add @s 0.02 0.08 rotational");

					this.playSoundAtHead("scpdy.gun.mp5sd.mag_attach", { volume: 1.2 });

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
				}

				if (this.reloadData.tick === 2) {
					this.player.runCommandAsync("camerashake add @s 0.01 0.1 rotational");

					this.playSoundAtHead("scpdy.gun.mp5sd.ch_pull", { volume: 1.2 });
				}

				if (this.reloadData.tick === 10) {
					this.player.runCommandAsync("camerashake add @s 0.01 0.2 rotational");

					this.playSoundAtHead("scpdy.gun.mp5sd.mag_remove", { volume: 1.2 });
				}

				if (this.reloadData.tick === 27) {
					this.player.runCommandAsync("camerashake add @s 0.015 0.1 rotational");

					this.playSoundAtHead("scpdy.gun.mp5sd.mag_attach", { volume: 1.2 });
				}

				if (this.reloadData.tick === 37) {
					this.player.runCommandAsync("camerashake add @s 0.02 0.1 rotational");

					this.playSoundAtHead("scpdy.gun.mp5sd.ch_slap", { volume: 1.2 });

					const reloadAmount = removeAmmo(
						this.playerInventoryContainer,
						magAmmoType,
						magDurabilityComp.damage,
					);
					magDurabilityComp.damage -= reloadAmount;
					this.playerOffhand.setItem(magItemStack);
				}

				if (this.reloadData.tick === 53) {
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
	}

	isUsable(): boolean {
		const itemStack = this.playerMainhand.getItem();

		if (!itemStack) return false;

		if (this.currentTick < PICK_DURATION) return false;
		if (this.tryReloadingNextTick) return false;
		if (this.reloadData) return false;
		if (this.player.getItemCooldown(COOLDOWN_IDS.shootScript) > 0) return false;

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

		this.player.playSound("scpdy.gun.trigger_click");

		const magItemStack = this.playerOffhand.getItem()!;
		const magDurabilityComp = magItemStack.getComponent("durability")!;
		const magAmmoCountNow = magDurabilityComp.maxDurability - magDurabilityComp.damage;

		if (magAmmoCountNow <= 0) {
			this.tryReloadingNextTick = true;
			return;
		}

		this.isUsingToShoot = true;
	}

	onStopUse(event: mc.ItemStopUseAfterEvent): void {
		this.isUsingToShoot = false;
		this.shotsFired = 0;
	}

	onSwingArm(): void {
		if (this.tryReloadingNextTick) return;
		this.tryReloadingNextTick = true;
	}

	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {
		if (this.tryReloadingNextTick) return;
		this.tryReloadingNextTick = true;
	}

	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {
		if (this.tryReloadingNextTick) return;
		this.tryReloadingNextTick = true;
	}
}

registerAdvancedItemProfile({
	itemTypeId: "lc:scpdy_gun_mp5sd",
	createInstance: (args) => new MP5SD(args),
});
