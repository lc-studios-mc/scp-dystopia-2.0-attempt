import * as mc from "@minecraft/server";
import { EventEmitter } from "@/utils/EventEmitter";
import type { MachineryInputMode } from "./mode";

export const MachineryInputEvents = new EventEmitter<{
	onActivate: {
		mode: MachineryInputMode;
		dimension: mc.Dimension;
		location: mc.Vector3;
		clearanceLevel: number;
		pulseDirection?: mc.Direction;
		source?: mc.Player;
		block?: mc.Block;
		entity?: mc.Entity;
	};
}>();
