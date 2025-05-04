import { homedir } from "node:os";
import path from "node:path";

export function getDevPackDirs(beta?: boolean): {
	devBehaviorPacks: string;
	devResourcePacks: string;
} {
	const comMojang = path.join(
		homedir(),
		"AppData/Local/Packages",
		beta ? "Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe" : "Microsoft.MinecraftUWP_8wekyb3d8bbwe",
		"LocalState/games/com.mojang",
	);

	return {
		devBehaviorPacks: path.join(comMojang, "development_behavior_packs"),
		devResourcePacks: path.join(comMojang, "development_resource_packs"),
	};
}

export function getCurrentTimeString(): string {
	const now = new Date();

	let hours = now.getHours();
	const minutes = now.getMinutes().toString().padStart(2, "0");
	const seconds = now.getSeconds().toString().padStart(2, "0");
	const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

	const period = hours >= 12 ? "PM" : "AM";

	hours = hours % 12;
	hours = hours === 0 ? 12 : hours; // Convert 0 to 12 for midnight

	const formattedTime = `[${hours}:${minutes}:${seconds}.${milliseconds} ${period}]`;

	return formattedTime;
}
