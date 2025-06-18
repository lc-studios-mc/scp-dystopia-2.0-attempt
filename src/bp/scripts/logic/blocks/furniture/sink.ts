import { getBlockCardinalDirection } from "@lib/utils/blockUtils";
import { stopSoundAt } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

const STATE_NAME = {
	isOn: "lc:is_on",
} as const;

function spawnFaucetWaterParticle(block: mc.Block): void {
	const direction = getBlockCardinalDirection(block.permutation);

	const particleLoc = vec3.getRelativeLocation(
		block.bottomCenter(),
		{
			x: 0,
			y: 1.2,
			z: 0.2,
		},
		direction,
	);

	block.dimension.spawnParticle("lc:scpdy_faucet_water_emitter", particleLoc);
}

function onPlayerInteract(event: mc.BlockComponentPlayerInteractEvent): void {
	const isOn = event.block.permutation.getState(STATE_NAME.isOn) === true;

	let newPermutation = event.block.permutation;

	newPermutation = newPermutation.withState(STATE_NAME.isOn, !isOn);

	if (isOn) {
		// Turn off
		event.dimension.playSound("scpdy.misc.faucet_water_drip", event.block.center());

		stopSoundAt(event.dimension, event.block.center(), "scpdy.misc.faucet_water");
	} else {
		// Turn on
		event.dimension.playSound("scpdy.misc.faucet_water", event.block.center(), {
			volume: 1.05,
		});

		spawnFaucetWaterParticle(event.block);
		stopSoundAt(event.dimension, event.block.center(), "scpdy.misc.faucet_water_drip");
	}

	event.block.setPermutation(newPermutation);
}

function onPlayerBreak(event: mc.BlockComponentPlayerBreakEvent): void {
	stopSoundAt(event.dimension, event.block, "scpdy.misc.faucet_water");
	stopSoundAt(event.dimension, event.block, "scpdy.misc.faucet_water_drip");
}

function onTick(event: mc.BlockComponentTickEvent): void {
	const isOn = event.block.permutation.getState(STATE_NAME.isOn) === true;

	if (!isOn) return;

	event.dimension.playSound("scpdy.misc.faucet_water", event.block.center(), {
		volume: 1.05,
	});

	spawnFaucetWaterParticle(event.block);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:sink", {
		onPlayerInteract,
		onPlayerBreak,
		onTick,
	});
});
