import fs from "fs-extra";
import esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { async as syncdir } from "sync-directory";
import { getCurrentTimeString, getDevPackDirs } from "./utils";
import path from "node:path";
import { BP_NAME, RP_NAME } from "./consts";
import chalk from "chalk";

const args = parseArgs({
	args: process.argv.slice(2),
	options: {
		distDir: {
			type: "string",
		},
		beta: {
			type: "boolean",
		},
		watch: {
			type: "boolean",
		},
	},
});

const { devBehaviorPacks, devResourcePacks } = getDevPackDirs();

const bpSrcDir = path.resolve("src/bp");
const bpOutDir =
	args.values.distDir != null
		? path.join(path.resolve(args.values.distDir), BP_NAME)
		: path.join(devBehaviorPacks, BP_NAME);

const rpSrcDir = path.resolve("src/rp");
const rpOutDir =
	args.values.distDir != null
		? path.join(path.resolve(args.values.distDir), RP_NAME)
		: path.join(devResourcePacks, RP_NAME);

async function main(): Promise<void> {
	const chokidarWatchOptions = {
		awaitWriteFinish: {
			stabilityThreshold: 300,
			pollInterval: 100,
		},
		atomic: 100,
	};

	const afterEachSync = (info: any) => {
		if (info.eventType.startsWith("init:")) return;

		const relativePath = path.relative("src/", info.srcPath);

		console.log(getCurrentTimeString(), `${info.eventType}: ${relativePath}`);
	};

	console.log(chalk.gray("Starting initial pack sync..."));

	const bpWatcher: any = await syncdir(bpSrcDir, bpOutDir, {
		watch: args.values.watch,
		deleteOrphaned: true,
		chokidarWatchOptions,
		exclude: /.*scripts.*/,
		afterEachSync,
	});

	const rpWatcher: any = await syncdir(rpSrcDir, rpOutDir, {
		watch: args.values.watch,
		deleteOrphaned: true,
		chokidarWatchOptions,
		afterEachSync,
	});

	console.log("Synced!");

	const srcScriptsDir = path.resolve("./src/bp/scripts/");

	const outdir = path.join(bpOutDir, "scripts");
	const outfile = path.join(outdir, "main.js");

	await fs.ensureDir(path.dirname(outfile));
	await fs.emptyDir(outdir);

	const esbuildOpts: esbuild.BuildOptions = {
		entryPoints: [path.join(srcScriptsDir, "main.ts")],
		outfile,
		bundle: true,
		allowOverwrite: true,
		sourcemap: true,
		sourceRoot: srcScriptsDir,
		external: ["@minecraft"],
		tsconfig: "./tsconfig.json",
		format: "esm",
		platform: "neutral",
		charset: "utf8",
		write: false, // Write functionality is in custom plugin below
		plugins: [
			{
				name: "custom-write",
				setup(build) {
					build.onEnd((result) => {
						if (!result.outputFiles) return;

						for (const outputFile of result.outputFiles) {
							let toWrite = outputFile.text;

							// Tweak source map contents for Minecraft
							if (path.extname(outputFile.path) === ".map") {
								const data = JSON.parse(outputFile.text);
								const sources = data.sources as string[];
								const convertedSources = sources.map((x) =>
									path.relative(srcScriptsDir, fileURLToPath(x)),
								);
								data.sources = convertedSources;
								toWrite = JSON.stringify(data, null, 2);
							}

							fs.writeFileSync(outputFile.path, toWrite, "utf8");
						}
					});
				},
			},
			{
				name: "build-log",
				setup(build) {
					build.onEnd(() => {
						console.log(getCurrentTimeString(), "Bundled scripts!");
					});
				},
			},
		],
	};

	let esbuildCtx: esbuild.BuildContext | null = null;

	console.log(chalk.gray("Bundling scripts..."));

	if (args.values.watch) {
		esbuildCtx = await esbuild.context(esbuildOpts);
		esbuildCtx.watch();
	} else {
		try {
			await esbuild.build(esbuildOpts);
		} catch {}
	}

	if (!args.values.watch) {
		console.log("Build finished!");
		return;
	}

	// Delay a little bit
	await new Promise((resolve) => setTimeout(resolve, 100));

	console.log(chalk.cyan("Watching for file changes... (Press CTRL+c to stop)"));

	return new Promise((resolve) => {
		process.once("SIGINT", async () => {
			try {
				console.log(chalk.yellow("Stopped watching"));
				(await bpWatcher).unwatch();
				(await rpWatcher).unwatch();
				await esbuildCtx?.cancel();
				await esbuildCtx?.dispose();
				await esbuild.stop();
			} finally {
				resolve();
			}
		});
	});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch(console.error);
}
