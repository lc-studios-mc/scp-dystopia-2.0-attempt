import manifestBp from "./manifest-bp.js";
import manifestRp from "./manifest-rp.js";

/** @type {import("@lc-studios-mc/mcr").Config} */
export default {
	extends: "../base-config.js",
	buildOptions: {
		bp: {
			outDir: "dist/v2.0.0-alpha-5/SCPDY_BP",
			manifest: manifestBp,
		},
		rp: {
			outDir: "dist/v2.0.0-alpha-5/SCPDY_RP",
			manifest: manifestRp,
		},
	},
};
