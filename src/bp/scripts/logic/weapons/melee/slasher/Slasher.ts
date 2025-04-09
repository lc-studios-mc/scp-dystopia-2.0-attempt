import { getEntityName, getModifiedDamageNumber } from "@lib/utils/entityUtils";
import { randomFloat, randomInt } from "@lib/utils/mathUtils";
import * as vec3 from "@lib/utils/vec3";
import { AdvancedItem, AdvancedItemBaseConstructorArgs } from "@logic/advancedItem/AdvancedItem";
import { registerAdvancedItemProfile } from "@logic/advancedItem/profileRegistry";
import * as scp427_1_module from "@logic/scps/scp427/scp427_1";
import * as mc from "@minecraft/server";
import * as beam from "./beam";

function shakeCamera(
	player: mc.Player,
	intensity: number,
	seconds: number,
	shakeType: "positional" | "rotational" = "rotational",
): void {
	player.runCommand(
		`camerashake add @s ${intensity.toFixed(2)} ${seconds.toFixed(2)} ${shakeType}`,
	);
}

const isPlayerImmune = (player: mc.Player): boolean =>
	[mc.GameMode.creative, mc.GameMode.spectator].includes(player.getGameMode());

registerAdvancedItemProfile({
	itemTypeId: "lc:scpdy_slasher",
	createInstance: (args) => new Slasher(args),
});

class Slasher extends AdvancedItem {
	private currentState: SlasherState;

	constructor(args: AdvancedItemBaseConstructorArgs) {
		super(args);
		args.player.startItemCooldown("scpdy_slasher_pick", 2);

		this.currentState = new IdleState(this);
	}

	transitionTo(newState: SlasherState): void {
		this.currentState.onExit();
		this.currentState = newState;
		this.currentState.onEnter();
	}

	getHeadFrontLocation(): mc.Vector3 {
		return vec3.add(this.player.getHeadLocation(), this.player.getViewDirection());
	}

	playSoundAtHeadFront(soundId: string, opts?: mc.WorldSoundOptions): void {
		this.player.dimension.playSound(soundId, this.getHeadFrontLocation(), opts);
	}

	playSound3DAnd2D(soundId: string, maxDist = 15, opts?: mc.PlayerSoundOptions): void {
		const soundId2D = `${soundId}.2d`;
		this.player.playSound(soundId2D, opts);

		const listeners = this.player.dimension.getPlayers({
			location: this.player.getHeadLocation(),
			maxDistance: maxDist,
		});

		for (const listener of listeners) {
			if (listener === this.player) continue;

			listener.playSound(soundId, {
				location: this.player.getHeadLocation(),
				pitch: opts?.pitch,
				volume: opts?.volume,
			});
		}
	}

	getCooldown(id: string): number {
		return this.player.getItemCooldown(id);
	}

	setCooldown(id: string, duration = 2): void {
		this.player.startItemCooldown(id, duration);
	}

	getNextDurabilityDamage(): number | undefined {
		const value = this.player.getDynamicProperty("nextSlasherDurabilityDamage");
		if (typeof value !== "number") return;
		return Math.floor(value);
	}

	setNextDurabilityDamage(value?: number | undefined) {
		this.player.setDynamicProperty(
			"nextSlasherDurabilityDamage",
			value == undefined || value <= 0 ? undefined : Math.floor(value),
		);
	}

	addNextDurabilityDamage(value: number): void {
		let current = this.getNextDurabilityDamage();
		if (typeof current !== "number") current = 0;
		this.setNextDurabilityDamage(current + Math.floor(value));
	}

	getCurrentDurability(durabilityComp: mc.ItemDurabilityComponent): number {
		return durabilityComp.maxDurability - durabilityComp.damage;
	}

	isNeedingRepair(durabilityComp: mc.ItemDurabilityComponent): boolean {
		return durabilityComp.damage >= durabilityComp.maxDurability;
	}

	processNextDurabilityDamage(durabilityComp: mc.ItemDurabilityComponent): boolean {
		const nextDurabilityDamage = this.getNextDurabilityDamage();
		if (nextDurabilityDamage == undefined) return false;

		this.setNextDurabilityDamage(undefined);

		if (this.player.getGameMode() === mc.GameMode.creative) return false;
		if (this.isNeedingRepair(durabilityComp)) return false;

		const newDamage = Math.min(this.getCurrentDurability(durabilityComp), nextDurabilityDamage);

		durabilityComp.damage += newDamage;

		return true;
	}

