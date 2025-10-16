import {
	build,
	getMinecraftPackageVersions,
	getRequiredEnv,
	getRequiredEnvWithFallback,
	parseVersionString,
	type BuildConfig,
} from "ganban";
import packageConfig from "../package.json" with { type: "json" };

const isDevBuild = Boolean(getRequiredEnvWithFallback("DEV", ""));
const addonVersionArray = parseVersionString(getRequiredEnvWithFallback("ADDON_VERSION", "0.0.1"));
const addonVersionForHumans = "v" + addonVersionArray.join(".");

const minEngineVersion = [1, 21, 110];
const behaviorPackUuid = "b5822a30-5be0-4699-a298-315ab9a21042";
const resourcePackUuid = "fbc36a82-3f2d-423f-974d-99c9e63b9c2e";

const minecraftPackageVersions = getMinecraftPackageVersions(packageConfig);

const behaviorPackManifest = {
	format_version: 2,
	header: {
		description: "An SCP add-on. Currently being restored from scratch.",
		name: isDevBuild ? `SCP: Dystopia BP - DEV` : `SCP: Dystopia BP - ${addonVersionForHumans}`,
		uuid: behaviorPackUuid,
		version: addonVersionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "data",
			uuid: "2457184f-4079-4124-9f7f-809f055252dd",
			version: addonVersionArray,
		},
		{
			language: "javascript",
			type: "script",
			uuid: "0d359555-6f1f-4b60-998b-c935e22ac452",
			version: addonVersionArray,
			entry: "scripts/main.js",
		},
	],
	dependencies: [
		{
			// Resource pack dependency
			uuid: resourcePackUuid,
			version: addonVersionArray,
		},
		{
			module_name: "@minecraft/server",
			version: minecraftPackageVersions["@minecraft/server"],
		},
		{
			module_name: "@minecraft/server-ui",
			version: minecraftPackageVersions["@minecraft/server-ui"],
		},
	],
};

const resourcePackManifest = {
	format_version: 2,
	header: {
		description: "Resource pack of the SCP: Dystopia add-on.",
		name: isDevBuild ? `SCP: Dystopia RP - DEV` : `SCP: Dystopia RP - ${addonVersionForHumans}`,
		uuid: resourcePackUuid,
		version: addonVersionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "resources",
			uuid: "d219deb9-19e5-43c5-b879-393d9fc525c9",
			version: addonVersionArray,
		},
	],
	capabilities: ["pbr"],
};

const buildConfig: BuildConfig = {
	behaviorPack: {
		type: "behavior",
		srcDir: "src/bp",
		outDir: isDevBuild ? getRequiredEnv("DEV_BP_OUTDIR") : `dist/${addonVersionForHumans}/bp`,
		manifest: behaviorPackManifest,
		scripts: {
			entry: "src/bp/scripts/main.ts",
			bundle: true,
			minify: false,
			sourceMap: isDevBuild,
			tsconfig: "tsconfig.json",
		},
	},
	resourcePack: {
		type: "resource",
		srcDir: "src/rp",
		outDir: isDevBuild ? getRequiredEnv("DEV_RP_OUTDIR") : `dist/${addonVersionForHumans}/rp`,
		manifest: resourcePackManifest,
		generateTextureList: true,
	},
	watch: Boolean(getRequiredEnvWithFallback("WATCH", "")),
};

// Create archive for release builds
if (!isDevBuild) {
	const archiveName = `dist/${addonVersionForHumans}/scp-dystopia-${addonVersionForHumans}`;
	buildConfig.archives = [
		{
			outFile: `${archiveName}.mcaddon`,
		},
		{
			outFile: `${archiveName}.zip`,
		},
	];
}

await build(buildConfig);
