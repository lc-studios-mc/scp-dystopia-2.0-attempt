import { randf, randi } from "@/utils/math";
import * as mc from "@minecraft/server";

const STATE = {
	fanRotation: "lc:fan_rotation",
} as const;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:panel_fan", {
		onTick({ block }) {
			tickFanRotation(block);
		},
	});

	event.blockComponentRegistry.registerCustomComponent("scpdy:panel_fan_static", {
		onPlace({ block }) {
			randomizeFanRotation(block);
		},
	});
});

function randomizeFanRotation(block: mc.Block) {
	const nextFanRotation = randi(0, 4);

	block.setPermutation(block.permutation.withState(STATE.fanRotation, nextFanRotation));
}

function tickFanRotation(block: mc.Block) {
	const fanRotationUnflat = Number(block.permutation.getState(STATE.fanRotation));

	const nextFanRotation = (fanRotationUnflat + 1) % 5;

	block.setPermutation(block.permutation.withState(STATE.fanRotation, nextFanRotation));

	if (mc.system.currentTick % 20 === 0) {
		block.dimension.playSound("scpdy.misc.fan_rotation.moderate", block.center(), {
			pitch: randf(0.98, 1.02),
			volume: 1,
		});
	}
}
