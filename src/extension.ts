import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

let extensionContext: vscode.ExtensionContext;
let isMuted = false;
const seenErrorLines = new Set<string>();
const lastDiagnosticErrorCounts = new Map<string, number>();

export function activate(context: vscode.ExtensionContext) {
  extensionContext = context;

  const testCommand = vscode.commands.registerCommand(
    "fahhherror.playSound",
    () => {
      playSound();
    },
  );
  context.subscriptions.push(testCommand);

  const runCommand = vscode.commands.registerCommand(
    "fahhherror.runCommandWithSound",
    async () => {
      const suggested = await getDefaultOrDetectedCommand(context);
      const lastCommand = context.globalState.get<string>(
        "fahhherror.lastCommand",
        "",
      );
      const input = await vscode.window.showInputBox({
        prompt: "Shell command to run",
        value: suggested || lastCommand,
        placeHolder: "npm test",
      });

      if (!input || !input.trim()) {
        return;
      }

      await context.globalState.update("fahhherror.lastCommand", input);
      await runShellCommand(input);
    },
  );
  context.subscriptions.push(runCommand);

  const runDefaultCommand = vscode.commands.registerCommand(
    "fahhherror.runDefaultCommandWithSound",
    async () => {
      const command = await getDefaultOrDetectedCommand(context);
      if (command) {
        await runShellCommand(command);
        return;
      }
      void vscode.commands.executeCommand("fahhherror.runCommandWithSound");
    },
  );
  context.subscriptions.push(runDefaultCommand);

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.text = "$(play) Run With Sound";
  statusBarItem.command = "fahhherror.runDefaultCommandWithSound";
  statusBarItem.tooltip =
    "Run the default or detected command and play sound on failure";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const menuStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99,
  );
  menuStatusBarItem.command = "fahhherror.openMenu";
  function updateMenuStatusBar() {
    const config = vscode.workspace.getConfiguration("errorSoundAlert");
    const globallyEnabled = config.get<boolean>("enabled", true);
    if (!globallyEnabled || isMuted) {
      menuStatusBarItem.text = "$(bell-slash) faahhhk";
      menuStatusBarItem.tooltip = "faahhhk — click to open settings";
      menuStatusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    } else {
      menuStatusBarItem.text = "$(bell) faahhhk";
      menuStatusBarItem.tooltip = "faahhhk — click to open settings";
      menuStatusBarItem.backgroundColor = undefined;
    }
  }
  updateMenuStatusBar();
  menuStatusBarItem.show();
  context.subscriptions.push(menuStatusBarItem);

  const openMenuCommand = vscode.commands.registerCommand(
    "fahhherror.openMenu",
    async () => {
      const config = vscode.workspace.getConfiguration("errorSoundAlert");
      const globallyEnabled = config.get<boolean>("enabled", true);
      const playOnDiagnostics = config.get<boolean>("playOnDiagnostics", true);
      const playOnTerminal = config.get<boolean>("playOnTerminalError", true);

      type MenuItem = vscode.QuickPickItem & {
        action: () => Promise<void> | void;
      };

      const items: MenuItem[] = [
        {
          label: isMuted
            ? "$(bell) Unmute sounds"
            : "$(bell-slash) Mute sounds",
          description: isMuted
            ? "Sounds are currently muted (temporary)"
            : "Temporarily silence all sounds",
          action() {
            isMuted = !isMuted;
            updateMenuStatusBar();
            void vscode.window.showInformationMessage(
              isMuted ? "faahhhk: Sounds muted" : "faahhhk: Sounds unmuted",
            );
          },
        },
        { label: "", kind: vscode.QuickPickItemKind.Separator, action() {} },
        {
          label: globallyEnabled
            ? "$(circle-slash) Disable extension"
            : "$(check) Enable extension",
          description: globallyEnabled
            ? "Turn off faahhhk completely"
            : "Turn on faahhhk",
          async action() {
            await config.update("enabled", !globallyEnabled, true);
            updateMenuStatusBar();
          },
        },
        {
          label: playOnDiagnostics
            ? "$(eye-closed) Disable diagnostic sounds"
            : "$(eye) Enable diagnostic sounds",
          description: playOnDiagnostics
            ? "Stop playing sound on editor errors"
            : "Play sound when editor errors appear",
          async action() {
            await config.update("playOnDiagnostics", !playOnDiagnostics, true);
          },
        },
        {
          label: playOnTerminal
            ? "$(terminal) Disable terminal error sounds"
            : "$(terminal) Enable terminal error sounds",
          description: playOnTerminal
            ? "Stop playing sound on non-zero exit codes"
            : "Play sound when a command fails",
          async action() {
            await config.update("playOnTerminalError", !playOnTerminal, true);
          },
        },
        { label: "", kind: vscode.QuickPickItemKind.Separator, action() {} },
        {
          label: "$(pencil) Set default command",
          description: "Choose the command that runs on startup",
          async action() {
            await vscode.commands.executeCommand(
              "fahhherror.setDefaultCommand",
            );
          },
        },
        {
          label: "$(refresh) Reset to auto-detect",
          description: "Let faahhhk detect the command from your project",
          async action() {
            await vscode.commands.executeCommand(
              "fahhherror.resetDefaultCommand",
            );
          },
        },
        {
          label: "$(settings-gear) Open all settings",
          description: "Open VS Code settings for faahhhk",
          action() {
            void vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "errorSoundAlert",
            );
          },
        },
      ];

      const picked = await vscode.window.showQuickPick(items, {
        title: "faahhhk Settings",
        placeHolder: "Choose an option",
      });

      if (picked) {
        await picked.action();
      }
    },
  );
  context.subscriptions.push(openMenuCommand);

  const toggleMuteCommand = vscode.commands.registerCommand(
    "fahhherror.toggleMute",
    () => {
      isMuted = !isMuted;
      updateMenuStatusBar();
      void vscode.window.showInformationMessage(
        isMuted ? "faahhhk: Sounds muted" : "faahhhk: Sounds unmuted",
      );
    },
  );
  context.subscriptions.push(toggleMuteCommand);

  const setDefaultCommand = vscode.commands.registerCommand(
    "fahhherror.setDefaultCommand",
    async () => {
      const config = vscode.workspace.getConfiguration("errorSoundAlert");
      const current = config.get("defaultCommand") as string | undefined;
      const input = await vscode.window.showInputBox({
        prompt: "Default shell command to run",
        value: current ?? "",
        placeHolder: "npm test",
      });

      if (!input || !input.trim()) {
        return;
      }

      await config.update("defaultCommand", input, true);
      await context.globalState.update(
        "fahhherror.defaultCommandSource",
        "user",
      );
    },
  );
  context.subscriptions.push(setDefaultCommand);

  const resetDefaultCommand = vscode.commands.registerCommand(
    "fahhherror.resetDefaultCommand",
    async () => {
      const config = vscode.workspace.getConfiguration("errorSoundAlert");
      await config.update("defaultCommand", "", true);
      await context.globalState.update(
        "fahhherror.defaultCommandSource",
        "auto",
      );
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const detected = detectDefaultCommand(workspaceFolder);
      if (detected) {
        await config.update("defaultCommand", detected, true);
        void vscode.window.showInformationMessage(
          `fahhhError reset to auto-detected command: ${detected}`,
        );
      } else {
        void vscode.window.showInformationMessage(
          "fahhhError reset to auto-detect. No command detected yet.",
        );
      }
    },
  );
  context.subscriptions.push(resetDefaultCommand);

  const diagnosticsListener = vscode.languages.onDidChangeDiagnostics(
    (event) => {
      handleDiagnostics(event.uris);
    },
  );
  context.subscriptions.push(diagnosticsListener);

  const taskListener = vscode.tasks.onDidEndTaskProcess((event) => {
    handleTaskResult(event);
  });
  context.subscriptions.push(taskListener);

  const config = vscode.workspace.getConfiguration("errorSoundAlert");
  const enabled = config.get("enabled") as boolean;
  const autoRun = config.get("autoRunCommand") as boolean;
  const defaultCommand = config.get("defaultCommand") as string;

  if (enabled && autoRun) {
    if (defaultCommand && defaultCommand.trim()) {
      void runShellCommand(defaultCommand.trim());
    } else {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const detected = detectDefaultCommand(workspaceFolder);
      if (detected) {
        void config.update("defaultCommand", detected, true).then(() => {
          void runShellCommand(detected);
        });
        void context.globalState.update(
          "fahhherror.defaultCommandSource",
          "auto",
        );
        void vscode.window.showInformationMessage(
          `fahhhError detected a default command: ${detected}`,
        );
        return;
      }
      void vscode.window
        .showInformationMessage(
          "Set a default command for fahhhError to run on startup.",
          "Set Default Command",
          "Open Settings",
        )
        .then((selection) => {
          if (selection === "Set Default Command") {
            void vscode.commands.executeCommand("fahhherror.setDefaultCommand");
          } else if (selection === "Open Settings") {
            void vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "errorSoundAlert.defaultCommand",
            );
          }
        });
    }
  }
}

