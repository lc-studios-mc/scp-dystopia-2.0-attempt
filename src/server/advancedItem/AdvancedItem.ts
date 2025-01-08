import * as mc from "@minecraft/server";
import { AdvancedItemProfile } from "./profileRegistry";

/**
 * Set of read-only properties required for an {@link AdvancedItem} instance to initialize
 */
export type AdvancedItemBaseConstructorArgs = {
  readonly getCurrentTick: () => number;
  readonly isBeingUsed: () => boolean;
  readonly profile: AdvancedItemProfile;
  readonly player: mc.Player;
  readonly playerHealth: mc.EntityHealthComponent;
  readonly playerEquippable: mc.EntityEquippableComponent;
  readonly playerMainhand: mc.ContainerSlot;
  readonly playerOffhand: mc.ContainerSlot;
  readonly hotbarSlotIndex: number;
};

/**
 * Base class for all advanced items
 */
export abstract class AdvancedItem {
  constructor(private readonly baseConstructorArgs: AdvancedItemBaseConstructorArgs) {}

  /**
   * Total elapsed ticks since the AdvancedItem instance is initialized.
   *
   * (The amount of ticks the player has held this item in their mainhand)
   */
  get currentTick(): number {
    return this.baseConstructorArgs.getCurrentTick();
  }

  get isBeingUsed(): boolean {
    return this.baseConstructorArgs.isBeingUsed();
  }

  get profile(): AdvancedItemProfile {
    return this.baseConstructorArgs.profile;
  }

  get player(): mc.Player {
    return this.baseConstructorArgs.player;
  }

  /**
   * {@link mc.EntityHealthComponent} of the player
   */
  get playerHealth(): mc.EntityHealthComponent {
    return this.baseConstructorArgs.playerHealth;
  }

  /**
   * {@link mc.EntityEquippableComponent } of the player
   */
  get playerEquippable(): mc.EntityEquippableComponent {
    return this.baseConstructorArgs.playerEquippable;
  }

  /**
   * {@link mc.ContainerSlot} of mainhand of the player
   */
  get playerMainhand(): mc.ContainerSlot {
    return this.baseConstructorArgs.playerMainhand;
  }

  /**
   * {@link mc.ContainerSlot} of offhand of the player
   */
  get playerOffhand(): mc.ContainerSlot {
    return this.baseConstructorArgs.playerOffhand;
  }

  get hotbarSlotIndex(): number {
    return this.baseConstructorArgs.hotbarSlotIndex;
  }

  isValid(mainhandItem?: mc.ItemStack): boolean {
    try {
      if (this.player.selectedSlotIndex !== this.hotbarSlotIndex) return false;

      if (!mainhandItem) mainhandItem = this.playerMainhand.getItem();

      if (!mainhandItem) return false;

      if (this.profile.itemTypeId !== mainhandItem.typeId) return false;

      return true;
    } catch {
      return false;
    }
  }

  abstract onTick(mainhandItemStack: mc.ItemStack): void;

  abstract onRemove(): void;

  abstract canBeUsed(): boolean;

  abstract onStartUse(event: mc.ItemStartUseAfterEvent): void;

  abstract onStopUse(event: mc.ItemStopUseAfterEvent): void;

  abstract onSwingArm(): void;

  abstract onHitEntity(event: mc.EntityHitEntityAfterEvent): void;

  abstract onHitBlock(event: mc.EntityHitBlockAfterEvent): void;
}
