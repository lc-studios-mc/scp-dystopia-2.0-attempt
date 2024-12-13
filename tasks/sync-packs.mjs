import { fileURLToPath } from "url";
import * as path from "path";
import * as os from "os";
import * as process from "process";
import concurrently from "concurrently";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const useMcPreview = process.argv[2] === "beta";

  const homedir = os.homedir();
  const mcDir = path.join(
    homedir,
    useMcPreview
      ? "AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/"
      : "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/",
  );

  const bpDir = path.join(mcDir, "development_behavior_packs", "SCPDY_BP");
  const rpDir = path.join(mcDir, "development_resource_packs", "SCPDY_RP");

  const watch = process.argv[2] === "watch" ? "-w" : "";

  const command1 = `npx syncdir ./packs/bp ${bpDir} ${watch} -exclude ".*\\.(gitignore|gitkeep)$"`;
  const command2 = `npx syncdir ./packs/rp ${rpDir} ${watch} -exclude ".*\\.(gitignore|gitkeep|psd|gif|bbmodel)$"`;

  concurrently([command1, command2]);
}