async function runShellCommand(command: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const expanded = expandCommandVariables(command, workspaceFolder);
  if (!expanded) {
    return;
  }
  const parsed = parseCommandLine(expanded);
  if (!parsed) {
    void vscode.window.showErrorMessage(
      "Unable to parse the command. Check quoting and try again.",
    );
    return;
  }
  const scope = workspaceFolder ?? vscode.TaskScope.Global;
  const definition: vscode.TaskDefinition = {
    type: "fahhherror",
    command: expanded,
  };
  const execution = new vscode.ShellExecution(parsed.command, parsed.args, {
    cwd: workspaceFolder?.uri.fsPath,
  });
  const task = new vscode.Task(
    definition,
    scope,
    "Run Command With Sound",
    "fahhherror",
    execution,
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
  };

  try {
    await vscode.tasks.executeTask(task);
  } catch {
    // silent fail
  }
}

async function getDefaultOrDetectedCommand(
  context: vscode.ExtensionContext,
): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration("errorSoundAlert");
  const defaultCommand = (config.get("defaultCommand") as string) ?? "";
  const preferActiveDetection =
    (config.get("preferActiveFileDetection") as boolean) ?? true;
  const source = context.globalState.get<string>(
    "fahhherror.defaultCommandSource",
    "",
  );

  if (defaultCommand.trim() && source !== "auto" && !preferActiveDetection) {
    return defaultCommand.trim();
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const detected = detectDefaultCommand(workspaceFolder);
  if (detected) {
    await config.update("defaultCommand", detected, true);
    await context.globalState.update("fahhherror.defaultCommandSource", "auto");
    return detected;
  }

  if (defaultCommand.trim()) {
    return defaultCommand.trim();
  }

  const lastCommand = context.globalState.get<string>(
    "fahhherror.lastCommand",
    "",
  );
  return lastCommand.trim() || undefined;
}