	getDurabilityComp(slasherItem: mc.ItemStack): mc.ItemDurabilityComponent {
		const comp = slasherItem.getComponent("durability");
		if (!comp) throw new Error("Durability component does not exist");
		return comp;
	}

	onTick(mainhandItemStack: mc.ItemStack): void {
		this.currentState.onTick(mainhandItemStack);
	}

	onRemove(): void {}

	isUsable(event: mc.ItemStartUseAfterEvent): boolean {
		if (this.isNeedingRepair(this.getDurabilityComp(event.itemStack))) return false;
		return this.currentState.isUsable(event);
	}

	onStartUse(event: mc.ItemStartUseAfterEvent): void {
		this.currentState.onStartUse(event);
	}

	onStopUse(event: mc.ItemStopUseAfterEvent): void {
		this.currentState.onStopUse(event);
	}

	onSwingArm(): void {
		this.currentState.onSwingArm();
	}

	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {
		this.currentState.onHitEntity(event);
	}

	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {
		this.currentState.onHitBlock(event);
	}
}

abstract class SlasherState {
	protected readonly slasher: Slasher;
	private _currentTick = -1;

	constructor(slasher: Slasher) {
		this.slasher = slasher;
	}

	get currentTick(): number {
		return this._currentTick;
	}

	// Lifetime methods
	onEnter(): void {}
	onExit(): void {}
	onTick(mainhandItemStack: mc.ItemStack): void {
		this._currentTick++;
	}

	// Event handlers
	isUsable(event: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}
	onStartUse(event: mc.ItemStartUseAfterEvent): void {}
	onStopUse(event: mc.ItemStopUseAfterEvent): void {}
	onSwingArm(): void {}
	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {}
	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {}
}

class IdleState extends SlasherState {
	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		if (this.slasher.isBeingUsed) {
			this.slasher.transitionTo(new ChargingState(this.slasher));
			return;
		}

		const durabilityComp = this.slasher.getDurabilityComp(mainhandItemStack);

		if (this.slasher.isNeedingRepair(durabilityComp)) {
			this.slasher.player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.slasher.needsRepair",
			});
		}

		if (this.slasher.processNextDurabilityDamage(durabilityComp)) {
			this.slasher.playerMainhand.setItem(mainhandItemStack);
			return;
		}
	}

	override onSwingArm(): void {
		this.slasher.transitionTo(new SwingAttackState(this.slasher));
	}
}

class SwingAttackState extends SlasherState {
	private static readonly DAMAGE = 2;
	private static readonly COOLDOWN = 3;
	private static readonly STATE_LIFESPAN = 10;

	private ticksUntilExitState = SwingAttackState.STATE_LIFESPAN;
	private cooldown = 0;
	private isNextSwingQueued = false;
	private nextAnimIndex = 0;

	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		if (this.ticksUntilExitState <= 0) {
			this.slasher.transitionTo(new IdleState(this.slasher));
			return;
		}

		this.ticksUntilExitState--;

