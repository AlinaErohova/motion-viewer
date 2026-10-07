# Motion Viewer — macOS standalone app

A local desktop Lottie viewer / inspector for `.json` and `.lottie` animations.

## What you get
- Native macOS `.app` and `.dmg` builds via Electron + electron-builder
- Open files with Finder / right-click → Open With
- Native file picker with multi-select
- Drag & drop `.json` / `.lottie`
- Playback, pause, reset, frame stepping and timeline scrubbing
- Speed controls
- Checkerboard / light / dark backgrounds
- Fullscreen canvas
- Basic animation metadata
- Copy JSON
- Everything runs locally; files are not uploaded

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

The generated app is unsigned by default. macOS may show a security warning the first time you open it. For personal use, Control-click the app and choose **Open**. For distribution to other people, the app should be signed and notarized with an Apple Developer account.
