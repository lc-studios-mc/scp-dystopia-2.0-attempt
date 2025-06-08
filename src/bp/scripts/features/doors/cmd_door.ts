import { flattenCoordinates, unflattenToCoordinates } from "@/utils/math";
import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";
import { destroyBlock } from "@/utils/block";

interface CmdDoorComponentParams {
	openSound?: {
		id: string;
		volume?: number;
		pitch?: number;
	};
	closeSound?: {
		id: string;
		volume?: number;
		pitch?: number;
	};
}

type ControlMode = "close" | "open" | "switch";
type NextAction = "none" | "open" | "close";

const STATE = {
	isBottomPart: "lc:is_bottom_part",
	nextAction: "lc:next_action",
	powerLevelMinor: "lc:power_level_minor",
	stepMajor: "lc:step_major",
	stepMinor: "lc:step_minor",
} as const;

const minStepIndex = 0;
const maxStepIndex = 15;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:cmd_door", COMPONENT);

	event.customCommandRegistry.registerEnum("scpdy:cmdDoorCtrlMode", ["close", "open", "switch"]);

	event.customCommandRegistry.registerCommand(
		{
			name: "scpdy:cmddoor",
			description: "Control a Command Door of SCP: Dystopia addon",
			permissionLevel: mc.CommandPermissionLevel.GameDirectors,
			mandatoryParameters: [
				{
					name: "scpdy:cmdDoorCtrlMode",
					type: mc.CustomCommandParamType.Enum,
				},
				{
					name: "location",
					type: mc.CustomCommandParamType.Location,
				},
			],
		},
		(origin, unknownMode, location) => {
			const dimension =
				origin.initiator?.dimension ??
				origin.sourceBlock?.dimension ??
				origin.sourceEntity?.dimension ??
				mc.world.getDimension("overworld");

			if (!vec3.isVector3(location)) return;

			const mode = unknownMode as ControlMode;

			const block = dimension.getBlock(location);

			if (!block)
				return {
					status: mc.CustomCommandStatus.Failure,
					message: `Failed to get a block at ${vec3.toString2(location)}`,
				};

			try {
				tryControl(block, mode);
			} catch (error) {
				return {
					status: mc.CustomCommandStatus.Failure,
					message: `${error}`,
				};
			}

			return {
				status: mc.CustomCommandStatus.Success,
				message: `Successfully sent a control signal to the Command Door at ${vec3.toString2(block)}`,
			};
		},
	);
});

