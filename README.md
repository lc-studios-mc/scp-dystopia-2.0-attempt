<div align="center">

<img src="./media/logo.webp" alt="Logo" title="SCP: Dystopia" height="80" />

<hr/>

**SCP: Dystopia** is an add-on for Minecraft Bedrock, based on the works of the [SCP Foundation](https://scp-wiki.wikidot.com/) community.

[![Static Badge](https://img.shields.io/badge/Discord-%235865F2?style=for-the-badge&logo=discord&logoColor=%23ffffff)](https://discord.gg/K2mxsJ2trE)
[![Static Badge](https://img.shields.io/badge/CurseForge-%23f16436?style=for-the-badge&logo=curseforge&logoColor=%23ffffff)](https://www.curseforge.com/minecraft-bedrock/addons/scp-dystopia-addon)
[![Static Badge](https://img.shields.io/badge/MCPEDL-%2300a52e?style=for-the-badge)](https://mcpedl.com/scp-dystopia-addon/)

<img src="./media/banner.webp" alt="Logo" title="SCP: Dystopia" />

</div>

## How to get the latest development build

- Make sure you are on a Windows 11 computer.
- Install Node.js.
  - I recommend to do so using [fnm](https://github.com/Schniz/fnm).
  - Fully read fnm's readme!
- Install pnpm.
  - Run `npm install -g pnpm`
- Install [Git for Windows](https://git-scm.com/downloads/win).
- Locate to the folder where you want your scp-dystopia clone to be.
- Run `git clone https://github.com/lc-studios-mc/scp-dystopia.git`.
- Open terminal in the cloned scp-dystopia folder.
- Run `pnpm install`.
- Run `pnpm run dev`.
  - This will compile both BP and RP, and put them into development packs folders in com.mojang.
  - Press CTRL+c to stop it.
  - Be careful when using dev build in a serious project.
- Run `git pull origin main` **periodically**.
  - This will make your scp-dystopia clone up-to-date with the remote origin.
  - I recommend to run it everytime before `pnpm run build`.

## Other Information

See credits [here](./docs/credits.md).

See attributions [here](./docs/attributions.md).

For bug reports, suggestions, questions, etc., please use our [Discord](https://discord.gg/K2mxsJ2trE).

Email: info@lc-studios.net
