import * as mc from "@minecraft/server";

export function getEntitiesInAllDimensions(options?: mc.EntityQueryOptions): mc.Entity[] {
	return [
		...mc.world.getDimension("overworld").getEntities(options),
		...mc.world.getDimension("nether").getEntities(options),
		...mc.world.getDimension("the_end").getEntities(options),
	];
}

/**
 * @returns Whether the entity's health is 0.
 */
export function isEntityDead(entity: mc.Entity): boolean {
	const comp = entity.getComponent("health");

	if (!comp) return false;

	return comp.currentValue <= 0;
}

/**
 * @returns Whether an impulse can be applied to the entity.
 */
export function canApplyImpulse(entity: mc.Entity): boolean;

/**
 * @returns Whether an impulse can be applied to entities of the type.
 */
export function canApplyImpulse(typeId: string): boolean;

export function canApplyImpulse(value: mc.Entity | string): boolean {
	const typeId = typeof value === "string" ? value : value.typeId;
	return !["minecraft:player", "minecraft:ender_dragon"].includes(typeId);
}

function getEntityName_typeId(typeId: string): mc.RawText {
	const entityTypeNamespace = typeId.split(":")[0];

	const entityTypeId =
		entityTypeNamespace === "minecraft" ? typeId.replace("minecraft:", "") : typeId;

	return { rawtext: [{ translate: `entity.${entityTypeId}.name` }] };
}

/**
 * @returns Name tag or translated name of the entity
 */
export function getEntityName(entity: mc.Entity): mc.RawText;

/**
 * @returns Translated name of the entity type
 */
export function getEntityName(typeId: string): mc.RawText;

/**
 * @returns Name of the player
 */
export function getEntityName(player: mc.Player): mc.RawText;

export function getEntityName(value: mc.Entity | string): mc.RawText {
	if (typeof value === "string") {
		return getEntityName_typeId(value);
	}

	if (value instanceof mc.Player) {
		return {
			rawtext: [{ text: value.name }],
		};
	}

	if (value.nameTag.trim() !== "") return { rawtext: [{ text: value.nameTag }] };

	return getEntityName_typeId(value.typeId);
}

export function canEntitySplashBlood(entity: mc.Entity): boolean {
	if (entity.typeId === "minecraft:player") return true;
	if (entity.matches({ families: ["human"] })) return true;
	if (entity.matches({ families: ["villager"] })) return true;
	if (entity.matches({ families: ["illager"] })) return true;
	if (entity.matches({ families: ["animal"] })) return true;
	if (entity.matches({ families: ["piglin"] })) return true;

	return false;
}

/**
 * @returns Damage value modified by various factors like armors and effects.
 */
export function getModifiedDamageNumber(damage: number, entity: mc.Entity): number {
	if (damage <= 0) return 0;

	const resistanceEffect = entity.getEffect("resistance");

	if (resistanceEffect) {
		const resistanceMultiplier = 1 - resistanceEffect.amplifier * 0.2;
		damage = Math.floor(damage * resistanceMultiplier);
	}

	if (damage <= 0) return 0;

	const equippableComponent = entity.getComponent("equippable");

	if (!equippableComponent) return damage;

	let defensePoints = 0;
	let armorToughness = 0;
	let epf = 0;

	const feetEq = equippableComponent.getEquipment(mc.EquipmentSlot.Feet);

	if (feetEq) {
		epf += feetEq.getComponent("enchantable")?.getEnchantment("protection")?.level ?? 0;
		epf +=
			(feetEq.getComponent("enchantable")?.getEnchantment("projectile_protection")?.level ?? 0) * 2;
	}

	switch (feetEq?.typeId) {
		case "minecraft:leather_boots":
		case "minecraft:golden_boots":
		case "minecraft:chainmail_boots":
			defensePoints += 1;
			break;
		case "minecraft:iron_boots":
			defensePoints += 2;
			break;
		case "minecraft:diamond_boots":
			defensePoints += 3;
			armorToughness += 2;
			break;
		case "minecraft:netherite_boots":
			defensePoints += 3;
			armorToughness += 3;
			break;
	}

	const headEq = equippableComponent.getEquipment(mc.EquipmentSlot.Head);

	if (headEq) {
		epf += headEq.getComponent("enchantable")?.getEnchantment("protection")?.level ?? 0;
		epf +=
			(headEq.getComponent("enchantable")?.getEnchantment("projectile_protection")?.level ?? 0) * 2;
	}

	switch (headEq?.typeId) {
		case "minecraft:leather_helmet":
			defensePoints += 1;
			break;
		case "minecraft:golden_helmet":
		case "minecraft:chainmail_helmet":
		case "minecraft:iron_helmet":
		case "minecraft:turtle_helmet":
			defensePoints += 2;
			break;
		case "minecraft:diamond_helmet":
			defensePoints += 3;
			armorToughness += 2;
			break;
		case "minecraft:netherite_helmet":
			defensePoints += 3;
			armorToughness += 3;
			break;
	}

	const legsEq = equippableComponent.getEquipment(mc.EquipmentSlot.Legs);

	if (legsEq) {
		epf += legsEq.getComponent("enchantable")?.getEnchantment("protection")?.level ?? 0;
		epf +=
			(legsEq.getComponent("enchantable")?.getEnchantment("projectile_protection")?.level ?? 0) * 2;
	}

	switch (legsEq?.typeId) {
		case "minecraft:leather_leggings":
			defensePoints += 2;
			break;
		case "minecraft:golden_leggings":
			defensePoints += 3;
			break;
		case "minecraft:chainmail_leggings":
			defensePoints += 4;
			break;
		case "minecraft:iron_leggings":
			defensePoints += 5;
			break;
		case "minecraft:diamond_leggings":
			defensePoints += 6;
			armorToughness += 2;
			break;
		case "minecraft:netherite_leggings":
			defensePoints += 6;
			armorToughness += 3;
			break;
	}

	const chestEq = equippableComponent.getEquipment(mc.EquipmentSlot.Chest);

	if (chestEq) {
		epf += chestEq.getComponent("enchantable")?.getEnchantment("protection")?.level ?? 0;
		epf +=
			(chestEq.getComponent("enchantable")?.getEnchantment("projectile_protection")?.level ?? 0) *
			2;
	}

	switch (chestEq?.typeId) {
		case "minecraft:leather_chestplate":
			defensePoints += 3;
			break;
		case "minecraft:golden_chestplate":
		case "minecraft:chainmail_chestplate":
			defensePoints += 5;
			break;
		case "minecraft:iron_chestplate":
			defensePoints += 6;
			break;
		case "minecraft:diamond_chestplate":
			defensePoints += 8;
			armorToughness += 2;
			break;
		case "minecraft:netherite_chestplate":
			defensePoints += 8;
			armorToughness += 3;
			break;
	}

	damage =
		damage *
		(1 -
			Math.min(
				20,
				Math.max(defensePoints / 5, defensePoints - (4 * damage) / (armorToughness + 8)),
			) /
				25);

	damage -= Math.min(20, epf) / 25;

	damage = Math.floor(damage);

	if (damage <= 0) return 0;

	return damage;
}
