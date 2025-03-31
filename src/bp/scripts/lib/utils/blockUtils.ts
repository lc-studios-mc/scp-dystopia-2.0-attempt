import * as mc from "@minecraft/server";

const AIR_OR_LIQUID_BLOCK_TYPE = new Set<string>([
	"minecraft:air",
	"minecraft:water",
	"minecraft:flowing_water",
	"minecraft:lava",
	"minecraft:flowing_lava",
],);

export function isAirOrLiquid(block: mc.Block): boolean;

export function isAirOrLiquid(blockTypeId: string): boolean;

export function isAirOrLiquid(value: mc.Block | string): boolean {
	if (typeof value === "string") {
		return AIR_OR_LIQUID_BLOCK_TYPE.has(value,);
	}

	return AIR_OR_LIQUID_BLOCK_TYPE.has(value.typeId,);
}

/**
 * @returns Whether the given block or any of its connected block has redstone power greater than 0.
 */
export function anyConnectedBlockHasRedstonePower(block: mc.Block): boolean {
	if ((block.getRedstonePower() ?? 0) > 0) return true;
	if ((block.above()?.getRedstonePower() ?? 0) > 0) return true;
	if ((block.below()?.getRedstonePower() ?? 0) > 0) return true;
	if ((block.north()?.getRedstonePower() ?? 0) > 0) return true;
	if ((block.south()?.getRedstonePower() ?? 0) > 0) return true;
	if ((block.east()?.getRedstonePower() ?? 0) > 0) return true;
	if ((block.west()?.getRedstonePower() ?? 0) > 0) return true;
	return false;
}

/**
 * @returns Another block in relative position of the given block.
 */
export function getRelativeBlock(
	origin: mc.Block,
	direction: mc.Direction,
	steps: number = 1,
): mc.Block | undefined {
	switch (direction) {
		case mc.Direction.Down:
			return origin.below(steps,);
		case mc.Direction.Up:
			return origin.above(steps,);
		case mc.Direction.North:
			return origin.north(steps,);
		case mc.Direction.South:
			return origin.south(steps,);
		case mc.Direction.East:
			return origin.east(steps,);
		case mc.Direction.West:
			return origin.west(steps,);
	}
}

export function getBlockCardinalDirection(permutation: mc.BlockPermutation): mc.Direction {
	const direction = permutation.getState("minecraft:cardinal_direction",) as
		| "north"
		| "south"
		| "west"
		| "east";

	switch (direction) {
		default:
		case "north":
			return mc.Direction.North;
		case "south":
			return mc.Direction.South;
		case "west":
			return mc.Direction.West;
		case "east":
			return mc.Direction.East;
	}
}
