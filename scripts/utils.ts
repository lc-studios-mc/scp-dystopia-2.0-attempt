import * as node_path from "node:path";
import * as node_os from "node:os";
import { COLORS } from "./colors";

export const log = (msg: string) => console.log(`${msg}${COLORS.Reset}`);
export const logPositive = (msg: string) => console.log(`${COLORS.FgGreen}${msg}${COLORS.Reset}`);
export const logGuide = (msg: string) => console.log(`${COLORS.FgCyan}${msg}${COLORS.Reset}`);
export const logWarn = (msg: string) => console.warn(`${COLORS.FgYellow}${msg}${COLORS.Reset}`);
export const logError = (msg: string) => console.error(`${COLORS.FgRed}${msg}${COLORS.Reset}`);

export const waitForCondition = (cond: () => boolean, interval = 500) =>
	new Promise<void>((resolve) => {
		const handle = setInterval(() => {
			if (cond()) {
				clearInterval(handle);
				resolve();
			}
		}, interval);
	});

export type DevPackDirectories = {
	readonly devBehaviorPacksDir: string;
	readonly devResourcePacksDir: string;
};

export const getDevPackDirectories = (beta: boolean): DevPackDirectories => {
	const mcName = beta
		? "Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe"
		: "Microsoft.MinecraftUWP_8wekyb3d8bbwe";

	const comMojangDir = node_path.join(
		node_os.homedir(),
		"AppData/Local/Packages",
		mcName,
		"LocalState/games/com.mojang",
	);

	return {
		devBehaviorPacksDir: node_path.join(comMojangDir, "development_behavior_packs"),
		devResourcePacksDir: node_path.join(comMojangDir, "development_resource_packs"),
	};
};
