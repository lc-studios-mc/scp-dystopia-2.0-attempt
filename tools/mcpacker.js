import { defineConfig } from "@lc-studios-js/mcpacker";
import path from "node:path";
import packageData from "../package.json" with { type: "json" };

const MIN_ENGINE_VERSION = [1, 21, 100];

/**
 * @param {number[]} arr
 * @returns {string}
 */
const formatDateArray = (arr) => {
	const [year, month, date] = arr;

	// Get the last two digits of the year
	const yearStr = String(year).slice(-2);

	// Pad month and date with a leading zero if they are single digits
	const monthStr = String(month).padStart(2, "0");
	const dateStr = String(date).padStart(2, "0");

	// Concatenate and return the formatted string
	return `${yearStr}${monthStr}${dateStr}`;
};

/**
 * @param {import("@lc-studios-js/mcpacker").CliArgs} args
 * @returns {{ text: string; array: [number,number,number]; isEarlyAccess: boolean; }}
 */
const createPackVersion = (args) => {
	if (args.dev) {
		return {
			text: "DEV",
			array: [0, 0, 1],
			isEarlyAccess: false,
		};
	}

	if (!args.dev && !args.packVersion) {
		const date = new Date();

		/** @type {[number,number,number]} */
		const array = [date.getFullYear(), date.getMonth() + 1, date.getDate()];

		return {
			text: `EA-${formatDateArray(array)}`, // yyyy-mm-dd
			array: [0, 0, +array.join("")],
			isEarlyAccess: true,
		};
	}

	if (args.packVersion) {
		return {
			text: `v${args.packVersion.join(".")}`,
			array: args.packVersion,
			isEarlyAccess: false,
		};
	}

	return {
		text: "UNRESOLVED",
		array: [0, 0, 0],
		isEarlyAccess: false,
	};
};

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
 * @param {import("@lc-studios-js/mcpacker").CliArgs} args
 * @returns {{ bpManifest: any; rpManifest: any; }}
 */
const createManifests = (args) => {
	const version = createPackVersion(args);

	const description = args.dev
		? "Development build. Do not publish this."
		: version.isEarlyAccess
			? "EARLY ACCESS - Not recommended to use this version in a serious project!"
			: "SCP addon by LC Studios MC.";

	const bpHeaderUuid = args.dev
		? "bc68b824-f338-472d-8b8e-942d2b34ca0d"
		: "b5822a30-5be0-4699-a298-315ab9a21042";

	const rpHeaderUuid = args.dev
		? "717e0c75-1e5c-4bc8-a543-baeaa203a5e1"
		: "fbc36a82-3f2d-423f-974d-99c9e63b9c2e";

	const scriptingApiVersion = getScriptinApiVersion();

	const bpManifest = {
		format_version: 2,
		header: {
			description,
			name: `SCP: Dystopia §7${version.text}`,
			uuid: bpHeaderUuid,
			version: version.array,
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
				version: version.array,
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
			name: `SCP: Dystopia §7${version.text} [RP]`,
			uuid: rpHeaderUuid,
			version: version.array,
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
 * @param {import("@lc-studios-js/mcpacker").CliArgs} args
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

	const version = createPackVersion(args);

	return {
		bpOutDir: path.join("dist", version.text.replaceAll(" ", "_"), "SCPDY_BP"),
		rpOutDir: path.join("dist", version.text.replaceAll(" ", "_"), "SCPDY_RP"),
	};
};

export default defineConfig((args) => {
	const { bpManifest, rpManifest } = createManifests(args);
	const { bpOutDir, rpOutDir } = getOutDir(args);

	/** @type {import("@lc-studios-js/mcpacker").BuildConfig} */
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
					esbuildOptionOverrides: {
						platform: "node",
					},
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
