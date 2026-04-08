# Khinsider Scraper

Desktop Electron app for browsing a Khinsider album page and downloading selected tracks through a Python scraper.

## Stack

- Electron for the desktop shell and UI
- Node.js / npm for app startup
- Python 3 for scraping and downloads
- `requests` and `beautifulsoup4` for the scraper

## Project Layout

- `index.html` - main app window
- `src/renderer/main.js` - Electron main process and IPC handlers
- `src/renderer/preload.js` - safe renderer API bridge
- `src/renderer/buttonFunctions.js` - UI behavior
- `src/python/scraper.py` - album parsing and file download logic

## Requirements

Install these before running the app:

- Node.js
- Python 3

The app launches with npm, but downloads and album lookups depend on Python being available on your system `PATH`.

## Install

Install Node dependencies:

```powershell
npm install
```

Install Python packages:

```powershell
py -m pip install requests beautifulsoup4
```

If `py` is not available, use:

```powershell
python -m pip install requests beautifulsoup4
```

## Run

Start the Electron app from the project root:

```powershell
npm start
```

## How It Works

1. Paste a Khinsider album URL into the app.
2. The Electron main process calls `scraper.py get_info <url>`.
3. The Python script parses the album page and returns the track list over stdout as JSON.
4. When you download tracks, Electron calls `scraper.py download_selected <url> <indices> [outputDir]`.
5. The Python script downloads files into the folder you selected in the directory picker.

## Important Notes

- `package.json` does not replace Python. This app depends on a real Python installation because Electron spawns `scraper.py` directly.
- On Windows, `pip` may not be available as a standalone command in PowerShell. Use `py -m pip ...` or `python -m pip ...`.
- The app currently expects Python to be callable as `python` on Windows.

## Troubleshooting

### `pip` is not recognized

Use:

```powershell
py -m pip install requests beautifulsoup4
```

or:

```powershell
python -m pip install requests beautifulsoup4
```

If neither works, Python is not installed or not on `PATH`.

### The app starts but downloads fail

Check the terminal running Electron. The app logs Python stdout and stderr there.

## WARNING: This is a work in progress! Some older songs will not download (will download NULL).