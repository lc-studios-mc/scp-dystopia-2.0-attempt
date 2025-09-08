# 📥 Installation Guide

This document provides instructions for installing the SCP: Dystopia addon for Minecraft Bedrock Edition. Two installation methods are available: a standard method for official releases and an advanced method for obtaining development versions.

-----

## Standard Installation (Recommended) 👍

This method is straightforward and suitable for most users.

1.  Download the addon file, which will have a `.mcaddon` extension, from an official release page.
2.  Open the downloaded `.mcaddon` file. Minecraft Bedrock Edition will launch and automatically import the addon packs. A success message will appear in-game.
3.  To use the addon, create or edit a Minecraft world. Navigate to the "Behavior Packs" and "Resource Packs" sections in the world settings and activate the SCP: Dystopia packs.

-----

## Advanced Installation: Development Version 🧪

This method allows users to install in-development versions of the addon directly from the source code. It is a more complex process that requires the use of command-line tools.

⚠️ This procedure is currently supported on **Windows only**.
Although it is technically possible to do this on some other operating systems, I will not explain it in here.

### Step 1: Install Prerequisites

Several command-line tools are required to build the addon.

1.  Open Windows PowerShell with administrative privileges. To do this, open the Start Menu, type `PowerShell`, right-click the result, and select "Run as administrator".

2.  Execute the following command in PowerShell to install the required tools (Git, pnpm, and Node.js).

    ```shell
    winget install Git.Git
    winget install pnpm.pnpm
    winget install OpenJS.NodeJS.LTS
    ```

3.  A system restart is required after the installation is complete.

4.  After restarting, open a new PowerShell window (administrator is not required) and execute the following commands to verify that each tool was installed correctly. Each command should return a version number.

    ```shell
    git --version
    pnpm --version
    node --version
    ```

### Step 2: Clone the Repository

Download the addon's source files from the online repository.

1.  Create a dedicated folder on your system (e.g., `C:\minecraft_addons`).

2.  Open a terminal or PowerShell window within this new folder. A common shortcut on Windows is to right-click the empty space in the folder and select "Open in Terminal".

3.  Execute the following command to download the project files.

    ```shell
    git clone https://github.com/lc-studios-mc/scp-dystopia.git
    ```

    This command downloads the project into a new subfolder named `scp-dystopia`.

> **Note:** If an error occurs during this process, you can safely delete the `scp-dystopia` folder and re-run the `git clone` command.

### Step 3: Configure Environment Variables

Create a configuration file to specify the output directory for the compiled addon packs, linking them to your Minecraft development folders.

1.  Navigate into the newly created `scp-dystopia` folder.

2.  Create a new file named exactly `.env` in this directory.

3.  Open the `.env` file with a text editor and paste the following content:

    ```env
    DEV_BP_OUTDIR="C:\Users\{USERNAME}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_behavior_packs\SCPDY_BP_DEV"
    DEV_RP_OUTDIR="C:\Users\{USERNAME}\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_resource_packs\SCPDY_RP_DEV"
    ```

4.  **Important:** Replace `{USERNAME}` in both paths with your Windows user profile name. You can find this name by navigating to `C:\Users\` in File Explorer.

### Step 4: Select a Branch

The repository uses branches to manage different lines of development.

  * `main`: The primary development branch. Contains the latest features that are generally stable. **Recommended for most users.**
  * `restoration`: A feature-specific branch for restoring older game mechanics.

To switch to the `main` branch, execute the following command from the terminal inside the `scp-dystopia` directory:

```shell
git checkout main
```

### Step 5: Build and Deploy the Addon

These final commands will update your local files and build the addon into the directories specified in Step 3.

1.  Ensure your terminal is still open in the `scp-dystopia` directory. First, update your local repository and its dependencies by running these three commands:

    ```shell
    git pull
    pnpm i
    ```

2.  Next, run the development script to build and deploy the addon:

    ```shell
    pnpm run dev
    ```

3.  This command will compile the addon and then continue running to watch for file changes. This is expected behavior. You can stop the process at any time by pressing **Ctrl+C** or by closing the terminal window.

### Step 6: Play

The development version of the addon is now deployed to your Minecraft development folders.
To use it, open Minecraft, edit a world, and activate the `SCPDY_BP_DEV` (Behavior Pack) and `SCPDY_RP_DEV` (Resource Pack).
