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

## :computer: Development

### Prerequisites

- Git
- Node.js (v22 or later)
- pnpm
- Minecraft: Bedrock Edition
- Visual Studio Code (for debugger)

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

## Other Information

Credits: [here](./docs/credits.md)

Attributions: [here](./docs/attributions.md)

Bug reports and suggestions: [Create a new issue](https://github.com/lc-studios-mc/scp-dystopia/issues)

Questions and general conversation: [Discord](https://discord.gg/K2mxsJ2trE)

Email: info@lc-studios.net
