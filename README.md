# Motion Viewer — macOS standalone app

A local desktop Lottie viewer / inspector for `.json` and `.lottie` animations.

## What you get
- Native macOS `.app` and `.dmg` builds via Electron + electron-builder
- Open files with Finder / right-click → Open With
- Native file picker with multi-select
- Drag & drop `.json` / `.lottie`
- Batch export to `.json` or `.lottie` at the original or a custom size
- Playback, pause, reset, frame stepping and timeline scrubbing
- Speed controls
- Checkerboard / light / dark backgrounds
- Fullscreen canvas
- Basic animation metadata
- Copy JSON
- Everything runs locally; files are not uploaded

## Install from GitHub Releases

1. Download `Motion Viewer-0.3.0-arm64.dmg` from the latest GitHub Release.
2. Open the DMG and drag **Motion Viewer** to **Applications**.
3. On the first launch, Control-click **Motion Viewer** in Applications, choose **Open**, then confirm **Open**.

The current build is ad-hoc signed but not Apple-notarized. Some browsers add a macOS quarantine attribute that can prevent the DMG from opening. If that happens, remove quarantine from the downloaded DMG only:

```bash
xattr -d com.apple.quarantine "/path/to/Motion Viewer-0.3.0-arm64.dmg"
```

Tip: type `xattr -d com.apple.quarantine ` in Terminal, drag the DMG into the Terminal window to insert its exact path, and press Return. Then open the DMG again.

## Build on macOS

Requires Node.js 20+.

```bash
npm install
npm run dist:mac
```

The installer will be created in `dist/` as a `.dmg`. The `.app` bundle is also available from the `dist:app` command:

```bash
npm run dist:app
```

For development:

```bash
npm run electron:dev
```

## Notes

The generated app uses ad-hoc signing (`identity: "-"`). For frictionless distribution without the quarantine workaround, it should be signed with an Apple Developer ID certificate and notarized by Apple.
