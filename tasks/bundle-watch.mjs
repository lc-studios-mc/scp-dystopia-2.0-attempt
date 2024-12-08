import { fileURLToPath } from "url";
import * as path from "path";
import * as process from "process";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import sane from "sane";
import { runCommand, scriptSrcPath, sleep } from "./shared.mjs";

const typeCheckCommand = "tsc --noEmit";

let shouldBundle = true;

async function bundle() {
  if (!shouldBundle) return;

  const outfile = "./packs/bp/scripts/main.js";

  try {
    esbuild.buildSync({
      entryPoints: [scriptSrcPath],
      bundle: true,
      outfile: outfile,
      charset: "utf8",
      format: "esm",
      external: ["@minecraft"],
      allowOverwrite: true,
      sourcemap: true,
      sourceRoot: path.resolve("./src/"),
    });
  } catch {
    console.error("Failed to bundle!");
    shouldBundle = false;
    return;
  }

  await sleep(500);

  const mapFile = outfile + ".map";

  let data = fs.readFileSync(mapFile, "utf-8");

  data = data.replaceAll("../../../src/", "");

  fs.writeFileSync(mapFile, data, {
    encoding: "utf-8",
  });

  shouldBundle = false;

  console.log("bundled");
}

async function watch() {
  if (!(await runCommand(typeCheckCommand))) {
    console.error("Type check failed!");
    return;
  }

  const watcher = sane("./src", {
    glob: ["**/*.ts"],
  });

  watcher.on("ready", function () {
    console.log("ready");
  });

  watcher.on("change", function (filepath, root, stat) {
    console.log("file changed", filepath);
    shouldBundle = true;
  });

  watcher.on("add", function (filepath, root, stat) {
    console.log("file added", filepath);
    shouldBundle = true;
  });

  watcher.on("delete", function (filepath, root) {
    console.log("file deleted", filepath);
    shouldBundle = true;
  });

  const intervalId = setInterval(async () => {
    await bundle();
  }, 500);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await watch();
}
