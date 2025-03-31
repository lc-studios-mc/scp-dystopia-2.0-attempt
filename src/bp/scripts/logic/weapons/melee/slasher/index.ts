import { getEntityName, getModifiedDamageNumber } from "@lib/utils/entityUtils";
import { randomFloat, randomInt } from "@lib/utils/mathUtils";
import * as vec3 from "@lib/utils/vec3";
import { AdvancedItem, AdvancedItemBaseConstructorArgs } from "@logic/advancedItem/AdvancedItem";
import { registerAdvancedItemProfile } from "@logic/advancedItem/profileRegistry";
import * as scp427_1_module from "@logic/scps/scp427/scp427_1";
import * as mc from "@minecraft/server";
import * as beam from "./beam";

type ChargeInfo = {
	elapsedTicks: number;
};

type SlashInfo = {
	elapsedTicks: number;
	slashTick: number;
	alreadyHitEntities: mc.Entity[];
	lockon?: {
		playerLoc: mc.Vector3;
		playerRot: mc.Vector2;
		entityLockLoc: mc.Vector3;
		entities: mc.Entity[];
		nextCritParticleTick: number;
	};
};

const PARAM = {
	swingAttackPreventionDuration: 4,
	swingAttackDuration: 8,
	swingAttackDamage: 4,
	fullChargeTick: 5,
	dashDuration: 4,
	slashDirectDamage: 19,
	slashDuration: 5,
	slashAftertasteDuration: 3,
} as const;

const CD_NAME = {
	swingAttackPrevention: "scpdy_slasher_swing_attack_prevention",
	swing1: "scpdy_slasher_swing_cd_1",
	swing2: "scpdy_slasher_swing_cd_2",
	chargeStart: "scpdy_slasher_charge_start_cd",
	chargeCancel: "scpdy_slasher_charge_cancel_cd",
	dash: "scpdy_slasher_dash_cd",
	slashStart: "scpdy_slasher_slash_start_cd",
	slashContinue: "scpdy_slasher_slash_continue_cd",
	slashHold: "scpdy_slasher_slash_hold_cd",
	slashEnd: "scpdy_slasher_slash_end_cd",
	slashAftertaste: "scpdy_slasher_aftertaste",
} as const;

const SLASH_LOCKON_EXCLUDED_FAMILIES: string[] = ["projectile", "inanimate", "scp096", "scp682"];
const SLASH_LOCKON_EXCLUDED_TYPES: string[] = [
	"minecraft:xp_orb",
	"minecraft:arrow",
	"minecraft:fireball",
	"minecraft:ender_dragon",
	"minecraft:wither",
];
const SLASH_CAPTURE_IGNORE_TAG = "scpdy_ignore_slasher_capture";
const SLASH_LOCKON_EXCLUDED_TAGS = [SLASH_CAPTURE_IGNORE_TAG];

const isPlayerImmune = (player: mc.Player): boolean =>
	[mc.GameMode.creative, mc.GameMode.spectator].includes(player.getGameMode(),);

registerAdvancedItemProfile({
	itemTypeId: "lc:scpdy_slasher",
	createInstance: (args) => new Slasher(args,),
},);

class Slasher extends AdvancedItem {
	private chargeInfo?: ChargeInfo;
	private slashInfo?: SlashInfo;

	constructor(args: AdvancedItemBaseConstructorArgs) {
		super(args,);

		args.player.startItemCooldown("scpdy_slasher_pick", 2,);
	}

	private shakeCamera(
		intensity: number,
		seconds: number,
		shakeType: "positional" | "rotational",
	): void {
		this.player.runCommand(
			`camerashake add @s ${intensity.toFixed(2,)} ${seconds.toFixed(2,)} ${shakeType}`,
		);
	}

	private getCooldown(name: string): number {
		return this.player.getItemCooldown(name,);
	}

	private setCooldown(name: string, duration: number): void {
		this.player.startItemCooldown(name, duration,);
	}

	private getNextDurabilityDamage(): number | undefined {
		const value = this.player.getDynamicProperty("nextSlasherDurabilityDamage",);
		if (typeof value !== "number") return;
		return Math.floor(value,);
	}

