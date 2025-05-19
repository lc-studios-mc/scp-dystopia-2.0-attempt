import { consumeHandItem, isCreativeOrSpectator } from "@/utils/player";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { _getModeStringFromIndex, _isModeString } from "./mode";
import { randf } from "@/utils/math";
import { getEntityClearanceLevel } from "@/utils/clearance_level";
import { MachineryInputEvents } from "./events";
import { getBlockCardinalDirection, reverseDirection } from "@/utils/direction";

const STATE = {
	isOn: "lc:is_on",
	clearanceLevel: "lc:clearance_level",
	mode: "lc:mode",
} as const;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:kr", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	beforeOnPlayerPlace(arg) {
		arg.cancel = true; // Custom placement logic is required

		mc.system.run(async () => {
			if (!arg.player) return;

			const formData = new ModalFormData();

			formData.title({ translate: "scpdy.machinery.input.kr.text" });
			formData.dropdown(
				{ translate: "scpdy.misc.text.clearanceLevel" },
				[
					{ translate: "scpdy.misc.text.clearanceLevel.level_0" },
					{ translate: "scpdy.misc.text.clearanceLevel.level_1" },
					{ translate: "scpdy.misc.text.clearanceLevel.level_2" },
					{ translate: "scpdy.misc.text.clearanceLevel.level_3" },
					{ translate: "scpdy.misc.text.clearanceLevel.level_4" },
					{ translate: "scpdy.misc.text.clearanceLevel.level_5" },
					{ translate: "scpdy.misc.text.clearanceLevel.o5" },
				],
				{
					defaultValueIndex: 0,
					tooltip: { translate: "scpdy.misc.text.clearanceLevel.tooltip" },
				},
			);
			formData.dropdown(
				{ translate: "scpdy.machinery.input.mode.text" },
				[
					{ translate: "scpdy.machinery.input.mode.text.powerRelayDoors" },
					{ translate: "scpdy.machinery.input.mode.text.ctrlBlastDoor" },
					{ translate: "scpdy.machinery.input.mode.text.placeRbBelow" },
					{ translate: "scpdy.machinery.input.mode.text.placeRbBehind" },
				],
				{
					defaultValueIndex: 0,
					tooltip: { translate: "scpdy.machinery.input.mode.text.tooltip" },
				},
			);

			const response = await formData.show(arg.player);

			if (response.canceled) return;
			if (!response.formValues) return;

			const clearanceLevel = Number(response.formValues[0]);
			const modeIndex = Number(response.formValues[1]);
			const mode = _getModeStringFromIndex(modeIndex);

			const newPermutation = arg.permutationToPlace
				.withState(STATE.clearanceLevel, clearanceLevel)
				.withState(STATE.mode, mode);

			if (!arg.block.isAir && !arg.block.isLiquid) return;

			const abort =
				!isCreativeOrSpectator(arg.player) &&
				consumeHandItem(arg.player, {
					filter: (itemStack) => itemStack.typeId === arg.permutationToPlace.getItemStack()?.typeId,
					max: 1,
				}) <= 0;

			if (abort) return;

			arg.block.setPermutation(newPermutation);

			arg.dimension.playSound("dig.copper", arg.block.center(), { pitch: randf(0.8, 1.0) });
		});
	},
	onPlayerInteract({ block, dimension, player }) {
		if (!player) return;

		const isOn = Boolean(block.permutation.getState(STATE.isOn));
		if (isOn) return;

		const minimumClearanceLevel = Number(block.permutation.getState(STATE.clearanceLevel));
		const playerClearanceLevel = getEntityClearanceLevel(player);

		const isAccepted = playerClearanceLevel >= minimumClearanceLevel;

		if (!isAccepted) {
			dimension.playSound("scpdy.interact.keycard_reader.deny", block.center());
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.misc.text.youDontHaveRequiredClearanceLevel",
				with: [String(minimumClearanceLevel)],
			});
			return;
		}

		const mode = String(block.permutation.getState(STATE.mode));
		if (!_isModeString(mode)) {
			throw new Error(`Unknown mode: ${mode}`);
		}

		const dir1 = getBlockCardinalDirection(block.permutation);
		if (!dir1) {
			throw new Error("Failed to get block direction");
		}

		const dir2 = reverseDirection(dir1);

		MachineryInputEvents.emit("onActivate", {
			mode,
			dimension,
			location: block.center(),
			clearanceLevel: playerClearanceLevel,
			source: player,
			block,
			pulseDirection: dir2,
		});

		block.setPermutation(block.permutation.withState(STATE.isOn, true));
		dimension.playSound("scpdy.interact.keycard_reader.accept", block.center());
	},
	onTick({ block }) {
		const isOn = Boolean(block.permutation.getState(STATE.isOn));
		if (!isOn) return;

		block.setPermutation(block.permutation.withState(STATE.isOn, false));
	},
};
