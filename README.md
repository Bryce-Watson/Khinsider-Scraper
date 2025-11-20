# Khinsider Scraper

A desktop application built with Electron and Python to easily browse and download video game soundtracks.

## Features

- **Easy Search**: Paste a Khinsider album URL to verify and retrieve the tracklist.
- **Selective Downloading**: Choose specific tracks or select the entire album to download.
- **Progress Tracking**: Visual progress bar and status updates during downloads.
- **Clean UI**: A modern, dark-themed interface for managing your VGM collection.

## Prerequisites

Before running the application, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (includes npm)
- [Python 3.x](https://www.python.org/downloads/)

## Installation

1.  **Install Node dependencies**
    Navigate to the project directory and run:
    ```bash
    npm install
    ```

2.  **Install Python dependencies**
    The underlying scraper requires `requests` and `beautifulsoup4`:
    ```bash
    pip install requests beautifulsoup4
    ```

## Usage

1.  Start the application:
    ```bash
    npm start
    ```

2.  Enter a valid album URL from Khinsider (e.g., `https://downloads.khinsider.com/game-soundtracks/album/example-album`).
3.  Click **Search** to load the available tracks.
4.  Select the tracks you wish to download using the checkboxes.
5.  Click **Download Selected**. The files will be downloaded to a local folder named after the album.

## Project Structure

- **src/renderer/**: Contains the Electron frontend logic (UI, styles, and button handlers).
- **src/python/**: Contains `scraper.py`, the core logic script handles web scraping and file downloading.
- **index.html**: The main application window layout.

## Technologies

- **Electron**: Cross-platform desktop framework.
- **Python**: Used for the backend scraping logic.
- **BeautifulSoup4**: Used for parsing HTML content.