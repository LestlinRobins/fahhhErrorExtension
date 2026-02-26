import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

let extensionContext: vscode.ExtensionContext;
let isMuted = false;
const seenErrorLines = new Set<string>();
const lastDiagnosticErrorCounts = new Map<string, number>();
let menuStatusBarItem: vscode.StatusBarItem;

function updateMenuStatusBar() {
  if (!menuStatusBarItem) {
    return;
  }
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

class FahhhkPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "fahhherror.settingsPanel";
  private _view?: vscode.WebviewView;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      const config = vscode.workspace.getConfiguration("errorSoundAlert");
      switch (message.type as string) {
        case "setEnabled":
          await config.update("enabled", message.value as boolean, true);
          updateMenuStatusBar();
          this.refresh();
          break;
        case "setMuted":
          isMuted = message.value as boolean;
          updateMenuStatusBar();
          break;
        case "setVolume":
          await config.update("volume", message.value as number, true);
          break;
        case "setSound":
          await config.update("soundFile", message.value as string, true);
          this.refresh();
          break;
        case "setPlayOnDiagnostics":
          await config.update(
            "playOnDiagnostics",
            message.value as boolean,
            true,
          );
          break;
        case "setPlayOnTerminal":
          await config.update(
            "playOnTerminalError",
            message.value as boolean,
            true,
          );
          break;
        case "setPlayOnSuccess":
          await config.update("playOnSuccess", message.value as boolean, true);
          break;
        case "setDefaultCommand":
          await config.update("defaultCommand", message.value as string, true);
          void vscode.window.showInformationMessage(
            "faahhhk: Default command saved",
          );
          break;
        case "resetDefaultCommand":
          await vscode.commands.executeCommand(
            "fahhherror.resetDefaultCommand",
          );
          this.refresh();
          break;
        case "testSound":
          playSound();
          break;
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtml();
    }
  }

  private _getHtml(): string {
    const config = vscode.workspace.getConfiguration("errorSoundAlert");
    const enabled = config.get<boolean>("enabled", true);
    const soundFile = config.get<string>("soundFile", "bundled:fahhhh.wav");
    const volume = config.get<number>("volume", 1);
    const playOnDiagnostics = config.get<boolean>("playOnDiagnostics", true);
    const playOnTerminal = config.get<boolean>("playOnTerminalError", true);
    const playOnSuccess = config.get<boolean>("playOnSuccess", false);
    const defaultCommand = config.get<string>("defaultCommand", "");
    const volumePct = Math.round(volume * 100);
    const nonce =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const soundCards: Array<{ key: string; label: string; icon: string }> = [
      { key: "bundled:fahhhh.wav", label: "fahhhh", icon: "😩" },
      { key: "bundled:emotional.wav", label: "emotional", icon: "💀" },
      { key: "bundled:success.wav", label: "success", icon: "🎉" },
    ];

    const soundCardsHtml = soundCards
      .map(
        (s) =>
          `<button class="sound-card${soundFile === s.key ? " active" : ""}" data-sound="${s.key}">` +
          `<span class="sound-icon">${s.icon}</span>${s.label}` +
          `</button>`,
      )
      .join("\n    ");

    const safeCmd = defaultCommand
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
<style nonce="${nonce}">
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground)}
.section{padding:12px 16px}
.section+.section{border-top:1px solid var(--vscode-sideBarSectionHeader-border,var(--vscode-panel-border,#333))}
.section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);margin-bottom:10px}
.row{display:flex;align-items:center;justify-content:space-between;padding:5px 0;gap:8px}
.row-label{flex:1;font-size:13px}
.row-desc{font-size:11px;color:var(--vscode-descriptionForeground);margin-top:1px}
.toggle{position:relative;width:36px;height:20px;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0}
.toggle-track{position:absolute;inset:0;border-radius:10px;background:var(--vscode-titleBar-inactiveBackground,#555);cursor:pointer;transition:background .15s}
.toggle input:checked+.toggle-track{background:var(--vscode-button-background)}
.toggle-thumb{position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s;pointer-events:none}
.toggle input:checked~.toggle-thumb{transform:translateX(16px)}
.sound-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.sound-card{padding:8px 4px;border-radius:4px;border:1px solid var(--vscode-panel-border,#333);background:var(--vscode-input-background);color:var(--vscode-foreground);cursor:pointer;text-align:center;font-size:11px;font-family:var(--vscode-font-family);transition:border-color .1s}
.sound-card:hover{border-color:var(--vscode-focusBorder)}
.sound-card.active{border-color:var(--vscode-button-background);background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
.sound-icon{font-size:20px;display:block;margin-bottom:3px}
.volume-row{margin-top:10px}
.volume-label{display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px}
input[type=range]{width:100%;-webkit-appearance:none;height:4px;border-radius:2px;background:var(--vscode-scrollbarSlider-background,#555);outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--vscode-button-background);cursor:pointer}
.cmd-input{width:100%;margin-top:6px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border,transparent);border-radius:2px;padding:4px 8px;font-family:var(--vscode-editor-font-family,monospace);font-size:12px}
.cmd-input:focus{outline:1px solid var(--vscode-focusBorder)}
.btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:2px;font-size:12px;cursor:pointer;border:none;font-family:var(--vscode-font-family)}
.btn-primary{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
.btn-primary:hover{background:var(--vscode-button-hoverBackground)}
.btn-secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
.btn-secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}
.btn-row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
</style></head><body>
<div class="section">
  <div class="section-title">Sound</div>
  <div class="sound-grid">
    ${soundCardsHtml}
  </div>
  <div class="volume-row">
    <div class="volume-label"><span>Volume</span><span id="vol-display">${volumePct}%</span></div>
    <input type="range" id="volume-slider" min="0" max="100" value="${volumePct}" />
  </div>
  <div class="btn-row">
    <button class="btn btn-secondary" id="test-btn">&#9654; Test sound</button>
  </div>
</div>
<div class="section">
  <div class="section-title">Triggers</div>
  <div class="row">
    <div><div class="row-label">Diagnostic errors</div><div class="row-desc">Play when editor shows error squiggles</div></div>
    <label class="toggle"><input type="checkbox" id="toggle-diagnostics" ${playOnDiagnostics ? "checked" : ""} /><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
  </div>
  <div class="row">
    <div><div class="row-label">Terminal errors</div><div class="row-desc">Play on non-zero exit codes</div></div>
    <label class="toggle"><input type="checkbox" id="toggle-terminal" ${playOnTerminal ? "checked" : ""} /><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
  </div>
  <div class="row">
    <div><div class="row-label">Success &#127881;</div><div class="row-desc">Play success.wav on exit code 0</div></div>
    <label class="toggle"><input type="checkbox" id="toggle-success" ${playOnSuccess ? "checked" : ""} /><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
  </div>
</div>
<div class="section">
  <div class="section-title">General</div>
  <div class="row">
    <div><div class="row-label">Enable faahhhk</div><div class="row-desc">Master on/off switch</div></div>
    <label class="toggle"><input type="checkbox" id="toggle-enabled" ${enabled ? "checked" : ""} /><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
  </div>
  <div class="row">
    <div><div class="row-label">Mute (temporary)</div><div class="row-desc">Silence until next reload</div></div>
    <label class="toggle"><input type="checkbox" id="toggle-muted" ${isMuted ? "checked" : ""} /><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
  </div>
  <div style="margin-top:10px">
    <div style="font-size:13px;margin-bottom:4px">Default command</div>
    <input class="cmd-input" id="cmd-input" type="text" value="${safeCmd}" placeholder="npm test, make, etc." />
    <div class="btn-row">
      <button class="btn btn-primary" id="cmd-save">Save</button>
      <button class="btn btn-secondary" id="cmd-reset">Auto-detect</button>
    </div>
  </div>
</div>
<script nonce="${nonce}">
(function(){
  var vscode=acquireVsCodeApi();
  document.querySelectorAll('.sound-card').forEach(function(c){
    c.addEventListener('click',function(){
      document.querySelectorAll('.sound-card').forEach(function(x){x.classList.remove('active');});
      c.classList.add('active');
      vscode.postMessage({type:'setSound',value:c.dataset.sound});
    });
  });
  var slider=document.getElementById('volume-slider');
  var volDisplay=document.getElementById('vol-display');
  slider.addEventListener('input',function(){volDisplay.textContent=slider.value+'%';});
  slider.addEventListener('change',function(){vscode.postMessage({type:'setVolume',value:parseInt(slider.value)/100});});
  document.getElementById('test-btn').addEventListener('click',function(){vscode.postMessage({type:'testSound'});});
  document.getElementById('toggle-diagnostics').addEventListener('change',function(e){vscode.postMessage({type:'setPlayOnDiagnostics',value:e.target.checked});});
  document.getElementById('toggle-terminal').addEventListener('change',function(e){vscode.postMessage({type:'setPlayOnTerminal',value:e.target.checked});});
  document.getElementById('toggle-success').addEventListener('change',function(e){vscode.postMessage({type:'setPlayOnSuccess',value:e.target.checked});});
  document.getElementById('toggle-enabled').addEventListener('change',function(e){vscode.postMessage({type:'setEnabled',value:e.target.checked});});
  document.getElementById('toggle-muted').addEventListener('change',function(e){vscode.postMessage({type:'setMuted',value:e.target.checked});});
  document.getElementById('cmd-save').addEventListener('click',function(){
    var val=document.getElementById('cmd-input').value.trim();
    vscode.postMessage({type:'setDefaultCommand',value:val});
  });
  document.getElementById('cmd-reset').addEventListener('click',function(){vscode.postMessage({type:'resetDefaultCommand'});});
})();
</script>
</body></html>`;
  }
}

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
      // Only prompt to enter a command for languages without built-in detection
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!hasBuiltInDetection(workspaceFolder)) {
        void vscode.commands.executeCommand("fahhherror.runCommandWithSound");
      }
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

  menuStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99,
  );
  menuStatusBarItem.command = "fahhherror.openPanel";
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
        {
          label: `$(unmute) Set volume (${Math.round(config.get<number>("volume", 1) * 100)}%)`,
          description: "Adjust the sound playback volume",
          async action() {
            await vscode.commands.executeCommand("fahhherror.setVolume");
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
        { label: "", kind: vscode.QuickPickItemKind.Separator, action() {} },
        {
          label: "$(music) Select sound",
          description: (() => {
            const sf = config.get<string>("soundFile", "bundled:fahhhh.wav");
            const names: Record<string, string> = {
              "bundled:fahhhh.wav": "fahhhh",
              "bundled:emotional.wav": "emotional damage",
              "bundled:success.wav": "success",
            };
            return `Current: ${names[sf] ?? sf}`;
          })(),
          async action() {
            const currentSound = config.get<string>(
              "soundFile",
              "bundled:fahhhh.wav",
            );
            type SoundItem = vscode.QuickPickItem & { value: string };
            const soundOptions: SoundItem[] = [
              {
                label: `${currentSound === "bundled:fahhhh.wav" ? "$(check) " : ""}fahhhh`,
                description: "The classic fahhhh sound (default)",
                value: "bundled:fahhhh.wav",
              },
              {
                label: `${currentSound === "bundled:emotional.wav" ? "$(check) " : ""}emotional damage`,
                description: "For when the pain is real",
                value: "bundled:emotional.wav",
              },
              {
                label: `${currentSound === "bundled:success.wav" ? "$(check) " : ""}success`,
                description: "Play on success (if you're into that)",
                value: "bundled:success.wav",
              },
            ];
            const chosen = await vscode.window.showQuickPick(soundOptions, {
              title: "faahhhk — Select Sound",
              placeHolder: "Pick the sound to play on error",
            });
            if (chosen) {
              await config.update("soundFile", chosen.value, true);
              void vscode.window.showInformationMessage(
                `faahhhk: Sound set to "${chosen.label.replace("$(check) ", "")}"`,
              );
            }
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

  const setVolumeCommand = vscode.commands.registerCommand(
    "fahhherror.setVolume",
    async () => {
      const cfg = vscode.workspace.getConfiguration("errorSoundAlert");
      const currentVolume = cfg.get<number>("volume", 1);
      const currentPercent = Math.round(currentVolume * 100);

      const input = await vscode.window.showInputBox({
        prompt: "Set volume level (0–100)",
        value: String(currentPercent),
        placeHolder: "100",
        validateInput(value) {
          const num = Number(value);
          if (isNaN(num) || num < 0 || num > 100) {
            return "Please enter a whole number between 0 and 100";
          }
          return undefined;
        },
      });

      if (input === undefined) {
        return;
      }

      const newVolume = Math.max(0, Math.min(1, Number(input) / 100));
      await cfg.update("volume", newVolume, true);
      void vscode.window.showInformationMessage(
        `faahhhk: Volume set to ${Math.round(newVolume * 100)}%`,
      );
    },
  );
  context.subscriptions.push(setVolumeCommand);

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

  const panelProvider = new FahhhkPanelProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FahhhkPanelProvider.viewType,
      panelProvider,
    ),
  );

  const openPanelCommand = vscode.commands.registerCommand(
    "fahhherror.openPanel",
    () => {
      void vscode.commands.executeCommand(
        "workbench.view.extension.fahhherror-sidebar",
      );
    },
  );
  context.subscriptions.push(openPanelCommand);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("errorSoundAlert")) {
        updateMenuStatusBar();
        panelProvider.refresh();
      }
    }),
  );

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
      }
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

function hasBuiltInDetection(
  workspaceFolder?: vscode.WorkspaceFolder,
): boolean {
  if (workspaceFolder) {
    const root = workspaceFolder.uri.fsPath;
    if (
      fs.existsSync(path.join(root, "package.json")) ||
      fs.existsSync(path.join(root, "Makefile")) ||
      fs.existsSync(path.join(root, "pom.xml")) ||
      fs.existsSync(path.join(root, "mvnw")) ||
      fs.existsSync(path.join(root, "mvnw.cmd")) ||
      fs.existsSync(path.join(root, "build.gradle")) ||
      fs.existsSync(path.join(root, "build.gradle.kts")) ||
      fs.existsSync(path.join(root, "gradlew")) ||
      fs.existsSync(path.join(root, "gradlew.bat")) ||
      fs.existsSync(path.join(root, "Cargo.toml")) ||
      fs.existsSync(path.join(root, "go.mod"))
    ) {
      return true;
    }
  }

  const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (activeFile) {
    const ext = path.extname(activeFile).toLowerCase();
    if (
      [
        ".py",
        ".js",
        ".mjs",
        ".cjs",
        ".java",
        ".c",
        ".cc",
        ".cpp",
        ".cxx",
      ].includes(ext)
    ) {
      return true;
    }
  }

  return false;
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
  if (isMuted || !config.get("enabled")) {
    return;
  }

  if (typeof event.exitCode !== "number") {
    return;
  }

  if (
    event.exitCode !== 0 &&
    config.get<boolean>("playOnTerminalError", true)
  ) {
    const key = `${event.execution.task.name}:${event.exitCode}`;
    if (!seenErrorLines.has(key)) {
      seenErrorLines.add(key);
      playSound();
      setTimeout(() => seenErrorLines.delete(key), 3000);
    }
  } else if (
    event.exitCode === 0 &&
    config.get<boolean>("playOnSuccess", false)
  ) {
    const key = `${event.execution.task.name}:success`;
    if (!seenErrorLines.has(key)) {
      seenErrorLines.add(key);
      const successPath = path.join(
        extensionContext.extensionPath,
        "sounds",
        "success.wav",
      );
      void playAudioFile(successPath, config.get<number>("volume", 1));
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
      // Check sounds/ first, fall back to media/ for legacy files
      const soundsPath = path.join(
        extensionContext.extensionPath,
        "sounds",
        filename,
      );
      const mediaPath = path.join(
        extensionContext.extensionPath,
        "media",
        filename,
      );
      expandedPath = fs.existsSync(soundsPath) ? soundsPath : mediaPath;
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
