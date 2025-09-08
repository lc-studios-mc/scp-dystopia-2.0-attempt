# 📥 How to Install

This page explains how you can install the SCP: Dystopia addon on your Minecraft Bedrock.

If you want it in development state without waiting for a proper release, read the [Build from source](#build-from-source).

## Installing a normal release

1. Download the addon file (name ends with `.mcaddon`)
1. Open the file, Minecraft should automatically install it for you.
1. Add the addon to your world and play!

## Build from source

⚠️ You can only do this on Windows or Linux.

### Installing the required tools

The required tools:
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

### Clone the repository

Create a folder somewhere on your computer's drive, name it something like "minecraft_addons".
Existing folder is also fine.

Open terminal in that folder.
On Windows, right click on the empty area inside the folder to open context menu, and left click "Open in terminal".

Run:
```shell
git clone https://github.com/lc-studios-mc/scp-dystopia.git
```

It will create a folder named `scp-dystopia`, which is a local clone of the [lc-studios-mc/scp-dystopia](https://github.com/lc-studios-mc/scp-dystopia) repository.

<ins>If you screw up something, you can always delete this folder (scp-dystopia) and clone it again.</ins>
