import { getBlockCardinalDirection } from "@lib/utils/blockUtils";
import { stopSoundAt } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

const STATE_NAME = {
	isOn: "lc:is_on",
} as const;

const spawnFaucetWaterParticle = (block: mc.Block): void => {
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
};

const onPlayerInteract = (arg: mc.BlockComponentPlayerInteractEvent): void => {
	const isOn = arg.block.permutation.getState(STATE_NAME.isOn) === true;

	let newPermutation = arg.block.permutation;

	newPermutation = newPermutation.withState(STATE_NAME.isOn, !isOn);

	if (isOn) {
		// Turn off
		arg.dimension.playSound("scpdy.misc.faucet_water_drip", arg.block.center());

		stopSoundAt(arg.dimension, arg.block.center(), "scpdy.misc.faucet_water");
	} else {
		// Turn on
		arg.dimension.playSound("scpdy.misc.faucet_water", arg.block.center(), {
			volume: 1.05,
		});

		spawnFaucetWaterParticle(arg.block);
		stopSoundAt(arg.dimension, arg.block.center(), "scpdy.misc.faucet_water_drip");
	}

	arg.block.setPermutation(newPermutation);
};

const onTick = (event: mc.BlockComponentTickEvent): void => {
	const isOn = event.block.permutation.getState(STATE_NAME.isOn) === true;

	if (!isOn) return;

	event.dimension.playSound("scpdy.misc.faucet_water", event.block.center(), {
		volume: 1.05,
	});

	spawnFaucetWaterParticle(event.block);
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:sink", {
		onPlayerInteract,
		onPlayerBreak(arg) {
			stopSoundAt(arg.dimension, arg.block, "scpdy.misc.faucet_water");
			stopSoundAt(arg.dimension, arg.block, "scpdy.misc.faucet_water_drip");
		},
		onTick,
	});
});
