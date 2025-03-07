import * as node_path from "node:path";
import fs from "fs-extra";

export const SRC_BP_PATH = node_path.resolve("./src/bp");
export const SRC_RP_PATH = node_path.resolve("./src/rp");
export const SRC_TSCONFIG_PATH = (() => {
	const path = node_path.resolve("./src/tsconfig.json");
	if (fs.existsSync(path)) return path;
	return undefined;
})();

export const BUILD_BP_NAME = "SCPDY_BP";
export const BUILD_RP_NAME = "SCPDY_RP";

export const BUILD_IGNORE_PATTERN = /.*(tsconfig\.json|scripts.*|\.git.*)/;
