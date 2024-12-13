import { fileURLToPath } from "url";
import * as path from "path";
import * as process from "process";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import { runCommand, scriptSrcPath } from "./shared.mjs";

const typeCheckCommand = "tsc --noEmit";

async function bundle() {
  if (!(await runCommand(typeCheckCommand))) {
    console.error("Type check failed!");
    return;
  }

  console.log("Bundling...");

  const outfile = "./packs/bp/scripts/main.js";

  await esbuild.build({
    entryPoints: [scriptSrcPath],
    bundle: true,
    minify: process.argv[2] === "minify",
    keepNames: true,
    outfile: "./packs/bp/scripts/main.js",
    charset: "utf8",
    format: "esm",
    external: ["@minecraft"],
    allowOverwrite: true,
    sourcemap: true,
    sourceRoot: path.resolve("./src/"),
  });

  const mapFile = outfile + ".map";

  let data = fs.readFileSync(mapFile, "utf-8");

  data = data.replaceAll("../../../src/", "");

  fs.writeFileSync(mapFile, data, {
    encoding: "utf-8",
  });

  console.log("Finished!");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await bundle();
}
