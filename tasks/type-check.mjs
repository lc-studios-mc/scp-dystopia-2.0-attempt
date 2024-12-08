import { fileURLToPath } from "url";
import { runCommand } from "./shared.mjs";

const command = "npx tsc --noEmit";

async function main() {
  if (!(await runCommand(command))) {
    console.error("Type check failed!");
    return;
  }

  console.log("Type check complete!");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
