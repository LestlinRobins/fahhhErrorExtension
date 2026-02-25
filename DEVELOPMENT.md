# Getting Started

## Development Setup

### Prerequisites

- Node.js and npm
- TypeScript knowledge (optional)
- VSCode

### Setup Instructions

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Compile the TypeScript code**

   ```bash
   npm run compile
   ```

3. **Watch mode for development** (in a separate terminal)
   ```bash
   npm watch
   ```

## Running the Extension

### In Development Mode (Debug)

1. Press `F5` in VSCode to launch the extension
2. This opens a new VSCode window with the extension loaded
3. Go to the command palette (`Ctrl+Shift+P`) and type "Error Sound Alert: Play Test Sound" to test

### Running Tests

```bash
npm test
```

## How It Works

The extension monitors your workspace for errors in two ways:

1. **Code Diagnostics Monitoring** - Listens to VSCode's diagnostic API which captures:
   - Language server errors (TypeScript, Python, etc.)
   - Linter warnings and errors
   - Built-in syntax checking

2. **Build Task Monitoring** - Detects when build/compile tasks execute and checks for errors:
   - C/C++ compilation errors (gcc, clang, MSVC)
   - Java compilation
   - Python errors
   - Rust compilation
   - Any build tool errors

When NEW errors appear (error count increases), the sound automatically plays.

### Debug Logging

To see what the extension is detecting, check the Debug Console (`Ctrl+Shift+Y`):

- "New error(s) detected!" - Sound should play
- "Diagnostic change detected" - Shows current vs previous error count
- "Task ended" and "Build task detected" - Shows when tasks complete

## Configuration

Open settings (`Ctrl+,`) and search for "Error Sound Alert" to configure:

- Enable/Disable the extension
- Choose a custom sound file or use built-in alert
- Adjust volume levels
- Toggle diagnostic and terminal error detection

### Example Settings

```json
{
  "errorSoundAlert.enabled": true,
  "errorSoundAlert.soundFile": "bundled:fahhhh.wav",
  "errorSoundAlert.volume": 0.8,
  "errorSoundAlert.playOnDiagnostics": true,
  "errorSoundAlert.playOnTerminalError": true
}
```

## Using Custom Sound Files

You can use either the bundled sound or custom files:

**Built-in sound:**

```json
{
  "errorSoundAlert.soundFile": "bundled:fahhhh.wav"
}
```

**Custom files** (place in any folder):

```json
{
  "errorSoundAlert.soundFile": "/path/to/your/sound.wav",
  "errorSoundAlert.soundFile": "${workspaceFolder}/sounds/alert.mp3",
  "errorSoundAlert.soundFile": "~/sounds/error.m4a"
}
```

## Platform-Specific Notes

- **Windows**: Uses PowerShell to play sounds
- **macOS**: Uses the `afplay` command
- **Linux**: Uses `paplay`, `aplay`, or `mpg123` (install with: `sudo apt install pulseaudio`)

## Building for Distribution

To create a `.vsix` package for distribution:

```bash
npm install -g vsce
vsce package
```

This creates an `error-sound-alert-0.0.1.vsix` file that can be installed via:

- Drag and drop into VSCode Extensions panel
- Or: `code --install-extension error-sound-alert-0.0.1.vsix`

## Troubleshooting

### Sound not playing?

1. **Test the audio system**
   - Use "Error Sound Alert: Play Test Sound" command
   - Check system volume settings

2. **For custom files**
   - Verify file path in settings is correct
   - Ensure file is in MP3, WAV, or M4A format
   - Check file permissions

3. **Platform-specific issues**
   - Windows: Make sure audio device is connected
   - macOS: Check if audio output is muted
   - Linux: Install audio players (see Platform-Specific Notes)

## Next Steps

- Customize the extension with your own sounds
- Share feedback or report issues in the repository
- Consider contributing improvements
