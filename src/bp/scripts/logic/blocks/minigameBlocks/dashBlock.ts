import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

function onTick(arg: mc.BlockComponentTickEvent): void {
	const ticksUntilActiveAgain = arg.block.permutation.getState("lc:ticks_until_active_again") as number;

	if (ticksUntilActiveAgain <= 0) return;

	arg.block.setPermutation(arg.block.permutation.withState("lc:ticks_until_active_again", ticksUntilActiveAgain - 1));
}

function onStepOn(arg: mc.BlockComponentStepOnEvent): void {
	if (!arg.entity) return;
	if (!(arg.entity instanceof mc.Player)) return;

	const ticksUntilActiveAgain = arg.block.permutation.getState("lc:ticks_until_active_again") as number;

	if (ticksUntilActiveAgain > 0) return;

	let dashDir = arg.entity.getVelocity();

	if (vec3.length(dashDir) < 2) {
		arg.entity.applyImpulse({
			x: dashDir.x * 11,
			y: 0.0,
			z: dashDir.z * 11,
		});
	}

	arg.entity.addEffect("speed", 50, {
		amplifier: 1,
	});

	arg.block.setPermutation(arg.block.permutation.withState("lc:ticks_until_active_again", 15));
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:dash_block", {
		onTick,
		onStepOn,
	});
});
