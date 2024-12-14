# Installation (for developers) 🖥️

## Prerequisites

- Windows 10/11
- [Minecraft: Bedrock Edition](https://www.minecraft.net/)
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- npm (part of Node.js)
- [Visual Studio Code](https://code.visualstudio.com/) (Minecraft debugger is only available for VSCode)

## Installation

### If you are official developer

Open PowerShell and run these commands step by step:

```powershell
# Navigate to the directory where you want to clone the repository
cd C:\path\to\your\directory

# Clone the repository
git clone https://github.com/lc-studios-mc/scp-dystopia.git

# Change into the repository directory
cd scp-dystopia

# Install npm packages
npm i
```

### If you are contributing

First, [fork this repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo).

Then, open PowerShell and run these commands step by step:

```powershell
# Navigate to the directory where you want to clone the repository
cd C:\path\to\your\directory

# Clone the repository
git clone https://github.com/{YOUR GITHUB USERNAME}/scp-dystopia.git

# Change into the repository directory
cd scp-dystopia

# Install npm packages
npm i
```

### Debugger setup

Install [Minecraft Bedrock Edition Debugger](https://marketplace.visualstudio.com/items?itemName=mojang-studios.minecraft-debugger) on  your VSCode

By default, the debugger won't work. You have to run a command to ensure that the Minecraft Bedrock Edition client can make "loopback" requests.

Minecraft Bedrock Edition:
```powershell
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436
```

Minecraft Bedrock Edition Preview:
```powershell
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-424268864-5579737-879501358-346833251-474568803-887069379-4040235476
```

[Official docs about debugging](https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptdevelopertools?view=minecraft-bedrock-stable#get-insight-into-your-code-with-minecraft-script-debugging)

