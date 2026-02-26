# Error Sound Alert

Automatically plays the legendary “fahhh” whenever your terminal throws an error, so every failed build comes with the emotional damage it truly deserves.

NEW: Success and Emotional Damage sounds added as per user feedback
NOTE: Success sound effect is purely organic and made by Muhammad Basil P V. Grateful to him for the idea too.

## Features

- Plays audio alerts when code errors are detected via diagnostics
- Support for custom MP3/WAV files or built-in system sounds
- Highly configurable with various options
- Easy enable/disable toggle
- Volume control

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Press `F5` to open the extension in debug mode

## Usage

### Basic Setup

The extension activates automatically when VSCode opens. By default, it will:

1. Monitor your code for errors (via the Diagnostics API)
2. Play the built-in "fahhhh" alert sound when errors are detected
3. Work on Windows, macOS, and Linux

### Commands

- **Error Sound Alert: Play Test Sound** - Manually trigger a sound alert to test the extension
- **Error Sound Alert: Run Command With Sound** - Prompt for a shell command, run it as a task, and play a sound if it fails
- **Error Sound Alert: Run Default Command With Sound** - Run the configured or detected default command
- **Error Sound Alert: Set Default Command** - Save a default shell command for automatic runs
- **Error Sound Alert: Reset to Auto-Detect** - Clear the default command and use auto-detection again

### Status Bar

Use the **Run With Sound** status bar button to run the configured or auto-detected command without opening the command palette.

### Configuration

Configure the extension via VSCode Settings (`Ctrl+,` / `Cmd+,`):

#### `errorSoundAlert.enabled`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable or disable the error sound alert

#### `errorSoundAlert.soundFile`

- **Type:** `string`
- **Default:** `bundled:fahhhh.wav`
- **Description:** Path to a custom sound file (MP3/WAV/M4A), use `bundled:fahhhh.wav` for the included sound, or `builtin-alert` for system beep

**Examples:**

```json
{
  "errorSoundAlert.soundFile": "bundled:fahhhh.wav",
  "errorSoundAlert.soundFile": "/path/to/alert.wav",
  "errorSoundAlert.soundFile": "~/sounds/error.mp3"
}
```

#### `errorSoundAlert.volume`

- **Type:** `number`
- **Default:** `1`
- **Range:** `0` - `1`
- **Description:** Volume level for the sound (0 = silent, 1 = maximum)

#### `errorSoundAlert.playOnDiagnostics`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Play sound when diagnostic errors are detected in code

#### `errorSoundAlert.playOnTerminalError`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Play sound when terminal detects exit code indicating error

#### `errorSoundAlert.defaultCommand`

- **Type:** `string`
- **Default:** `""`
- **Description:** Default shell command to run for terminal error detection. Supports `${workspaceFolder}`, `${file}`, `${fileBasename}`, `${fileDirname}`, and `${fileBasenameNoExtension}`.

#### `errorSoundAlert.autoRunCommand`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Run the default command automatically when VS Code starts. If `defaultCommand` is empty, the extension tries to auto-detect one from common project files.

#### `errorSoundAlert.preferActiveFileDetection`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Prefer auto-detection based on the active file even when a default command is set

## Supported Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- Built-in system sounds (cross-platform)

## Platform Support

| Platform | Built-in Sound | Custom Audio |
| -------- | -------------- | ------------ |
| Windows  | ✅ Yes         | ✅ Yes       |
| macOS    | ✅ Yes         | ✅ Yes       |
| Linux    | ✅ Yes         | ✅ Yes       |

## Detecting Compiler Errors (C/C++, Java, etc.)

For the extension to detect compiler errors from terminal builds, you can either use the **Run Command With Sound** command, set a **default command** for automatic runs, or set up a **build task with a problem matcher**. The sound triggers when the task exits with a non-zero code and diagnostics are produced.

Auto-detection looks for common project files (like package.json, pom.xml, build.gradle, Cargo.toml, go.mod, or Makefile) and active file types (C/C++, Python, Java, JavaScript) to set a reasonable default command.

### C/C++ Example

Create or edit `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "gcc",
      "args": ["-g", "${file}", "-o", "${workspaceFolder}/a.out"],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": "$gcc"
    }
  ]
}
```

Then run `Ctrl+Shift+B` to build - when errors appear in the Problems panel, the sound will play!

### How It Works

1. You create a build task (above example compiles with `gcc`)
2. VSCode's **problem matcher** captures compiler errors into the Problems panel
3. The extension detects new errors and plays the sound
4. The sound only plays once per error (not repeatedly)

## Configuration Examples

### Use a custom alert sound

```json
{
  "errorSoundAlert.soundFile": "${workspaceFolder}/sounds/alert.wav",
  "errorSoundAlert.volume": 0.8
}
```

### Disable on terminal errors but keep diagnostics alerts

```json
{
  "errorSoundAlert.playOnDiagnostics": true,
  "errorSoundAlert.playOnTerminalError": false
}
```

### Only play sounds at low volume

```json
{
  "errorSoundAlert.volume": 0.3
}
```

## Troubleshooting

### Sound doesn't play on Windows

- Ensure your system volume is not muted
- Check that audio output device is connected
- Verify file path is correct in settings

### Sound doesn't play on macOS

- Make sure audio output is not muted
- Try using a different audio file format

### Sound doesn't play on Linux

- Install `pulseaudio` or `alsa`: `sudo apt-get install pulseaudio`
- Or use `paplay`, `aplay` command line tools

## Tips

1. **Test the extension** - Use the "Play Test Sound" command to verify audio is working before relying on automatic alerts
2. **Custom sounds** - Place audio files in your project's sounds directory for non-absolute paths
3. **Performance** - The extension has minimal performance impact as it only listens to error events

## Future Enhancements

- [ ] Multiple sounds for different error types
- [ ] Configurable sound for warnings vs. errors
- [ ] Terminal exit code detection
- [ ] Sound intensity based on error severity

## License

MIT
