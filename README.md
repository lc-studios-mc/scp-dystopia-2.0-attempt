<div align="center">

<img src="./media/logo.webp" alt="Logo" title="SCP: Dystopia" height="80" />

<hr/>

**SCP: Dystopia** is an add-on for Minecraft Bedrock, based on the works of the [SCP Foundation](https://scp-wiki.wikidot.com/) community.

[![Static Badge](https://img.shields.io/badge/Discord-%235865F2?style=for-the-badge&logo=discord&logoColor=%23ffffff)](https://discord.gg/K2mxsJ2trE)
[![Static Badge](https://img.shields.io/badge/CurseForge-%23f16436?style=for-the-badge&logo=curseforge&logoColor=%23ffffff)](https://www.curseforge.com/minecraft-bedrock/addons/scp-dystopia-addon)
[![Static Badge](https://img.shields.io/badge/MCPEDL-%2300a52e?style=for-the-badge)](https://mcpedl.com/scp-dystopia-addon/)

<img src="./media/banner.webp" alt="Logo" title="SCP: Dystopia" />

</div>

> [!IMPORTANT]
> Development is done in the `dev` branch.

## How to get the latest development build

### Prerequisites

- Make sure you are on a Windows 11 computer.
- Install Node.js.
  - I recommend to do so using [fnm](https://github.com/Schniz/fnm).
  - Fully read fnm's readme!
- Install [pnpm](https://pnpm.io/installation).
- Install [Git for Windows](https://git-scm.com/downloads/win).
- Create a local clone.
  - Open terminal in the folder where you want your scp-dystopia clone to be.
  - Run `git clone https://github.com/lc-studios-mc/scp-dystopia.git`.
  - `cd` into the cloned repo.
  - Run `git checkout dev`. This branch is where the development is done.
  - Run `pnpm install`

### Run build

- Open terminal in the cloned scp-dystopia folder.
- Run `git pull origin dev` (everytime).
- Run `pnpm run dev`.
  - This will compile both BP and RP, and put them into development packs folders in com.mojang.
  - Press CTRL+c to stop the process.
  - Be careful when using dev build in a serious project.
- Try running `pnpm install` if anything goes wrong.

## Other Information

See credits [here](./docs/credits.md).

See attributions [here](./docs/attributions.md).

For bug reports and suggestions: [Create a new issue](https://github.com/lc-studios-mc/scp-dystopia/issues).

For questions and general conversation: [Discord](https://discord.gg/K2mxsJ2trE).

Email: info@lc-studios.net
