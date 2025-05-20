import * as mc from "@minecraft/server";

/**
 * Creates a string of block states.
 * You can use the output string in commands such as `fill` and `setblock`. You might want to wrap it inside "`[]`" before using it inside a command.
 * @param states - The record object that represents block states.
 * @returns String that looks like: `"key1"=value1,"key2"=value2,"key3"=value3`
 */
export function createBlockStatesString(states: Record<string, string | number | boolean>): string {
	const array: string[] = [];

	for (const [k, v] of Object.entries(states)) {
		const vStr = typeof v === "string" ? `"${v}"` : `${v}`;
		array.push(`"${k}"=${vStr}`);
	}

	return array.join(",");
}

/**
 * Destroys a block by running `setblock` command with `destroy` flag set to true.
 * @param block - The block.
 */
export function destroyBlock(block: mc.Block): void {
	const location = `${block.x} ${block.y} ${block.z}`;
	block.dimension.runCommand(`setblock ${location} air destroy`);
}