		if (this.cooldown > 0) this.cooldown--;
		else if (this.cooldown <= 0 && this.isNextSwingQueued) {
			this.isNextSwingQueued = false;
			this.swingAttack();
		}
	}

	override onEnter(): void {
		this.swingAttack();
	}

	override onSwingArm(): void {
		if (this.cooldown > 0) {
			this.isNextSwingQueued = true;
			return;
		}

		this.swingAttack();
	}

	private swingAttack(): void {
		this.ticksUntilExitState = SwingAttackState.STATE_LIFESPAN;
		this.cooldown += SwingAttackState.COOLDOWN;

		this.slasher.playSoundAtHeadFront("scpdy.slasher.swing", { volume: 1.1 });

		const animSwingCd1 = `scpdy_slasher_swing_cd_1`;
		const animSwingCd2 = `scpdy_slasher_swing_cd_2`;

		if (this.nextAnimIndex === 0) {
			this.slasher.setCooldown(animSwingCd1, 10);
			this.slasher.setCooldown(animSwingCd2, 0);

			this.nextAnimIndex = 1;
		} else {
			this.slasher.setCooldown(animSwingCd2, 10);
			this.slasher.setCooldown(animSwingCd1, 0);

			this.nextAnimIndex = 0;
		}

		shakeCamera(this.slasher.player, 0.05, 0.09);

		const mainhandItem = this.slasher.playerMainhand.getItem()!;
		const durabilityComp = this.slasher.getDurabilityComp(mainhandItem);
		if (this.slasher.isNeedingRepair(durabilityComp)) return;

		this.shootBeams();

		mc.system.run(() => {
			this.simulateSwingDamage();
		});
	}

	private shootBeams(): void {
		beam.shootSlasherSwingBeam(this.slasher.player, -1);
		beam.shootSlasherSwingBeam(this.slasher.player, 0);
		beam.shootSlasherSwingBeam(this.slasher.player, 1);
	}

	private simulateSwingDamage(): void {
		const entities = this.slasher.player.dimension.getEntities({
			closest: 10,
			maxDistance: 2.2,
			location: this.slasher.getHeadFrontLocation(),
		});

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]!;
			if (entity === this.slasher.player) continue;
			if (entity instanceof mc.Player) {
				if (!mc.world.gameRules.pvp) continue;
				if (isPlayerImmune(entity)) continue;
			}

			const damage = Math.max(1, getModifiedDamageNumber(SwingAttackState.DAMAGE, entity));

			const damaged = entity.applyDamage(damage, {
				cause: mc.EntityDamageCause.override,
				damagingEntity: this.slasher.player,
			});

			if (!damaged) continue;

			this.slasher.addNextDurabilityDamage(1);
		}
	}
}

class ChargingState extends SlasherState {
	private static readonly FULL_CHARGE_DURATION = 4;

	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		const durabilityComp = this.slasher.getDurabilityComp(mainhandItemStack);
		if (this.slasher.isNeedingRepair(durabilityComp)) {
			this.slasher.transitionTo(new IdleState(this.slasher));
			return;
		}

		if (this.slasher.processNextDurabilityDamage(durabilityComp)) {
			this.slasher.playerMainhand.setItem(mainhandItemStack);
			return;
		}

		const chargeUIMap = [
			"§c>    X    <",
			"§c>   X   <",
			"§c>  X  <",
			"§c> X <",
			"§c>X<",
		];

		if (this.currentTick < ChargingState.FULL_CHARGE_DURATION) {
			this.slasher.player.onScreenDisplay.setActionBar(chargeUIMap[this.currentTick] ?? "");
		} else {
			// Flashy colors for fully charged
			this.slasher.player.onScreenDisplay.setActionBar(
				this.currentTick % 2 === 0 ? "§e>X<" : "§b>X<",
			);
		}

		if (this.currentTick === 0) {
			this.slasher.setCooldown("scpdy_slasher_charge_start_cd");
			this.slasher.player.playAnimation("animation.scpdy_player.slasher.charge_start");
		}

		if (this.currentTick > 0 && this.currentTick % 6 === 0) {
			this.slasher.player.playAnimation("animation.scpdy_player.slasher.charge_hold");
		}

		if (this.currentTick % 8 === 0) {
			this.slasher.playSoundAtHeadFront("scpdy.slasher.charge_loop");
		}
	}

	override onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		if (this.currentTick < ChargingState.FULL_CHARGE_DURATION) this.cancelCharge();
		else this.releaseFullCharge();
	}

	private cancelCharge(): void {
		this.slasher.setCooldown("scpdy_slasher_charge_cancel_cd");
		this.slasher.transitionTo(new IdleState(this.slasher));

		this.slasher.player.onScreenDisplay.setActionBar("§8---");
	}

	private releaseFullCharge(): void {
		const plunge = !this.slasher.player.isOnGround && this.slasher.player.getRotation().x > 65 &&
			this.slasher.player.inputInfo.getButtonState(mc.InputButton.Jump) === mc.ButtonState.Pressed;

		if (plunge) {
			this.slasher.transitionTo(new PlungeWindupState(this.slasher));
			return;
		}

		this.slasher.transitionTo(new SlashingState(this.slasher));
	}
}

class SlashingState extends SlasherState {
	private static readonly GROUND_DASH_DURATION = 2;
	private static readonly AIR_DASH_DURATION = 4;
	private static readonly SLASH_DAMAGING_DURATION = 4;
	public static readonly SLASH_REDOABLE_DURATION = 5;
	public static readonly FULL_SLASH_DURATION = 10;
	private static readonly DIRECT_SLASH_DAMAGE = 19;

