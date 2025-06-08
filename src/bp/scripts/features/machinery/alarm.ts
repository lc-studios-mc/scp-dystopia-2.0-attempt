import { getBlockFace, getRelativeBlockAtDirection, reverseDirection } from "@/utils/direction";
import { randf } from "@/utils/math";
import { consumeHandItem, isCreativeOrSpectator } from "@/utils/player";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

const STATE = {
	redstoneDir: "lc:redstone_dir",
	redstoneExtend: "lc:redstone_extend",
	isActive: "lc:is_active",
} as const;

type RedstoneDir = "backward" | "forward" | "up" | "down";

const redstoneDirs = ["backward", "forward", "up", "down"];

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:alarm", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	beforeOnPlayerPlace(e) {
		e.cancel = true;

		mc.system.run(() => {
			beforeOnPlayerPlaceAsync(e);
		});
	},
	onTick({ block, dimension }) {
		const detectedRedstone = checkForRedstone(block);
		const shouldBeActive = detectedRedstone;
		const isCurrentlyActive = Boolean(block.permutation.getState(STATE.isActive));

		if (shouldBeActive && !isCurrentlyActive) {
			block.setPermutation(block.permutation.withState(STATE.isActive, true));
		} else if (!shouldBeActive && isCurrentlyActive) {
			block.setPermutation(block.permutation.withState(STATE.isActive, false));
		}

		if (shouldBeActive) {
			dimension.playSound("scpdy.misc.alarm", block.center(), {
				volume: 1.1,
			});
		}
	},
};

function checkForRedstone(alarm: mc.Block): boolean {
	const redstoneDetectionBlock = getBlockForRedstoneDetection(alarm);
	if (!redstoneDetectionBlock) return false;

	const power = redstoneDetectionBlock.getRedstonePower();
	return power != undefined && power > 0;
}

function getBlockForRedstoneDetection(alarm: mc.Block): mc.Block | undefined {
	const blockFace = getBlockFace(alarm.permutation);
	if (!blockFace) return;

	const redstoneDir = alarm.permutation.getState(STATE.redstoneDir) as RedstoneDir;
	const redstoneExtend = Number(alarm.permutation.getState(STATE.redstoneExtend));

	switch (redstoneDir) {
		case "up":
			return alarm.above(redstoneExtend);
		case "down":
			return alarm.below(redstoneExtend);
		case "backward":
			return getRelativeBlockAtDirection(alarm, reverseDirection(blockFace), redstoneExtend);
		case "forward":
			return getRelativeBlockAtDirection(alarm, blockFace, redstoneExtend);
	}
}

async function beforeOnPlayerPlaceAsync(e: mc.BlockComponentPlayerPlaceBeforeEvent): Promise<void> {
	if (!e.player) return;

	const formData = new ModalFormData();

	formData.title({ translate: "scpdy.machinery.alarm" });

	formData.dropdown(
		{ translate: "scpdy.machinery.alarm.redstoneDetectionDir" },
		[
			{ translate: "scpdy.misc.text.backward" },
			{ translate: "scpdy.misc.text.forward" },
			{ translate: "scpdy.misc.text.up" },
			{ translate: "scpdy.misc.text.down" },
		],
		{
			defaultValueIndex: 0,
			tooltip: { translate: "scpdy.machinery.alarm.redstoneDetectionDir.tip" },
		},
	);

	formData.slider({ translate: "scpdy.machinery.alarm.redstoneDetectionExtend" }, 1, 5, {
		defaultValue: 2,
		valueStep: 1,
		tooltip: { translate: "scpdy.machinery.alarm.redstoneDetectionExtent.tip" },
	});

	const response = await formData.show(e.player);

	if (!e.player.isValid) return;
	if (response.canceled) return;
	if (!response.formValues) return;

	const newPermutation = e.permutationToPlace
		.withState(STATE.redstoneDir, redstoneDirs[Number(response.formValues[0])]!)
		.withState(STATE.redstoneExtend, Number(response.formValues[1]));

	if (!e.block.isAir && !e.block.isLiquid) return;

	const abort =
		!isCreativeOrSpectator(e.player) &&
		consumeHandItem(e.player, {
			filter: (itemStack) => itemStack.typeId === e.permutationToPlace.getItemStack()?.typeId,
			max: 1,
		}) <= 0;

	if (abort) return;

	e.block.setPermutation(newPermutation);

	e.dimension.playSound("dig.copper", e.block.center(), { pitch: randf(0.8, 1.0) });
}
