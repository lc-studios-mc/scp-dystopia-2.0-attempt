import { getBlockCardinalDirection, reverseDirection } from "@/utils/direction";
import { randf } from "@/utils/math";
import { consumeHandItem, isCreativeOrSpectator } from "@/utils/player";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { InputDeviceEvents } from "./events";
import { getInputDeviceModeFromIndex, isInputDeviceMode } from "./mode";

const STATE = {
	isPressed: "lc:is_pressed",
	mode: "lc:mode",
	rbLifespan: "lc:rb_lifespan",
} as const;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:btn", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	beforeOnPlayerPlace(arg) {
		arg.cancel = true; // Custom placement logic is required

		mc.system.run(async () => {
			if (!arg.player) return;

			const formData = new ModalFormData();

			formData.title({ translate: "scpdy.machinery.input.btn.text" });
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
			formData.slider({ translate: "scpdy.machinery.input.rbLifespan" }, 1, 5, {
				defaultValue: 5,
				valueStep: 1,
				tooltip: "scpdy.machinery.input.rbLifespan.tooltip",
			});

			// @ts-expect-error
			const response = await formData.show(arg.player);

			if (response.canceled) return;
			if (!response.formValues) return;

			const modeIndex = Number(response.formValues[0]);
			const mode = getInputDeviceModeFromIndex(modeIndex);
			const rbLifespan = Number(response.formValues[1]);

			const newPermutation = arg.permutationToPlace.withState(STATE.mode, mode).withState(STATE.rbLifespan, rbLifespan);

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

			// Redstone Block Placeholder tip
			if (mode !== "placeRbBehind" && mode !== "placeRbBelow") return;
			if (!arg.player.addTag("scpdy_sent_input_device_rb_tip")) return;
			mc.system.runTimeout(() => {
				if (!arg.player || !arg.player.isValid) return;
				arg.player.sendMessage({ translate: "scpdy.machinery.input.rbMode.tip" });
				arg.player.playSound("random.orb");
			}, 8);
		});
	},
	onPlayerInteract({ block, dimension, player }) {
		if (!player) return;

		const isPressed = Boolean(block.permutation.getState(STATE.isPressed));
		if (isPressed) return;

		block.setPermutation(block.permutation.withState(STATE.isPressed, true));

		dimension.playSound("scpdy.interact.button.click", block.center());

		const mode = String(block.permutation.getState(STATE.mode));
		if (!isInputDeviceMode(mode)) {
			throw new Error(`Unknown mode: ${mode}`);
		}

		const dir1 = getBlockCardinalDirection(block.permutation);
		if (!dir1) {
			throw new Error("Failed to get block direction");
		}

		const dir2 = reverseDirection(dir1);

		InputDeviceEvents.emit("onActivate", {
			mode,
			dimension,
			location: block.center(),
			clearanceLevel: -1,
			source: player,
			block,
			pulseDirection: dir2,
			rbLifespan: Number(block.permutation.getState(STATE.rbLifespan)),
		});
	},
	onTick({ block, dimension }) {
		const isPressed = Boolean(block.permutation.getState(STATE.isPressed));
		if (!isPressed) return;

		block.setPermutation(block.permutation.withState(STATE.isPressed, false));

		dimension.playSound("scpdy.interact.button.click", block.center(), {
			pitch: 0.23,
			volume: 0.19,
		});
	},
};
