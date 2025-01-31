# Developer Guide

## :mag: Table of Contents

- [Developer Guide](#developer-guide)
  - [:mag: Table of Contents](#mag-table-of-contents)
  - [:page\_facing\_up: Prerequisites](#page_facing_up-prerequisites)
  - [:hammer\_and\_wrench: Installation](#hammer_and_wrench-installation)
    - [If you are contributor](#if-you-are-contributor)
    - [If you are collaborator](#if-you-are-collaborator)
  - [:deciduous\_tree: Project Structure](#deciduous_tree-project-structure)
    - [In-Depth: `packs`](#in-depth-packs)
    - [In-Depth: `src`](#in-depth-src)
    - [In-Depth: `tasks`](#in-depth-tasks)
  - [:keyboard: Useful Commands](#keyboard-useful-commands)
  - [:microscope: Debugging](#microscope-debugging)
  - [:wood: Git Branching Strategy](#wood-git-branching-strategy)

## :page_facing_up: Prerequisites

- Windows 10/11
- Minecraft: Bedrock Edition
- Node.js
- npm
- Git
- Visual Studio Code, for Minecraft debugger and built-in TypeScript support
- Basic command line knowledge

## :hammer_and_wrench: Installation

### If you are contributor

First, [fork this repository](https://github.com/lc-studios-mc/scp-dystopia/fork).

Then, open PowerShell and run:

```pwsh
# Move into your directory to contain the repository
cd your/minecraft/addons

# Clone the repository to your local machine (replace YOUR_USERNAME with your GitHub username)
git clone "https://github.com/YOUR_USERNAME/scp-dystopia.git"

# Move into the clone
cd "scp-dystopia"

# Install packages
npm install
```

Done!

### If you are collaborator

Open PowerShell and run:

```pwsh
# Move into your directory to contain the repository
cd your/minecraft/addons

# Clone the repository to your local machine
git clone "https://github.com/lc-studios-mc/scp-dystopia.git"

# Move into the clone
cd "scp-dystopia"

# Install packages
npm install
```

Done!

## :deciduous_tree: Project Structure

SCP: Dystopia's project structure look like this:

```
.
├── packs/
│   ├── bp/
│   │   └── (Behavior pack files)
│   └── rp/
│       └── (Resource pack files)
├── src/
│   └── (TypeScript files)
├── tasks/
│   └── (Task automation scripts)
└── (Other files and folders)
```

**Brief overview:**

`packs` contains `bp` (behavior pack) and `rp` (resource pack).
They are same as normal packs, except for that you cannot put scripts in `bp`.

`src` contains TypeScript files that will later be compiled to be a part of behavior pack.

`tasks` contains simple CLI tools to automate common tasks.

### In-Depth: `packs`

`bp`'s structure is 99% identical to a standard structure.
It contains manifest.json, blocks, entities, items, etc.

However, it cannot contain scripts.
You must put them into `src` instead.

```
.
└── packs/
    └── bp/
        ├── blocks/
        ├── entities/
        ├── items/
        ├── recipes/
        ├── manifest.json
        └── ...
```

`rp`'s structure is also 99% identical to a standard structure.

```
.
└── packs/
    └── rp/
        ├── animations/
        ├── entity/
        ├── models/
        ├── textures/
        ├── manifest.json
        └── ...
```

### In-Depth: `src`

```
.
└── src
    ├── augumentations
    │   └── (Augumentation modules)
    ├── lib
    │   └── (Library/Utility modules)
    └── server
        └── (Modules to control add-on behavior)
```

If you're new, you are probably confused.
So I'll explain this structure in details.

:memo: "module" refers to a JS/TS file that contains import/export statement(s).

— First, `server`.

It contains modules to control add-on behavior.
Such as gun system and SCP-096's advanced chasing system.

— Second, `lib`.

It contains utility modules used by `server` modules.
For example, `lib/utils/vec3.ts` contains many functions to manipulate Vector3 object.

It also contains modules to hold constant values to be used across `server` modules.

— Third, `augumentation`.

It contains modules to override or extend existing parts of the Minecraft module.

[Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)

### In-Depth: `tasks`

It contains task automation scripts that can be called from command line, typically ran by npm scripts defined in [package.json](./package.json).

Commands are explained in [Useful Commands](#️keyboard-useful-commands) section below.

## :keyboard: Useful Commands

npm scripts

```bash
# Check TypeScript errors
npm run typecheck

# Generate dev build at local Minecraft installation and watch for src file changes
npm run dev

# Same as 'dev', but for Minecraft Preview
npm run devb

# Generate production build at .\dist
npm run dist

# Run dependency-cruiser to check dependency issues
npm run depcruise
```

**Building the add-on:**

```pwsh
# Generate development build inside ...\com.mojang\development_*_packs
#
# [ Available options ]
# -w --watch   — Watch for src file changes and automatically update the build
# -b --beta    — Change the build destination to Minecraft Preview
node ./scripts/build.mjs dev

# Generate production build at .\dist
node ./scripts/build.mjs dist
```

## :microscope: Debugging

1. Install the [Minecraft Bedrock Edition Debugger](https://marketplace.visualstudio.com/items?itemName=mojang-studios.minecraft-debugger) within Visual Studio Code

2. Ensure that the Minecraft Bedrock Edition client can make "loopback" requests

> If you want to connect Minecraft Bedrock Edition client to Visual Studio Code running on the same machine (this is the most common scenario), you will need to exempt the Minecraft client from UWP loopback restrictions. To do this, run the following from a command prompt or the Start | Run app.

Minecraft Bedrock Edition:

```pwsh
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436
```

Minecraft Bedrock Edition Preview:

```pwsh
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-424268864-5579737-879501358-346833251-474568803-887069379-4040235476
```

— [Official Documentation](https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptdevelopertools?view=minecraft-bedrock-stable#get-insight-into-your-code-with-minecraft-script-debugging)

3. Generate development build

Minecraft Bedrock Edition:

```pwsh
node ./tasks/build.mjs dev
```

Minecraft Bedrock Edition Preview:

```pwsh
node ./tasks/build.mjs dev --beta-mc
```

Source map is generated in development build.
Setting breakpoints in a TypeScript source file just works!

4. Open *Run and Debug* view of Visual Studio Code and choose **Debug with Minecraft** (or **Debug with Minecraft Preview**) and press green :arrow_forward: to enter "listen" state (or simply press `F5` to start with previous configuration)

<img src="https://code.visualstudio.com/assets/docs/editor/debugging/run.png" height="260">

5. Connect Minecraft to Visual Studio Code

```
/script debugger connect
```

![Screenshot](https://learn.microsoft.com/en-us/minecraft/creator/documents/media/scriptdevelopertools/breakpointhit.png?view=minecraft-bedrock-stable)

6. Done!

See [launch.json](./.vscode/launch.json) for configurations.

## :wood: Git Branching Strategy

See [BRANCHING.md](./BRANCHING.md).
