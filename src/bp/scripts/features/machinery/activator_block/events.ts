import * as mc from "@minecraft/server";
import { EventEmitter } from "@/utils/EventEmitter";

export const ActivatorBlockEvents = new EventEmitter<{
	onTickPower: { block: mc.Block; powered: boolean };
}>();
