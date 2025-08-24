> [!CAUTION]
> We're currently working on version 2.0, which is a complete rewrite. It's not yet in a stable development stage and **will introduce breaking changes.**
> You should not use it in a serious project for now!

<hr/>

<div align="center">

<img src="./media/logo.webp" alt="Logo" title="SCP: Dystopia" height="80" />

<hr/>

**SCP: Dystopia** is an add-on for Minecraft Bedrock, based on the works of the [SCP Foundation](https://scp-wiki.wikidot.com/) community.

[![Static Badge](https://img.shields.io/badge/Discord-%235865F2?style=for-the-badge&logo=discord&logoColor=%23ffffff)](https://discord.gg/K2mxsJ2trE)
[![Static Badge](https://img.shields.io/badge/CurseForge-%23f16436?style=for-the-badge&logo=curseforge&logoColor=%23ffffff)](https://www.curseforge.com/minecraft-bedrock/addons/scp-dystopia-addon)
[![Static Badge](https://img.shields.io/badge/MCPEDL-%2300a52e?style=for-the-badge)](https://mcpedl.com/scp-dystopia-addon/)

<img src="./media/banner.webp" alt="Logo" title="SCP: Dystopia" />

</div>

## :computer: Developer Setup

### Prerequisites

- Git
- Node.js (v22 or later)
- pnpm
- Minecraft: Bedrock Edition
- Visual Studio Code (for debugging)

### Setup

1. Clone the repository

```bash
git clone https://github.com/lc-studios-mc/scp-dystopia.git
cd scp-dystopia
```

2. Install dependencies

```bash
pnpm install
```

3. Set environment variables

Create a file named `.env` and paste this text:

```env
# Replace {User} with your username
DEV_BP_OUTDIR="C:\Users\{User}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_behavior_packs\SCPDY_BP_DEV"
DEV_RP_OUTDIR="C:\Users\{User}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_resource_packs\SCPDY_RP_DEV"
```

4. Test

```bash
pnpm run dev # This will compile the addon and output the packs into the folders you specified with .env
```

### Debugging

You must install [Minecraft Bedrock Debugger](https://marketplace.visualstudio.com/items?itemName=mojang-studios.minecraft-debugger) to Visual Studio Code.

Open PowerShell as administrator and run these commands. [Source](https://github.com/Mojang/minecraft-debugger?tab=readme-ov-file#ensure-that-the-minecraft-bedrock-client-can-make-loopback-requests)

```pwsh
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-424268864-5579737-879501358-346833251-474568803-887069379-4040235476
```

Open the scp-dystopia folder you cloned earlier in Visual Studio Code.

Compile the addon by running `pnpm run dev` in terminal.

Within Visual Studio Code, click the "Debug with Minecraft" option under the Run menu (or hit F5) to start debugging. This will place Visual Studio Code into "Listen Mode", where it awaits a connection from Minecraft.

Start Minecraft and load into a world with the SCP: Dystopia behavior pack.

Run the command `/script debugger connect` in Minecraft.

**You should see a "Debugger connected to host" response from this command if the connection is successful!**

In scripts (TypeScript), you can set breakpoints in your code by clicking on the left-hand side of the editor, on specific lines of code.

## :memo: Other Information

Credits: [here](./docs/credits.md)

Attributions: [here](./docs/attributions.md)

Bug reports and suggestions: [Create a new issue](https://github.com/lc-studios-mc/scp-dystopia/issues)

Questions and general conversation: [Discord](https://discord.gg/K2mxsJ2trE)

Email: info@lc-studios.net
