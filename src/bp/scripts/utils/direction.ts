import * as mc from "@minecraft/server";

/**
 * Reverse a direction.
 * @param direction - Original direction.
 * @returns Reversed version of `direction`.
 * @throws Will throw an error if the provided direction is unknown.
 */
export function reverseDirection(direction: mc.Direction): mc.Direction {
	switch (direction) {
		case mc.Direction.Up:
			return mc.Direction.Down;
		case mc.Direction.Down:
			return mc.Direction.Up;
		case mc.Direction.North:
			return mc.Direction.South;
		case mc.Direction.South:
			return mc.Direction.North;
		case mc.Direction.West:
			return mc.Direction.East;
		case mc.Direction.East:
			return mc.Direction.West;
		default:
			throw new Error(`Unknown direction: ${direction}`);
	}
}

/**
 * Retrieves a block relative to the given origin block in the specified direction and number of steps.
 * @param origin - The starting block from which to calculate the relative position.
 * @param direction - The direction in which to move relative to the origin block.
 * @param steps - The number of steps to move in the specified direction (default is 1).
 * @returns The block at the relative position, could be undefined.
 * @throws Will throw an error if the provided direction is unknown.
 */
export function getRelativeBlockAtDirection(
	origin: mc.Block,
	direction: mc.Direction,
	steps = 1,
): mc.Block | undefined {
	switch (direction) {
		case mc.Direction.Up:
			return origin.above(steps);
		case mc.Direction.Down:
			return origin.below(steps);
		case mc.Direction.North:
			return origin.north(steps);
		case mc.Direction.South:
			return origin.south(steps);
		case mc.Direction.West:
			return origin.west(steps);
		case mc.Direction.East:
			return origin.east(steps);
		default:
			throw new Error(`Unknown direction: ${direction}`);
	}
}

/**
 * Gets the value of `minecraft:cardinal_direction` state.
 * @param permutation - Block permutation.
 * @returns Direction, undefined if the state does not exist.
 */
export function getBlockCardinalDirection(
	permutation: mc.BlockPermutation,
): mc.Direction | undefined {
	const blockDir = permutation.getState("minecraft:cardinal_direction");

	switch (blockDir) {
		case "north":
			return mc.Direction.North;
		case "south":
			return mc.Direction.South;
		case "west":
			return mc.Direction.West;
		case "east":
			return mc.Direction.East;
	}

	return undefined;
}

/**
 * Gets the value of `minecraft:block_face` state.
 * @param permutation - Block permutation.
 * @returns Direction, undefined if the state does not exist.
 */
export function getBlockFace(permutation: mc.BlockPermutation): mc.Direction | undefined {
	const blockDir = permutation.getState("minecraft:block_face");

	switch (blockDir) {
		case "up":
			return mc.Direction.Up;
		case "down":
			return mc.Direction.Down;
		case "north":
			return mc.Direction.North;
		case "south":
			return mc.Direction.South;
		case "west":
			return mc.Direction.West;
		case "east":
			return mc.Direction.East;
	}

	return undefined;
}
