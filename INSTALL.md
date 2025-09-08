# 📥 How to Install

This page explains how you can install the SCP: Dystopia addon on your Minecraft Bedrock.

If you want it in development state without waiting for a proper release, read the [Build from source](#build-from-source) section.

## Installing a normal release

1. Download the addon file (name ends with `.mcaddon`)
1. Open the file, Minecraft should automatically install it for you.
1. Add the addon to your world and play!

## Build from source

Follow the steps written in this section from top to bottom.

⚠️ You can only do this on Windows or Linux.

### Installing the required tools

The required tools are:
- Git
- pnpm
- Node.js

On Windows, open your terminal and run:
```shell
winget install Git.Git
winget install pnpm.pnpm
winget install OpenJS.NodeJS.LTS
```

On Linux, I assume you can search it on your own.

Verify installation of each tool (<ins>you might have to restart your computer</ins>):
```shell
git --version
pnpm --version
node --version
```

### Cloning the repository

Create a folder somewhere on your computer's drive, name it something like "minecraft_addons".
Existing folder is also fine.

Open terminal in that folder.
On Windows, right click on the empty area inside the folder to open context menu, and left click "Open in terminal".

Run:
```shell
git clone https://github.com/lc-studios-mc/scp-dystopia.git
```

It will create a folder named "scp-dystopia", which would be a local clone of the [lc-studios-mc/scp-dystopia](https://github.com/lc-studios-mc/scp-dystopia) repository.

<ins>If you screw up something, you can always delete this folder (scp-dystopia) and clone it again.</ins>

### Setting environment variables

Create a file named `.env` at top level of the scp-dystopia folder and open it in your text editor.

Copy and paste this text (read until the end if you use Linux):
```env
DEV_BP_OUTDIR="C:\Users\{USERNAME}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_behavior_packs\SCPDY_BP_DEV"
DEV_RP_OUTDIR="C:\Users\{USERNAME}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_resource_packs\SCPDY_RP_DEV"
```

<ins>Replace two `{USERNAME}` in the pasted text with the actual username of yours. Look inside `C:\Users\` to know your username.</ins>

> [!NOTE]
> `C:\Users\{USERNAME}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang`
> is the standard location on Windows systems for Minecraft Bedrock to save some data.
> You can change it like the guide below.

#### Changing pack output locations

The text `DEV_BP_OUTDIR="C:\Users\{USERNAME}\..."` <br/>
essentially tells the system: `the path "C:\Users\{USERNAME}\..." is where the compiled/generated pack will be at.`

So, if you want the packs to be generated inside `C:\SCP_Dystopia\` for example, you can change the content of .env file to:

```env
DEV_BP_OUTDIR="C:\SCP_Dystopia\SCPDY_BP_DEV"
DEV_RP_OUTDIR="C:\SCP_Dystopia\SCPDY_RP_DEV"
```

If you're a Linux user:

```env
DEV_BP_OUTDIR="/path/to/minecrafts/behavior_packs/SCPDY_BP_DEV"
DEV_RP_OUTDIR="/path/to/minecrafts/resource_packs/SCPDY_RP_DEV"
```

### Choosing a branch

Quick summary:
- `main` branch: *usually* up-to-date and contains the latest state of development that is good enough to be a part of "main".
- `restoration` branch: contains the latest state of the v1 restoration project.
- Use `git checkout <branch_name>` to change the branch you're on.

Git branch is a complex topic on its own, so I won't deep dive into it here.

Branches are like a parallel timeline of a repository.

In this repository, there's `main` branch, which is *usually* up-to-date and contains the latest state of development.

Why did I say "usually"? Let's say I post a video on YouTube showcasing a new feature,
but that new feature may not have been uploaded to the main branch *yet*.

**That applies to the case of the v1 restoration project**
(aimed to fix and restore the old features that are now broken)

I'm working on it, but it's not finished yet enough to merge such huge changes into the main branch.

So there's another branch named `restoration`, which is where I work on the v1 restoration project.

You can use the `git checkout <branch>` command to move to a different branch.
By default, you are on the main branch.

**Know which branch you're on:**
```shell
git branch
```

**If you want to go to the `restoration` branch:**
```shell
git checkout restoration
```

**If you want to go back to the `main` branch:**
```shell
git checkout main
```

> [!CAUTION]
> Some commands shown here may not work on certain branches, but should work on `main` and `restoration`.

### Fetching and pulling (retrieving) the latest state

<ins>Do this every time you want a new development version.</ins>

Make sure you're on the correct branch: [Choosing a branch](#choosing-a-branch)

Run: 
```shell
# Fetch information from remote
git fetch
# Sync the branch you are currently on with the remote state (i.e. the latest state)
git pull
# Update internal dependencies
pnpm i
```
