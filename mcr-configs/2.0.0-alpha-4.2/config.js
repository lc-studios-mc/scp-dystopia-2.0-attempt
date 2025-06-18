import manifestBp from "./manifest-bp.js";
import manifestRp from "./manifest-rp.js";

/** @type {import("@lc-studios-mc/mcr").Config} */
export default {
	extends: "../base-config.js",
	buildOptions: {
		bp: {
			outDir: "dist/SCPDY_2.0.0-Alpha-4.2_1.21.90/SCPDY_BP",
			manifest: manifestBp,
			script: {
				sourceMap: false,
			},
		},
		rp: {
			outDir: "dist/SCPDY_2.0.0-Alpha-4.2_1.21.90/SCPDY_RP",
			manifest: manifestRp,
		},
	},
};
