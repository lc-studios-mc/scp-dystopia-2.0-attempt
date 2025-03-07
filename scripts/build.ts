import * as node_url from "node:url";
import * as node_path from "node:path";
import fs from "fs-extra";
import esbuild from "esbuild";
import JSON5 from "json5";
import chokidar from "chokidar";
import { COLORS } from "./colors";
import {
	getDevPackDirectories,
	log,
	logError,
	logGuide,
	logPositive,
	logWarn,
	waitForCondition,
} from "./utils";
import {
	BUILD_BP_NAME,
	BUILD_IGNORE_PATTERN,
	BUILD_RP_NAME,
	SRC_BP_PATH,
	SRC_RP_PATH,
	SRC_TSCONFIG_PATH,
} from "./shared";
import { tsImport } from "tsx/esm/api";

export const getPackScriptEsbuildOpts = (
	packType: PackType,
	srcDir: string,
	targetDir: string,
	dev = false,
): esbuild.BuildOptions | undefined => {
	const entryPointPath = (() => {
		let path = node_path.join(srcDir, "scripts", "main.ts");
		if (fs.existsSync(path)) return path;
		path = path.slice(0, -2) + "mts";
		if (fs.existsSync(path)) return path;
		return undefined;
	})();

	if (entryPointPath === undefined) return;

	const outfilePath = (() => {
		const extension = entryPointPath.endsWith(".mts") ? ".mjs" : ".js";
		const path = node_path.join(targetDir, "scripts", `main${extension}`);
		return path;
	})();

	const opts: esbuild.BuildOptions = {
		bundle: true,
		minify: !dev,
		target: ["es2023"],
		allowOverwrite: true,
		external: ["@minecraft"],
		charset: "utf8",
		format: "esm",
		platform: "neutral",
		plugins: [
			{
				name: "rebuild-notify",
				setup(build) {
					build.onEnd((result) => {
						if (result.errors.length > 0) {
							logError(`Failed to bundle ${packType} scripts`);
						} else {
							logPositive(`Successfully bundled ${packType} scripts`);
						}
					});
				},
			},
		],

		absWorkingDir: srcDir,
		entryPoints: [entryPointPath],
		outfile: outfilePath,
		tsconfig: SRC_TSCONFIG_PATH,
		sourcemap: dev ? "linked" : undefined,
		sourceRoot: dev ? srcDir : undefined,
	};

	return opts;
};

type CompilePackOpts = {
	readonly dev?: boolean;
	readonly watch?: boolean;
};

type CompilePackResult = Either<{
	readonly executionTime: number;
}>;

