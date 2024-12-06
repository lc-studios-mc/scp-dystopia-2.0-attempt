<div align="center">

<img src="./media/logo.webp" alt="Logo" title="SCP: Dystopia" height="80" />

<hr/>

[![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/lc-studios-mc/scp-dystopia/total?style=for-the-badge)](https://github.com/lc-studios-mc/scp-dystopia/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/lc-studios-mc/scp-dystopia?style=for-the-badge)](https://github.com/lc-studios-mc/scp-dystopia/commits/)
[![Static Badge](https://img.shields.io/badge/Discord-%235865F2?style=for-the-badge&logo=discord&logoColor=%23ffffff)](https://discord.gg/K2mxsJ2trE)

**SCP: Dystopia** is an add-on for [Minecraft: Bedrock Edition](https://www.minecraft.net/), based on the works of the [SCP Foundation](https://scp-wiki.wikidot.com/) community.

It adds many popular concepts from SCP Foundation universe, including SCP objects and factions, recreated in a form of blocks, mobs, and items! 🧊

</div>

> [!CAUTION]
> This repo is not ready until the release of SCP: Dystopia 2.0.0 Alpha 1.
> 
> It is planned to be released on `1:00 A.M. Sat, December 14, 2024 (UTC)`

- [Introduction 🌟](#introduction-)
- [For Players 🕹️](#for-players-️)
  - [Prerequisites 📋](#prerequisites-)
  - [Installation 🛠️](#installation-️)
- [For Developers 💻](#for-developers-)
  - [Prerequisites 📋](#prerequisites--1)
  - [Installation 🛠️](#installation-️-1)
- [Additional Info 📄](#additional-info-)
  - [License ⚖️](#license-️)
  - [Credits 📝](#credits-)

## Introduction 🌟

This Minecraft add-on contains many exciting features based on concepts from SCP Foundation universe!

For example,

- SCP objects
- Construction blocks
- Furniture blocks
- Door blocks

But what's the point of using SCP: Dystopia?

- Compatibile ✅
  - SCP: Dystopia will stay fine even when you use it in conjunction with other complex add-ons (*in most cases*).
- Optimized 🚀
  - Unlike old add-ons that use entities for everything, SCP: Dystopia's core functionalities are written in optimized scripts.
- Configurable 🔧
  - SCP: Dystopia provides many items to configure your SCP map, you can even make facility lockdown system!
- Survival support 🪓 **(not yet)**
  - We'll add survival support before the full 2.0 release.

## For Players 🕹️

> [!NOTE]
> How-to-play guides and tutorials are not available yet.

### Prerequisites 📋

- Minecraft: Bedrock Edition with custom add-on support (not marketplace!)
  - Windows 10/11
  - Android
  - iOS

### Installation 🛠️

**Standard way (Recommended)**

- Download archive with .mcaddon extension
- Open the downloaded file with Minecraft
- Done!

Manual way
- Download archive with .zip extension
- Unzip the downloaded file
- Open the unzipped folder
- Rename behavior pack (`bp`) to something more distinguishable
- Copy and paste behavior pack to `development_behavior_packs` folder
- Rename resource pack (`rp`) to something more distinguishable
- Copy and paste resource pack to `development_resource_packs` folder
- Done!

> [!IMPORTANT]
> Locations of `development_*_packs` folders are different for each platform.
>
> In Windows, they are typically located inside `C:\Users\{USER}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang`.
>
> Please search on your own if you are not using Windows. 

## For Developers 💻

### Prerequisites 📋

- Windows 10/11
- Minecraft: Bedrock Edition
- [Node.js](https://nodejs.org/) (Tested on v22.11.0)
- npm (Tested on 10.9.0)
- [Visual Studio Code](https://code.visualstudio.com/)
  - Not necessary, but this project is configured for VSCode.

Run this in your terminal to make sure TypeScript is installed globally:

```powershell
npm i typescript -g
```

### Installation 🛠️

> [!NOTE]
> We'll assume that you are using **npm** as a package manager for Node.js.

1. Download [source code](https://github.com/lc-studios-mc/scp-dystopia/archive/refs/heads/main.zip)

2. Extract it. The extracted folder (that directly contains files like `packages.json` and `tsconfig.json`) will be your project directory.

3. Open terminal in your project directory

4. Run this command to install packages:

```powershell
npm i
```

5. Wait for npm to finish installing packages...

6. Done!

## Additional Info 📄

### License ⚖️

This project is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

[Read details](./LICENSE.md)

### Credits 📝

See [CREDITS.md](./CREDITS.md)
