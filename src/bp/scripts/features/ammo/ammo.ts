import * as mc from "@minecraft/server";

export const getAmmoTypeOfItemStack = (itemStack: mc.ItemStack): string | undefined => {
	const tags = itemStack.getTags();

	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i]!;
		if (!tag.startsWith("ammo_type:")) continue;

		const split = tag.split(":");
		return split[1];
	}
};

export const getAmmoCountInContainer = (container: mc.Container, requiredAmmoType: string): number => {
	let accumulated = 0;

	for (let i = 0; i < container.size; i++) {
		const itemStack = container.getItem(i);

		if (!itemStack) continue;
		if (!itemStack.hasTag("lc:ammo_item")) continue;

		const ammoType = getAmmoTypeOfItemStack(itemStack);

		if (ammoType !== requiredAmmoType) continue;

		if (itemStack.hasTag("lc:ammo_pack")) {
			const durability = itemStack.getComponent("durability");
			if (!durability) continue;

			accumulated += durability.maxDurability - durability.damage;
			continue;
		}

		accumulated += itemStack.amount;
	}

	return accumulated;
};

export const consumeAmmoInContainer = (
	container: mc.Container,
	requiredAmmoType: string,
	maxCount = Infinity,
): number => {
	let consumed = 0;
	let consumableCount = Math.floor(maxCount);

	for (let i = 0; i < container.size; i++) {
		if (consumableCount <= 0) continue;

		const itemStack = container.getItem(i);

		if (!itemStack) continue;
		if (!itemStack.hasTag("lc:ammo_item")) continue;

		const ammoType = getAmmoTypeOfItemStack(itemStack);

		if (ammoType !== requiredAmmoType) continue;

		if (itemStack.hasTag("lc:ammo_pack")) {
			const durability = itemStack.getComponent("durability");
			if (!durability) continue;

			const toConsume = Math.min(consumableCount, durability.maxDurability - durability.damage);

			consumed += toConsume;
			consumableCount -= toConsume;

			durability.damage += toConsume;

			container.setItem(i, itemStack);

			continue;
		}

		const toConsume = Math.min(consumableCount, itemStack.amount);

		consumed += toConsume;
		consumableCount -= toConsume;

		const newAmount = itemStack.amount - toConsume;

		if (newAmount > 0) {
			itemStack.amount -= toConsume;
			container.setItem(i, itemStack);
		} else {
			container.setItem(i, undefined);
		}
	}

	return consumed;
};