	private static readonly LOCKON_EXCLUDED_FAMILIES: string[] = [
		"projectile",
		"inanimate",
		"scp096",
		"scp682",
	];
	private static readonly LOCKON_EXCLUDED_TYPES: string[] = [
		"minecraft:xp_orb",
		"minecraft:arrow",
		"minecraft:fireball",
		"minecraft:ender_dragon",
		"minecraft:wither",
	];
	public static readonly LOCKON_IGNORE_TAG = "scpdy_ignore_slasher_capture";
	private static readonly LOCKON_EXCLUDED_TAGS = [SlashingState.LOCKON_IGNORE_TAG];

	private slashTick = 0;
	private alreadySlashedEntities: mc.Entity[] = [];

	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		if (this.currentTick % 2 === 0) {
			this.slasher.player.addEffect("weakness", 3, {
				amplifier: 255,
				showParticles: false,
			});
		}

		if (this.currentTick === 0) {
			this.onFirstTick();
			this.chargeReleaseActionbarAnim();
		}

		if (this.currentTick === this.slashTick) {
			this.onSlash();
		} else if (this.currentTick === this.slashTick + 1) {
			shakeCamera(this.slasher.player, 0.08, 0.1);
			this.slasher.player.playAnimation("animation.scpdy_player.slasher.slash_end");
			beam.shootSlasherSlashBeam(this.slasher.player);
		}

		if (
			this.currentTick > this.slashTick &&
			this.currentTick <= SlashingState.SLASH_DAMAGING_DURATION + this.slashTick
		) {
			this.simulateSlashDamaging();
		}

		if (this.currentTick < this.slashTick) return;

		if (this.currentTick >= SlashingState.FULL_SLASH_DURATION + this.slashTick) {
			this.slasher.transitionTo(new IdleState(this.slasher));
			return;
		}