function expandCommandVariables(
  command: string,
  workspaceFolder?: vscode.WorkspaceFolder,
): string | undefined {
  let expanded = command;
  const workspacePath = workspaceFolder?.uri.fsPath;
  const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;

  if (expanded.includes("${workspaceFolder}") && !workspacePath) {
    void vscode.window.showErrorMessage("No workspace folder is open");
    return undefined;
  }

  if (expanded.includes("${file}") && !activeFile) {
    void vscode.window.showErrorMessage("No active file is open");
    return undefined;
  }

  if (workspacePath) {
    expanded = expanded.replace(/\$\{workspaceFolder\}/g, workspacePath);
  }

  if (activeFile) {
    const fileBasename = path.basename(activeFile);
    const fileDirname = path.dirname(activeFile);
    const fileBasenameNoExtension = path.parse(activeFile).name;
    expanded = expanded.replace(/\$\{file\}/g, activeFile);
    expanded = expanded.replace(/\$\{fileBasename\}/g, fileBasename);
    expanded = expanded.replace(/\$\{fileDirname\}/g, fileDirname);
    expanded = expanded.replace(
      /\$\{fileBasenameNoExtension\}/g,
      fileBasenameNoExtension,
    );
  }

  return expanded;
}

function detectDefaultCommand(
  workspaceFolder?: vscode.WorkspaceFolder,
): string | undefined {
  if (!workspaceFolder) {
    return undefined;
  }

  const root = workspaceFolder.uri.fsPath;
  const packageJsonPath = path.join(root, "package.json");
  const hasPackageJson = fs.existsSync(packageJsonPath);
  const usesPnpm = fs.existsSync(path.join(root, "pnpm-lock.yaml"));
  const usesYarn = fs.existsSync(path.join(root, "yarn.lock"));
  const pkgManager = usesPnpm ? "pnpm" : usesYarn ? "yarn" : "npm";

  if (hasPackageJson) {
    try {
      const raw = fs.readFileSync(packageJsonPath, "utf8");
      const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
      const scripts = parsed.scripts ?? {};
      if (scripts.build) {
        return formatPackageManagerCommand(pkgManager, "build");
      }
      if (scripts.test) {
        return formatPackageManagerCommand(pkgManager, "test");
      }
      if (scripts.lint) {
        return formatPackageManagerCommand(pkgManager, "lint");
      }
    } catch {
      // ignore invalid package.json
    }
  }

  if (fs.existsSync(path.join(root, "Makefile"))) {
    return "make";
  }

  const mvnwUnix = path.join(root, "mvnw");
  const mvnwWin = path.join(root, "mvnw.cmd");
  if (
    fs.existsSync(path.join(root, "pom.xml")) ||
    fs.existsSync(mvnwUnix) ||
    fs.existsSync(mvnwWin)
  ) {
    if (process.platform === "win32" && fs.existsSync(mvnwWin)) {
      return "mvnw.cmd test";
    }
    if (fs.existsSync(mvnwUnix)) {
      return "./mvnw test";
    }
    return "mvn test";
  }

  const gradleUnix = path.join(root, "gradlew");
  const gradleWin = path.join(root, "gradlew.bat");
  if (
    fs.existsSync(path.join(root, "build.gradle")) ||
    fs.existsSync(path.join(root, "build.gradle.kts")) ||
    fs.existsSync(gradleUnix) ||
    fs.existsSync(gradleWin)
  ) {
    if (process.platform === "win32" && fs.existsSync(gradleWin)) {
      return "gradlew.bat test";
    }
    if (fs.existsSync(gradleUnix)) {
      return "./gradlew test";
    }
    return "gradle test";
  }

  if (fs.existsSync(path.join(root, "Cargo.toml"))) {
    return "cargo test";
  }

  if (fs.existsSync(path.join(root, "go.mod"))) {
    return "go test ./...";
  }

  const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (activeFile) {
    const ext = path.extname(activeFile).toLowerCase();
    if ([".py"].includes(ext)) {
      return 'python "${file}"';
    }
    if ([".js", ".mjs", ".cjs"].includes(ext)) {
      return 'node "${file}"';
    }
    if ([".java"].includes(ext)) {
      return 'javac "${file}" && java -cp "${fileDirname}" "${fileBasenameNoExtension}"';
    }
    if ([".c"].includes(ext)) {
      return 'gcc "${file}" -o "${workspaceFolder}/a.out"';
    }
    if ([".cc", ".cpp", ".cxx"].includes(ext)) {
      return 'g++ "${file}" -o "${workspaceFolder}/a.out"';
    }
  }

  return undefined;
}

