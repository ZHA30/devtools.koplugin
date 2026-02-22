# KOReader Devtools Plugin

## Introduction

`devtools.koplugin` exposes a lightweight LAN web service for KOReader diagnostics and file operations.

It provides:

- Real-time log diagnostics with startup-segment paging.
- Web-based file management under KOReader data root.
- Optional auth code protection.
- A web top-bar **Restart** action for immediate KOReader restart.

Default port: `18080` (configurable).

## Menu Entry And Features

Open in KOReader:

- `Main menu -> Devtools`

Menu items:

1. `Devtools server`
   - Tap: toggle server on/off.
   - Long press: set service port.
   - When running, the item shows current port (for example `Devtools server: 18080`).
2. `Autostart`
   - Toggle automatic server startup with KOReader.
3. `Authentication`
   - Tap: enable/disable auth-code verification.
   - Long press: set auth code.

Dispatcher actions:

- `toggle_devtools_server`: toggles Devtools service.

## Web UI Overview

Routes:

- `/` (single split dashboard)
- `/index.html` (single split dashboard)

Dashboard layout:

- Left pane: logs.
- Right pane: files.
- Top-left controls (logs side): clear, previous/next segment, restart, stop service.
- Top-right controls (files side): upload files/folder, refresh.
- Bottom strip: repository link and theme switch.

Logs pane:

- Shows latest startup log segment by default.
- Supports previous/next segment navigation.
- Supports clearing log file.

Files pane:

- Spreadsheet-like e-ink style file listing.
- Breadcrumb path navigation (root shown as `🏠`).
- Includes an explicit `..` parent-entry row for quick navigation to the upper folder.
- Sort by name or modified time.
- Multi-select with row checkboxes.
- Upload files, upload folder, refresh, move, delete, download.
- Folder download is supported (served as `.tar` archive).

Auth behavior:

- If auth is enabled and request is unauthorized, the web page prompts for auth code in a modal dialog.

## Notes

- Works normally on Kindle Paperwhite 11th gen (PW5).