		if (
			this.slasher.isBeingUsed &&
			this.currentTick >= SlashingState.SLASH_REDOABLE_DURATION + this.slashTick
		) {
			this.slasher.transitionTo(new IdleState(this.slasher));
		}
	}

	private onFirstTick(): void {
		const dash = this.slasher.player.inputInfo.getMovementVector().y > 0.6;
		if (dash) {
			const isOnGround = this.slasher.player.isOnGround;

			this.slashTick = isOnGround
				? SlashingState.GROUND_DASH_DURATION
				: SlashingState.AIR_DASH_DURATION;

			this.slasher.setCooldown("scpdy_slasher_dash_cd");
			this.slasher.playSound3DAnd2D("scpdy.slasher.dash", 10, { volume: 1.3 });

			let dashImpulse = this.getDashImpulse();

			if (isOnGround) {
				dashImpulse.y = 0;
				dashImpulse = vec3.mul(vec3.normalize(dashImpulse), 4.8);
				this.slasher.player.applyKnockback(dashImpulse, 0.12);
			} else {
				this.slasher.player.applyImpulse(dashImpulse);
			}

			shakeCamera(this.slasher.player, 0.03, 0.13);
			this.slasher.player.playAnimation("animation.scpdy_player.slasher.dash_slash_start");
		} else {
			this.slasher.player.playAnimation("animation.scpdy_player.slasher.slash_start");
		}
	}

	private chargeReleaseActionbarAnim(): void {
		const uiFrames = [
			"<X>",
			"< X >",
			"<  X  >",
		];

		for (let i = 0; i < uiFrames.length; i++) {
			const uiFrame = uiFrames[i]!;

			mc.system.runTimeout(() => {
				this.slasher.player.onScreenDisplay.setActionBar(`§4${uiFrame}`);
			}, i);
		}
	}

	private getDashImpulse(): mc.Vector3 {
		return vec3
			.chain(vec3.FORWARD)
			.mul(2.2)
			.changeDir(this.slasher.player.getViewDirection())
			.done();
	}

	private onSlash(): void {
		const lockonCond = this.slasher.player.isSneaking;
		const lockonEntities = lockonCond ? this.getEntitiesInSlashRange(true) : [];

		if (lockonEntities.length > 0) {
			this.slasher.transitionTo(new LockonSlashingState(this.slasher, lockonEntities));
			return;
		}

		this.slasher.setCooldown("scpdy_slasher_slash_continue_cd", 3);
		this.slasher.setCooldown("scpdy_slasher_slash_start_cd");
		this.slasher.playSound3DAnd2D("scpdy.slasher.slash", 10, { volume: 1.3 });
	}

	private simulateSlashDamaging(): void {
		const entities = this.getEntitiesInSlashRange();

		if (entities.length <= 0) return;

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]!;

			if (this.alreadySlashedEntities.includes(entity)) continue;

			const damaged = entity.applyDamage(
				getModifiedDamageNumber(SlashingState.DIRECT_SLASH_DAMAGE, entity),
				{
					cause: mc.EntityDamageCause.override,
					damagingEntity: this.slasher.player,
				},
			);

			if (!damaged) continue;

			scp427_1_module.chainsawStun(entity);

			this.alreadySlashedEntities.push(entity);

			this.slasher.addNextDurabilityDamage(2);

			if (i > 2) continue;

			shakeCamera(this.slasher.player, 0.13, 0.26);

			const critParticleLoc = vec3.midpoint(
				this.slasher.player.getHeadLocation(),
				entity.getHeadLocation(),
			);

			this.slasher.player.dimension.spawnParticle(
				"lc:scpdy_slasher_spark_emitter",
				critParticleLoc,
			);

			mc.system.runTimeout(() => {
				this.slasher.playSoundAtHeadFront("scpdy.slasher.critical", { volume: 1.1 });
			}, i);
		}
	}

	private getEntitiesInSlashRange(lockon = false): mc.Entity[] {
		const headLoc = this.slasher.player.getHeadLocation();
		const viewDir = this.slasher.player.getViewDirection();
		const result: mc.Entity[] = [];

		const checkPositions = [
			{ z: 1.3, y: 0, maxDistance: 1.8 },
			{ z: 2.7, y: 0, maxDistance: 1.8 },
			{ z: 2.2, y: -1.4, maxDistance: 1.9 },
		];

		const candidates: mc.Entity[] = [];

		for (const pos of checkPositions) {
			const location = vec3.getRelativeToHead(headLoc, viewDir, {
				z: pos.z,
				y: pos.y ?? 0,
			});

			const entities = this.slasher.player.dimension.getEntities({
				closest: 5,
				maxDistance: pos.maxDistance,
				location,
				excludeFamilies: lockon ? SlashingState.LOCKON_EXCLUDED_FAMILIES : undefined,
				excludeTypes: lockon ? SlashingState.LOCKON_EXCLUDED_TYPES : undefined,
				excludeTags: lockon ? SlashingState.LOCKON_EXCLUDED_TAGS : undefined,
			});

			candidates.push(...entities);
		}

		for (const entity of candidates) {
			if (entity === this.slasher.player) continue;
			if (result.includes(entity)) continue;
			if (entity instanceof mc.Player) {
				if (!mc.world.gameRules.pvp) continue;
				if (isPlayerImmune(entity)) continue;
			}

			// Check if entity is actually visible via raycast
			const raycastHit = [
				...this.slasher.player.dimension.getEntitiesFromRay(
					this.slasher.player.getHeadLocation(),
					vec3.sub(entity.location, this.slasher.player.getHeadLocation()),
				),
				...this.slasher.player.dimension.getEntitiesFromRay(
					this.slasher.getHeadFrontLocation(),
					vec3.sub(entity.getHeadLocation(), this.slasher.player.getHeadLocation()),
				),
			];

			if (raycastHit.some((x) => x.entity === entity)) {
				result.push(entity);
			}
		}

		return result;
	}
}

class LockonSlashingState extends SlasherState {
	private endTick = -1;
	private playerLoc: mc.Vector3 = vec3.ZERO;
	private playerRot: mc.Vector2 = vec3.ZERO;
	private entityLockLoc: mc.Vector3 = vec3.ZERO;
	private nextCritParticleTick = 0;

	constructor(slasher: Slasher, private lockonEntities: mc.Entity[]) {
		super(slasher);

		this.slasher.setCooldown("scpdy_slasher_slash_hold_cd");
		this.slasher.setCooldown("scpdy_slasher_slash_start_cd");

		if (lockonEntities.length <= 0) {
			this.endTick = 0;
			return;
		}

		const entity = lockonEntities[0]!;

		const lockonRelativeLoc = vec3
			.chain(slasher.player.location)
			.sub(entity.location)
			.normalize()
			.add(entity.location)
			.done();

		slasher.player.teleport(lockonRelativeLoc, { facingLocation: entity.location });

		this.playerLoc = lockonRelativeLoc;
		this.playerRot = slasher.player.getRotation();
		this.entityLockLoc = lockonEntities[0]!.location;
		this.nextCritParticleTick = randomInt(1, 2);
		entity.clearVelocity();
	}