function formatPackageManagerCommand(
  pkgManager: string,
  script: string,
): string {
  if (pkgManager === "yarn") {
    return `yarn ${script}`;
  }
  if (pkgManager === "pnpm") {
    return script === "test" ? "pnpm test" : `pnpm run ${script}`;
  }
  return script === "test" ? "npm test" : `npm run ${script}`;
}

function parseCommandLine(
  commandLine: string,
): { command: string; args: string[] } | undefined {
  const args: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < commandLine.length; i += 1) {
    const char = commandLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && /\s/.test(char)) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    args.push(current);
  }

  if (inQuotes || args.length === 0) {
    return undefined;
  }

  const [command, ...rest] = args;
  return { command, args: rest };
}

function handleDiagnostics(uris: readonly vscode.Uri[]) {
  const config = vscode.workspace.getConfiguration("errorSoundAlert");
  if (isMuted || !config.get("enabled") || !config.get("playOnDiagnostics")) {
    return;
  }

  for (const uri of uris) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    const errorCount = diagnostics.filter(
      (diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error,
    ).length;

    const key = uri.toString();
    const previousCount = lastDiagnosticErrorCounts.get(key) ?? 0;

    if (errorCount > previousCount) {
      playSound();
    }

    if (errorCount === 0) {
      lastDiagnosticErrorCounts.delete(key);
    } else {
      lastDiagnosticErrorCounts.set(key, errorCount);
    }
  }
}

