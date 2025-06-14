import manifestBp from "./manifest-bp.js";
import manifestRp from "./manifest-rp.js";

/** @type {import("@lc-studios-mc/mcr").Config} */
export default {
	extends: "../base-config.js",
	buildOptions: {
		bp: {
			outDir: "<com.mojang>/development_behavior_packs/SCPDY_BP",
			manifest: manifestBp,
		},
		rp: {
			outDir: "<com.mojang>/development_resource_packs/SCPDY_RP",
			manifest: manifestRp,
		},
		watch: true,
	},
};
