"use strict";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as url from "node:url";
import * as readline from "node:readline";
import * as path from "node:path";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import chokidar from "chokidar";
import { BP_NAME, getTargetBehaviorPackDir, getTargetResourcePackDir, RP_NAME, syncDirectories } from "./shared.mjs";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 <command> [options]")

  .command("dev", "Create development build at local Minecraft directory", function (yargs) {
    return yargs
      .option("watch", {
        alias: "w",
        type: "boolean",
        describe: "Automatically update build when a file system change is detected in source",
      })
      .option("beta-mc", {
        alias: "b",
        type: "boolean",
        describe: "Set default paths of the output packs to the ones in Minecraft Preview",
      });
  })

  .command("dist", "Create production build at dist/")

  // at least one command is required
  .demand(1, "Please specify one of the commands!")
  .strict()

  .help("h")
  .alias("h", "help")
  .alias("v", "version").argv;

const IGNORED_DIR_NAMES = [".git", "node_modules", "scripts"];

/**
 * @param {string} filepath
 * @returns {boolean}
 */
function shouldIgnore(filepath) {
  const parts = filepath.split(path.sep);
  return parts.some((part) => IGNORED_DIR_NAMES.includes(part));
}

/**
 * @param {string} sourceDir
 * @param {string} targetDir
 */
async function removeOrphans(sourceDir, targetDir) {
  try {
    const walkTarget = async (dir) => {
      if (shouldIgnore(dir)) {
        return;
      }

      const items = await fs.readdir(dir);

      for (const item of items) {
        const targetPath = path.join(dir, item);
        if (shouldIgnore(targetPath)) {
          continue;
        }

        const sourcePath = path.join(sourceDir, path.relative(targetDir, targetPath));
        const stats = await fs.stat(targetPath);

        if (stats.isDirectory()) {
          await walkTarget(targetPath);
          // Check if directory is empty and doesn't exist in source
          const isDirEmpty = (await fs.readdir(targetPath)).length === 0;
          if (isDirEmpty && !(await fs.pathExists(sourcePath))) {
            await fs.remove(targetPath);
            console.log(`Removed orphaned directory: ${path.relative(targetDir, targetPath)}`);
          }
        } else {
          if (!(await fs.pathExists(sourcePath))) {
            await fs.remove(targetPath);
            console.log(`Removed orphaned file: ${path.relative(targetDir, targetPath)}`);
          }
        }
      }
    };

    await walkTarget(targetDir);
  } catch (error) {
    console.error("Error removing orphaned files:", error);
  }
}

/**
 * @typedef DevBuildArgs
 * @property {boolean} watch
 * @property {boolean} beta-mc
 */

/**
 * @param {DevBuildArgs} args
 */
