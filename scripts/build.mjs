"use strict";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs-extra";
import syncdir from "sync-directory";
import yesno from "yesno";
import * as esbuild from "esbuild";
import * as url from "node:url";
import * as path from "node:path";
import * as os from "node:os";
import colors from "./colors.mjs";

const SRC_BP_PATH = path.resolve("./src/bp");
const SRC_RP_PATH = path.resolve("./src/rp");

const BUILD_BP_NAME = "SCPDY_BP";
const BUILD_RP_NAME = "SCPDY_RP";

const argv = await yargs(hideBin(process.argv))
	.usage("Usage: $0 <command> [options]")

	.command("dev", "Create development build (at local Minecraft installation)", function (yargs) {
		return yargs
			.option("watch", {
				alias: "w",
				type: "boolean",
				describe: "Watch for file changes and automatically update build",
			})
			.option("beta", {
				alias: "b",
				type: "boolean",
				describe: "Set output location to Minecraft Preview",
			});
	})

	.command("dist", "Create production build (at dist/)")

	// At least one command must be specified
	.demand(1, "Please specify one of the commands!")
	.strict()

	.help("h")
	.alias("h", "help")
	.alias("v", "version").argv;

// Script should not run if it's not the main file
if (import.meta.url.startsWith("file:") && process.argv[1] === url.fileURLToPath(import.meta.url)) {
	await main();
}

async function main() {
	switch (argv._[0]) {
		case "dev":
			await dev({
				watch: argv["watch"] === true,
				beta: argv["beta"] === true,
			});
			break;
		case "dist":
			await dist();
			break;
	}
}

/**
 * @typedef DevBuildArgs
 * @property {boolean} watch
 * @property {boolean} beta
 */

/**
 * @param {DevBuildArgs} args
 */
async function dev(args) {
	const mc = getMinecraftPath(args.beta);

	const targetBpPath = path.join(
		mc,
		"LocalState/games/com.mojang/development_behavior_packs",
		BUILD_BP_NAME,
	);

	const targetRpPath = path.join(
		mc,
		"LocalState/games/com.mojang/development_resource_packs",
		BUILD_RP_NAME,
	);

	/** @type {RegExp} */
	const syncdirExclusionPattern = /.*\\(tsconfig.json|scripts.*|.git.*)/;

	if (args.watch) {
		console.log(`Press ${colors.FgMagenta}Ctrl+C${colors.Reset} to stop process`);

		// Wait a second to give user a time to read the log above
		await new Promise((resolve) => {
			setTimeout(resolve, 800);
		});
	}

	const bpWatcher = /** @type {import('chokidar').FSWatcher | undefined} */ (
		syncdir(SRC_BP_PATH, targetBpPath, {
			/** @type {import('chokidar').ChokidarOptions} */
			chokidarWatchOptions: {},
			deleteOrphaned: true,
			exclude: syncdirExclusionPattern,
			watch: args.watch,
			afterEachSync: (params) =>
				console.log(
					`${colors.FgGray}Synced ${colors.FgWhite}bp${params?.relativePath}${colors.Reset}`,
				),
		})
	);

	const rpWatcher = /** @type {import('chokidar').FSWatcher | undefined} */ (
		syncdir(SRC_RP_PATH, targetRpPath, {
			/** @type {import('chokidar').ChokidarOptions} */
			chokidarWatchOptions: {},
			deleteOrphaned: true,
			exclude: syncdirExclusionPattern,
			watch: args.watch,
			afterEachSync: (params) =>
				console.log(
					`${colors.FgGray}Synced ${colors.FgWhite}rp${params?.relativePath}${colors.Reset}`,
				),
		})
	);

	/** @type {import('esbuild').BuildOptions} */
	const bpScriptEsbuildOptions = {
		absWorkingDir: SRC_BP_PATH,
		entryPoints: [path.join(SRC_BP_PATH, "scripts", "main.ts")],
		outfile: path.join(targetBpPath, "scripts", "main.js"),
		bundle: true,
		minify: false,
		loader: { ".ts": "ts" },
		allowOverwrite: true,
		external: ["@minecraft"],
		charset: "utf8",
		format: "esm",
		platform: "neutral",
		sourcemap: "linked",
		sourceRoot: SRC_BP_PATH,
		plugins: [
			{
				name: "rebuild-notify",
				setup(build) {
					build.onEnd((result) => {
						const color = result.errors.length > 0 ? colors.FgRed : colors.FgGreen;
						console.log(
							`${color}Bundling behavior pack script ended with ${result.errors.length} errors${colors.Reset}`,
						);
					});
				},
			},
		],
	};

	if (args.watch) {
		(async () => {
			const ctx = await esbuild.context(bpScriptEsbuildOptions);
			await ctx.watch();
		})();
	} else {
		await esbuild.build(bpScriptEsbuildOptions);
	}
}

async function dist() {
	const distDir = path.resolve("./dist");

	if (fs.existsSync(distDir)) {
		const deleteDistDir = await yesno({
			defaultValue: true,
			question: "Build already exists. Delete it? (y/n):",
		});

		if (!deleteDistDir) return;

		await fs.rm(distDir, { force: true, recursive: true });

		console.log(`Deleted ${distDir}`);
	}

	const targetBpPath = path.join(distDir, BUILD_BP_NAME);
	const targetRpPath = path.join(distDir, BUILD_RP_NAME);

	console.log("Generating build...");

	try {
		/** @type {RegExp} */
		const syncdirExclusionPattern = /.*\\(tsconfig.json|scripts.*|.git.*)/;

		syncdir(SRC_BP_PATH, targetBpPath, {
			exclude: syncdirExclusionPattern,
		});

		syncdir(SRC_RP_PATH, targetRpPath, {
			exclude: syncdirExclusionPattern,
		});

		/** @type {import('esbuild').BuildOptions} */
		const bpScriptEsbuildOptions = {
			absWorkingDir: SRC_BP_PATH,
			entryPoints: [path.join(SRC_BP_PATH, "scripts", "main.ts")],
			outfile: path.join(targetBpPath, "scripts", "main.js"),
			bundle: true,
			minify: true,
			loader: { ".ts": "ts" },
			external: ["@minecraft"],
			charset: "utf8",
			format: "esm",
			platform: "neutral",
		};

		const bpScriptEsbuildResult = await esbuild.build(bpScriptEsbuildOptions);

		if (bpScriptEsbuildResult.errors.length > 0)
			throw new Error(
				`Bundling behavior pack script ended with ${bpScriptEsbuildResult.errors.length} errors`,
			);

		console.log(`${colors.FgGreen}Finished!${colors.Reset}`);
	} catch (err) {
		console.error(`${colors.FgRed}Build process resulted in an error\n${err}${colors.Reset}`);
	}
}

/** @returns {string} */
function getMinecraftPath(beta = false) {
	return path.join(
		os.homedir(),
		beta
			? "AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe"
			: "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe",
	);
}
