import chalk from "chalk";
import fs from "fs-extra";
import path from "node:path";
import { parseArgs } from "node:util";
import { getDevPackDirs } from "./utils";
import { BP_NAME, RP_NAME } from "./consts";

const args = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	allowNegative: true,
	options: {
		"inside-com-mojang": {
			type: "boolean",
			default: false,
		},
		"com-mojang-beta": {
			type: "boolean",
			default: false,
		},
	},
});

const entries: string[] = args.positionals.map((x) => path.resolve(x));

if (args.values["inside-com-mojang"]) {
	const { devBehaviorPacks, devResourcePacks } = getDevPackDirs(args.values["com-mojang-beta"]);
	const bpOutDir = path.join(devBehaviorPacks, BP_NAME);
	const rpOutDir = path.join(devResourcePacks, RP_NAME);
	entries.push(bpOutDir);
	entries.push(rpOutDir);
}

for (const entry of entries) {
	try {
		await fs.rm(entry, { recursive: true });
		console.log(chalk.green(`Removed ${entry}`));
	} catch (error) {
		console.error(chalk.red(`Failed to remove ${entry}: ${error}`));
	}
}