async function dev(args) {
  const sourceBpDir = path.resolve("./packs/bp");
  const sourceRpDir = path.resolve("./packs/rp");

  const targetBpDir = getTargetBehaviorPackDir(args["beta-mc"]);
  const targetRpDir = getTargetResourcePackDir(args["beta-mc"]);

  if (fs.existsSync(targetBpDir)) {
    if (fs.lstatSync(targetBpDir).isDirectory()) {
      await removeOrphans(sourceBpDir, targetBpDir);
      fs.rmSync(path.join(targetBpDir, "scripts"), { recursive: true, force: true });
    } else {
      throw new Error("Target BP path is blocked!");
    }
  } else {
    await fs.ensureDir(targetBpDir);
  }

  if (fs.existsSync(targetRpDir)) {
    if (fs.lstatSync(targetRpDir).isDirectory()) {
      await removeOrphans(sourceRpDir, targetRpDir);
    } else {
      throw new Error("Target RP path is blocked!");
    }
  } else {
    await fs.ensureDir(targetRpDir);
  }

  /**
   * @param {string} outfile
   * @returns {Promise<import('esbuild').BuildResult>}
   */
  const runESBuild = async (outfile) => {
    return await esbuild.build({
      entryPoints: ["main.ts"],
      absWorkingDir: path.resolve("./src"),
      outfile: outfile,
      bundle: true,
      allowOverwrite: true,
      external: ["@minecraft"],
      charset: "utf8",
      format: "esm",
      platform: "neutral",
      sourcemap: "linked",
      sourceRoot: path.resolve("./src"),
    });
  };

  if (args.watch) {
    /**
     * Gets the relative path from the source directory
     * @param {string} sourceDir - The source directory path
     * @param {string} filepath - The full file path
     * @returns {string} The relative path from the source directory
     */
    const getRelativePath = (sourceDir, filepath) => {
      return path.relative(sourceDir, filepath);
    };

    /**
     * Gets the corresponding target path for a given source file
     * @param {string} sourceDir - The source directory path
     * @param {string} targetDir - The target directory path
     * @param {string} filepath - The full source file path
     * @returns {string} The corresponding target file path
     */
    const getTargetPath = (sourceDir, targetDir, filepath) => {
      const relativePath = getRelativePath(sourceDir, filepath);
      return path.join(targetDir, relativePath);
    };

    /**
     * Creates a watcher that mirrors changes from source to target
     * @param {string} sourceDir
     * @param {string} targetDir
     * @param {string} name
     * @returns {import('chokidar').FSWatcher} The initialized watcher instance
     */
    const createPackWatcher = (sourceDir, targetDir, name) => {
      const watcher = chokidar.watch(sourceDir, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: true,
        ignored: (filepath) => shouldIgnore(filepath),
      });

      watcher
        .on("add", async (filepath) => {
          if (shouldIgnore(filepath)) return;
          try {
            const targetPath = getTargetPath(sourceDir, targetDir, filepath);
            await fs.copy(filepath, targetPath);
            console.log(`[${name}] File copied: ${getRelativePath(sourceDir, filepath)}`);
          } catch (error) {
            console.error(`[${name}] Error copying file: ${filepath}`, error);
          }
        })
        .on("change", async (filepath) => {
          if (shouldIgnore(filepath)) return;
          try {
            const targetPath = getTargetPath(sourceDir, targetDir, filepath);
            await fs.copy(filepath, targetPath);
            console.log(`[${name}] File updated: ${getRelativePath(sourceDir, filepath)}`);
          } catch (error) {
            console.error(`[${name}] Error updating file: ${filepath}`, error);
          }
        })
        .on("unlink", async (filepath) => {
          if (shouldIgnore(filepath)) return;
          try {
            const targetPath = getTargetPath(sourceDir, targetDir, filepath);
            await fs.remove(targetPath);
            console.log(`[${name}] File deleted: ${getRelativePath(sourceDir, filepath)}`);
          } catch (error) {
            console.error(`[${name}] Error deleting file: ${filepath}`, error);
          }
        })
        .on("addDir", async (filepath) => {
          if (shouldIgnore(filepath)) return;
          try {
            const targetPath = getTargetPath(sourceDir, targetDir, filepath);
            await fs.ensureDir(targetPath);
            console.log(`[${name}] Directory created: ${getRelativePath(sourceDir, filepath)}`);
          } catch (error) {
            console.error(`[${name}] Error creating directory: ${filepath}`, error);
          }
        })
        .on("unlinkDir", async (filepath) => {
          if (shouldIgnore(filepath)) return;
          try {
            const targetPath = getTargetPath(sourceDir, targetDir, filepath);
            await fs.remove(targetPath);
            console.log(`[${name}] Directory deleted: ${getRelativePath(sourceDir, filepath)}`);
          } catch (error) {
            console.error(`[${name}] Error deleting directory: ${filepath}`, error);
          }
        })
        .on("error", (error) => {
          console.error(`[${name}] Watcher error:`, error);
        });

      console.log(`[${name}] Watching ${sourceDir} for changes...`);

      return watcher;
    };

    console.log("\x1b[36m%s\x1b[0m", "Press Ctrl+C to stop process");

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    /** @type {(import('chokidar').FSWatcher)[]} */
    const watchers = [];

    watchers.push(
      createPackWatcher(sourceBpDir, targetBpDir, "bp"),
      createPackWatcher(sourceRpDir, targetRpDir, "rp"),
    );

    console.log(`Ignoring directories: ${IGNORED_DIR_NAMES.join(", ")}`);

    const outfile = path.join(targetBpDir, "scripts", "main.js");

    let shouldRunESBuild = false;

    const scriptWatcher = chokidar
      .watch("./src", {
        ignored: (path, stats) => stats?.isFile() && !path.endsWith(".ts"),
        persistent: true,
      })
      .on("add", () => {
        shouldRunESBuild = true;
      })
      .on("change", () => {
        shouldRunESBuild = true;
      })
      .on("unlink", () => {
        shouldRunESBuild = true;
      });

    watchers.push(scriptWatcher);

    setInterval(async () => {
      if (!shouldRunESBuild) return;

      try {
        await runESBuild(outfile);

        console.log("[scripts] Bundled");
      } catch (error) {
        console.error("[scripts] Error bundling scripts:", error);
      }

      shouldRunESBuild = false;
    }, 500);

    if (process.platform === "win32") {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.on("SIGINT", function () {
        process.emit("SIGINT");
      });
    }

    process.on("SIGINT", function () {
      watchers.forEach((watcher) => watcher.close());
      console.log("\x1b[33m%s\x1b[0m", "Stopped process");
      process.exit();
    });
  } else {
    await syncDirectories(sourceBpDir, targetBpDir);
    await syncDirectories(sourceRpDir, targetRpDir);

    const outfile = path.join(targetBpDir, "scripts", "main.js");

    await runESBuild(outfile);

    console.log("Bundled scripts");
  }
}

async function dist() {
  const distDir = path.resolve("./dist");

  if (fs.existsSync(distDir)) {
    await fs.rm(distDir, { force: true, recursive: true });
    console.log("Deleted old dist");
  }

  await fs.ensureDir(distDir);

  const sourceBpDir = path.resolve("./packs/bp");
  const sourceRpDir = path.resolve("./packs/rp");

  const targetBpDir = path.resolve(`./dist/${BP_NAME}`);
  const targetRpDir = path.resolve(`./dist/${RP_NAME}`);

  await syncDirectories(sourceBpDir, targetBpDir);
  await syncDirectories(sourceRpDir, targetRpDir);

  const outfile = path.join(targetBpDir, "scripts", "main.js");

  await esbuild.build({
    entryPoints: ["main.ts"],
    absWorkingDir: path.resolve("./src"),
    outfile: outfile,
    bundle: true,
    minify: true,
    allowOverwrite: true,
    external: ["@minecraft"],
    charset: "utf8",
    format: "esm",
    platform: "neutral",
  });

  console.log("Bundled scripts");
}

async function main() {
  switch (argv._[0]) {
    case "dev":
      await dev({
        watch: argv["watch"] === true,
        "beta-mc": argv["beta-mc"] === true,
      });
      break;
    case "dist":
      await dist();
      break;
  }
}

if (import.meta.url.startsWith("file:") && process.argv[1] === url.fileURLToPath(import.meta.url)) {
  await main();
}
