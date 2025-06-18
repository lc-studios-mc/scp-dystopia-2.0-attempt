export default {
	format_version: 2,
	header: {
		description:
			"§l§cEARLY ACCESS!§r \n§eRequires 'Beta APIs' experiment.§r \n§4May not work properly on future MC versions.",
		name: "SCP: Dystopia §cDEV§r",
		uuid: "5368765d-325d-42c7-92ac-195e5ea02966",
		version: [0, 0, 1],
		min_engine_version: [1, 21, 90],
	},
	modules: [
		{
			description: "Behavior pack",
			type: "data",
			uuid: "c163b8c9-3430-411b-aad8-f01b9dacf99d",
			version: [1, 0, 0],
		},
		{
			description: "Scripts",
			language: "javascript",
			type: "script",
			uuid: "5fa83869-172d-41dc-8fb0-bd98da2e9da6",
			version: [1, 0, 0],
			entry: "scripts/main.js",
		},
	],
	dependencies: [
		{
			// Resource pack
			uuid: "807f0464-6ecc-42c5-8bc3-9ad7fd5dfb57",
			version: [0, 0, 1],
		},
		{
			module_name: "@minecraft/server",
			version: "2.1.0-beta",
		},
		{
			module_name: "@minecraft/server-ui",
			version: "2.1.0-beta",
		},
	],
};
