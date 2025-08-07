import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";

const onTick = (arg: mc.BlockComponentTickEvent): void => {
	const ticksUntilActiveAgain = arg.block.permutation.getState(
		"lc:ticks_until_active_again",
	) as number;

	if (ticksUntilActiveAgain <= 0) return;

	arg.block.setPermutation(
		arg.block.permutation.withState("lc:ticks_until_active_again", ticksUntilActiveAgain - 1),
	);
};

const onStepOn = (arg: mc.BlockComponentStepOnEvent): void => {
	if (!arg.entity) return;

	const ticksUntilActiveAgain = arg.block.permutation.getState(
		"lc:ticks_until_active_again",
	) as number;

	if (ticksUntilActiveAgain > 0) return;

	let dashDir: mc.Vector3;
	if (arg.entity instanceof mc.Player) {
		const viewDir = arg.entity.getViewDirection();
		const viewDirNorm = vec3.normalize({ ...viewDir, y: 0 });

		const moveDir = arg.entity.inputInfo.getMovementVector();
		const moveDirRotated = vec3.changeDir(
			{
				x: moveDir.x,
				y: 0,
				z: moveDir.y,
			},
			viewDirNorm,
		);

		dashDir = vec3.normalize(moveDirRotated);
	} else {
		dashDir = vec3.normalize(arg.entity.getVelocity());
	}

	if (vec3.length(dashDir) < 5) {
		arg.entity.applyKnockback(
			{
				x: dashDir.x * 7,
				z: dashDir.z * 7,
			},
			0.04,
		);
	}

	arg.entity.addEffect("speed", 50, {
		amplifier: 1,
	});

	arg.block.setPermutation(arg.block.permutation.withState("lc:ticks_until_active_again", 15));
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:dash_block", {
		onTick,
		onStepOn,
	});
});
