"use strict";

import * as path from "node:path";
import * as os from "node:os";
import fs from "fs-extra";
import { glob } from "glob";

export const BP_NAME = "SCPDY_BP";
export const RP_NAME = "SCPDY_RP";

export function getMinecraftDir(beta = false) {
  return path.join(
    os.homedir(),
    beta
      ? "AppData\\Local\\Packages\\Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe"
      : "AppData\\Local\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe",
  );
}

export function getTargetBehaviorPackDir(beta = false) {
  const mcDir = getMinecraftDir(beta);
  return path.join(mcDir, "LocalState\\games\\com.mojang\\development_behavior_packs", BP_NAME);
}

export function getTargetResourcePackDir(beta = false) {
  const mcDir = getMinecraftDir(beta);
  return path.join(mcDir, "LocalState\\games\\com.mojang\\development_resource_packs", RP_NAME);
}

/**
 * @param {string} sourceDir
 * @param {string} targetDir
 * @param {string[]} ignorePatterns
 */
export async function syncDirectories(sourceDir, targetDir, ignorePatterns = []) {
  // Ensure paths are absolute and normalized
  const sourceDirAbs = path.resolve(sourceDir);
  const targetDirAbs = path.resolve(targetDir);

  // Convert ignore patterns to be relative to source directory
  const normalizedIgnorePatterns = ignorePatterns.map((pattern) =>
    path.join(sourceDirAbs, pattern).replace(/\\/g, "/"),
  );

  // Get all files from source directory using the new glob promise interface
  const files = await glob("**/*", {
    cwd: sourceDirAbs,
    dot: true,
    nodir: true,
    ignore: normalizedIgnorePatterns,
    absolute: true,
  });

  // Process each file
  for (const sourceFile of files) {
    const relativePath = path.relative(sourceDirAbs, sourceFile);
    const targetFile = path.join(targetDirAbs, relativePath);

    try {
      // Create target directory if it doesn't exist
      await fs.ensureDir(path.dirname(targetFile));

      // Copy file with its metadata
      await fs.copy(sourceFile, targetFile, { preserveTimestamps: true });

      console.log(`Synced: ${relativePath}`);
    } catch (error) {
      console.error(`Failed to sync ${relativePath}:`, error);
    }
  }
}
