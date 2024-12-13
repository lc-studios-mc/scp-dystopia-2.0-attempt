import { fileURLToPath } from "url";
import * as path from "path";
import fs from "fs-extra";
import * as esbuild from "esbuild";
import { runCommand, scriptSrcPath } from "./shared.mjs";

const srcBp = path.resolve("./packs/bp/");
const srcRp = path.resolve("./packs/rp/");
const distDir = path.resolve("./dist/");
const distBp = path.join(distDir, "bp");
const distRp = path.join(distDir, "rp");

const typeCheckCommand = "tsc --noEmit";

async function main() {
  if (await fs.exists(distDir)) {
    console.log("\x1b[33m%s\x1b[0m", "Dist directory already exists. Please remove it first.");
    return;
  }

  if (!(await runCommand(typeCheckCommand))) {
    console.error("Type check failed!");
    return;
  }

  console.log("Creating dist...");

  await fs.copy(srcBp, distBp);
  await fs.copy(srcRp, distRp);

  const distBpScriptsDir = path.join(distBp, "scripts");

  if (await fs.exists(distBpScriptsDir)) {
    fs.rmSync(distBpScriptsDir, { recursive: true });
  }

  const outfile = path.join(distBpScriptsDir, "main.js");

  await esbuild.build({
    entryPoints: [scriptSrcPath],
    bundle: true,
    outfile: outfile,
    charset: "utf8",
    minify: true,
    external: ["@minecraft"],
    format: "esm",
    platform: "neutral",
    allowOverwrite: true,
  });

  console.log("Finished!");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
