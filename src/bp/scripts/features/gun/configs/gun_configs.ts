import type { GunConfig } from "../types";

// Import gun configs
import m17 from "./m17";

export const gunConfigsById: ReadonlyMap<string, GunConfig> = new Map([
	// [ID, GunConfig]
	[m17.id, m17],
]);
