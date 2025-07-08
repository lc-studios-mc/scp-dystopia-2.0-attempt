import * as mc from "@minecraft/server";
import { getAmmoTypeOfItemStack } from "@/features/ammo/ammo";
import { clamp, console, findContainerSlot } from "@lc-studios-mc/scripting-utils";

export class GunMagContext {
	private readonly containerSlot: mc.ContainerSlot;
	private readonly magItemType: string;
	private readonly itemStack: mc.ItemStack;
	private readonly durability: mc.ItemDurabilityComponent;
	private readonly midAmmoCount: number;
	private readonly lowAmmoCount: number;
	readonly ammoType: string;
	private madeChanges = false;

	private constructor(containerSlot: mc.ContainerSlot) {
		this.containerSlot = containerSlot;
		this.magItemType = containerSlot.typeId;
		this.itemStack = containerSlot.getItem()!;

		const durability = this.itemStack.getComponent("durability");
		if (!durability) throw new Error(`Mag item (ID: ${this.itemStack.typeId}) is missing a durability component.`);
		this.durability = durability;
		this.midAmmoCount = Math.min(20, Math.floor(this.durability.maxDurability / 2.5));
		this.lowAmmoCount = Math.min(10, Math.floor(this.durability.maxDurability / 4.0));

		const ammoType = getAmmoTypeOfItemStack(this.itemStack);
		if (!ammoType) throw new Error(`Mag item (ID: ${this.itemStack.typeId}) has no ammo type defined.`);
		this.ammoType = ammoType;
	}

	static findMag(container: mc.Container, magItemType: string): GunMagContext | undefined {
		const slot = findContainerSlot(container, (slot) => slot.hasItem() && slot.typeId === magItemType);
		if (!slot) return;

		const ctx = new GunMagContext(slot);
		return ctx;
	}

	/**
	 * @returns String: `(color) Remaining Ammo Count (color reset) / Max Ammo Count`
	 */
	createRemainingAmmoDisplayString(colored = true): string {
		if (colored) {
			const color =
				this.remainingAmmoCount <= this.lowAmmoCount
					? "§c"
					: this.remainingAmmoCount <= this.midAmmoCount
						? "§e"
						: "§f";

			return `${color}${this.remainingAmmoCount}§r / ${this.maxAmmoCount}`;
		}

		return `${this.remainingAmmoCount} / ${this.maxAmmoCount}`;
	}

	/**
	 * Consumes the remaining ammo in the mag.
	 *
	 * @param maxConsumption - Maximum amount of ammo to consume. `Infinity` by default.
	 * @returns Amount of consumed ammo.
	 */
	consumeAmmo(maxConsumption = Infinity): number {
		const consumption = clamp(Math.floor(maxConsumption), 0, this.remainingAmmoCount);
		const newDurabilityDamage = this.durability.damage + consumption;

		if (newDurabilityDamage !== this.durability.damage) {
			this.durability.damage = newDurabilityDamage;
			this.madeChanges = true;
		}

		return consumption;
	}

	/** Sets the modified Item Stack back into the original container slot. */
	apply(): void {
		if (!this.madeChanges) return;

		if (!this.isValid) {
			console.error("Failed to apply Gun Mag Context because it is invalid.");
			return;
		}

		this.containerSlot.setItem(this.itemStack);

		this.madeChanges = false;
	}

	/**
	 * The gun mag context is valid if the container slot is valid and has the same item as when the gun mag context
	 * instance was created.
	 */
	get isValid(): boolean {
		if (!this.containerSlot.isValid) return false;
		if (!this.containerSlot.hasItem()) return false;
		if (this.containerSlot.typeId !== this.magItemType) return false;
		if (!this.durability.isValid) return false;
		return true;
	}

	get maxAmmoCount(): number {
		return this.durability.maxDurability;
	}

	get remainingAmmoCount(): number {
		return this.durability.maxDurability - this.durability.damage;
	}

	set remainingAmmoCount(value: number) {
		value = clamp(Math.floor(value), 0, this.durability.maxDurability);
		this.durability.damage = this.durability.maxDurability - value;

		this.madeChanges = true;
	}

	get expendedAmmoCount(): number {
		return this.durability.damage;
	}

	set expendedAmmoCount(value: number) {
		value = clamp(Math.floor(value), 0, this.durability.maxDurability);
		this.durability.damage = value;

		this.madeChanges = true;
	}

	get isEmpty(): boolean {
		return this.durability.damage >= this.durability.maxDurability;
	}
}