	override onEnter(): void {
		this.slasher.playSound3DAnd2D("scpdy.slasher.slash", 10, { volume: 1.3 });
	}

	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		if (this.endTick >= 0) {
			this.ending();
			return;
		}

		if (this.currentTick % 8 === 0) this.slasher.playSound3DAnd2D("scpdy.slasher.chainsaw.loop");

		const shouldStartEnding = this.lockonEntities.length <= 0 ||
			this.slasher.player.inputInfo.getButtonState(mc.InputButton.Sneak) ===
				mc.ButtonState.Released;

		if (shouldStartEnding) {
			this.blowOffLockonEntities();

			this.slasher.playSound3DAnd2D("scpdy.slasher.slash", 10, { volume: 1.3 });
			this.slasher.playSound3DAnd2D("scpdy.slasher.chainsaw.finish", 10, { volume: 1.3 });
			this.slasher.setCooldown("scpdy_slasher_slash_end_cd");
			this.slasher.player.playAnimation("animation.scpdy_player.slasher.slash_end");

			this.endTick = this.currentTick;
			return;
		}

		this.tickLockon();

		shakeCamera(this.slasher.player, 0.08, 0.1);
	}

	private ending(): void {
		if (this.currentTick >= SlashingState.FULL_SLASH_DURATION + this.endTick) {
			this.slasher.transitionTo(new IdleState(this.slasher));
			return;
		}

		if (
			this.slasher.isBeingUsed &&
			this.currentTick >= SlashingState.SLASH_REDOABLE_DURATION + this.endTick
		) {
			this.slasher.transitionTo(new IdleState(this.slasher));
		}
	}

	private blowOffLockonEntities(): void {
		if (this.lockonEntities.length <= 0) return;

		const impulse = vec3.mul(this.slasher.player.getViewDirection(), 2);

		for (let i = 0; i < this.lockonEntities.length; i++) {
			const entity = this.lockonEntities[i]!;
			entity.applyImpulse(impulse);
		}

		this.lockonEntities = [];
	}

	private tickLockon(): void {
		this.slasher.player.teleport(this.playerLoc, { rotation: this.playerRot });

		if (this.nextCritParticleTick === this.currentTick) {
			this.spawnCritParticle();
			this.nextCritParticleTick += randomInt(2, 6);
		}

		shakeCamera(this.slasher.player, 0.04, 0.13, "rotational");

		if (this.currentTick % 3 === 0) {
			this.slasher.player.playAnimation("animation.scpdy_player.slasher.slash_hold");
		}

		for (let i = 0; i < this.lockonEntities.length; i++) {
			const entity = this.lockonEntities[i]!;

			if (!entity.isValid || entity.hasTag(SlashingState.LOCKON_IGNORE_TAG)) {
				this.lockonEntities.splice(i, 1);
				i--;
				continue;
			}

			const targetHealthComp = entity.getComponent("health");

			if (targetHealthComp?.currentValue == 0) {
				this.lockonEntities.splice(i, 1);
				i--;
				continue;
			}

			entity.tryTeleport(this.entityLockLoc, { keepVelocity: false });

			entity.applyDamage(1, {
				cause: mc.EntityDamageCause.override,
				damagingEntity: this.slasher.player,
			});

			scp427_1_module.chainsawStun(entity);

			if (i === 0 && targetHealthComp) {
				this.displayEntityHealthInfo(targetHealthComp);
			}
		}
	}

	private spawnCritParticle(): void {
		const sparkParticleLoc = vec3
			.chain(vec3.FORWARD)
			.mul(0.45)
			.changeDir(this.slasher.player.getViewDirection())
			.add(this.slasher.player.getHeadLocation())
			.done();

		this.slasher.player.dimension.spawnParticle(
			"lc:scpdy_slasher_spark_emitter",
			sparkParticleLoc,
		);
	}

	private displayEntityHealthInfo(healthComp: mc.EntityHealthComponent): void {
		const entity = healthComp.entity;

		const targetName = getEntityName(entity);

		const colorText = healthComp.currentValue <= 0
			? "§c"
			: healthComp.currentValue <= 30
			? mc.system.currentTick % 2 === 0
				? "§b"
				: "§d"
			: "§e";

		const currentHealth = Math.floor(healthComp.currentValue);
		const maxHealth = Math.floor(healthComp.effectiveMax);
		const healthText = `${currentHealth} / ${maxHealth}`;

		const actionbarText: mc.RawText = {
			rawtext: [
				{ text: colorText },
				{ rawtext: targetName.rawtext },
				{ text: " — ❤ " },
				{ text: healthText },
			],
		};

		this.slasher.player.onScreenDisplay.setActionBar(actionbarText);
	}
}

