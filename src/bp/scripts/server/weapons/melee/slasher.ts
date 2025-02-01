import * as mc from "@minecraft/server";
import * as vec3 from "@lib/utils/vec3";
import { canEntitySplashBlood, getEntityName } from "@lib/utils/entityUtils";
import { clamp, randomFloat, randomInt } from "@lib/utils/mathUtils";
import { isEntityDead } from "@lib/utils/entityUtils";
import { getModifiedDamageNumber } from "@lib/utils/entityUtils";
import { AdvancedItem, AdvancedItemBaseConstructorArgs } from "@server/advancedItem/AdvancedItem";
import { registerAdvancedItemProfile } from "@server/advancedItem/profileRegistry";
import * as scp427_1_module from "@server/scps/scp427/scp427_1";

const SLASH_TARGET_EXCLUDED_FAMILIES: string[] = ["projectile", "inanimate", "wind_charge"];
const SLASH_TARGET_EXCLUDED_TYPES: string[] = [
	"minecraft:item",
	"minecraft:xp_orb",
	"minecraft:arrow",
	"minecraft:fireball",
];
const SLASHER_IGNORE_TAG = "scpdy_ignore_slasher_capture";
const SLASH_TARGET_EXCLUDED_TAGS: string[] = [SLASHER_IGNORE_TAG];

function playChainsawStartSound(player: mc.Player): void {
	player.playSound("scpdy.slasher.chainsaw.start_2d");

	const nearbyPlayers = player.dimension.getPlayers({
		location: player.location,
		maxDistance: 20,
	});

	for (const player2 of nearbyPlayers) {
		if (player2 === player) continue;

		player2.playSound("scpdy.slasher.chainsaw.start", {
			location: player.getHeadLocation(),
			volume: 1.7,
		});
	}
}

function playChainsawLoopSound(player: mc.Player): void {
	player.playSound("scpdy.slasher.chainsaw.loop_2d");

	const nearbyPlayers = player.dimension.getPlayers({
		location: player.location,
		maxDistance: 20,
	});

	for (const player2 of nearbyPlayers) {
		if (player2 === player) continue;

		player2.playSound("scpdy.slasher.chainsaw.loop", {
			location: player.getHeadLocation(),
			volume: 1.7,
		});
	}
}

function playChainsawFinishSound(player: mc.Player): void {
	player.playSound("scpdy.slasher.chainsaw.finish_2d");

	const nearbyPlayers = player.dimension.getPlayers({
		location: player.location,
		maxDistance: 20,
	});

	for (const player2 of nearbyPlayers) {
		if (player2 === player) continue;

		player2.playSound("scpdy.slasher.chainsaw.finish", {
			location: player2.getHeadLocation(),
			volume: 1.7,
		});
	}
}

function playSlashSound(player: mc.Player): void {
	player.playSound("scpdy.slasher.slash_2d");

	const nearbyPlayers = player.dimension.getPlayers({
		location: player.location,
		maxDistance: 20,
	});

	for (const player2 of nearbyPlayers) {
		if (player2 === player) continue;

		player2.playSound("scpdy.slasher.slash", {
			location: player2.getHeadLocation(),
			volume: 3.0,
		});
	}
}

class Slasher extends AdvancedItem {
	private _chargeData?: ChargeData;
	private _slashData?: SlashData;

	constructor(ars: AdvancedItemBaseConstructorArgs) {
		super(ars);

		ars.player.startItemCooldown("scpdy_slasher_pick", 2);
	}

