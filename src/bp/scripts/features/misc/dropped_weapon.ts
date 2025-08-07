import { console } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";
import { getMobEquippedWeaponId } from "../mobs/equipped_weapon_id";

const PREFIX = "lc:scpdy_dropped_";

const onPickupRequest = (droppedWeaponEntity: mc.Entity): void => {
	if (!droppedWeaponEntity.typeId.startsWith(PREFIX)) {
		throw new Error("Dropped weapon entity type ID must start with 'lc:scpdy_dropped_'");
	}

	const weaponId = droppedWeaponEntity.typeId.slice(PREFIX.length);

	const nearbyMobs = droppedWeaponEntity.dimension.getEntities({
		families: ["mob", "can_pickup_dropped_weapon"],
		location: droppedWeaponEntity.location,
		closest: 3,
		maxDistance: 3,
	});

	for (const mob of nearbyMobs) {
		const currentlyEquippedWeaponId = getMobEquippedWeaponId(mob);

		if (currentlyEquippedWeaponId === weaponId) {
			console.log(`The entity has already equipped ${weaponId}. Pickup request has been ignored.`);
			continue;
		}

		let triggeredEquipEvent = false;

		try {
			mob.triggerEvent(`lc:try_equip_${weaponId}`);
			triggeredEquipEvent = true;
		} catch {}

		if (!triggeredEquipEvent) {
			console.log(`The entity does not have defined event for equipping ${weaponId}. Pickup request has been ignored.`);
			continue;
		}

		mc.system.runTimeout(() => {
			const newEquippedWeaponId = getMobEquippedWeaponId(mob);

			if (newEquippedWeaponId !== weaponId) {
				console.log(`The entity could not equip ${weaponId}. Pickup request has been ignored.`);
				return;
			}

			droppedWeaponEntity.triggerEvent("despawn");
		}, 1);

		break; // Only one mob may pickup the weapon
	}
};

mc.system.afterEvents.scriptEventReceive.subscribe((e) => {
	if (e.id !== "scpdy_dropped_weapon:on_pickup_request") return;
	if (!e.sourceEntity) return;

	onPickupRequest(e.sourceEntity);
}, {
	namespaces: ["scpdy_dropped_weapon"],
});
