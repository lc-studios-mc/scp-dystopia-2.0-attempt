import type { GunDamageStrategy } from "./types";

// Import damage strategies
import DefaultDamageStrategy from "./default_damage_strategy";

export const gunDamageStrategiesById: ReadonlyMap<string, GunDamageStrategy> = new Map([
	// [ID, GunDamageStrategy]
	["default", new DefaultDamageStrategy()],
]);