const COMPONENT: mc.BlockCustomComponent = {
	onTick({ block, dimension }, arg1) {
		const params = arg1.params as CmdDoorComponentParams;

		const isBottomPart = Boolean(block.permutation.getState(STATE.isBottomPart));
		if (!isBottomPart) return; // Only the bottom part should simulate

		const otherPartBlock = isBottomPart ? block.above() : block.below();
		if (!otherPartBlock || otherPartBlock.typeId !== block.typeId) return;

		const nextAction = block.permutation.getState(STATE.nextAction) as NextAction;

		const { major: currentStepMajor, minor: currentStepMinor } = getStep(block.permutation);
		const currentStepIndex = flattenCoordinates(currentStepMajor, currentStepMinor);
		const newStepIndex = getUpdatedStepIndex(currentStepIndex, nextAction, minStepIndex, maxStepIndex);

		const newNextAction: NextAction =
			// maybe i can make this cleaner but im too lazy
			mc.system.currentTick % 2 === 0 && (newStepIndex <= minStepIndex || newStepIndex >= maxStepIndex)
				? "none"
				: nextAction;

		const newStepUnflat = unflattenToCoordinates(newStepIndex, 4);
		block.setPermutation(
			block.permutation
				.withState(STATE.nextAction, newNextAction)
				.withState(STATE.stepMajor, newStepUnflat.major)
				.withState(STATE.stepMinor, newStepUnflat.minor),
		);
		otherPartBlock.setPermutation(
			otherPartBlock.permutation
				.withState(STATE.stepMajor, newStepUnflat.major)
				.withState(STATE.stepMinor, newStepUnflat.minor),
		);

		// --- Play Sounds ---
		if (mc.system.currentTick % 2 !== 0) return currentStepIndex; // Sounds are also updated only every 2 ticks
		if (params.openSound && nextAction === "open" && newStepIndex === 1) {
			dimension.playSound(params.openSound.id, block.location, {
				volume: params.openSound.volume,
				pitch: params.openSound.pitch,
			});
		}
		if (params.closeSound && nextAction === "close" && newStepIndex === 14) {
			dimension.playSound(params.closeSound.id, block.location, {
				volume: params.closeSound.volume,
				pitch: params.closeSound.pitch,
			});
		}
	},
	beforeOnPlayerPlace({ player }) {
		if (!player) return;

		mc.system.run(() => {
			if (!player.addTag("scpdy_sent_cmd_door_beginner_tip")) return;

			mc.system.runTimeout(() => {
				player.sendMessage({ translate: "scpdy.cmdDoor.text.beginnerTip" });
				player.playSound("random.orb");
			}, 8);
		});
	},
	onPlace({ block }) {
		const isBottomPart = Boolean(block.permutation.getState(STATE.isBottomPart));

		if (!isBottomPart) {
			const blockBelow = block.below();

			if (!blockBelow || blockBelow.typeId === block.typeId) return;

			block.setType("minecraft:air");
			return;
		}

		const blockAbove = block.above();

		if (!blockAbove || !(blockAbove.isAir || block.isLiquid)) {
			destroyBlock(block);
			return;
		}

		const upperPartPermutation = block.permutation.withState(STATE.isBottomPart, false);

		blockAbove.setPermutation(upperPartPermutation);
	},
	onPlayerDestroy({ block, destroyedBlockPermutation }) {
		const isBottomPart = Boolean(destroyedBlockPermutation.getState(STATE.isBottomPart));
		const otherPartBlock = isBottomPart ? block.above() : block.below();

		if (!otherPartBlock || otherPartBlock.typeId !== destroyedBlockPermutation.type.id) return;

		destroyBlock(otherPartBlock);
	},
};

function getUpdatedStepIndex(
	currentStepIndex: number,
	nextAction: NextAction,
	minStepIndex: number,
	maxStepIndex: number,
): number {
	if (mc.system.currentTick % 2 !== 0) return currentStepIndex; // Steps are updated only every 2 ticks
	if (nextAction === "open" && currentStepIndex < maxStepIndex) {
		return currentStepIndex + 1;
	}
	if (nextAction === "close" && currentStepIndex > minStepIndex) {
		return currentStepIndex - 1;
	}
	return currentStepIndex;
}

function getStep(permutation: mc.BlockPermutation): { major: number; minor: number } {
	const major = Number(permutation.getState(STATE.stepMajor));
	const minor = Number(permutation.getState(STATE.stepMinor));
	return { major, minor };
}

function tryControl(cmdDoorBlock: mc.Block, mode: ControlMode): void {
	if (!cmdDoorBlock.isValid) throw new Error("Block is invalid");

	if (!cmdDoorBlock.hasTag("lc:cmd_door")) throw new Error("Block is not a Command Door");

	if (cmdDoorBlock.hasTag("lc:door_top_part")) {
		return tryControl(cmdDoorBlock.below()!, mode); // Only the bottom part should simulate
	}

	const newNextAction = getAppropriateNextActionForControl(cmdDoorBlock.permutation, mode);

	mc.system.run(() => {
		cmdDoorBlock.setPermutation(cmdDoorBlock.permutation.withState(STATE.nextAction, newNextAction));
	});
}

function getAppropriateNextActionForControl(permutation: mc.BlockPermutation, mode: ControlMode): NextAction {
	const { major: currentStepMajor, minor: currentStepMinor } = getStep(permutation);
	const currentStepIndex = flattenCoordinates(currentStepMajor, currentStepMinor);
	const currentNextAction = permutation.getState(STATE.nextAction) as NextAction;

	switch (mode) {
		case "close":
			return currentStepIndex > minStepIndex ? "close" : "none";
		case "open":
			return currentStepIndex < maxStepIndex ? "open" : "none";
		case "switch":
			return currentStepIndex < maxStepIndex || currentNextAction === "close"
				? "open"
				: currentStepIndex > minStepIndex || currentNextAction === "open"
					? "close"
					: "none";
	}
}
