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

const isDist = args.values.distDir != null;

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

	console.log("Starting initial compilation...");

	const bpWatcherPromise: any = syncdir(bpSrcDir, bpOutDir, {
		watch: args.values.watch,
		deleteOrphaned: true,
		chokidarWatchOptions,
		exclude: /.*scripts.*/,
		afterEachSync,
	});

	const rpWatcherPromise: any = syncdir(rpSrcDir, rpOutDir, {
		watch: args.values.watch,
		deleteOrphaned: true,
		chokidarWatchOptions,
		afterEachSync,
	});

	const [bpWatcher, rpWatcher] = await Promise.all([bpWatcherPromise, rpWatcherPromise]);

	console.log("Synced!");

	const srcScriptsDir = path.resolve("./src/bp/scripts/");

	const bpScriptOutdir = path.join(bpOutDir, "scripts");
	const bpScriptutfile = path.join(bpScriptOutdir, "main.js");

	await fs.ensureDir(path.dirname(bpScriptutfile));
	await fs.emptyDir(bpScriptOutdir);

	console.log(bpScriptutfile);

	const esbuildOpts: esbuild.BuildOptions = {
		entryPoints: [path.join(srcScriptsDir, "main.ts")],
		outfile: bpScriptutfile,
		bundle: true,
		allowOverwrite: true,
		external: ["@minecraft"],
		tsconfig: "./tsconfig.json",
		format: "esm",
		platform: "neutral",
		charset: "utf8",
		plugins: [],
	};

	if (!isDist) {
		esbuildOpts.sourcemap = true;
		esbuildOpts.sourceRoot = srcScriptsDir;
		esbuildOpts.write = false; // Write functionality is in custom plugin below
		esbuildOpts.plugins?.push({
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
							const convertedSources = sources.map((x) => path.relative(srcScriptsDir, fileURLToPath(x)));
							data.sources = convertedSources;
							toWrite = JSON.stringify(data, null, 2);
						}

						fs.writeFileSync(outputFile.path, toWrite, "utf8");
					}
				});
			},
		});
		esbuildOpts.plugins?.push({
			name: "build-log",
			setup(build) {
				build.onEnd(() => {
					console.log(getCurrentTimeString(), "Bundled BP scripts!");
				});
			},
		});
	}

	let esbuildCtx: esbuild.BuildContext | null = null;

	if (args.values.watch) {
		esbuildCtx = await esbuild.context(esbuildOpts);
		esbuildCtx.watch();
	} else {
		await esbuild.build(esbuildOpts);
		console.log("Bundled BP scripts!");
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
