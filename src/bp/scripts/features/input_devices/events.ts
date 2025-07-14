import { EventEmitter } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";
import type { InputDeviceMode } from "./mode";

export const InputDeviceEvents = new EventEmitter<{
	onActivate: {
		mode: InputDeviceMode;
		dimension: mc.Dimension;
		location: mc.Vector3;
		clearanceLevel: number;
		pulseDirection?: mc.Direction;
		source?: mc.Player;
		block?: mc.Block;
		entity?: mc.Entity;
		rbLifespan?: number;
	};
}>();
