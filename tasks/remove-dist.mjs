import { fileURLToPath } from "url";
import { deleteDirectorySync } from "./shared.mjs";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  deleteDirectorySync("./dist/");

  console.log("Removed!");
}