const compilePack = async (
	packType: PackType,
	srcDir: string,
	targetDir: string,
	opts?: CompilePackOpts,
): Promise<CompilePackResult> => {
	try {
		srcDir = node_path.resolve(srcDir);
		if (!fs.existsSync(srcDir)) throw new Error("Does not exist");
		const stat = await fs.lstat(srcDir);
		if (!stat.isDirectory()) throw new Error("Not a directory");
	} catch (error) {
		logError(`Failed to resolve src directory (${srcDir})`);
		logError(`Error: ${error}`);
		return { success: false, error };
	}

	targetDir = node_path.resolve(targetDir);
	await fs.ensureDir(targetDir);

	const getSrcRelativePath = (srcPath: string) =>
		node_path.relative(srcDir, node_path.resolve(srcPath));

	const getTargetPath = (srcPath: string) => {
		const path = node_path.resolve(targetDir, getSrcRelativePath(srcPath));
		if (path.endsWith(".json.mts")) return path.slice(0, -4);
		return path;
	};

	const updateFile = async (srcPath: string): Promise<"copiedFile" | "tsToJson" | "error"> => {
		const targetPath = getTargetPath(srcPath);

		// A file with `.json.mts` extension will be imported as TypeScript module using tsx,
		// then its default exported object will get converted to JSON and written to target.
		if (srcPath.endsWith(".json.mts")) {
			try {
				// For some unknown reason, the file extension must be .mts and the file URL must end
				// with .mjs in order to prevent tsx from caching the module.
				let moduleUrl = node_url.pathToFileURL(srcPath).toString();
				moduleUrl = moduleUrl.slice(0, -2) + "js";
				const module = await tsImport(moduleUrl, {
					parentURL: import.meta.url,
					tsconfig: SRC_TSCONFIG_PATH,
				});

				const json = JSON.stringify(module.default, null, opts?.dev ? 2 : undefined);

				if (!fs.existsSync(srcPath))
					throw new Error("Src file was deleted before this TS-to-JSON process is finished");

				fs.writeFileSync(targetPath, json);
				return "tsToJson";
			} catch (error) {
				logError(`Failed to convert TS module (at ${srcPath}) to JSON\n${error}`);
				return "error";
			}
		}

		const MINIFY_JSON =
			!opts?.dev &&
			targetPath.endsWith(".json") &&
			node_path.basename(targetPath) !== "manifest.json";

		if (MINIFY_JSON) {
			// Minify JSON for production build
			const text = fs.readFileSync(srcPath, { encoding: "utf-8" });
			const obj = JSON5.parse(text); // Use JSON5 parser to allow comments
			const json = JSON.stringify(obj);
			fs.writeFileSync(targetPath, json);
		} else {
			fs.copyFileSync(srcPath, targetPath);
		}

		return "copiedFile";
	};

	const walkSrcDir = async (dir = srcDir) => {
		const dirEntries = await fs.readdir(dir);
		for (const entryName of dirEntries) {
			const fullPath = node_path.resolve(dir, entryName);
			if (BUILD_IGNORE_PATTERN.test(fullPath)) continue;
			const stat = await fs.lstat(fullPath);

			if (stat.isDirectory()) {
				if (entryName.startsWith("_")) continue;
				await fs.ensureDir(getTargetPath(fullPath));
				await walkSrcDir(fullPath);
				continue;
			}

			if (!stat.isFile()) continue;

			await updateFile(fullPath);
		}
	};

	if (!opts?.watch) {
		const execTimeStart = performance.now();
		await walkSrcDir();
		const execTimeEnd = performance.now();

		return {
			success: true,
			value: {
				executionTime: execTimeEnd - execTimeStart,
			},
		};
	}

	const initialCompileTimeStart = performance.now();
	await walkSrcDir();
	const initialCompileTimeEnd = performance.now();
	const initialCompileTime = initialCompileTimeEnd - initialCompileTimeStart;
	log(`Completed initial ${packType} compilation in ${initialCompileTime.toFixed(2)} ms`);

	log(`Watching ${packType}...`);

	const watcher = chokidar.watch(srcDir, {
		ignored: BUILD_IGNORE_PATTERN,
		ignoreInitial: true,
		awaitWriteFinish: {
			pollInterval: 500,
		},
	});

	const logFSUpdate = (msg: string, srcPath: string, error = false) =>
		error
			? log(`${COLORS.FgRed}[${packType}] ${msg}: ${node_path.relative(srcDir, srcPath)}`)
			: log(
					`${COLORS.FgMagenta}[${packType}] ${COLORS.FgGray}${msg}: ` +
						`${COLORS.FgWhite}${node_path.relative(srcDir, srcPath)}`,
			  );

	const addOrChangeCallback = (file: string) => {
		updateFile(file).then((result) => {
			switch (result) {
				case "copiedFile":
					logFSUpdate("Copied File", file);
					break;
				case "tsToJson":
					logFSUpdate("Converted TS to JSON", file);
					break;
				case "error":
					logFSUpdate("Error Updating File", file, true);
					break;
			}
		});
	};

	watcher.on("add", addOrChangeCallback);

	watcher.on("change", addOrChangeCallback);

	watcher.on("addDir", (file: string) => {
		const targetPath = getTargetPath(file);
		fs.mkdirSync(targetPath);
		logFSUpdate("Add Directory", file);
	});

	watcher.on("unlink", (file: string) => {
		const targetPath = getTargetPath(file);
		fs.rmSync(targetPath, { force: true, recursive: true });
		logFSUpdate("Delete File", file);
	});

	watcher.on("unlinkDir", (file: string) => {
		const targetPath = getTargetPath(file);
		fs.rmSync(targetPath, { force: true, recursive: true });
		logFSUpdate("Delete Directory", file);
	});

	const esbuildOpts = getPackScriptEsbuildOpts(packType, srcDir, targetDir, opts?.dev);
	let esbuildCtx: esbuild.BuildContext | undefined = undefined;
	if (esbuildOpts) {
		logWarn(
			`${packType} scripts will be bundled without type-checking. Enter \`npm run typecheck\` to run type-check.`,
		);
		esbuildCtx = await esbuild.context(esbuildOpts);
		esbuildCtx.watch(); // Don't await
	} else {
		log(`${COLORS.FgGray}${packType} scripts were not found (this is not an error)`);
	}

	let stopWatch = false;

	const SIGINTListener = () => {
		(async () => {
			process.removeListener("SIGINT", SIGINTListener);
			try {
				await watcher.close();
				if (esbuildCtx) {
					await esbuildCtx.cancel();
					await esbuildCtx.dispose();
				}
			} finally {
				log(`Stopped ${packType} watcher`);
				stopWatch = true;
			}
		})();
	};

	process.on("SIGINT", SIGINTListener);

	await waitForCondition(() => stopWatch);

	return { success: true, value: { executionTime: -1 } };
};

