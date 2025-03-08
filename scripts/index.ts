import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { generateDevelopmentBuild, generateProductionBuild } from "./build";

const main = async () => {
	const argv = await yargs(hideBin(process.argv))
		.usage("Usage: $0 <command> [options]")

		.command(
			"dev",
			"Generates development build inside .../com.mojang/development_*_packs",
			(yargs) =>
				yargs
					.option("watch", {
						alias: "w",
						type: "boolean",
						describe:
							"Automatically updates the build whenever there is a file system change in src",
					})
					.option("beta", {
						alias: "b",
						type: "boolean",
						describe: "Sets the build location to the Minecraft Preview one",
					}),
		)

		.command("dist", "Generates production build inside ./dist/")

		// At least one command must be specified
		.demand(1, "Please specify one of the commands!")
		.strict()

		.help("h")
		.alias("h", "help").argv;

	const command = argv._[0];
	if (command === "dev") {
		await generateDevelopmentBuild({
			watch: argv.watch === true,
			beta: argv.beta === true,
		});
	} else if (command === "dist") {
		await generateProductionBuild();
	}
};

main().catch((error) => console.error(error));