class PlungeWindupState extends SlasherState {
	private static readonly COMPLETE_TICK = 8;

	override onEnter(): void {
		this.slasher.player.addEffect("weakness", PlungeWindupState.COMPLETE_TICK + 2, {
			amplifier: 255,
			showParticles: false,
		});

		this.slasher.player.addEffect("resistance", PlungeWindupState.COMPLETE_TICK + 5, {
			amplifier: 255,
			showParticles: false,
		});

		mc.system.run(() => {
			this.slasher.player.applyImpulse({ x: 0, y: 1.2, z: 0 });
		});

		this.slasher.playSound3DAnd2D("scpdy.slasher.plunge_windup", 15, { volume: 1.5 });
		this.slasher.setCooldown("scpdy_plunge_windup_cd");

		// TODO: plunge windup third person animations
	}

	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		if (this.currentTick === PlungeWindupState.COMPLETE_TICK) {
			this.slasher.transitionTo(new PlungeFallState(this.slasher, this.slasher.player.location.y));
			return;
		}
	}
}

class PlungeFallState extends SlasherState {
	private static readonly FALL_FORCE: mc.Vector3 = { x: 0, y: -3.3, z: 0 };

	constructor(slasher: Slasher, private readonly startHeight: number) {
		super(slasher);
	}

	override onEnter(): void {
		this.addEffects();

		this.slasher.playSound3DAnd2D("scpdy.slasher.slash", 12, {
			volume: 1.3,
			pitch: randomFloat(0.8, 0.9),
		});
		this.slasher.player.applyImpulse(PlungeFallState.FALL_FORCE);
		this.slasher.setCooldown("scpdy_plunge_fall_cd");

		// TODO: plunge fall third person animations
	}

	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		if (this.currentTick % 2 === 0) {
			mc.system.run(() => {
				this.addEffects();
			});
		}

		if (this.currentTick === 0) return;

		const yVelocity = this.slasher.player.getVelocity().y;

		const blockBelow = this.slasher.player.dimension.getBlockBelow(this.slasher.player.location, {
			maxDistance: Math.abs(yVelocity * 2),
		});

		if (!blockBelow && yVelocity < -0.5) return;

		this.slasher.transitionTo(new PlungeImpactState(this.slasher, this.startHeight));
	}

	private addEffects(): void {
		this.slasher.player.addEffect("resistance", 6, {
			amplifier: 255,
			showParticles: false,
		});

		this.slasher.player.addEffect("weakness", 10, {
			amplifier: 255,
			showParticles: false,
		});

		this.slasher.player.addEffect("slowness", 12, {
			amplifier: 0,
		});
	}
}

class PlungeImpactState extends SlasherState {
	private static readonly MIN_DEPTH_CONSIDERED_AS_HIGH = 10;
	private static readonly STATE_DURATION = 15;

	private readonly fallenDepth: number;
	private readonly isHighFallDepth: boolean;

	constructor(slasher: Slasher, startHeight: number) {
		super(slasher);

		this.fallenDepth = startHeight - this.slasher.player.location.y;
		this.isHighFallDepth = this.fallenDepth >= PlungeImpactState.MIN_DEPTH_CONSIDERED_AS_HIGH;

		this.slasher.player.addEffect("weakness", PlungeImpactState.STATE_DURATION + 2, {
			amplifier: 255,
			showParticles: false,
		});
	}