	private setNextDurabilityDamage(value?: number | undefined) {
		this.player.setDynamicProperty(
			"nextSlasherDurabilityDamage",
			value == undefined || value <= 0 ? undefined : Math.floor(value,),
		);
	}

	private addNextDurabilityDamage(value: number): void {
		let current = this.getNextDurabilityDamage();
		if (typeof current !== "number") current = 0;
		this.setNextDurabilityDamage(current + Math.floor(value,),);
	}

	private getCurrentDurability(durabilityComp: mc.ItemDurabilityComponent): number {
		return durabilityComp.maxDurability - durabilityComp.damage;
	}

	private isNeedingRepair(durabilityComp: mc.ItemDurabilityComponent): boolean {
		return durabilityComp.damage >= durabilityComp.maxDurability;
	}

	private processNextDurabilityDamage(durabilityComp: mc.ItemDurabilityComponent): boolean {
		const nextDurabilityDamage = this.getNextDurabilityDamage();
		if (nextDurabilityDamage == undefined) return false;

		this.setNextDurabilityDamage(undefined,);

		if (this.player.getGameMode() === mc.GameMode.creative) return false;
		if (this.isNeedingRepair(durabilityComp,)) return false;

		const newDamage = Math.min(this.getCurrentDurability(durabilityComp,), nextDurabilityDamage,);

		durabilityComp.damage += newDamage;

		return true;
	}

	private getDurabilityComp(slasherItem: mc.ItemStack): mc.ItemDurabilityComponent {
		const comp = slasherItem.getComponent("durability",);
		if (!comp) throw new Error("Durability component does not exist",);
		return comp;
	}

	get extHeadLocation(): mc.Vector3 {
		return vec3.add(this.player.getHeadLocation(), this.player.getViewDirection(),);
	}

	private playSoundAtExtHeadLocation(soundId: string, opts?: mc.WorldSoundOptions): void {
		this.player.dimension.playSound(soundId, this.extHeadLocation, opts,);
	}

	private playSound3DAnd2D(soundId: string, maxDist = 20, opts?: mc.PlayerSoundOptions): void {
		const soundId2D = `${soundId}.2d`;
		this.player.playSound(soundId2D, opts,);

		const listeners = this.player.dimension.getPlayers({
			location: this.player.getHeadLocation(),
			maxDistance: maxDist,
		},);

		for (const listener of listeners) {
			if (listener === this.player) continue;

			listener.playSound(soundId, {
				location: this.player.getHeadLocation(),
				pitch: opts?.pitch,
				volume: opts?.volume,
			},);
		}
	}

	onRemove(): void {}

	onSwingArm(): void {
		const swingAttackPreventionName = this.getCooldown(CD_NAME.swingAttackPrevention,);
		if (swingAttackPreventionName > 0) return;
		if (this.getCooldown(CD_NAME.slashAftertaste,) > 0) return;
		if (this.chargeInfo) return;
		if (this.slashInfo) return;
		this.swingAttack();
	}

	onHitEntity(_event: mc.EntityHitEntityAfterEvent): void {}

	onHitBlock(_event: mc.EntityHitBlockAfterEvent): void {}

