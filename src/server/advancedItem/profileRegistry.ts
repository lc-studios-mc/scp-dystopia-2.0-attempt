import { AdvancedItem, AdvancedItemBaseConstructorArgs } from "./AdvancedItem";

export type AdvancedItemProfile = {
  itemTypeId: string;
  createInstance: (args: AdvancedItemBaseConstructorArgs) => AdvancedItem;
};

const ENTRIES = new Map<string, AdvancedItemProfile>();

export function registerAdvancedItemProfile(profile: AdvancedItemProfile): void {
  const itemTypeId = profile.itemTypeId;

  if (ENTRIES.has(itemTypeId))
    throw new Error(`Advabced Item of type "${itemTypeId}" is already registered.`);

  ENTRIES.set(itemTypeId, profile);
}

export function getAdvancedItemProfile(itemTypeId: string): AdvancedItemProfile | undefined {
  return ENTRIES.get(itemTypeId);
}
