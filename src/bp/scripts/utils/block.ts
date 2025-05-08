import * as mc from "@minecraft/server";

/**
 * Destroys a block by running `setblock` command with `destroy` flag set to true.
 * @param block - The block.
 */
export function destroyBlock(block: mc.Block): void {
	const location = `${block.x} ${block.y} ${block.z}`;
	block.dimension.runCommand(`setblock ${location} air destroy`);
}
