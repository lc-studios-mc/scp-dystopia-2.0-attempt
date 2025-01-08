import * as mc from "@minecraft/server";

const AMMO_TYPE_OBJ = {
  "556mm": "lc:scpdy_ammo_556mm",
  "9mm": "lc:scpdy_ammo_9mm",
  "50bmg": "lc:scpdy_ammo_50bmg",
  "762x51": "lc:scpdy_ammo_762x51",
  "12shell": "lc:scpdy_ammo_12shell",
  "338magnum": "lc:scpdy_ammo_338magnum",
} as const;

export type AmmoType = keyof typeof AMMO_TYPE_OBJ;

export type AmmoTypeInfo = {
  /** Amount of ammo put into mag at once */
  readonly maxBatchLoad: number;
  /** Cooldown before being able to put ammo into mag again */
  readonly loadCooldown: number;
  /** ID of the sound played when putting ammo into mag */
  readonly loadSoundId: string;
};

const AMMO_TYPE_INFO_MAP = new Map<AmmoType, AmmoTypeInfo>([
  [
    "9mm",
    {
      maxBatchLoad: 3,
      loadCooldown: 0,
      loadSoundId: "scpdy.gun.magazine.load_ammo",
    },
  ],
  [
    "12shell",
    {
      maxBatchLoad: 1,
      loadCooldown: 5,
      loadSoundId: "scpdy.gun.spas12.reload",
    },
  ],
  [
    "50bmg",
    {
      maxBatchLoad: 1,
      loadCooldown: 18,
      loadSoundId: "scpdy.gun.magazine.load_ammo",
    },
  ],
  [
    "338magnum",
    {
      maxBatchLoad: 1,
      loadCooldown: 9,
      loadSoundId: "scpdy.gun.magazine.load_ammo",
    },
  ],
  [
    "556mm",
    {
      maxBatchLoad: 3,
      loadCooldown: 0,
      loadSoundId: "scpdy.gun.magazine.load_ammo",
    },
  ],
  [
    "762x51",
    {
      maxBatchLoad: 3,
      loadCooldown: 5,
      loadSoundId: "scpdy.gun.magazine.load_ammo",
    },
  ],
]);

export function getAmmoType(itemStack: mc.ItemStack): AmmoType | undefined {
  const ammoType = itemStack
    .getTags()
    .find((tag) => tag.startsWith("ammo_type:"))
    ?.split(":")[1];

  if (ammoType === undefined) return undefined;
  if (!(ammoType in AMMO_TYPE_OBJ)) return undefined;

  return ammoType as AmmoType;
}

export function getAmmoItemType(ammoType: AmmoType): string {
  const value = AMMO_TYPE_OBJ[ammoType];
  if (typeof value !== "string") throw new Error(`Ammo item type of ${ammoType} is invalid.`);
  return value;
}

export function getAmmoTypeInfo(ammoType: AmmoType): AmmoTypeInfo {
  const value = AMMO_TYPE_INFO_MAP.get(ammoType);
  if (!value) throw new Error(`Ammo type info of ${ammoType} is missing.`);
  return value;
}

/**
 * @returns Total amount of ammo inside container
 */
export function getTotalAmmoCount(container: mc.Container, ammoType: AmmoType): number {
  let ammoCount = 0;

  for (let i = 0; i < container.size; i++) {
    const slot = container.getSlot(i);
    const itemStack = slot.getItem();

    if (!itemStack) continue;
    if (getAmmoType(itemStack) !== ammoType) continue;

    if (itemStack.hasTag("scpdy:ammo")) {
      ammoCount += itemStack.amount;
    } else if (itemStack.hasTag("scpdy:ammo_pack")) {
      const durabilityComp = itemStack.getComponent("durability")!;
      ammoCount += durabilityComp.maxDurability - durabilityComp.damage;
    }
  }

  return ammoCount;
}

/**
 * Removes specific ammo type from container.
 * @returns Amount of removed ammo
 */
export function removeAmmo(
  container: mc.Container,
  ammoType: AmmoType,
  maxAmount: number,
  excludePacks = false,
): number {
  maxAmount = Math.floor(maxAmount);

  if (maxAmount <= 0) throw new RangeError("maxAmount is less than 0");

  let totalRemoved = 0;

  for (let i = 0; i < container.size; i++) {
    if (totalRemoved >= maxAmount) break;

    const slot = container.getSlot(i);
    const itemStack = slot.getItem();

    if (!itemStack) continue;
    if (getAmmoType(itemStack) !== ammoType) continue;

    if (itemStack.hasTag("scpdy:ammo")) {
      const initialStackAmount = itemStack.amount;

      let decreaseAmount = Math.min(Math.max(maxAmount - totalRemoved, 0), initialStackAmount);

      totalRemoved += decreaseAmount;

      if (itemStack.amount - decreaseAmount > 0) {
        itemStack.amount -= decreaseAmount;
        slot.setItem(itemStack);
      } else {
        slot.setItem();
      }

      continue;
    }

    if (excludePacks) continue;

    if (itemStack.hasTag("scpdy:ammo_pack")) {
      const durabilityComp = itemStack.getComponent("durability")!;

      const damageIncrease = Math.min(
        Math.max(maxAmount - totalRemoved, 0),
        durabilityComp.maxDurability - durabilityComp.damage,
      );

      durabilityComp.damage += damageIncrease;
      totalRemoved += damageIncrease;

      slot.setItem(itemStack);
    }
  }

  return totalRemoved;
}