	private swingAttack(): void {
		this.setCooldown(CD_NAME.swingAttackPrevention, PARAM.swingAttackPreventionDuration,);

		const swingCd1 = this.getCooldown(CD_NAME.swing1,);
		const swingCd2 = this.getCooldown(CD_NAME.swing2,);

		if (swingCd1 === 0 && swingCd2 === 0) {
			this.setCooldown(CD_NAME.swing1, PARAM.swingAttackDuration,);
		} else if (swingCd1 > 0) {
			this.setCooldown(CD_NAME.swing2, PARAM.swingAttackDuration,);
			this.setCooldown(CD_NAME.swing1, 0,);
		} else if (swingCd2 > 0) {
			this.setCooldown(CD_NAME.swing1, PARAM.swingAttackDuration,);
			this.setCooldown(CD_NAME.swing2, 0,);
		}

		this.playSoundAtExtHeadLocation("scpdy.slasher.swing", {
			volume: 1.2,
			pitch: randomFloat(0.9, 1.1,),
		},);
		this.shakeCamera(0.05, 0.09, "rotational",);

		const mainhandItem = this.playerMainhand.getItem()!;
		const durabilityComp = this.getDurabilityComp(mainhandItem,);
		if (this.isNeedingRepair(durabilityComp,)) return;

		mc.system.runTimeout(() => {
			beam.shootSlasherSwingBeam(this.player, -0.6,);
			beam.shootSlasherSwingBeam(this.player, 0,);
			beam.shootSlasherSwingBeam(this.player, 0.6,);
		}, 1,);

		mc.system.run(() => {
			const swingDamageTakers = this.player.dimension.getEntities({
				closest: 10,
				maxDistance: 2.2,
				location: this.extHeadLocation,
			},);

			for (let i = 0; i < swingDamageTakers.length; i++) {
				const entity = swingDamageTakers[i]!;
				if (entity === this.player) continue;
				if (entity instanceof mc.Player) {
					if (!mc.world.gameRules.pvp) continue;
					if (isPlayerImmune(entity,)) continue;
				}

				this.addNextDurabilityDamage(1,);

				entity.applyDamage(PARAM.swingAttackDamage, {
					cause: mc.EntityDamageCause.entityAttack,
					damagingEntity: this.player,
				},);
			}
		},);
	}

	isUsable(event: mc.ItemStartUseAfterEvent): boolean {
		if (this.isNeedingRepair(this.getDurabilityComp(event.itemStack,),)) return false;
		return true;
	}

	onStartUse(_event: mc.ItemStartUseAfterEvent): void {
		this.chargeInfo = {
			elapsedTicks: 0,
		};
	}

	onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		if (this.chargeInfo && this.chargeInfo.elapsedTicks >= PARAM.fullChargeTick) {
			this.onReleaseFullCharge();
		} else {
			this.cancelCharge();
		}
	}

	onTick(mainhandItemStack: mc.ItemStack): void {
		if (this.chargeInfo) {
			if (this.onTickCharge(this.chargeInfo,)) this.chargeInfo.elapsedTicks++;
		}

		if (this.slashInfo) {
			if (this.onTickSlash(this.slashInfo,)) this.slashInfo.elapsedTicks++;
		}

		if (this.chargeInfo || this.slashInfo) return;

		const durabilityComp = this.getDurabilityComp(mainhandItemStack,);

		if (this.isNeedingRepair(durabilityComp,)) {
			this.player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.slasher.needsRepair",
			},);
		}

		if (this.processNextDurabilityDamage(durabilityComp,)) {
			this.playerMainhand.setItem(mainhandItemStack,);
			return;
		}
	}

	private onTickCharge(chargeInfo: ChargeInfo): boolean {
		if (this.slashInfo) return false;
		if (this.getCooldown(CD_NAME.slashAftertaste,) > 0) return false;
		if (this.getCooldown(CD_NAME.swing1,) > 0) return false;
		if (this.getCooldown(CD_NAME.swing2,) > 0) return false;
		if (this.getCooldown(CD_NAME.swingAttackPrevention,) > 0) return false;

		if (chargeInfo.elapsedTicks === 0) {
			this.setCooldown(CD_NAME.chargeStart, 2,);
			this.player.onScreenDisplay.setActionBar(`§c>    X    <`,);
			this.player.playAnimation("animation.scpdy_player.slasher.charge_start",);
		} else if (chargeInfo.elapsedTicks === 1) {
			this.player.onScreenDisplay.setActionBar(`§c>   X   <`,);
		} else if (chargeInfo.elapsedTicks === 2) {
			this.player.onScreenDisplay.setActionBar(`§c>  X  <`,);
		} else if (chargeInfo.elapsedTicks === 3) {
			this.player.onScreenDisplay.setActionBar(`§c> X <`,);
		} else if (chargeInfo.elapsedTicks === 4) {
			this.player.onScreenDisplay.setActionBar(`§c>X<`,);
		} else if (chargeInfo.elapsedTicks >= 5) {
			if (chargeInfo.elapsedTicks % 2 === 0) {
				this.player.onScreenDisplay.setActionBar(`§e>X<`,);
			} else {
				this.player.onScreenDisplay.setActionBar(`§b>X<`,);
			}
		}

		if (chargeInfo.elapsedTicks > 0 && chargeInfo.elapsedTicks % 6 === 0) {
			this.player.playAnimation("animation.scpdy_player.slasher.charge_hold",);
		}

		if (chargeInfo.elapsedTicks % 8 === 0) {
			this.playSoundAtExtHeadLocation("scpdy.slasher.charge_loop",);
		}

		if (chargeInfo.elapsedTicks % 2 === 0) {
			this.shakeCamera(0.01, 0.1, "rotational",);
		}

		return true;
	}

	private cancelCharge(): void {
		this.chargeInfo = undefined;
		this.setCooldown(CD_NAME.chargeCancel, 2,);
	}

	private onReleaseFullCharge(): void {
		this.chargeInfo = undefined;

		this.slashInfo = {
			elapsedTicks: 0,
			slashTick: 0,
			alreadyHitEntities: [],
		};

		this.player.onScreenDisplay.setActionBar(`§b<X>`,);

		mc.system.runTimeout(() => {
			this.player.onScreenDisplay.setActionBar(`§b< X >`,);
		}, 1,);

		mc.system.runTimeout(() => {
			this.player.onScreenDisplay.setActionBar(`§b<  X  >`,);
		}, 2,);
	}

	private getEntitiesInSlashRange(lockon = false): mc.Entity[] {
		const headLoc = this.player.getHeadLocation();
		const viewDir = this.player.getViewDirection();

		const candidates: mc.Entity[] = [
			...this.player.dimension.getEntities({
				closest: 5,
				maxDistance: 1.8,
				location: vec3.getRelativeToHead(headLoc, viewDir, {
					z: 1.3,
				},),
				excludeFamilies: lockon ? SLASH_LOCKON_EXCLUDED_FAMILIES : undefined,
				excludeTypes: lockon ? SLASH_LOCKON_EXCLUDED_TYPES : undefined,
				excludeTags: lockon ? SLASH_LOCKON_EXCLUDED_TAGS : undefined,
			},),
			...this.player.dimension.getEntities({
				closest: 5,
				maxDistance: 1.8,
				location: vec3.getRelativeToHead(headLoc, viewDir, {
					z: 2.7,
				},),
				excludeFamilies: lockon ? SLASH_LOCKON_EXCLUDED_FAMILIES : undefined,
				excludeTypes: lockon ? SLASH_LOCKON_EXCLUDED_TYPES : undefined,
				excludeTags: lockon ? SLASH_LOCKON_EXCLUDED_TAGS : undefined,
			},),
			...this.player.dimension.getEntities({
				closest: 5,
				maxDistance: 1.9,
				location: vec3.getRelativeToHead(headLoc, viewDir, {
					z: 2.2,
					y: -1.4,
				},),
				excludeFamilies: lockon ? SLASH_LOCKON_EXCLUDED_FAMILIES : undefined,
				excludeTypes: lockon ? SLASH_LOCKON_EXCLUDED_TYPES : undefined,
				excludeTags: lockon ? SLASH_LOCKON_EXCLUDED_TAGS : undefined,
			},),
		];

		const result: mc.Entity[] = [];

		for (let i = 0; i < candidates.length; i++) {
			const entity = candidates[i]!;

			if (entity === this.player) continue;
			if (result.includes(entity,)) continue;
			if (entity instanceof mc.Player) {
				if (!mc.world.gameRules.pvp) continue;
				if (isPlayerImmune(entity,)) continue;
			}

			const raycastHit = [
				...this.player.dimension.getEntitiesFromRay(
					this.player.getHeadLocation(),
					vec3.sub(entity.location, this.player.getHeadLocation(),),
				),
				...this.player.dimension.getEntitiesFromRay(
					this.extHeadLocation,
					vec3.sub(entity.getHeadLocation(), this.player.getHeadLocation(),),
				),
			];

			if (!raycastHit) continue;
			if (!raycastHit.some((x) => x.entity === entity)) continue;

			result.push(entity,);
		}

		return result;
	}

	private getDashImpulse(movementY = 1): mc.Vector3 {
		return vec3
			.chain(vec3.FORWARD,)
			.mul(2.0 * movementY,)
			.changeDir(this.player.getViewDirection(),)
			.done();
	}

	private onTickSlash(slashInfo: SlashInfo): boolean {
		if (slashInfo.elapsedTicks === 0) {
			if (this.player.inputInfo.getMovementVector().y > 0.6) {
				slashInfo.slashTick = PARAM.dashDuration;
				this.setCooldown(CD_NAME.dash, 2,);
				this.playSound3DAnd2D("scpdy.slasher.dash", 10, { volume: 1.2 },);

				const dashImpulse = this.getDashImpulse(1,);

				if (this.player.isOnGround) {
					this.player.applyKnockback({ x: dashImpulse.x * 4.2, z: dashImpulse.z * 4.2 }, 0.15,);
				} else {
					this.player.applyImpulse(dashImpulse,);
				}

				this.player.playAnimation("animation.scpdy_player.slasher.dash_slash_start",);
			} else {
				this.player.playAnimation("animation.scpdy_player.slasher.slash_start",);
			}
		}

		if (slashInfo.elapsedTicks === slashInfo.slashTick) {
			this.playSound3DAnd2D("scpdy.slasher.slash", 20, {
				volume: 1.5,
				pitch: randomFloat(0.9, 1.1,),
			},);
			this.shakeCamera(0.08, 0.2, "rotational",);

			const lockonEntities =
				this.player.inputInfo.getButtonState(mc.InputButton.Sneak,) === mc.ButtonState.Pressed
					? this.getEntitiesInSlashRange(true,)
					: [];

			if (lockonEntities.length > 0) {
				const entity = lockonEntities[0];

				const lockonRelativeLoc = vec3
					.chain(this.player.location,)
					.sub(entity.location,)
					.normalize()
					.add(entity.location,)
					.done();

				this.player.teleport(lockonRelativeLoc, { facingLocation: lockonEntities[0].location },);

				slashInfo.lockon = {
					playerLoc: lockonRelativeLoc,
					playerRot: this.player.getRotation(),
					entityLockLoc: lockonEntities[0]!.location,
					entities: lockonEntities,
					nextCritParticleTick: slashInfo.elapsedTicks + randomInt(1, 2,),
				};

				entity.clearVelocity();

				if (mc.system.currentTick % 8 !== 0) this.playSound3DAnd2D("scpdy.slasher.chainsaw.loop",);

				this.setCooldown(CD_NAME.slashHold, 3,);
			} else {
				this.setCooldown(CD_NAME.slashContinue, 3,);
			}

			this.setCooldown(CD_NAME.slashStart, 2,);
		}

		if (slashInfo.lockon) {
			const end =
				this.player.inputInfo.getButtonState(mc.InputButton.Sneak,) !== mc.ButtonState.Pressed ||
				slashInfo.lockon.entities.length <= 0;

			if (end) {
				const impulse = vec3.mul(this.player.getViewDirection(), 2,);
				for (let i = 0; i < slashInfo.lockon.entities.length; i++) {
					const entity = slashInfo.lockon.entities[i];
					entity.applyImpulse(impulse,);
				}

				this.playSound3DAnd2D("scpdy.slasher.slash", 10, { volume: 1.3 },);
				this.playSound3DAnd2D("scpdy.slasher.chainsaw.finish", 10, { volume: 1.3 },);
				this.setCooldown(CD_NAME.slashAftertaste, PARAM.slashAftertasteDuration,);
				this.setCooldown(CD_NAME.slashEnd, 2,);
				this.player.playAnimation("animation.scpdy_player.slasher.slash_end",);
				this.endSlash();
				return false;
			}

			this.player.teleport(slashInfo.lockon.playerLoc, {
				rotation: slashInfo.lockon.playerRot,
			},);

			if (mc.system.currentTick % 8 === 0) {
				this.playSound3DAnd2D("scpdy.slasher.chainsaw.loop",);
			}

			const playerHeadLoc = this.player.getHeadLocation();
			const playerViewDir = this.player.getViewDirection();

			if (slashInfo.lockon.nextCritParticleTick === slashInfo.elapsedTicks) {
				const sparkParticleLoc = vec3
					.chain(vec3.FORWARD,)
					.mul(0.45,)
					.changeDir(playerViewDir,)
					.add(playerHeadLoc,)
					.done();

				slashInfo.lockon.nextCritParticleTick = slashInfo.lockon.nextCritParticleTick +
					randomInt(2, 6,);

				this.player.dimension.spawnParticle("lc:scpdy_slasher_spark_emitter", sparkParticleLoc,);
			}

			this.shakeCamera(0.09, 0.13, "rotational",);

			this.player.playAnimation("animation.scpdy_player.slasher.slash_hold",);

			this.addNextDurabilityDamage(1,);

			for (let i = 0; i < slashInfo.lockon.entities.length; i++) {
				try {
					const entity = slashInfo.lockon.entities[i]!;

					if (!entity.isValid || entity.hasTag(SLASH_CAPTURE_IGNORE_TAG,)) {
						slashInfo.lockon.entities.splice(i, 1,);
						i--;
						continue;
					}

					const targetHealthComp = entity.getComponent("health",);

					if (targetHealthComp?.currentValue == 0) {
						slashInfo.lockon.entities.splice(i, 1,);
						i--;
						continue;
					}

					entity.tryTeleport(slashInfo.lockon.entityLockLoc, { keepVelocity: false },);

					entity.applyDamage(1, {
						damagingEntity: this.player,
						cause: mc.EntityDamageCause.override,
					},);

					scp427_1_module.chainsawStun(entity,);

					if (i === 0 && targetHealthComp) {
						const targetName = getEntityName(entity,);

						const colorText = targetHealthComp.currentValue <= 0
							? "§c"
							: targetHealthComp.currentValue <= 30
							? mc.system.currentTick % 2 === 0
								? "§b"
								: "§d"
							: "§e";

						const currentHealth = Math.floor(targetHealthComp.currentValue,);
						const maxHealth = Math.floor(targetHealthComp.effectiveMax,);
						const healthText = `${currentHealth} / ${maxHealth}`;

						const actionbarText: mc.RawText = {
							rawtext: [
								{ text: colorText },
								{ rawtext: targetName.rawtext },
								{ text: " — ❤ " },
								{ text: healthText },
							],
						};

						this.player.onScreenDisplay.setActionBar(actionbarText,);
					}
				} catch {}
			}

			return true;
		}

		if (
			slashInfo.elapsedTicks >= slashInfo.slashTick &&
			slashInfo.elapsedTicks < slashInfo.slashTick + PARAM.slashDuration
		) {
			const hitEntities = this.getEntitiesInSlashRange();

			for (let i = 0; i < hitEntities.length; i++) {
				const entity = hitEntities[i]!;

				if (slashInfo.alreadyHitEntities.includes(entity,)) continue;

				const damaged = entity.applyDamage(
					getModifiedDamageNumber(PARAM.slashDirectDamage, entity,),
					{
						cause: mc.EntityDamageCause.override,
						damagingEntity: this.player,
					},
				);

				if (!damaged) continue;

				this.addNextDurabilityDamage(2,);

				scp427_1_module.chainsawStun(entity,);

				slashInfo.alreadyHitEntities.push(entity,);

				if (i > 2) continue;

				this.shakeCamera(0.13, 0.26, "rotational",);

				const critParticleLoc = vec3.midpoint(
					this.player.getHeadLocation(),
					entity.getHeadLocation(),
				);

				this.player.dimension.spawnParticle("lc:scpdy_slasher_spark_emitter", critParticleLoc,);

				mc.system.runTimeout(() => {
					this.playSoundAtExtHeadLocation("scpdy.slasher.critical", { volume: 1.2 },);
				}, i,);
			}
		}

		if (slashInfo.elapsedTicks === slashInfo.slashTick + 1) {
			beam.shootSlasherSlashBeam(this.player,);
			this.player.playAnimation("animation.scpdy_player.slasher.slash_end",);
		}

		if (slashInfo.elapsedTicks === slashInfo.slashTick + PARAM.slashDuration) {
			this.setCooldown(CD_NAME.slashAftertaste, PARAM.slashAftertasteDuration,);
			this.endSlash();
			return false;
		}

		return true;
	}

	private endSlash(): void {
		this.slashInfo = undefined;
	}
}