	override onEnter(): void {
		if (
			this.fallenDepth <= 1.2 || (!this.slasher.player.isFalling && !this.slasher.player.isOnGround)
		) {
			this.slasher.playSoundAtHeadFront("mace.smash_air", { volume: 1.1 });
			return;
		}

		this.slasher.addNextDurabilityDamage(Math.ceil(this.fallenDepth / 2));

		const impactLocation = this.getImpactLocation();

		mc.system.run(() => {
			this.affectNearbyEntities(impactLocation);
		});

		this.slasher.setCooldown("scpdy_plunge_impact_cd");

		this.slasher.player.spawnParticle(
			"lc:scpdy_slasher_spark_emitter",
			vec3.add(this.slasher.player.location, { x: 0, y: 0.3, z: 0 }),
		);

		if (this.isHighFallDepth) {
			this.slasher.playSoundAtHeadFront("mace.heavy_smash_ground", { volume: 1.1 });

			this.slasher.playSound3DAnd2D("scpdy.slasher.plunge_impact", 20, {
				volume: 1.8,
				pitch: this.fallenDepth > 50 ? 0.7 : this.fallenDepth > 20 ? randomFloat(0.85, 0.95) : 1,
			});

			if (mc.system.serverSystemInfo.memoryTier > mc.MemoryTier.Low) {
				this.slasher.player.dimension.spawnEntity(
					"lc:scpdy_slasher_plunge_impact_particle_spawner",
					impactLocation,
				);
			}
		} else {
			this.slasher.playSoundAtHeadFront("mace.smash_ground", { volume: 1.1 });
			this.slasher.playSoundAtHeadFront("scpdy.slasher.critical", { volume: 1.4 });
		}

		this.slasher.player.dimension.spawnParticle(
			"lc:scpdy_slasher_plunge_impact_emitter",
			impactLocation,
		);

		this.shakeNearbyPlayerCameras(impactLocation);

		// TODO: plunge impact third person animation
	}

	private shakeNearbyPlayerCameras(location: mc.Vector3): void {
		const locString = vec3.toString2(location);
		this.slasher.player.dimension.runCommand(
			`execute positioned ${locString} run camerashake add @a[r=10] 0.3 0.35 rotational`,
		);
	}

	private getImpactLocation(): mc.Vector3 {
		const loc = this.slasher.player.dimension.getBlockBelow(
			vec3.add(this.slasher.player.location, { x: 0, y: -1.0, z: 0 }),
			{ maxDistance: 15 },
		)?.bottomCenter();

		if (!loc) return this.slasher.player.location;

		return vec3.add(loc, { x: 0, y: 0.5, z: 0 });
	}

	private affectNearbyEntities(impactLocation: mc.Vector3): void {
		const damage = 4 + Math.min(200, Math.ceil(this.fallenDepth / 1.5));

		this.onNearbyEntities(impactLocation, (entity, wasRayHit) => {
			try {
				entity.applyDamage(wasRayHit ? damage : Math.floor(damage / 2), {
					cause: mc.EntityDamageCause.maceSmash,
					damagingEntity: this.slasher.player,
				});
				entity.addEffect("slowness", 80, {
					amplifier: 1,
				});
			} catch {}
		});
	}

	private onNearbyEntities(
		impactLocation: mc.Vector3,
		action: (entity: mc.Entity, wasRayHit: boolean) => void,
	): void {
		const entities = this.slasher.player.dimension.getEntities({
			location: impactLocation,
			maxDistance: this.fallenDepth > 20 ? 4.5 : this.fallenDepth > 50 ? 5.5 : 9,
			closest: 15,
		});

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]!;

			if (entity === this.slasher.player) continue;
			if (entity instanceof mc.Player) {
				if (!mc.world.gameRules.pvp) continue;
				if (isPlayerImmune(entity)) continue;
			}

			let rayHit = false;

			const rayHit1 = this.slasher.player.dimension.getEntitiesFromRay(
				this.slasher.player.location,
				vec3.sub(entity.location, this.slasher.player.location),
			)
				.some(hitInfo => hitInfo.entity === entity);

			if (rayHit1) {
				rayHit = true;
			} else {
				const rayHit2 = this.slasher.player.dimension.getEntitiesFromRay(
					this.slasher.player.getHeadLocation(),
					vec3.sub(entity.getHeadLocation(), this.slasher.player.getHeadLocation()),
				)
					.some(hitInfo => hitInfo.entity === entity);

				rayHit = rayHit2;
			}

			action(entity, rayHit);
		}
	}

	override onTick(mainhandItemStack: mc.ItemStack): void {
		super.onTick(mainhandItemStack);

		if (this.currentTick < PlungeImpactState.STATE_DURATION) return;

		this.slasher.setCooldown("scpdy_slasher_pick");
		this.slasher.transitionTo(new IdleState(this.slasher));
	}
}
