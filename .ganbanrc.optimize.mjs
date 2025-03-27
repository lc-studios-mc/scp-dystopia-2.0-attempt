/** @type {import('ganban').Config} */
export default {
	bpSrc: "src/bp",
	bpName: "SCPDY_BP",
	bpTarget: "dist",
	rpSrc: "src/rp",
	rpName: "SCPDY_RP",
	rpTarget: "dist",
	tsconfig: "tsconfig.json",
	minify: false, // Minification causes some files to break and I gotta fix the bug later
};
