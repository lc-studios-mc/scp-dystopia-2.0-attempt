"use strict";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as url from "node:url";
import * as path from "node:path";
import fs from "fs-extra";
import { getTargetBehaviorPackDir, getTargetResourcePackDir } from "./shared.mjs";

const argv = yargs(hideBin(process.argv))
	.usage("Usage: $0 <command> [options]")

	.command("dev", "Delete development build at local Minecraft directory", function (yargs) {
		return yargs.option("beta-mc", {
			alias: "b",
			type: "boolean",
			describe: "Look for the packs in Minecraft Preview instead",
		});
	})

	.command("dist", "Delete dist directory")

	// at least one command is required
	.demand(1, "Please specify one of the commands!")
	.strict()

	.help("h")
	.alias("h", "help")
	.alias("v", "version").argv;

async function deleteDevBuild(beta = false) {
	const bp = getTargetBehaviorPackDir(beta);
	const rp = getTargetResourcePackDir(beta);

	try {
		await fs.rm(bp, { recursive: true });
		console.log(`Deleted behavior pack at ${bp}`);
	} catch (error) {
		console.error("Failed to delete behavior pack:", error);
	}

	try {
		await fs.rm(rp, { recursive: true });
		console.log(`Deleted resource pack at ${rp}`);
	} catch (error) {
		console.error("Failed to delete resource pack:", error);
	}
}

async function deleteDist() {
	const distDir = path.resolve("./dist");

	try {
		await fs.rm(distDir, { recursive: true });
		console.log(`Deleted dist at ${distDir}`);
	} catch (error) {
		console.error("Failed to delete dist:", error);
	}
}

async function main() {
	switch (argv._[0]) {
		case "dev-build":
			deleteDevBuild(argv["beta-mc"] === true);
			break;
		case "dist":
			deleteDist();
			break;
	}
}

if (import.meta.url.startsWith("file:") && process.argv[1] === url.fileURLToPath(import.meta.url)) {
	await main();
}