type DevBuildArgs = {
	readonly beta: boolean;
	readonly watch: boolean;
};

export const generateDevelopmentBuild = async (args: DevBuildArgs) => {
	const { devBehaviorPacksDir, devResourcePacksDir } = getDevPackDirectories(args.beta);

	const bpTargetDir = node_path.join(devBehaviorPacksDir, BUILD_BP_NAME);
	const rpTargetDir = node_path.join(devResourcePacksDir, BUILD_RP_NAME);

	if (fs.existsSync(bpTargetDir)) {
		log("Deleting existing behavior pack at target location...");
		await fs.rm(bpTargetDir, { recursive: true });
		log("Deleted!");
	}

	if (fs.existsSync(rpTargetDir)) {
		log("Deleting existing resource pack at target location...");
		await fs.rm(rpTargetDir, { recursive: true });
		log("Deleted!");
	}

	if (args.watch) {
		logGuide("You can press CTRL+C to stop this process");

		await Promise.all([
			compilePack("BP", SRC_BP_PATH, bpTargetDir, { dev: true, watch: true }),
			compilePack("RP", SRC_RP_PATH, rpTargetDir, { dev: true, watch: true }),
		]);

		return;
	}

	let errored = false;

	try {
		log("Compiling behavior pack...");
		const compileBpResult = await compilePack("BP", SRC_BP_PATH, bpTargetDir, {
			dev: true,
			watch: false,
		});
		if (compileBpResult.success) {
			logPositive(`Compiled behavior pack in ${compileBpResult.value.executionTime.toFixed(2)} ms`);
		} else {
			logError(`Failed to compile behavior pack. Error: ${compileBpResult.error}`);
			errored = true;
		}
	} catch (error) {
		logError("Unhandled error was occured during behavior pack compilation.");
		throw error;
	}

	try {
		log("Compiling resource pack...");
		const compileRpResult = await compilePack("RP", SRC_RP_PATH, rpTargetDir, {
			dev: true,
			watch: false,
		});
		if (compileRpResult.success) {
			logPositive(`Compiled resource pack in ${compileRpResult.value.executionTime.toFixed(2)} ms`);
		} else {
			logError(`Failed to compile resource pack. Error: ${compileRpResult.error}`);
			errored = true;
		}
	} catch (error) {
		logError("Unhandled error was occured during resource pack compilation.");
		throw error;
	}

	if (errored) {
		logError("Build finished with an error.");
	} else {
		logPositive("Build finished successfully!");
	}
};

export const generateProductionBuild = async () => {
	const distDir = node_path.resolve("./dist");

	if (fs.existsSync(distDir)) {
		log("Deleting existing target dir...");
		await fs.rm(distDir, { recursive: true });
		log("Deleted!");
	}

	const bpTargetDir = node_path.join(distDir, BUILD_BP_NAME);
	const rpTargetDir = node_path.join(distDir, BUILD_RP_NAME);

	let errored = false;

	try {
		log("Compiling behavior pack...");
		const compileBpResult = await compilePack("BP", SRC_BP_PATH, bpTargetDir);
		if (compileBpResult.success) {
			logPositive(`Compiled behavior pack in ${compileBpResult.value.executionTime.toFixed(2)} ms`);
		} else {
			logError(`Failed to compile behavior pack. Error: ${compileBpResult.error}`);
			errored = true;
		}
	} catch (error) {
		logError("Unhandled error was occured during behavior pack compilation.");
		throw error;
	}

	try {
		log("Compiling resource pack...");
		const compileRpResult = await compilePack("RP", SRC_RP_PATH, rpTargetDir);
		if (compileRpResult.success) {
			logPositive(`Compiled resource pack in ${compileRpResult.value.executionTime.toFixed(2)} ms`);
		} else {
			logError(`Failed to compile resource pack. Error: ${compileRpResult.error}`);
			errored = true;
		}
	} catch (error) {
		logError("Unhandled error was occured during resource pack compilation.");
		throw error;
	}

	if (errored) {
		logError("Build finished with an error.");
	} else {
		logPositive("Build finished successfully!");
	}
};