function handleTaskResult(event: vscode.TaskProcessEndEvent) {
  const config = vscode.workspace.getConfiguration("errorSoundAlert");
  if (isMuted || !config.get("enabled") || !config.get("playOnTerminalError")) {
    return;
  }

  if (typeof event.exitCode === "number" && event.exitCode !== 0) {
    const key = `${event.execution.task.name}:${event.exitCode}`;
    if (!seenErrorLines.has(key)) {
      seenErrorLines.add(key);
      playSound();
      setTimeout(() => seenErrorLines.delete(key), 3000);
    }
  }
}

function playSound() {
  const config = vscode.workspace.getConfiguration("errorSoundAlert");
  const soundFile = config.get("soundFile") as string;
  const volume = config.get("volume") as number;

  try {
    if (soundFile === "builtin-alert") {
      // Use built-in system sound
      playBuiltInAlert();
    } else {
      // Play custom audio file
      playAudioFile(soundFile, volume);
    }
  } catch {
    // silent fail
  }
}

function playBuiltInAlert() {
  const { execSync } = require("child_process");
  try {
    if (process.platform === "win32") {
      execSync("powershell.exe -NoProfile -Command [console]::beep(800,200)", {
        stdio: "ignore",
        shell: true,
      });
    } else if (process.platform === "darwin") {
      execSync("afplay /System/Library/Sounds/Glass.aiff", { stdio: "ignore" });
    } else {
      execSync("paplay /usr/share/sounds/freedesktop/stereo/complete.oga", {
        stdio: "ignore",
      });
    }
  } catch {
    // silent fail
  }
}

async function playAudioFile(filePath: string, volume: number = 1.0) {
  try {
    let expandedPath = filePath;

    // Handle bundled files (e.g., "bundled:fahhhh.wav")
    if (expandedPath.startsWith("bundled:")) {
      const filename = expandedPath.replace("bundled:", "");
      expandedPath = path.join(
        extensionContext.extensionPath,
        "media",
        filename,
      );
    } else {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      // Expand ${workspaceFolder} placeholder
      if (expandedPath.includes("${workspaceFolder}")) {
        if (workspaceFolder) {
          expandedPath = expandedPath.replace(
            "${workspaceFolder}",
            workspaceFolder.uri.fsPath,
          );
        } else {
          vscode.window.showErrorMessage("No workspace folder is open");
          return;
        }
      }

      // Expand ~ to home directory
      expandedPath = expandedPath.replace(
        /^~/,
        process.env.HOME || process.env.USERPROFILE || "",
      );

      // Make path absolute if relative
      if (!path.isAbsolute(expandedPath)) {
        if (workspaceFolder) {
          expandedPath = path.join(workspaceFolder.uri.fsPath, expandedPath);
        }
      }
    }

    if (!fs.existsSync(expandedPath)) {
      return;
    }

    const ext = path.extname(expandedPath).toLowerCase();
    if (![".mp3", ".wav", ".m4a"].includes(ext)) {
      return;
    }

    // Use cross-platform audio playing
    const { execSync } = require("child_process");

    if (process.platform === "win32") {
      // Windows: Create and run a PowerShell script that plays audio
      try {
        const os = require("os");
        const tempDir = os.tmpdir();
        const timestamp = Date.now();
        const tempPs1 = path.join(tempDir, `play-${timestamp}.ps1`);

        const psScript = `[System.Reflection.Assembly]::LoadWithPartialName("System.Media") | Out-Null
$sound = New-Object System.Media.SoundPlayer
$sound.SoundLocation = "${expandedPath}"
$sound.PlaySync()`;

        fs.writeFileSync(tempPs1, psScript);
        execSync(
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`,
          {
            stdio: "ignore",
            timeout: 15000,
          },
        );
        try {
          fs.unlinkSync(tempPs1);
        } catch {
          /* ignore */
        }
      } catch {
        // silent fail
      }
    } else if (process.platform === "darwin") {
      try {
        execSync(`afplay "${expandedPath}"`, { stdio: "ignore" });
      } catch {
        // silent fail
      }
    } else {
      for (const player of ["paplay", "aplay", "ffplay", "mpg123"]) {
        try {
          execSync(`${player} "${expandedPath}"`, { stdio: "ignore" });
          break;
        } catch {
          /* try next */
        }
      }
    }
  } catch {
    // silent fail
  }
}

export function deactivate() {}
