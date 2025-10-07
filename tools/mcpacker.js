import { defineConfig } from "mcpacker";
import path from "node:path";
import packageData from "../package.json" with { type: "json" };

const MIN_ENGINE_VERSION = [1, 21, 111];

/** @returns {{ "@minecraft/server": string; "@minecraft/server-ui": string; }} */
const getScriptinApiVersion = () => {
	/**
	 * @param {string} input
	 * @returns {string|undefined}
	 */
	const extractVersion = (input) => {
		const regex = /(\d+\.\d+\.\d+(?:-beta)?)/;
		const match = input.match(regex);
		return match ? match[1] : undefined;
	};

	const serverResult = extractVersion(packageData.dependencies["@minecraft/server"]);
	const serverUiResult = extractVersion(packageData.dependencies["@minecraft/server-ui"]);

	if (!serverResult) throw new Error("Failed to get @minecraft/server package version");
	if (!serverUiResult) throw new Error("Failed to get @minecraft/server-ui package version");

	return {
		"@minecraft/server": serverResult,
		"@minecraft/server-ui": serverUiResult,
	};
};

/**
 * @param {import("mcpacker").CliArgs} args
 * @returns {{ bpManifest: any; rpManifest: any; }}
 */
const createManifests = (args) => {
	const description = `This version will immediately stop working on next Minecraft content drop.
Consider using "Distilled" version which is not experimental.
Please do not ask for updates.`;

	const bpHeaderUuid = "bc68b824-f338-472d-8b8e-942d2b34ca0d";

	const rpHeaderUuid = "717e0c75-1e5c-4bc8-a543-baeaa203a5e1";

	const scriptingApiVersion = getScriptinApiVersion();

	const bpManifest = {
		format_version: 2,
		header: {
			description,
			name: `SCP:DY 2.0 Alpha EPHEMERAL (1.21.111 only)`,
			uuid: bpHeaderUuid,
			version: [69, 69, 69],
			min_engine_version: MIN_ENGINE_VERSION,
		},
		modules: [
			{
				type: "data",
				uuid: "2457184f-4079-4124-9f7f-809f055252dd",
				version: [0, 0, 1],
			},
			{
				language: "javascript",
				type: "script",
				uuid: "0d359555-6f1f-4b60-998b-c935e22ac452",
				version: [0, 0, 1],
				entry: "scripts/main.js",
			},
		],
		dependencies: [
			{
				// Resource pack
				uuid: rpHeaderUuid,
				version: [69, 69, 69],
			},
			{
				module_name: "@minecraft/server",
				version: scriptingApiVersion["@minecraft/server"],
			},
			{
				module_name: "@minecraft/server-ui",
				version: scriptingApiVersion["@minecraft/server-ui"],
			},
		],
	};

	const rpManifest = {
		format_version: 2,
		header: {
			description: `(Resource Pack) ${description}`,
			name: `SCP:DY 2.0 Alpha EPHEMERAL (1.21.111 only)`,
			uuid: rpHeaderUuid,
			version: [69, 69, 69],
			min_engine_version: MIN_ENGINE_VERSION,
		},
		modules: [
			{
				type: "resources",
				uuid: "d219deb9-19e5-43c5-b879-393d9fc525c9",
				version: [0, 0, 1],
			},
		],
	};

	return { bpManifest, rpManifest };
};

/** @param {string} type */
const getDevOutDir = (type) => {
	const envKey = `DEV_${type.toUpperCase()}_OUTDIR`;
	const value = process.env[envKey];

	if (!value) throw new Error(`Please set the environment variable '${envKey}' to a directory`);

	return path.resolve(value);
};

/**
 * @param {import("mcpacker").CliArgs} args
 * @returns {{ bpOutDir: string; rpOutDir: string; }}
 */
const getOutDir = (args) => {
	const isDev = !!args.dev;
	if (isDev) {
		return {
			bpOutDir: getDevOutDir("bp"),
			rpOutDir: getDevOutDir("rp"),
		};
	}

	return {
		bpOutDir: path.join("dist", "SCPDY_2.0_Alpha_Ephemeral", "SCPDY_BP"),
		rpOutDir: path.join("dist", "SCPDY_2.0_Alpha_Ephemeral", "SCPDY_RP"),
	};
};

export default defineConfig((args) => {
	const { bpManifest, rpManifest } = createManifests(args);
	const { bpOutDir, rpOutDir } = getOutDir(args);

	/** @type {import("mcpacker").BuildConfig} */
	const config = {
		packs: [
			{
				type: "behavior",
				name: "BP",
				srcDir: "src/bp",
				outDir: bpOutDir,
				manifest: bpManifest,
				clean: true,
				watch: args.watch,
				scripts: {
					entry: "src/bp/scripts/main.ts",
					bundle: true,
					sourceMap: true,
				},
			},
			{
				type: "resource",
				name: "RP",
				srcDir: "src/rp",
				outDir: rpOutDir,
				manifest: rpManifest,
				clean: true,
				watch: args.watch,
			},
		],
	};

	return config;
});
