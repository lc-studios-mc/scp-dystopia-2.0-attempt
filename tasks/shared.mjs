import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

export const scriptSrcPath = "./src/server/index.ts";

const execAsync = promisify(exec);

/**
 * @param {string} command
 * @param {import("child_process").ExecOptions} options
 * @returns {Promise<boolean>}
 */
export async function runCommand(command, options) {
  try {
    const { stdout, stderr } = await execAsync(command, options);

    if (stderr) {
      console.error(`Error: ${stderr}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Execution failed: ${error.message}`);
    return false;
  }
}

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function deleteDirectorySync(path) {
  try {
    fs.rmSync(path, { recursive: true, maxRetries: 5 });
    console.log(`Directory ${path} deleted successfully!`);

    return true;
  } catch (error) {
    console.error(`Error deleting directory: ${error.message}`);

    return false;
  }
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
