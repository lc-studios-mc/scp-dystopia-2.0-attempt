# 📥 How to Install

This page explains how you can install the SCP: Dystopia addon on your Minecraft Bedrock.

If you want it in development state without waiting for a proper release, read the [Build from source](#build-from-source) section below.

## Installing a normal release

1. Download the addon file (name ends with `.mcaddon`)
1. Open the file, Minecraft should automatically install it for you.
1. Add the addon to your world and play!

## Build from source

⚠️ You can only do this on Windows or Linux.

### Installing required tools

> [!NOTE]
> For Linux, I will not be explaining how to install the required tools.
> (I assume you can search it on your own)

Summary of required tools:
- Git
- pnpm
- Node.js

Open up your terminal. You will be typing many commands. ⌨️

Windows:
```bash
winget install Git.Git
winget install pnpm.pnpm
winget install OpenJS.NodeJS.LTS
```

Verify installation of each tool:

```bash
git --version
pnpm --version
node --version
```

<ins>For Node.js, you might have to restart your computer.</ins>