	onTick(mainhandItemStack: mc.ItemStack): void {
		const durabilityComp = mainhandItemStack.getComponent("durability")!;
		if (durabilityComp.damage >= durabilityComp.maxDurability - 1) {
			this.player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.slasher.needsRepair",
			});
			return;
		}

		if (this._slashData) {
			this.onTickSlash();
		} else if (this._chargeData) {
			this.onTickCharge();
		} else {
			// Apply durability damage

			const durabilityDamageToApply = this.nextSlasherDurabilityDamage;

			if (durabilityDamageToApply > 0) {
				this.nextSlasherDurabilityDamage = 0;

				if (this.player.getGameMode() === mc.GameMode.creative) return;

				durabilityComp.damage = Math.min(
					durabilityComp.damage + durabilityDamageToApply,
					durabilityComp.maxDurability - 1,
				);

				this.playerMainhand.setItem(mainhandItemStack);
			}
		}
	}

	get nextSlasherDurabilityDamage(): number {
		const value = this.player.getDynamicProperty("nextSlasherDurabilityDamage");
		if (typeof value !== "number") return 0;
		return value;
	}

	set nextSlasherDurabilityDamage(value: number) {
		value = Math.floor(value);
		const value2 = value <= 0 ? undefined : value;
		this.player.setDynamicProperty("nextSlasherDurabilityDamage", value2);
	}

	onRemove(): void {
		this.cancelCharge();
		this.cancelSlash();
	}

	isUsable(event: mc.ItemStartUseAfterEvent): boolean {
		const durabilityComp = event.itemStack.getComponent("durability")!;
		if (durabilityComp.damage >= durabilityComp.maxDurability - 1) return false;
		return true;
	}

	onStartUse(event: mc.ItemStartUseAfterEvent): void {
		if (this._slashData) return;
		if (this.player.getItemCooldown("scpdy_slasher_prevent_charge_cd")) return;

		this._chargeData = {
			chargeTick: 0,
		};
	}

	onStopUse(event: mc.ItemStopUseAfterEvent): void {
		if (!this._chargeData) return;

		if (this._chargeData.chargeTick < 6) {
			this.cancelCharge();
			return;
		}

		this.fullyCharged();
	}

	onSwingArm(): void {
		const slasherItem = this.playerMainhand.getItem();
		if (!slasherItem || slasherItem.typeId !== this.profile.itemTypeId) return;
		const durabilityComp = slasherItem.getComponent("durability")!;
		if (durabilityComp.damage >= durabilityComp.maxDurability - 1) return;

		if (this._chargeData) return;
		if (this._slashData) return;
		if (this.player.getItemCooldown("scpdy_slasher_prevent_swing_cd") > 0) return;

		this.player.startItemCooldown("scpdy_slasher_swing_cd_hit", 6);
		this.onAttack();
	}

	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {
		const slasherItem = this.playerMainhand.getItem();
		if (!slasherItem || slasherItem.typeId !== this.profile.itemTypeId) return;
		const durabilityComp = slasherItem.getComponent("durability")!;
		if (durabilityComp.damage >= durabilityComp.maxDurability - 1) return;

		if (this._chargeData) return;
		if (this._slashData) return;
		if (this.player.getItemCooldown("scpdy_slasher_prevent_swing_cd") > 0) return;

		this.player.startItemCooldown("scpdy_slasher_swing_cd_hit", 6);
		this.onAttack(event.hitEntity);
	}

	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {
		const slasherItem = this.playerMainhand.getItem();
		if (!slasherItem || slasherItem.typeId !== this.profile.itemTypeId) return;
		const durabilityComp = slasherItem.getComponent("durability")!;
		if (durabilityComp.damage >= durabilityComp.maxDurability - 1) return;

		if (this._chargeData) return;
		if (this._slashData) return;
		if (this.player.getItemCooldown("scpdy_slasher_prevent_swing_cd") > 0) return;

		this.player.startItemCooldown("scpdy_slasher_swing_cd_hit", 6);
		this.onAttack();
	}

	private onAttack(hitEntity?: mc.Entity): void {
		this.player.dimension.playSound("scpdy.slasher.swing", this.player.getHeadLocation(), {
			volume: 1.4,
			pitch: randomFloat(0.97, 1.03),
		});

		this.player.runCommandAsync("camerashake add @s 0.08 0.1 rotational");
		this.player.startItemCooldown("scpdy_slasher_prevent_charge_cd", 12);
		this.player.startItemCooldown("scpdy_slasher_prevent_swing_cd", 4);

		if (this.player.getItemCooldown("scpdy_slasher_swing_cd_2") > 0) {
			this.player.startItemCooldown("scpdy_slasher_swing_cd_3", 15);
			this.player.startItemCooldown("scpdy_slasher_swing_cd_2", 0);
			this.swingAttackDamage(1, hitEntity);
			return;
		}

		if (this.player.getItemCooldown("scpdy_slasher_swing_cd_3") > 0) {
			this.player.startItemCooldown("scpdy_slasher_swing_cd_2", 15);
			this.player.startItemCooldown("scpdy_slasher_swing_cd_3", 0);
			this.swingAttackDamage(1, hitEntity);
			return;
		}

		if (this.player.getItemCooldown("scpdy_slasher_swing_cd_1") > 0) {
			this.player.startItemCooldown("scpdy_slasher_swing_cd_2", 15);
			this.player.startItemCooldown("scpdy_slasher_swing_cd_1", 0);
			this.swingAttackDamage(1, hitEntity);
			return;
		}

		this.player.startItemCooldown("scpdy_slasher_swing_cd_1", 15);
		this.swingAttackDamage(0, hitEntity);
	}

	private swingAttackDamage(type: number, hitEntity?: mc.Entity): void {
		const slasherItem = this.playerMainhand.getItem();

		if (!slasherItem || slasherItem.typeId !== this.profile.itemTypeId) return;

		const durabilityComp = slasherItem.getComponent("durability")!;

		let entities: mc.Entity[];

		if (type === 0) {
			entities = this.player
				.getEntitiesFromViewDirection({
					maxDistance: 4,
				})
				.map((x) => x.entity);
		} else if (type === 1) {
			entities = this.player.dimension.getEntities({
				maxDistance: 3,
				closest: 5,
				location: vec3.add(this.player.getHeadLocation(), this.player.getViewDirection()),
			});
		} else {
			entities = [];
		}

		try {
			for (const entity of entities) {
				if (entity === this.player) continue;
				if (entity instanceof mc.Player && !mc.world.gameRules.pvp) continue;

				const isFirstHitEntity = entity === hitEntity;

				const damaged = entity.applyDamage(getModifiedDamageNumber(6, entity), {
					cause: isFirstHitEntity
						? mc.EntityDamageCause.override
						: mc.EntityDamageCause.entityAttack,
					damagingEntity: isFirstHitEntity ? undefined : this.player,
				});

				if (damaged && this.player.getGameMode() !== mc.GameMode.creative) {
					durabilityComp.damage = Math.min(
						durabilityComp.damage + 2,
						durabilityComp.maxDurability - 1,
					);
				}
			}

			this.playerMainhand.setItem(slasherItem);
		} catch {}
	}

	private cancelCharge(): void {
		if (!this._chargeData) return;

		this._chargeData = undefined;

		this.player.startItemCooldown("scpdy_slasher_prevent_charge_cd", 3);
		this.player.startItemCooldown("scpdy_slasher_charge_cancel_cd", 2);
		this.player.onScreenDisplay.setActionBar("§8---");
	}

	private cancelSlash(): void {
		this._slashData = undefined;
	}

	private fullyCharged(): void {
		const player = this.player;

		this._chargeData = undefined;

		player.startItemCooldown("scpdy_slasher_prevent_charge_cd", 20);

		player.onScreenDisplay.setActionBar("§c<+>");

		mc.system.runTimeout(() => {
			player.onScreenDisplay.setActionBar("§c< + >");
		}, 1);

		mc.system.runTimeout(() => {
			player.onScreenDisplay.setActionBar("§c<  +  >");
		}, 2);

		this._slashData = {
			totalTick: 0,
			nextCritParticleTick: 0,
		};
	}

	private onTickCharge(): void {
		const chargeData = this._chargeData!;

		if (mc.system.currentTick % 2 === 0) {
			this.player.addEffect("weakness", 3, {
				amplifier: 255,
				showParticles: false,
			});
		}

		if (chargeData.chargeTick === 0) {
			this.player.startItemCooldown("scpdy_slasher_charge_start_cd", 2);
			this.player.playAnimation("animation.scpdy_player.slasher.charge_start");

			this.player.onScreenDisplay.setActionBar("§c>      +      <");
		} else if (chargeData.chargeTick === 1) {
			this.player.onScreenDisplay.setActionBar("§c>     +     <");
		} else if (chargeData.chargeTick === 2) {
			this.player.onScreenDisplay.setActionBar("§c>    +    <");
		} else if (chargeData.chargeTick === 3) {
			this.player.onScreenDisplay.setActionBar("§c>   +   <");
		} else if (chargeData.chargeTick === 4) {
			this.player.onScreenDisplay.setActionBar("§c>  +  <");
		} else if (chargeData.chargeTick === 5) {
			this.player.onScreenDisplay.setActionBar("§c> + <");
		} else if (chargeData.chargeTick >= 6) {
			if (chargeData.chargeTick % 2 === 0) {
				this.player.onScreenDisplay.setActionBar("§b>+<");
			} else {
				this.player.onScreenDisplay.setActionBar("§d>+<");
			}

			this.player.playAnimation("animation.scpdy_player.slasher.charge_hold");
		}

		if (chargeData.chargeTick === 0 || chargeData.chargeTick % 8 === 0) {
			this.player.dimension.playSound("scpdy.slasher.charge_loop", this.player.getHeadLocation(), {
				volume: 1.3,
			});
		}

		chargeData.chargeTick++;
	}

	private onTickSlash(): void {
		const slashData = this._slashData!;

		let playerHeadLoc = this.player.getHeadLocation();
		let playerViewDir = this.player.getViewDirection();

		if (slashData.totalTick === 0) {
			this.player.startItemCooldown("scpdy_slasher_slash_start_cd", 2);
			this.player.playAnimation("animation.scpdy_player.slasher.slash_start");
			playChainsawStartSound(this.player);
		}

		if (slashData.totalTick === 11) {
			playSlashSound(this.player);

			mc.system.run(() => {
				this.player.dimension.playSound("scpdy.slasher.dash", this.player.location, {
					volume: 1.3,
				});
			});

			this.player.clearVelocity();

			const force = vec3.clone(playerViewDir);

			if (this.player.isSneaking) {
				this.player.applyKnockback(force.x, force.z, 3.2, 0.1);
			} else {
				const forceMultiplier = this.player.isOnGround ? 2.5 : 2.0;

				force.x *= forceMultiplier;
				force.y = clamp(force.y * (forceMultiplier / 2), -4, 4);
				force.z *= forceMultiplier;

				this.player.applyImpulse(force);
			}
		}

		if (!slashData.lockonTarget && slashData.totalTick >= 10 && slashData.totalTick <= 14) {
			const velocityLength = vec3.length(this.player.getVelocity());

			const raycastHits = this.player.getEntitiesFromViewDirection({
				excludeFamilies: SLASH_TARGET_EXCLUDED_FAMILIES,
				excludeTypes: SLASH_TARGET_EXCLUDED_TYPES,
				excludeTags: SLASH_TARGET_EXCLUDED_TAGS,
				maxDistance: velocityLength * 2,
			});

			const nearbyEntities = this.player.dimension.getEntities({
				excludeFamilies: SLASH_TARGET_EXCLUDED_FAMILIES,
				excludeTypes: SLASH_TARGET_EXCLUDED_TYPES,
				excludeTags: SLASH_TARGET_EXCLUDED_TAGS,
				maxDistance: 2.0,
				closest: 5,
				location: vec3.add(playerHeadLoc, playerViewDir),
			});

			const hitEntities: mc.Entity[] = [];

			function addHitEntityIfValid(player: mc.Player, entity?: mc.Entity): void {
				if (!entity) return;
				if (entity.id === player.id) return;
				if (entity instanceof mc.Player) {
					if (!mc.world.gameRules.pvp) return;
					if ([mc.GameMode.creative, mc.GameMode.spectator].includes(entity.getGameMode())) return;
				}

				hitEntities.push(entity);
			}

			for (let i = 0; i < raycastHits.length; i++) {
				const hit = raycastHits[i];
				addHitEntityIfValid(this.player, hit?.entity);
			}

			for (let i = 0; i < nearbyEntities.length; i++) {
				const entity = nearbyEntities[i];
				addHitEntityIfValid(this.player, entity);
			}

			// Damage

			for (let i = 0; i < hitEntities.length; i++) {
				try {
					const entity = hitEntities[i]!;

					scp427_1_module.chainsawStun(entity);

					const damaged = entity.applyDamage(16, {
						cause: mc.EntityDamageCause.entityAttack,
						damagingEntity: this.player,
					});

					if (damaged) {
						const sparkParticleLoc = vec3.midpoint(playerHeadLoc, entity.getHeadLocation());

						entity.dimension.spawnParticle("lc:scpdy_slasher_spark_emitter", sparkParticleLoc);

						if (canEntitySplashBlood(entity)) {
							entity.dimension.spawnParticle(
								"lc:scpdy_blood_splash_emitter",
								entity.getHeadLocation(),
							);
						}

						entity.dimension.playSound("scpdy.slasher.critical", entity.location, {
							volume: 1.2,
						});

						this.nextSlasherDurabilityDamage += 3;
					}

					if (this.isBeingUsed) {
						if (mc.system.currentTick % 8 !== 0) playChainsawLoopSound(this.player);

						this.player.startItemCooldown("scpdy_slasher_slash_hold_cd", 2);
						this.player.playAnimation("animation.scpdy_player.slasher.slash_hold");

						slashData.lockonTarget = entity;
						slashData.lockonTargetLoc = entity.location;

						const lockonRelativeLoc = vec3
							.chain(this.player.location)
							.sub(entity.location)
							.normalize()
							.add(entity.location)
							.done();

						this.player.teleport(lockonRelativeLoc, {});

						slashData.lockonPlayerLoc = lockonRelativeLoc;
						slashData.lockonPlayerRot = this.player.getRotation();

						slashData.nextCritParticleTick = slashData.totalTick + randomInt(1, 2);

						entity.clearVelocity();
					} else {
						this.player.runCommandAsync("camerashake add @s 0.6 0.12 positional");
					}
				} catch {}
			}
		}

		if (!slashData.lockonTarget && slashData.totalTick >= 14) {
			this.finishSlash();
			return;
		}

		if (slashData.lockonTarget) {
			if (!this.isBeingUsed) {
				playChainsawFinishSound(this.player);
				playSlashSound(this.player);
				this.finishSlash();
				return;
			}

			if (!slashData.lockonTarget.isValid()) {
				playChainsawFinishSound(this.player);
				playSlashSound(this.player);
				slashData.lockonTarget = undefined;
				this.finishSlash();
				return;
			}

			if (isEntityDead(slashData.lockonTarget)) {
				playChainsawFinishSound(this.player);
				playSlashSound(this.player);
				this.finishSlash();
				return;
			}

			if (slashData.lockonTarget.hasTag(SLASHER_IGNORE_TAG)) {
				playChainsawFinishSound(this.player);
				playSlashSound(this.player);
				slashData.lockonTarget = undefined;
				this.finishSlash();
				return;
			}

			this.player.teleport(slashData.lockonPlayerLoc!, {
				rotation: slashData.lockonPlayerRot!,
			});

			if (mc.system.currentTick % 8 === 0) {
				playChainsawLoopSound(this.player);
			}

			if (mc.system.currentTick % 3 === 0) {
				this.player.playAnimation("animation.scpdy_player.slasher.slash_hold");
			}

			playerHeadLoc = this.player.getHeadLocation();
			playerViewDir = this.player.getViewDirection();

			if (slashData.nextCritParticleTick === slashData.totalTick) {
				const sparkParticleLoc = vec3
					.chain(vec3.FORWARD)
					.mul(0.35)
					.changeDir(playerViewDir)
					.add(playerHeadLoc)
					.done();

				if (Math.random() > 0.5) {
					slashData.lockonTarget.dimension.playSound(
						"scpdy.slasher.critical",
						slashData.lockonTarget.location,
						{
							volume: 1.2,
						},
					);
				}

				slashData.nextCritParticleTick = slashData.nextCritParticleTick + randomInt(2, 6);
				this.player.dimension.spawnParticle("lc:scpdy_slasher_spark_emitter", sparkParticleLoc);
			}

			this.player.runCommandAsync("camerashake add @s 0.09 0.13 rotational");

			scp427_1_module.chainsawStun(slashData.lockonTarget);

			try {
				const damaged = slashData.lockonTarget.applyDamage(1, {
					cause: mc.EntityDamageCause.override,
				});

				if (damaged) {
					if (canEntitySplashBlood(slashData.lockonTarget)) {
						this.player.dimension.spawnParticle(
							"lc:scpdy_blood_splash_emitter",
							slashData.lockonTarget.getHeadLocation(),
						);
					}

					this.nextSlasherDurabilityDamage += 1;
				}
			} catch {}

			slashData.lockonTarget.tryTeleport(
				slashData.lockonTargetLoc ?? slashData.lockonTarget.location,
				{
					keepVelocity: false,
				},
			);

			const targetHealthComp = slashData.lockonTarget.getComponent("health");

			if (targetHealthComp) {
				const targetName = getEntityName(slashData.lockonTarget);

				const colorText =
					targetHealthComp.currentValue <= 0
						? "§c"
						: targetHealthComp.currentValue <= 30
						? mc.system.currentTick % 2 === 0
							? "§b"
							: "§d"
						: "§e";

				const currentHealth = Math.floor(targetHealthComp.currentValue);
				const maxHealth = Math.floor(targetHealthComp.effectiveMax);
				const healthText = `${currentHealth} / ${maxHealth}`;

				const actionbarText: mc.RawText = {
					rawtext: [
						{ text: colorText },
						{ rawtext: targetName.rawtext },
						{ text: " — ❤ " },
						{ text: healthText },
					],
				};

				this.player.onScreenDisplay.setActionBar(actionbarText);
			}
		}

		slashData.totalTick++;
	}

	private finishSlash(): void {
		const playerViewDir = this.player.getViewDirection();

		if (this._slashData?.lockonTarget) {
			const lockonEntityBlowForce = vec3
				.chain(vec3.FORWARD)
				.mul(2.0)
				.changeDir(playerViewDir)
				.done();

			this._slashData.lockonTarget.applyImpulse(lockonEntityBlowForce);
			this._slashData.lockonTarget = undefined;
		}

		this._slashData = undefined;

		this.player.startItemCooldown("scpdy_slasher_prevent_charge_cd", 4);
		this.player.startItemCooldown("scpdy_slasher_slash_finish_cd", 2);
		this.player.playAnimation("animation.scpdy_player.slasher.slash_finish");

		let i = 0;

		const runId = mc.system.runInterval(() => {
			if (i > 3) {
				mc.system.clearRun(runId);
				return;
			}

			const entities = [
				...this.player
					.getEntitiesFromViewDirection({
						excludeFamilies: SLASH_TARGET_EXCLUDED_FAMILIES,
						excludeTypes: SLASH_TARGET_EXCLUDED_TYPES,
						maxDistance: 2.5,
					})
					.map((hit) => hit.entity),
				...this.player.dimension.getEntities({
					excludeFamilies: SLASH_TARGET_EXCLUDED_FAMILIES,
					excludeTypes: SLASH_TARGET_EXCLUDED_TYPES,
					maxDistance: 1.5,
					closest: 5,
					location: vec3.add(this.player.getHeadLocation(), playerViewDir),
				}),
			];

			for (const entity of entities) {
				if (entity === this.player) continue;
				if (entity.typeId === "minecraft:player" && !mc.world.gameRules.pvp) continue;

				entity.applyDamage(3, {
					cause: mc.EntityDamageCause.entityAttack,
					damagingEntity: this.player,
				});
			}

			i++;
		}, 1);
	}
}

type ChargeData = {
	chargeTick: number;
};

type SlashData = {
	totalTick: number;
	nextCritParticleTick: number;
	lockonTarget?: mc.Entity;
	lockonTargetLoc?: mc.Vector3;
	lockonPlayerLoc?: mc.Vector3;
	lockonPlayerRot?: mc.Vector2;
};

registerAdvancedItemProfile({
	itemTypeId: "lc:scpdy_slasher",
	createInstance: (args) => new Slasher(args),
});

mc.world.beforeEvents.worldInitialize.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:slasher", {
		onBeforeDurabilityDamage(arg) {
			arg.durabilityDamage = 0;
		},
	});
});
